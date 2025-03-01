import type { ReactNode } from "react";
import { type ActionFunctionArgs, redirect } from "react-router";
import { getSupabaseServerClient } from "~/supabase/supabase.server";

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<Response> => {
  const headersToSet = new Headers();
  const { supabase, headers } = getSupabaseServerClient(request, headersToSet);
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
  }

  return redirect("/", {
    headers,
  });
};

export default function Logout(): ReactNode {
  return <div>Logging out...</div>;
}
