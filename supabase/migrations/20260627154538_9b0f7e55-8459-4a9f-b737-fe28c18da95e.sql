
-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Guest',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ meetings ============
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_instant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX meetings_host_id_idx ON public.meetings(host_id);
CREATE INDEX meetings_start_time_idx ON public.meetings(start_time);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can look up any meeting (needed for join-by-code).
CREATE POLICY "Authenticated can read meetings"
  ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Host inserts meetings"
  ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates own meetings"
  ON public.meetings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host deletes own meetings"
  ON public.meetings FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============ participants ============
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ
);
CREATE INDEX participants_meeting_id_idx ON public.participants(meeting_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read participants"
  ON public.participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert participants"
  ON public.participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Self updates own participant row"
  ON public.participants FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ enable realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;

-- ============ short code generator ============
CREATE OR REPLACE FUNCTION public.generate_meeting_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  digits TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..10 LOOP
    digits := digits || floor(random() * 10)::int::text;
    IF i = 3 OR i = 7 THEN
      digits := digits || ' ';
    END IF;
  END LOOP;
  RETURN digits;
END;
$$;

-- ============ new user handler: create profile + seed meetings ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Guest ' || substr(NEW.id::text, 1, 4)
  );

  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, display_name, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Seed upcoming meetings
  INSERT INTO public.meetings (meeting_code, title, description, start_time, duration_minutes, host_id, is_instant)
  VALUES
    (public.generate_meeting_code(), 'Weekly Team Standup', 'Sync on sprint progress and blockers.', now() + interval '2 hours', 30, NEW.id, false),
    (public.generate_meeting_code(), 'Product Design Review', 'Walk through Q3 dashboard mockups.', now() + interval '1 day', 45, NEW.id, false),
    (public.generate_meeting_code(), '1:1 with Sam', 'Career check-in.', now() + interval '3 days', 30, NEW.id, false);

  -- Seed recent meetings
  INSERT INTO public.meetings (meeting_code, title, description, start_time, duration_minutes, host_id, is_instant)
  VALUES
    (public.generate_meeting_code(), 'Customer Discovery Call', 'Interview with Acme Co.', now() - interval '1 day', 30, NEW.id, false),
    (public.generate_meeting_code(), 'Engineering All-Hands', 'Roadmap updates.', now() - interval '3 days', 60, NEW.id, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
