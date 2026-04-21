-- Favorites table for premium users to save cities and webcams
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('city', 'camera')),
  ref_id TEXT NOT NULL,
  -- denormalized display fields so we don't need a join to render
  name TEXT NOT NULL,
  subtitle TEXT,
  -- city-only fields
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  country TEXT,
  country_code TEXT,
  admin1 TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_favorites_user_kind ON public.favorites (user_id, kind);
