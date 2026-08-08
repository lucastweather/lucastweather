REVOKE EXECUTE ON FUNCTION public.increment_api_usage(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_api_usage(text) TO service_role;

CREATE POLICY "Subscribers cannot be inserted by clients"
  ON public.subscribers FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Subscribers cannot be updated by clients"
  ON public.subscribers FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Subscribers cannot be deleted by clients"
  ON public.subscribers FOR DELETE TO anon, authenticated USING (false);