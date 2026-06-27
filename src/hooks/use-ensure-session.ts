import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current visitor has a Supabase session. If not, signs them in
 * anonymously — satisfies the assignment's "assume default user is logged in"
 * requirement without a full auth UI.
 */
export function useEnsureSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) {
          setUserId(data.session.user.id);
          setReady(true);
        }
        return;
      }
      const { data: signIn, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (error) {
        console.error("Anonymous sign-in failed", error);
        setReady(true);
        return;
      }
      setUserId(signIn.user?.id ?? null);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  return { userId, ready };
}
