// play-webhook Edge Function
//
// Receives Google Play Real-Time Developer Notifications delivered by Cloud
// Pub/Sub push. Pub/Sub posts an envelope shaped like:
//   { "message": { "data": "<base64 JSON>", "messageId": "..." }, "subscription": "..." }
//
// For subscription notifications we verify the purchase token through Google
// Play and update an existing google_subscriptions row. Unknown tokens return
// 200 so Pub/Sub does not retry forever; the authenticated client path creates
// rows after purchase/restore.
//
// Deploy: supabase functions deploy play-webhook --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildGoogleSubscriptionPatch,
  updateKnownGoogleSubscription,
  verifyGoogleSubscription,
} from '../_shared/google-play.ts';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type PubSubEnvelope = {
  message?: {
    data?: string;
    messageId?: string;
    message_id?: string;
  };
  subscription?: string;
};

type PlayNotification = {
  eventTimeMillis?: string;
  packageName?: string;
  subscriptionNotification?: {
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
  voidedPurchaseNotification?: {
    orderId?: string;
    productType?: number;
    purchaseToken?: string;
    refundType?: number;
  };
};

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let envelope: PubSubEnvelope;
  try {
    envelope = parsePubSubEnvelope(await req.json());
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const data = envelope.message?.data;
  const messageId = envelope.message?.messageId ?? envelope.message?.message_id;
  if (!data) {
    return json(400, { error: 'Missing Pub/Sub message data' });
  }

  let notification: PlayNotification;
  try {
    notification = decodeBase64Json(data);
  } catch (error) {
    console.error('play-webhook: failed to decode Pub/Sub data', {
      messageId,
      error,
    });
    return json(400, { error: 'Invalid Pub/Sub message data' });
  }

  console.log('play-webhook: received RTDN', {
    messageId,
    packageName: notification.packageName,
    eventTimeMillis: notification.eventTimeMillis,
    subscriptionNotification: notification.subscriptionNotification,
    voidedPurchaseNotification: notification.voidedPurchaseNotification,
  });

  const purchaseToken =
    notification.subscriptionNotification?.purchaseToken ??
    notification.voidedPurchaseNotification?.purchaseToken;
  if (!purchaseToken) {
    return json(200, { ok: true, ignored: 'missing_purchase_token' });
  }

  if (notification.voidedPurchaseNotification) {
    await markKnownGoogleSubscriptionRevoked(purchaseToken, notification);
    return json(200, { ok: true });
  }

  try {
    const purchase = await verifyGoogleSubscription(purchaseToken);
    const patch = buildGoogleSubscriptionPatch(purchase);
    const result = await updateKnownGoogleSubscription(
      purchaseToken,
      patch,
      notification,
    );
    return json(200, { ok: true, result });
  } catch (error) {
    console.error('play-webhook: verification/update failed', error);
    return json(200, { ok: false, error: 'verification_or_update_failed' });
  }
});

function decodeBase64Json(data: string): PlayNotification {
  return parsePlayNotification(JSON.parse(atob(data)));
}

function parsePubSubEnvelope(value: unknown): PubSubEnvelope {
  const record = parseRecord(value);
  const message = readRecord(record, 'message');
  return {
    message: message
      ? {
          data: readString(message, 'data'),
          messageId: readString(message, 'messageId'),
          message_id: readString(message, 'message_id'),
        }
      : undefined,
    subscription: readString(record, 'subscription'),
  };
}

function parsePlayNotification(value: unknown): PlayNotification {
  const record = parseRecord(value);
  const subscriptionNotification = readRecord(record, 'subscriptionNotification');
  const voidedPurchaseNotification = readRecord(
    record,
    'voidedPurchaseNotification',
  );

  return {
    eventTimeMillis: readString(record, 'eventTimeMillis'),
    packageName: readString(record, 'packageName'),
    subscriptionNotification: subscriptionNotification
      ? {
          notificationType: readNumber(
            subscriptionNotification,
            'notificationType',
          ),
          purchaseToken: readString(subscriptionNotification, 'purchaseToken'),
          subscriptionId: readString(subscriptionNotification, 'subscriptionId'),
        }
      : undefined,
    voidedPurchaseNotification: voidedPurchaseNotification
      ? {
          orderId: readString(voidedPurchaseNotification, 'orderId'),
          productType: readNumber(voidedPurchaseNotification, 'productType'),
          purchaseToken: readString(
            voidedPurchaseNotification,
            'purchaseToken',
          ),
          refundType: readNumber(voidedPurchaseNotification, 'refundType'),
        }
      : undefined,
  };
}

async function markKnownGoogleSubscriptionRevoked(
  purchaseToken: string,
  notification: PlayNotification,
): Promise<void> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error } = await admin
    .from('google_subscriptions')
    .update({
      state: 'revoked',
      raw_last_notification: notification,
      updated_at: new Date().toISOString(),
    })
    .eq('purchase_token', purchaseToken);

  if (error) {
    console.error('play-webhook: voided purchase update failed', error);
  }
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}
