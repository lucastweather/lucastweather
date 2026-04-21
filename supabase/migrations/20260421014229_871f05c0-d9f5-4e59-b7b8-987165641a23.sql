
-- Subscribers table tracks active Stripe subscriptions per user
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription record
CREATE POLICY "users_view_own_subscription" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id);

-- Server-side updates only (via service role); no direct insert/update from client
CREATE POLICY "users_insert_own_subscription" ON public.subscribers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_subscription" ON public.subscribers
  FOR UPDATE USING (auth.uid() = user_id);
