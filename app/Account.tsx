import { supabase } from "./supabaseClient";
import { Button } from "./components/Button";

export default function Account() {
  return (
    <Button type="button" onClick={() => supabase.auth.signOut()}>
      Sign Out
    </Button>
  );
}
