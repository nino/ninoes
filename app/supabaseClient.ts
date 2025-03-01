import { createBrowserClient } from "@supabase/ssr";
import { env } from "./env";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
