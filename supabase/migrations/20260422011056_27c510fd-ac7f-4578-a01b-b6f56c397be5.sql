
-- API keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Default',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  monthly_limit INTEGER NOT NULL DEFAULT 20,
  monthly_usage INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api keys"
ON public.api_keys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own api keys"
ON public.api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users revoke own api keys"
ON public.api_keys FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own api keys"
ON public.api_keys FOR DELETE
USING (auth.uid() = user_id);

-- Usage log (lightweight)
CREATE TABLE public.api_usage_log (
  id BIGSERIAL PRIMARY KEY,
  key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_usage_key_time ON public.api_usage_log(key_id, created_at DESC);

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api usage"
ON public.api_usage_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.api_keys k
    WHERE k.id = api_usage_log.key_id AND k.user_id = auth.uid()
  )
);

-- Atomically increment usage; reset window if new month
CREATE OR REPLACE FUNCTION public.increment_api_usage(_key_hash TEXT)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, key_id UUID, user_id UUID, monthly_limit INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k RECORD;
  current_period TIMESTAMPTZ := date_trunc('month', now());
BEGIN
  SELECT * INTO k FROM public.api_keys
   WHERE key_hash = _key_hash AND revoked_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, NULL::UUID, 0;
    RETURN;
  END IF;

  -- Roll the window if month changed
  IF k.period_start < current_period THEN
    UPDATE public.api_keys
       SET period_start = current_period, monthly_usage = 0
     WHERE id = k.id;
    k.monthly_usage := 0;
  END IF;

  IF k.monthly_usage >= k.monthly_limit THEN
    RETURN QUERY SELECT FALSE, 0, k.id, k.user_id, k.monthly_limit;
    RETURN;
  END IF;

  UPDATE public.api_keys
     SET monthly_usage = monthly_usage + 1,
         last_used_at  = now()
   WHERE id = k.id;

  RETURN QUERY SELECT TRUE, (k.monthly_limit - (k.monthly_usage + 1)), k.id, k.user_id, k.monthly_limit;
END;
$$;
