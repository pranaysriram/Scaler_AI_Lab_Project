-- Fix critical security finding: restrict participants SELECT to hosts and existing participants
DROP POLICY IF EXISTS "Authenticated can read participants" ON public.participants;

CREATE POLICY "Host can read participants"
  ON public.participants FOR SELECT TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE host_id = auth.uid()
    )
  );

CREATE POLICY "Self can read own participant rows"
  ON public.participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());