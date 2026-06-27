
-- Restrict participant inserts to rows the caller owns or unauth'd guests joining (display name only)
DROP POLICY IF EXISTS "Authenticated can insert participants" ON public.participants;
CREATE POLICY "User inserts self as participant"
  ON public.participants FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Lock down SECURITY DEFINER helpers from being called directly via the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_meeting_code() FROM PUBLIC, anon, authenticated;
