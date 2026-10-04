/**
 * Date and gap formatting for the Star Trek pages, written by hand rather than
 * with `Intl`. The page is server-rendered and then hydrated, and the two sides
 * run different ICU builds (Node on the server, Safari or Chrome in the
 * browser), which disagree on details like "Sep" versus "Sept" and where the
 * comma after the weekday goes. Any such difference is a hydration error, so
 * the output is pinned here instead.
 */

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
   "Jan",
   "Feb",
   "Mar",
   "Apr",
   "May",
   "Jun",
   "Jul",
   "Aug",
   "Sep",
   "Oct",
   "Nov",
   "Dec",
];

function parseDate(date: string): {
   weekday: string;
   day: number;
   month: string;
   year: number;
} {
   const [year, month, day] = date.split("-").map(Number);
   const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
   return { weekday: weekdays[weekday], day, month: months[month - 1], year };
}

/** "5 Sep 2026" from a `YYYY-MM-DD` calendar date. */
export function formatShortDate(date: string): string {
   const { day, month, year } = parseDate(date);
   return `${day} ${month} ${year}`;
}

/** "Sat 5 Sep 2026" from a `YYYY-MM-DD` calendar date. */
export function formatAirDate(date: string): string {
   const { weekday } = parseDate(date);
   return `${weekday} ${formatShortDate(date)}`;
}

function plural(count: number, unit: string): string {
   return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** "in 3 days" / "3 days ago", with "today", "tomorrow", "next week" etc. */
function formatRelative(value: number, unit: string): string {
   if (value === 0) {
      return unit === "day" ? "today" : `this ${unit}`;
   }
   if (value === 1) return unit === "day" ? "tomorrow" : `next ${unit}`;
   if (value === -1) return unit === "day" ? "yesterday" : `last ${unit}`;
   return value > 0 ? `in ${plural(value, unit)}` : `${plural(-value, unit)} ago`;
}

/** "tomorrow", "3 days ago", "in 2 months" — coarser as the gap grows. */
export function formatGap(daysUntilAir: number): string {
   const days = Math.abs(daysUntilAir);
   if (days < 14) return formatRelative(daysUntilAir, "day");
   if (days < 60) return formatRelative(Math.round(daysUntilAir / 7), "week");
   if (days < 365) return formatRelative(Math.round(daysUntilAir / 30.44), "month");
   return formatRelative(Math.round(daysUntilAir / 365.25), "year");
}
