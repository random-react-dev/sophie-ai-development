-- Apple In-App Purchase subscriptions table.
-- Populated by the `verify-purchase` and `apple-webhook` Edge Functions
-- using the service-role key. Clients can read only their own rows via RLS.
--
-- Named `apple_subscriptions` (not `subscriptions`) to avoid collision with
-- a pre-existing legacy Stripe `subscriptions` table in the same schema.

CREATE TABLE public.apple_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  original_transaction_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,               -- active | expired | billing_retry | revoked
  purchase_date TIMESTAMPTZ NOT NULL,
  expires_date TIMESTAMPTZ NOT NULL,
  auto_renew_status BOOLEAN NOT NULL DEFAULT true,
  environment TEXT NOT NULL,         -- Sandbox | Production
  raw_last_notification JSONB,       -- debug trail, optional
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apple_subscriptions_user ON public.apple_subscriptions(user_id);

ALTER TABLE public.apple_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may read their own subscription rows.
CREATE POLICY "read own apple subscription" ON public.apple_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE intentionally have no policy: only the
-- service-role key (used by Edge Functions) can mutate this table.
