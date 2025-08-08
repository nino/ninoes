import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type UseSessionReturn = {
   session: Session | null;
   isLoading: boolean;
   supabase: SupabaseClient;
};

export function useSession(): UseSessionReturn {
   const [session, setSession] = React.useState<Session | null>(null);
   const [isLoading, setIsLoading] = React.useState(true);
   const [supabase] = React.useState(() =>
      createBrowserClient(
         import.meta.env.VITE_SUPABASE_URL,
         import.meta.env.VITE_SUPABASE_ANON_KEY,
      ),
   );

   React.useEffect(() => {
      const getSession = async (): Promise<void> => {
         try {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
         } catch (error) {
            console.error("Error getting session:", error);
         } finally {
            setIsLoading(false);
         }
      };

      void getSession();

      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         setSession(session);
         setIsLoading(false);
      });

      return () => subscription.unsubscribe();
   }, [supabase]);

   return React.useMemo(
      () => ({
         session,
         isLoading,
         supabase,
      }),
      [isLoading, session, supabase],
   );
}
