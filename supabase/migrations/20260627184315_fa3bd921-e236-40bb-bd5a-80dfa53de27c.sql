DROP POLICY IF EXISTS "Anyone authenticated can read profiles" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);