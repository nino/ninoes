import { z } from "zod";

export const env = z
   .object({
      VITE_SUPABASE_URL: z.string(),
      VITE_SUPABASE_ANON_KEY: z.string(),
   })
   .parse(import.meta.env);
