/**
 * A "days since" calendar feed: one all-day event every `interval` days after a
 * start date, each titled "N days since <title>". Ported from nino-api2's
 * /calendar endpoint.
 */
import { z } from "zod";
import { addDays } from "./startrek";
import { escapeText, foldLine } from "./startrek-ical";

/** How many intervals past the start date the feed covers. */
const intervalCount = 100;

const domain = "days-since.ninoes";

/**
 * Bounds that keep every event a four-digit year: `addDays` goes through
 * `Date.UTC`, which reads years 0–99 as 1900–1999, and iCalendar dates are
 * exactly eight digits. 100 intervals of ten years from 2999 still ends before
 * 10000.
 */
const maxInterval = 3650;
const minYear = 1000;
const maxYear = 2999;

export const calendarParamsSchema = z.object({
   title: z.string().trim().min(1, "title can't be blank"),
   start_date: z.iso.date("start_date must be a date like 2024-01-31").refine((date) => {
      const year = Number(date.slice(0, 4));
      return year >= minYear && year <= maxYear;
   }, `start_date must be between ${minYear} and ${maxYear}`),
   interval: z.coerce
      .number("interval must be a number")
      .int("interval must be a whole number")
      .min(1, "interval must be at least 1")
      .max(maxInterval, `interval must be at most ${maxInterval}`),
});

export type CalendarParams = z.infer<typeof calendarParamsSchema>;

/**
 * Validates the query string. Returns the parsed params, or a single message
 * listing every problem.
 */
export function parseCalendarParams(
   searchParams: URLSearchParams,
): { ok: true; params: CalendarParams } | { ok: false; error: string } {
   const fields = ["title", "start_date", "interval"] as const;
   const missing = fields.filter((field) => !searchParams.has(field));
   if (missing.length > 0) {
      return {
         ok: false,
         error: missing.map((field) => `${field} is required`).join(", "),
      };
   }

   const result = calendarParamsSchema.safeParse(
      Object.fromEntries(fields.map((field) => [field, searchParams.get(field)])),
   );
   if (result.success) return { ok: true, params: result.data };
   return {
      ok: false,
      error: result.error.issues.map((issue) => issue.message).join(", "),
   };
}

/** FNV-1a, so UIDs stay stable per title without putting the title itself in them. */
function hash(value: string): string {
   let h = 0x811c9dc5;
   for (const byte of new TextEncoder().encode(value)) {
      h ^= byte;
      h = Math.imul(h, 0x01000193);
   }
   return (h >>> 0).toString(16).padStart(8, "0");
}

function formatTimestamp(now: Date): string {
   return `${now.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

export function buildDaysSinceCalendar(
   { title, start_date: startDate, interval }: CalendarParams,
   now: Date = new Date(),
): string {
   const dtstamp = formatTimestamp(now);
   const uidPrefix = `${startDate}-${hash(title)}`;

   const events = Array.from({ length: intervalCount + 1 }, (_, factor) => {
      const days = factor * interval;
      const date = addDays(startDate, days);
      return [
         "BEGIN:VEVENT",
         `UID:${uidPrefix}-${days}@${domain}`,
         `DTSTAMP:${dtstamp}`,
         // An all-day event: DTEND is exclusive, so it is the following day.
         `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
         `DTEND;VALUE=DATE:${addDays(date, 1).replace(/-/g, "")}`,
         `SUMMARY:${escapeText(`${days} ${days === 1 ? "day" : "days"} since ${title}`)}`,
         "TRANSP:TRANSPARENT",
         "END:VEVENT",
      ].join("\r\n");
   });

   const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${domain}//Days since//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
   ];

   return (
      lines
         .flatMap((line) => line.split("\r\n"))
         .map(foldLine)
         .join("\r\n") + "\r\n"
   );
}
