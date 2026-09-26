import { shiftFeed, sourceFeedUrl } from "~/utils/last-year";

/** `/last-year` — the podcast feed, a year late. Moved here from nino-api. */
export const loader = async (): Promise<Response> => {
   const response = await fetch(sourceFeedUrl);
   if (!response.ok) {
      return new Response("Failed to fetch feed.", { status: 502 });
   }

   return new Response(shiftFeed(await response.text()), {
      headers: {
         "Content-Type": "application/rss+xml; charset=utf-8",
         "Cache-Control": "public, max-age=3600",
      },
   });
};
