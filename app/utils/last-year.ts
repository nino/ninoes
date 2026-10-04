/**
 * "Project Last Year": the Project Hail Mary audiobook feed, replayed exactly
 * one year late. Every episode's pubDate moves forward a year, and episodes
 * whose new date is still in the future are left out. Ported from nino-api's
 * /last-year endpoint.
 */

export const sourceFeedUrl = "https://ninoan.com/audio/project-hail-mary.xml";

export const feedTitle = "Project Last Year";

/** RFC 822 date, as RSS uses, e.g. "Thu, 04 Aug 2022 18:00:00 +0000". */
function formatRfc822(date: Date): string {
   return date.toUTCString().replace(/GMT$/, "+0000");
}

/** The pubDate a year on, or null when the original can't be parsed. */
export function shiftPubDate(pubDate: string): Date | null {
   const ms = Date.parse(pubDate);
   if (Number.isNaN(ms)) return null;
   const shifted = new Date(ms);
   shifted.setUTCFullYear(shifted.getUTCFullYear() + 1);
   return shifted;
}

export function shiftFeed(xml: string, now: Date = new Date()): string {
   const retitled = xml.replace(
      /(<channel>[\s\S]*?<title>)[\s\S]*?(<\/title>)/,
      `$1${feedTitle}$2`,
   );

   // Taking the whitespace before each item lets a dropped item vanish cleanly.
   return retitled.replace(/\s*<item>[\s\S]*?<\/item>/g, (item) => {
      const match = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(item);
      if (match === null) return item;
      const shifted = shiftPubDate(match[1].trim());
      if (shifted === null) return item;
      if (shifted.getTime() > now.getTime()) return "";
      return item.replace(match[0], `<pubDate>${formatRfc822(shifted)}</pubDate>`);
   });
}
