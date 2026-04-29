-- Google Play subscriptions table.
-- Populated by verify-play-purchase and reconciled by play-webhook with the
-- service-role key. Clients can read only their own rows via RLS.

CREATE TABLE public.google_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  base_plan_id TEXT,
  offer_id TEXT,
  purchase_token TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,               -- active | expired | billing_retry | revoked
  purchase_date TIMESTAMPTZ,
  expires_date TIMESTAMPTZ NOT NULL,
  auto_renew_status BOOLEAN NOT NULL DEFAULT true,
  acknowledgement_state TEXT,
  latest_order_id TEXT,
  environment TEXT NOT NULL DEFAULT 'Production',
  raw_last_verification JSONB,
  raw_last_notification JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_google_subscriptions_user ON public.google_subscriptions(user_id);
CREATE INDEX idx_google_subscriptions_purchase_token ON public.google_subscriptions(purchase_token);

ALTER TABLE public.google_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own google subscription" ON public.google_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE intentionally have no policy: only the service-role key
-- used by Edge Functions can mutate this table.
