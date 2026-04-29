import { createClient } from 'npm:@supabase/supabase-js@2';

const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

export type PlaySubscriptionState =
  | 'active'
  | 'expired'
  | 'billing_retry'
  | 'revoked';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type PlayLineItem = {
  productId?: string;
  expiryTime?: string;
  offerDetails?: {
    basePlanId?: string;
    offerId?: string;
  };
  autoRenewingPlan?: {
    autoRenewEnabled?: boolean;
  };
};

export type PlaySubscriptionPurchase = {
  acknowledgementState?: string;
  latestOrderId?: string;
  lineItems?: PlayLineItem[];
  regionCode?: string;
  startTime?: string;
  subscriptionState?: string;
  testPurchase?: Record<string, unknown>;
};

export type GoogleSubscriptionPatch = {
  product_id: string;
  base_plan_id: string | null;
  offer_id: string | null;
  state: PlaySubscriptionState;
  purchase_date: string | null;
  expires_date: string;
  auto_renew_status: boolean;
  acknowledgement_state: string | null;
  latest_order_id: string | null;
  environment: 'Sandbox' | 'Production';
  raw_last_verification: PlaySubscriptionPurchase;
  updated_at: string;
};

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

export function getPackageName(): string {
  const packageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');
  if (!packageName) {
    throw new Error('Missing GOOGLE_PLAY_PACKAGE_NAME');
  }
  return packageName;
}

export async function verifyGoogleSubscription(
  purchaseToken: string,
): Promise<PlaySubscriptionPurchase> {
  const packageName = getPackageName();
  const accessToken = await getAccessToken();
  const url = `${API_BASE}/applications/${encodeURIComponent(
    packageName,
  )}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Play verify failed: ${response.status} ${body}`);
  }

  return parsePlaySubscriptionPurchase(await response.json());
}

export async function acknowledgeGoogleSubscription(
  productId: string,
  purchaseToken: string,
): Promise<void> {
  const packageName = getPackageName();
  const accessToken = await getAccessToken();
  const url = `${API_BASE}/applications/${encodeURIComponent(
    packageName,
  )}/purchases/subscriptions/${encodeURIComponent(
    productId,
  )}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!response.ok && response.status !== 409) {
    const body = await response.text();
    throw new Error(`Google Play acknowledge failed: ${response.status} ${body}`);
  }
}

export function buildGoogleSubscriptionPatch(
  purchase: PlaySubscriptionPurchase,
): GoogleSubscriptionPatch {
  const lineItem = pickCurrentLineItem(purchase);
  const productId = lineItem.productId;
  const expiresDate = lineItem.expiryTime;
  if (!productId || !expiresDate) {
    throw new Error('Google Play purchase missing productId or expiryTime');
  }

  return {
    product_id: productId,
    base_plan_id: lineItem.offerDetails?.basePlanId ?? null,
    offer_id: lineItem.offerDetails?.offerId ?? null,
    state: mapGoogleSubscriptionState(purchase.subscriptionState, expiresDate),
    purchase_date: purchase.startTime ?? null,
    expires_date: expiresDate,
    auto_renew_status: lineItem.autoRenewingPlan?.autoRenewEnabled ?? true,
    acknowledgement_state: purchase.acknowledgementState ?? null,
    latest_order_id: purchase.latestOrderId ?? null,
    environment: purchase.testPurchase ? 'Sandbox' : 'Production',
    raw_last_verification: purchase,
    updated_at: new Date().toISOString(),
  };
}

export async function updateKnownGoogleSubscription(
  purchaseToken: string,
  patch: GoogleSubscriptionPatch,
  rawLastNotification?: unknown,
): Promise<'updated' | 'unknown'> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: existing, error: selectError } = await admin
    .from('google_subscriptions')
    .select('id')
    .eq('purchase_token', purchaseToken)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }
  if (!existing) {
    return 'unknown';
  }

  const update =
    rawLastNotification === undefined
      ? patch
      : { ...patch, raw_last_notification: rawLastNotification };
  const { error: updateError } = await admin
    .from('google_subscriptions')
    .update(update)
    .eq('id', existing.id);
  if (updateError) {
    throw updateError;
  }

  return 'updated';
}

export function isAcknowledgementPending(
  purchase: PlaySubscriptionPurchase,
): boolean {
  return purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING';
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const serviceAccount = getServiceAccount();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    {
      alg: 'RS256',
      typ: 'JWT',
    },
    {
      aud: serviceAccount.token_uri ?? TOKEN_URL,
      exp: nowSeconds + 3600,
      iat: nowSeconds,
      iss: serviceAccount.client_email,
      scope: ANDROID_PUBLISHER_SCOPE,
    },
    serviceAccount.private_key,
  );

  const response = await fetch(serviceAccount.token_uri ?? TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google OAuth token failed: ${response.status} ${body}`);
  }

  const token = parseTokenResponse(await response.json());
  cachedAccessToken = {
    token: token.access_token,
    expiresAtMs: Date.now() + token.expires_in * 1000,
  };
  return token.access_token;
}

function getServiceAccount(): ServiceAccount {
  const encoded = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64');
  if (!encoded) {
    throw new Error('Missing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64');
  }
  const parsed = parseRecord(JSON.parse(atob(encoded)));
  const clientEmail = readString(parsed, 'client_email');
  const privateKey = readString(parsed, 'private_key');
  if (!clientEmail || !privateKey) {
    throw new Error('Google service account JSON missing client_email/private_key');
  }
  return {
    client_email: clientEmail,
    private_key: privateKey,
    token_uri: readString(parsed, 'token_uri') ?? TOKEN_URL,
  };
}

async function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const keyData = pemToArrayBuffer(privateKeyPem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`;
}

function pickCurrentLineItem(purchase: PlaySubscriptionPurchase): PlayLineItem {
  const lineItems = purchase.lineItems ?? [];
  const sorted = [...lineItems].sort(
    (a, b) =>
      new Date(b.expiryTime ?? 0).getTime() -
      new Date(a.expiryTime ?? 0).getTime(),
  );
  return sorted[0] ?? {};
}

function mapGoogleSubscriptionState(
  subscriptionState: string | undefined,
  expiresDate: string,
): PlaySubscriptionState {
  if (new Date(expiresDate).getTime() <= Date.now()) {
    return 'expired';
  }

  switch (subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_CANCELED':
      return 'active';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PENDING':
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'billing_retry';
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired';
    default:
      return 'billing_retry';
  }
}

function parsePlaySubscriptionPurchase(value: unknown): PlaySubscriptionPurchase {
  const record = parseRecord(value);
  const rawLineItems = readArray(record, 'lineItems') ?? [];
  return {
    acknowledgementState: readString(record, 'acknowledgementState'),
    latestOrderId: readString(record, 'latestOrderId'),
    lineItems: rawLineItems.map(parseLineItem),
    regionCode: readString(record, 'regionCode'),
    startTime: readString(record, 'startTime'),
    subscriptionState: readString(record, 'subscriptionState'),
    testPurchase: readRecord(record, 'testPurchase') ?? undefined,
  };
}

function parseLineItem(value: unknown): PlayLineItem {
  const record = parseRecord(value);
  const offerDetails = readRecord(record, 'offerDetails');
  const autoRenewingPlan = readRecord(record, 'autoRenewingPlan');
  return {
    productId: readString(record, 'productId'),
    expiryTime: readString(record, 'expiryTime'),
    offerDetails: offerDetails
      ? {
          basePlanId: readString(offerDetails, 'basePlanId'),
          offerId: readString(offerDetails, 'offerId'),
        }
      : undefined,
    autoRenewingPlan: autoRenewingPlan
      ? { autoRenewEnabled: readBoolean(autoRenewingPlan, 'autoRenewEnabled') }
      : undefined,
  };
}

function parseTokenResponse(value: unknown): GoogleTokenResponse {
  const record = parseRecord(value);
  const accessToken = readString(record, 'access_token');
  const expiresIn = readNumber(record, 'expires_in');
  const tokenType = readString(record, 'token_type');
  if (!accessToken || !expiresIn || !tokenType) {
    throw new Error('Invalid Google OAuth token response');
  }
  return {
    access_token: accessToken,
    expires_in: expiresIn,
    token_type: tokenType,
  };
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

function readArray(record: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = record[key];
  return Array.isArray(value) ? value : undefined;
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

function readBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function base64UrlJson(value: Record<string, unknown>): string {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
