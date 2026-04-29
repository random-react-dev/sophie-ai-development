// verify-purchase Edge Function
//
// Verifies a StoreKit 2 JWS transaction submitted by the client and persists
// the resulting subscription state to `public.apple_subscriptions`.
//
// Request: POST with header `Authorization: Bearer <user JWT>` and body
//   { "jwsRepresentation": "<JWS string>" }
//
// Response: 200 { state, expiresDate, productId }
//           400 invalid JWS / bad input
//           401 missing or invalid auth
//           500 DB / server error
//
// Required env vars:
//   APPLE_BUNDLE_ID            - e.g. "ai.speakwithsophie.app"
//   APPLE_APP_ID               - numeric Apple ID from App Store Connect
//   SUPABASE_URL               - injected by the Supabase runtime
//   SUPABASE_ANON_KEY          - injected by the Supabase runtime (used for auth.getUser)
//   SUPABASE_SERVICE_ROLE_KEY  - service-role key for upsert
//
// Deploy: `supabase functions deploy verify-purchase --no-verify-jwt`
// (`verify_jwt = false` is set in supabase/config.toml because the new 2026
// sb_publishable_ key format breaks the platform-level JWT gateway —
// see https://github.com/orgs/supabase/discussions/41834. Authentication is
// still enforced internally below via `supabaseAuth.auth.getUser()`.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Environment } from 'npm:@apple/app-store-server-library@1.4.0';
import { getVerifier } from '../_shared/apple-verifier.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function deriveState(expiresMs: number | undefined | null): string {
  if (!expiresMs) return 'expired';
  return expiresMs > Date.now() ? 'active' : 'expired';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  // 1. Authn: extract user_id from the JWT.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(401, { error: 'Missing Authorization header' });

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData.user) {
    return json(401, { error: 'Unauthorized' });
  }
  const userId = userData.user.id;

  // 2. Parse body.
  let jwsRepresentation: string;
  try {
    const body = await req.json();
    jwsRepresentation = body?.jwsRepresentation;
    if (!jwsRepresentation || typeof jwsRepresentation !== 'string') {
      return json(400, { error: 'Missing jwsRepresentation' });
    }
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  // 3. Verify JWS using Apple's library.
  // We try Sandbox first (TestFlight + dev) and fall back to Production
  // because the JWS itself does not announce its environment to the verifier.
  let decoded: any;
  let environmentLabel: 'Sandbox' | 'Production' = 'Sandbox';
  try {
    const verifier = await getVerifier(Environment.SANDBOX);
    decoded = await verifier.verifyAndDecodeTransaction(jwsRepresentation);
  } catch (sandboxErr) {
    try {
      const verifier = await getVerifier(Environment.PRODUCTION);
      decoded = await verifier.verifyAndDecodeTransaction(jwsRepresentation);
      environmentLabel = 'Production';
    } catch (prodErr) {
      console.error('verify-purchase: JWS verify failed', { sandboxErr, prodErr });
      return json(400, { error: 'Invalid JWS signature' });
    }
  }

  const originalTransactionId = String(
    decoded?.originalTransactionId ?? decoded?.transactionId ?? '',
  );
  const productId = String(decoded?.productId ?? '');
  const purchaseDateMs: number | undefined = decoded?.purchaseDate;
  const expiresDateMs: number | undefined = decoded?.expiresDate;
  // Apple's decoded transaction has an `environment` field — prefer it.
  if (decoded?.environment) {
    environmentLabel = decoded.environment === 'Production' ? 'Production' : 'Sandbox';
  }

  if (!originalTransactionId || !productId || !purchaseDateMs || !expiresDateMs) {
    console.error('verify-purchase: decoded payload missing fields', decoded);
    return json(400, { error: 'Decoded transaction missing required fields' });
  }

  const state = deriveState(expiresDateMs);
  const purchaseDateIso = new Date(purchaseDateMs).toISOString();
  const expiresDateIso = new Date(expiresDateMs).toISOString();

  // 4. Upsert via service-role client.
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { error: upsertErr } = await supabaseAdmin
    .from('apple_subscriptions')
    .upsert(
      {
        user_id: userId,
        product_id: productId,
        original_transaction_id: originalTransactionId,
        state,
        purchase_date: purchaseDateIso,
        expires_date: expiresDateIso,
        environment: environmentLabel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'original_transaction_id' },
    );

  if (upsertErr) {
    console.error('verify-purchase: DB upsert failed', upsertErr);
    return json(500, { error: 'Database error' });
  }

  return json(200, {
    state,
    expiresDate: expiresDateIso,
    productId,
  });
});
