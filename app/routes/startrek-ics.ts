import type { LoaderFunctionArgs } from "react-router";
import { buildCalendar } from "~/utils/startrek-ical";
import { findSeries } from "~/utils/startrek";
import { externalOrigin } from "~/utils/request";

/**
 * The delayed schedule as a subscribable calendar feed. `?series=tng` narrows
 * it to one show; without it the feed carries all five.
 */
export const loader = ({ request }: LoaderFunctionArgs): Response => {
   const url = new URL(request.url);
   const series = findSeries(url.searchParams.get("series"));
   const { origin } = externalOrigin(request);
   const body = buildCalendar(series, origin);

   return new Response(body, {
      headers: {
         "Content-Type": "text/calendar; charset=utf-8",
         "Content-Disposition": `inline; filename="star-trek-${series?.id ?? "all"}.ics"`,
         // The dates are fixed, so this can sit in a cache for a good while.
         "Cache-Control": "public, max-age=86400",
      },
   });
};
