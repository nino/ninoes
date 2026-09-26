import type { LoaderFunctionArgs } from "react-router";
import { buildDaysSinceCalendar, parseCalendarParams } from "~/utils/days-since-ical";

/**
 * `/calendar?title=…&start_date=YYYY-MM-DD&interval=N` — a "days since" feed
 * with an event every `interval` days. Moved here from nino-api2.
 */
export const loader = ({ request }: LoaderFunctionArgs): Response => {
   const parsed = parseCalendarParams(new URL(request.url).searchParams);
   if (!parsed.ok) {
      return Response.json({ errors: parsed.error }, { status: 400 });
   }

   return new Response(buildDaysSinceCalendar(parsed.params), {
      headers: {
         "Content-Type": "text/calendar; charset=utf-8",
         "Cache-Control": "public, max-age=86400",
      },
   });
};
