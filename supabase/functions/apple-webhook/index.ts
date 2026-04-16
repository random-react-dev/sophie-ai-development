// apple-webhook Edge Function
//
// Receives App Store Server Notifications v2 from Apple. Apple posts:
//   { "signedPayload": "<JWS notification>" }
//
// We verify the JWS, decode the notification, and reconcile the matching
// row in `public.apple_subscriptions` (looked up by original_transaction_id —
// created earlier by `verify-purchase`). If no row exists yet we log a
// warning and 200 (renewal-before-verify race; client will sync later).
//
// TODO(future): wire `appAccountToken` (set client-side at purchase time
// via StoreKit 2's `Product.PurchaseOption.appAccountToken`) so we can map
// notifications to a `user_id` even when verify-purchase hasn't fired yet.
//
// Required env vars:
//   APPLE_BUNDLE_ID
//   APPLE_APP_ID
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: `supabase functions deploy apple-webhook --no-verify-jwt`
// (Apple does not send a Supabase JWT.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Environment } from 'npm:@apple/app-store-server-library@1.4.0';
import { getVerifier } from '../_shared/apple-verifier.ts';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type StateUpdate = {
  state?: string;
  expires_date?: string;
  auto_renew_status?: boolean;
};

function mapNotification(notificationType: string, subtype?: string): StateUpdate | null {
  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'RENEWAL_EXTENDED':
      return { state: 'active' };
    case 'DID_FAIL_TO_RENEW':
      return { state: 'billing_retry' };
    case 'EXPIRED':
    case 'GRACE_PERIOD_EXPIRED':
      return { state: 'expired' };
    case 'REVOKE':
      return { state: 'revoked' };
    case 'DID_CHANGE_RENEWAL_STATUS':
      // Subtype AUTO_RENEW_ENABLED / AUTO_RENEW_DISABLED.
      return { auto_renew_status: subtype !== 'AUTO_RENEW_DISABLED' };
    default:
      return null;
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let signedPayload: string;
  try {
    const body = await req.json();
    signedPayload = body?.signedPayload;
    if (!signedPayload || typeof signedPayload !== 'string') {
      return json(400, { error: 'Missing signedPayload' });
    }
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  // Verify and decode the notification. Try Production first (most webhook
  // traffic in real use), fall back to Sandbox (test notifications, sandbox
  // testers).
  let decodedNotification: any;
  try {
    const verifier = await getVerifier(Environment.PRODUCTION);
    decodedNotification = await verifier.verifyAndDecodeNotification(signedPayload);
  } catch (prodErr) {
    try {
      const verifier = await getVerifier(Environment.SANDBOX);
      decodedNotification = await verifier.verifyAndDecodeNotification(signedPayload);
    } catch (sandboxErr) {
      console.error('apple-webhook: notification verify failed', { prodErr, sandboxErr });
      return json(400, { error: 'Invalid signedPayload' });
    }
  }

  const notificationType: string = decodedNotification?.notificationType ?? '';
  const subtype: string | undefined = decodedNotification?.subtype;
  console.log('apple-webhook: received', { notificationType, subtype });

  // The transaction info inside the notification is itself a signed JWT.
  // The Apple library returns it pre-decoded under data.signedTransactionInfo
  // (string) and data.signedRenewalInfo (string). We decode the transaction
  // to get originalTransactionId + expiresDate.
  const data = decodedNotification?.data;
  const signedTx: string | undefined = data?.signedTransactionInfo;
  const signedRenewal: string | undefined = data?.signedRenewalInfo;

  let txInfo: any = null;
  let renewalInfo: any = null;
  try {
    const env: Environment =
      data?.environment === 'Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
    const verifier = await getVerifier(env);
    if (signedTx) {
      txInfo = await verifier.verifyAndDecodeTransaction(signedTx);
    }
    if (signedRenewal) {
      renewalInfo = await verifier.verifyAndDecodeRenewalInfo(signedRenewal);
    }
  } catch (decodeErr) {
    console.error('apple-webhook: failed to decode embedded JWT', decodeErr);
    // Continue — we may still be able to act on a notification that has no tx.
  }

  const originalTransactionId: string | undefined =
    txInfo?.originalTransactionId ?? renewalInfo?.originalTransactionId;

  if (!originalTransactionId) {
    console.warn('apple-webhook: notification has no originalTransactionId; ignoring', {
      notificationType,
      subtype,
    });
    return json(200, { ok: true, ignored: true });
  }

  const update = mapNotification(notificationType, subtype);
  if (!update) {
    console.log('apple-webhook: unhandled notificationType, no-op', notificationType);
    return json(200, { ok: true, handled: false });
  }

  // Fill in derived fields.
  if (txInfo?.expiresDate && (update.state === 'active' || !update.state)) {
    update.expires_date = new Date(txInfo.expiresDate).toISOString();
  }
  if (
    renewalInfo &&
    typeof renewalInfo.autoRenewStatus === 'number' &&
    update.auto_renew_status === undefined &&
    notificationType === 'DID_CHANGE_RENEWAL_STATUS'
  ) {
    update.auto_renew_status = renewalInfo.autoRenewStatus === 1;
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Look up the existing row.
  const { data: existing, error: selErr } = await supabaseAdmin
    .from('apple_subscriptions')
    .select('id, user_id')
    .eq('original_transaction_id', originalTransactionId)
    .maybeSingle();

  if (selErr) {
    console.error('apple-webhook: DB select failed', selErr);
    // Apple retries on 5xx — but we already have a parsed payload. Return 200
    // to avoid retry storms; the next notification (or client refresh) will
    // reconcile.
    return json(200, { ok: false, error: 'db_select_failed' });
  }

  if (!existing) {
    console.warn(
      'apple-webhook: no subscription row for originalTransactionId, no-op',
      { originalTransactionId, notificationType },
    );
    // TODO: when appAccountToken is wired, we can resolve user_id from
    // renewalInfo.appAccountToken and INSERT a fresh row here.
    return json(200, { ok: true, ignored: 'unknown_transaction' });
  }

  const patch: Record<string, unknown> = {
    ...update,
    raw_last_notification: decodedNotification,
    updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await supabaseAdmin
    .from('apple_subscriptions')
    .update(patch)
    .eq('id', existing.id);

  if (updErr) {
    console.error('apple-webhook: DB update failed', updErr);
    return json(200, { ok: false, error: 'db_update_failed' });
  }

  return json(200, { ok: true });
});
