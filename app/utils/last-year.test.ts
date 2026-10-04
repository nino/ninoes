import { expect, test } from "vitest";
import { shiftFeed, shiftPubDate } from "./last-year";

function item(title: string, pubDate: string): string {
   return `
    <item>
      <pubDate>${pubDate}</pubDate>
      <title>${title}</title>
    </item>`;
}

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Project Hail Mary</title>
    <description>Project Hail Mary by Andy Weir</description>
${item("Old", "Wed, 04 Aug 2021 18:00:00 +0000")}
${item("Recent", "Sun, 05 Jul 2026 20:46:49 +0000")}
${item("Leap", "Mon, 29 Feb 2024 12:00:00 +0000")}
  </channel>
</rss>`;

const now = new Date("2026-09-26T09:00:00Z");

test("shifts a pubDate forward one year", () => {
   expect(shiftPubDate("Wed, 04 Aug 2021 18:00:00 +0000")?.toISOString()).toBe(
      "2022-08-04T18:00:00.000Z",
   );
   // Offsets are respected, so the result is the same instant a year on.
   expect(shiftPubDate("Wed, 04 Aug 2021 19:00:00 +0100")?.toISOString()).toBe(
      "2022-08-04T18:00:00.000Z",
   );
   expect(shiftPubDate("not a date")).toBeNull();
});

test("renames the channel, shifts dates and drops items still in the future", () => {
   const out = shiftFeed(feed, now);
   expect(out).toContain("<title>Project Last Year</title>");
   expect(out).not.toContain("Project Hail Mary</title>");
   // Item titles are untouched.
   expect(out).toContain("<title>Old</title>");

   expect(out).toContain("<pubDate>Thu, 04 Aug 2022 18:00:00 +0000</pubDate>");
   // 29 Feb has no counterpart the next year, so it rolls on to 1 March.
   expect(out).toContain("<pubDate>Sat, 01 Mar 2025 12:00:00 +0000</pubDate>");
   // A year after July 2026 hasn't happened yet.
   expect(out).not.toContain("Recent");
   expect(out.match(/<item>/g)).toHaveLength(2);
});

test("keeps an item whose shifted date is exactly now", () => {
   const out = shiftFeed(feed, new Date("2027-07-05T20:46:49Z"));
   expect(out).toContain("<title>Recent</title>");
});
