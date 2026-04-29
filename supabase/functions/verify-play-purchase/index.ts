// verify-play-purchase Edge Function
//
// Verifies a Google Play subscription purchase token submitted by the Android
// client and persists the resulting entitlement to public.google_subscriptions.
//
// Request: POST with header Authorization: Bearer <user JWT> and body
//   { "purchaseToken": "<Google Play purchase token>" }
//
// Response: 200 { state, expiresDate, productId }
//           400 bad input / invalid token
//           401 missing or invalid auth
//           500 DB / server error
//
// Deploy: supabase functions deploy verify-play-purchase --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  acknowledgeGoogleSubscription,
  buildGoogleSubscriptionPatch,
  type GoogleSubscriptionPatch,
  isAcknowledgementPending,
  type PlaySubscriptionPurchase,
  verifyGoogleSubscription,
} from '../_shared/google-play.ts';

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { error: 'Missing Authorization header' });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return json(401, { error: 'Unauthorized' });
  }

  let purchaseToken: string;
  try {
    const body = await req.json();
    purchaseToken = readPurchaseToken(body);
    if (!purchaseToken) {
      return json(400, { error: 'Missing purchaseToken' });
    }
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  let purchase: PlaySubscriptionPurchase;
  let patch: GoogleSubscriptionPatch;
  try {
    purchase = await verifyGoogleSubscription(purchaseToken);
    patch = buildGoogleSubscriptionPatch(purchase);
  } catch (error) {
    console.error('verify-play-purchase: Google verification failed', error);
    return json(400, { error: 'Invalid Google Play purchase token' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error: upsertError } = await admin
    .from('google_subscriptions')
    .upsert(
      {
        ...patch,
        user_id: user.id,
        purchase_token: purchaseToken,
      },
      { onConflict: 'purchase_token' },
    );

  if (upsertError) {
    console.error('verify-play-purchase: DB upsert failed', upsertError);
    return json(500, { error: 'Database error' });
  }

  if (isAcknowledgementPending(purchase)) {
    try {
      await acknowledgeGoogleSubscription(patch.product_id, purchaseToken);
    } catch (error) {
      console.error('verify-play-purchase: acknowledge failed', error);
      return json(500, { error: 'Google Play acknowledge failed' });
    }
  }

  return json(200, {
    state: patch.state,
    expiresDate: patch.expires_date,
    productId: patch.product_id,
  });
});

function readPurchaseToken(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return '';
  }
  const token = (value as Record<string, unknown>).purchaseToken;
  return typeof token === 'string' ? token : '';
}
