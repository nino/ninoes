/**
 * The /startrek schedule as an iCalendar feed (RFC 5545), so the delayed
 * broadcast dates can be subscribed to in a normal calendar app.
 *
 * Every air date is fixed, so the feed never actually changes — subscribing
 * once is enough. The refresh hints are there only for well-behaved clients.
 */
import {
   addDays,
   allSeries,
   delayedAirDate,
   episodeCode,
   type Series,
} from "./startrek";

/** Identifies events from this feed; also the UID namespace. */
const domain = "startrek.ninoes";

/** Escapes a value for an iCalendar TEXT property (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
   return value
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
}

/**
 * Folds a content line to 75 octets (RFC 5545 §3.1), continuing with a leading
 * space. Measured in UTF-8 bytes, never splitting a character, because episode
 * titles carry accents.
 */
export function foldLine(line: string): string {
   const encoder = new TextEncoder();
   if (encoder.encode(line).length <= 75) return line;

   const parts: Array<string> = [];
   let current = "";
   let used = 0;
   let budget = 75;
   // Iterating the string yields whole code points, so a character is never cut
   // in half; surrogate pairs stay together.
   for (const char of line) {
      const size = encoder.encode(char).length;
      if (used + size > budget) {
         parts.push(current);
         current = char;
         used = size;
         budget = 74; // The continuation's leading space takes one octet.
      } else {
         current += char;
         used += size;
      }
   }
   parts.push(current);
   return parts.join("\r\n ");
}

function formatDate(date: string): string {
   return date.replace(/-/g, "");
}

function formatTimestamp(now: Date): string {
   return `${now.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

const humanDate = new Intl.DateTimeFormat("en-GB", {
   day: "numeric",
   month: "long",
   year: "numeric",
   timeZone: "UTC",
});

function events(series: Series, dtstamp: string, pageUrl: string): Array<string> {
   return series.episodes.map((episode) => {
      const airDate = delayedAirDate(episode.originalAirDate, series.delayYears);
      const original = humanDate.format(
         new Date(`${episode.originalAirDate}T00:00:00Z`),
      );
      const description = [
         `${series.fullName}, season ${episode.season}.`,
         `Originally broadcast ${original}, ${series.delayYears} years earlier.`,
      ].join(" ");

      return [
         "BEGIN:VEVENT",
         `UID:${episode.key}@${domain}`,
         `DTSTAMP:${dtstamp}`,
         // An all-day event: DTEND is exclusive, so it is the following day.
         `DTSTART;VALUE=DATE:${formatDate(airDate)}`,
         `DTEND;VALUE=DATE:${formatDate(addDays(airDate, 1))}`,
         `SUMMARY:${escapeText(`${series.shortName} ${episodeCode(episode)} · ${episode.title}`)}`,
         `DESCRIPTION:${escapeText(description)}`,
         `URL:${escapeText(pageUrl)}`,
         // The episode marks a date, it does not occupy the day.
         "TRANSP:TRANSPARENT",
         "END:VEVENT",
      ].join("\r\n");
   });
}

/**
 * Builds the feed for one series, or for all of them when `series` is null.
 * `origin` is the site's base URL, used for the links back to the page.
 */
export function buildCalendar(
   series: Series | null,
   origin: string,
   now: Date = new Date(),
): string {
   const included = series === null ? allSeries : [series];
   // X-WR-CALNAME and X-WR-CALDESC are non-standard, and clients disagree about
   // whether to unescape them — a comma can surface as a literal "\,". Keeping
   // these two values free of commas and semicolons sidesteps that entirely.
   const name =
      series === null
         ? "Star Trek (delayed)"
         : `${series.fullName} (${series.delayYears} years delayed)`;
   const description =
      series === null
         ? "Every Star Trek episode on its delayed anniversary. TOS is 60 years delayed. Everything else is 45."
         : `Every episode of ${series.fullName} — ${series.delayYears} years delayed.`;

   const dtstamp = formatTimestamp(now);
   const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${domain}//Star Trek delayed schedule//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeText(name)}`,
      `X-WR-CALDESC:${escapeText(description)}`,
      // The dates never move, so a daily poll is more than enough.
      "REFRESH-INTERVAL;VALUE=DURATION:P1D",
      "X-PUBLISHED-TTL:P1D",
      ...included.flatMap((entry) =>
         events(entry, dtstamp, `${origin}/startrek?series=${entry.id}`),
      ),
      "END:VCALENDAR",
   ];

   // Fold every content line, then terminate each with CRLF as the spec requires.
   return (
      lines
         .flatMap((line) => line.split("\r\n"))
         .map(foldLine)
         .join("\r\n") + "\r\n"
   );
}
