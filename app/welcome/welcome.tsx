import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { Auth } from "~/Auth";
import { NamesRanking } from "~/NamesRanking";

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

  return !session ? <Auth /> : <NamesRanking key={session.user.id} />;
}
