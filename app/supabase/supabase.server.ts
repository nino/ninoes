import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { env } from "~/env";
import type { SupabaseClient } from "@supabase/supabase-js";

export const getSupabaseServerClient = (
  request: Request,
  headers: Headers,
): {
  supabase: SupabaseClient;
  headers: Headers;
} => {
  const supabase = createServerClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
            ({ name, value }) => ({ name, value: value ?? "" }),
          );
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            );
          }
        },
      },
    },
  );
  return { supabase, headers };
};
