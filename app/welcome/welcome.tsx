import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Auth from "../Auth";
import Account from "../Account";
import type { Session } from "@supabase/supabase-js";

export function Welcome() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return !session ? <Auth /> : <Account key={session.user.id} />;
}
