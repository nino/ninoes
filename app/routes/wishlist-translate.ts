import { z } from "zod";
import { getSupabaseServerClient } from "~/supabase/supabase.server";
import { translateWish } from "~/server/translate.server";
import type { Route } from "./+types/wishlist-translate";

// Wishes are short, so a handful per call keeps the request well under a
// minute; the client calls again while some are left.
const batchSize = 10;

/**
 * Translates wishes that don't have a translation yet. Takes no input: it only
 * ever works on what's pending in the database, so calling it more often than
 * needed costs nothing.
 */
export async function action({ request }: Route.ActionArgs): Promise<Response> {
   const headers = new Headers();
   const { supabase } = getSupabaseServerClient(request, headers);

   const { data, error } = await supabase
      .from("wishes")
      .select("id, title, description")
      .is("language", null)
      .order("created_at", { ascending: true })
      .limit(batchSize);
   if (error) throw error;

   const pending = z
      .array(
         z.object({
            id: z.uuid(),
            title: z.string(),
            description: z.string().nullable(),
         }),
      )
      .parse(data);
   const results = await Promise.allSettled(
      pending.map(async (wish) => {
         const translation = await translateWish(wish);
         // Only write if nobody edited the wish while it was being translated.
         let update = supabase
            .from("wishes")
            .update({
               language: translation.language,
               translated_title: translation.title,
               translated_description:
                  wish.description == null ? null : translation.description,
            })
            .eq("id", wish.id)
            .eq("title", wish.title);
         update =
            wish.description == null
               ? update.is("description", null)
               : update.eq("description", wish.description);
         const { error: updateError } = await update;
         if (updateError) throw updateError;
      }),
   );

   const failures = results.filter((r) => r.status === "rejected");
   for (const failure of failures)
      console.error("Wish translation failed:", failure.reason);

   return Response.json(
      { translated: results.length - failures.length, failed: failures.length },
      { headers },
   );
}
