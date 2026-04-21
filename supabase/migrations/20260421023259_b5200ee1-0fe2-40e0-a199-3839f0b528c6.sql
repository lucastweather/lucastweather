DROP POLICY IF EXISTS "users_insert_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_update_own_subscription" ON public.subscribers;

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_user_id_unique_idx
ON public.subscribers (user_id);