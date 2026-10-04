import { z } from "zod";
import { getSupabaseServerClient } from "~/supabase/supabase.server";
import { translateWish } from "~/server/translate.server";
import type { Route } from "./+types/wishlist-translate";

// Wishes are short, so a handful per call keeps the request well under a
// minute; the client calls again while some are left.
const batchSize = 10;

const PendingWishesSchema = z.array(
   z.object({ id: z.uuid(), title: z.string(), description: z.string().nullable() }),
);

/**
 * Translates wishes that don't have a translation yet. Takes no input: it only
 * works on what's pending in the database, and each pending wish is leased to
 * one run at a time, so extra or concurrent calls don't repeat paid work.
 */
export async function action({ request }: Route.ActionArgs): Promise<Response> {
   const headers = new Headers();
   const { supabase } = getSupabaseServerClient(request, headers);

   const { data, error } = await supabase.rpc("start_wish_translations", {
      p_limit: batchSize,
   });
   if (error) throw error;
   const pending = PendingWishesSchema.parse(data);

   const results = await Promise.allSettled(
      pending.map(async (wish): Promise<boolean> => {
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
         const { data: updated, error: updateError } = await update.select("id");
         if (updateError) throw updateError;
         // No row means the wish was edited or deleted meanwhile; the edit put
         // it back in the queue, so this isn't progress.
         return updated.length > 0;
      }),
   );

   let translated = 0;
   let failed = 0;
   for (const result of results) {
      if (result.status === "rejected") {
         failed++;
         console.error("Wish translation failed:", result.reason);
      } else if (result.value) {
         translated++;
      }
   }

   return Response.json({ translated, failed }, { headers });
}
