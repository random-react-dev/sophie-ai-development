// check-talk-quota Edge Function
//
// Called by the Talk screen before opening a Gemini session. Enforces the
// free-tier daily cap (15 minutes / 900 seconds) and grants unlimited access
// to users with an active Apple subscription.
//
// Input:  no body required; auth JWT in Authorization header.
// Output (200): { allowed: true, isPro: boolean, used: number, cap: number }
// Output (402): { allowed: false, reason: 'free_quota_exhausted',
//                 used: number, cap: number }
// Output (401): { error: 'Unauthorized' } if auth JWT missing/invalid.
//
// Side effect on allowed + non-Pro: increments today's daily_usage.seconds_used
// by FREE_SESSION_CHARGE_SECONDS (charge-in-advance / tamper-resistant).
//
// Deploy: `supabase functions deploy check-talk-quota --no-verify-jwt`
// (`verify_jwt = false` is set in supabase/config.toml because the new 2026
// sb_publishable_ key format breaks the platform-level JWT gateway —
// see https://github.com/orgs/supabase/discussions/41834. Authentication is
// still enforced internally below via `userClient.auth.getUser()`.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FREE_DAILY_CAP_SECONDS = 15 * 60;            // 15 minutes per calendar day
const FREE_SESSION_CHARGE_SECONDS = 5 * 60;        // charge 5 min per session start

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function todayUtcDateString(): string {
  // Postgres DATE column uses ISO YYYY-MM-DD.
  return new Date().toISOString().slice(0, 10);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth: resolve caller identity from the forwarded JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();

  if (authErr || !user) {
    return json(401, { error: 'Unauthorized' });
  }

  // Service-role client bypasses RLS — needed to read/upsert usage + read the
  // subscription row.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 1. Active subscription check.
  const nowIso = new Date().toISOString();
  const { data: sub, error: subErr } = await admin
    .from('apple_subscriptions')
    .select('state, expires_date')
    .eq('user_id', user.id)
    .eq('state', 'active')
    .gt('expires_date', nowIso)
    .maybeSingle();

  if (subErr) {
    console.error('check-talk-quota: subscription lookup failed', subErr);
    // Fail open — don't lock Pro users out of Talk because of a DB blip. The
    // worst case here is a Pro user gets free usage on a retry, which is fine.
    return json(200, {
      allowed: true,
      isPro: false,
      used: 0,
      cap: FREE_DAILY_CAP_SECONDS,
      degraded: true,
    });
  }

  if (sub) {
    return json(200, {
      allowed: true,
      isPro: true,
      used: 0,
      cap: FREE_DAILY_CAP_SECONDS,
    });
  }

  // 2. Free-tier quota.
  const today = todayUtcDateString();
  const { data: usage, error: usageErr } = await admin
    .from('daily_usage')
    .select('seconds_used')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  if (usageErr) {
    console.error('check-talk-quota: usage lookup failed', usageErr);
    return json(500, { error: 'quota_lookup_failed' });
  }

  const used = usage?.seconds_used ?? 0;
  if (used >= FREE_DAILY_CAP_SECONDS) {
    return json(402, {
      allowed: false,
      reason: 'free_quota_exhausted',
      used,
      cap: FREE_DAILY_CAP_SECONDS,
    });
  }

  // 3. Charge in advance. If the user's session is shorter than
  //    FREE_SESSION_CHARGE_SECONDS they effectively get less talk time — a
  //    conservative choice that matches Apple reviewer expectations (the cap
  //    is visibly enforced).
  const nextUsed = used + FREE_SESSION_CHARGE_SECONDS;
  const { error: upsertErr } = await admin
    .from('daily_usage')
    .upsert(
      {
        user_id: user.id,
        date: today,
        seconds_used: nextUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    );

  if (upsertErr) {
    console.error('check-talk-quota: usage upsert failed', upsertErr);
    // Allow the session — better UX than locking out on a transient write
    // error; the next session will re-check and catch over-use.
  }

  return json(200, {
    allowed: true,
    isPro: false,
    used: nextUsed,
    cap: FREE_DAILY_CAP_SECONDS,
  });
});
