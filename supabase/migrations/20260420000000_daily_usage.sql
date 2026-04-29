-- Migration: 20260420000000_daily_usage
-- Description: Create public.daily_usage to track free-tier Talk-minute
--              consumption per user per day. Users with an active row in
--              public.apple_subscriptions are not rate-limited and do not
--              need a row here. Writes only from the service role (edge
--              function `check-talk-quota`); reads are RLS-scoped to the
--              row owner.
-- Safety: purely additive — creates a brand new table that does not exist
--         anywhere else in the schema. No existing data or tables are
--         modified. Idempotent via IF NOT EXISTS / DROP POLICY IF EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

-- The composite PRIMARY KEY (user_id, date) already creates a btree index
-- that satisfies the `eq('user_id').eq('date')` lookup used by the edge
-- function; no additional index needed for v1.

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT. INSERT / UPDATE / DELETE are performed by the edge
-- function with the service-role key, which bypasses RLS — no client-facing
-- write policies are defined.
DROP POLICY IF EXISTS "read own daily usage" ON public.daily_usage;
CREATE POLICY "read own daily usage" ON public.daily_usage
  FOR SELECT USING (user_id = auth.uid());

COMMIT;
