import { expect, test } from "vitest";
import { buildCalendar, escapeText, foldLine } from "./startrek-ical";
import { allSeries, findSeries, type Series } from "./startrek";

function series(id: string): Series {
   const found = findSeries(id);
   if (found === null) throw new Error(`no such series: ${id}`);
   return found;
}

const origin = "https://ninoes.fly.dev";
const now = new Date("2026-08-28T09:00:00Z");

function lines(ics: string): Array<string> {
   return ics.split("\r\n");
}

/** Rejoins folded lines, the way a calendar client would. */
function unfold(ics: string): Array<string> {
   const out: Array<string> = [];
   for (const line of lines(ics)) {
      if (line.startsWith(" ") && out.length > 0) {
         out[out.length - 1] += line.slice(1);
      } else {
         out.push(line);
      }
   }
   return out;
}

test("escapes the characters RFC 5545 reserves in TEXT values", () => {
   expect(escapeText("a,b")).toBe("a\\,b");
   expect(escapeText("a;b")).toBe("a\\;b");
   expect(escapeText("a\\b")).toBe("a\\\\b");
   expect(escapeText("a\nb")).toBe("a\\nb");
   // Backslashes are escaped first, so an escape is never double-applied.
   expect(escapeText("a\\,b")).toBe("a\\\\\\,b");
   // Colons are legal unescaped inside a TEXT value.
   expect(escapeText("Star Trek: Voyager")).toBe("Star Trek: Voyager");
});

/** Reverses foldLine: drop the single space that begins each continuation. */
function unfoldLine(folded: string): string {
   return folded
      .split("\r\n")
      .map((part, index) => (index === 0 ? part : part.slice(1)))
      .join("");
}

test("folds long lines to 75 octets, counting bytes not characters", () => {
   expect(foldLine("short")).toBe("short");

   const long = "SUMMARY:" + "x".repeat(200);
   const parts = foldLine(long).split("\r\n");
   expect(parts.length).toBeGreaterThan(1);
   for (const [index, part] of parts.entries()) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
      if (index > 0) expect(part.startsWith(" ")).toBe(true);
   }
   expect(unfoldLine(foldLine(long))).toBe(long);
});

test("never splits a multi-byte character when folding", () => {
   // Each "é" is two octets, so the fold boundary lands mid-character unless
   // the width is measured in bytes.
   const line = "SUMMARY:" + "é".repeat(80);
   const folded = foldLine(line);
   for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
   }
   expect(unfoldLine(folded)).toBe(line);
   expect(folded).not.toContain("�");
});

test("wraps the feed in a valid VCALENDAR", () => {
   const ics = buildCalendar(null, origin, now);
   const unfolded = unfold(ics);
   expect(unfolded[0]).toBe("BEGIN:VCALENDAR");
   expect(unfolded).toContain("VERSION:2.0");
   expect(unfolded).toContain("CALSCALE:GREGORIAN");
   expect(unfolded).toContain("X-WR-CALNAME:Star Trek (delayed)");
   // A trailing CRLF closes the final line, so the last entry is empty.
   expect(unfolded.at(-1)).toBe("");
   expect(unfolded.at(-2)).toBe("END:VCALENDAR");
   expect(ics.endsWith("\r\n")).toBe(true);
});

test("uses CRLF throughout, with no bare newlines", () => {
   const ics = buildCalendar(series("ent"), origin, now);
   expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
});

test("carries one event per broadcast, balanced and uniquely identified", () => {
   const ics = buildCalendar(null, origin, now);
   const unfolded = unfold(ics);
   const begins = unfolded.filter((line) => line === "BEGIN:VEVENT");
   const ends = unfolded.filter((line) => line === "END:VEVENT");
   const total = allSeries.reduce((n, s) => n + s.episodes.length, 0);
   expect(begins).toHaveLength(total);
   expect(ends).toHaveLength(total);

   const uids = unfolded.filter((line) => line.startsWith("UID:"));
   expect(uids).toHaveLength(total);
   expect(new Set(uids).size).toBe(total);
});

test("narrows to a single series when one is given", () => {
   const ics = buildCalendar(series("tos"), origin, now);
   const unfolded = unfold(ics);
   expect(unfolded.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(79);
   expect(unfolded).toContain(
      "X-WR-CALNAME:Star Trek: The Original Series (60 years delayed)",
   );
   expect(unfolded.some((line) => line.includes("TNG "))).toBe(false);
});

test("puts the premiere on its delayed date as a one-day all-day event", () => {
   const unfolded = unfold(buildCalendar(series("tos"), origin, now));
   const start = unfolded.indexOf("BEGIN:VEVENT");
   const event = unfolded.slice(start, unfolded.indexOf("END:VEVENT") + 1);

   expect(event).toContain("UID:tos-1-1@startrek.ninoes");
   expect(event).toContain("DTSTAMP:20260828T090000Z");
   expect(event).toContain("DTSTART;VALUE=DATE:20260908");
   // DTEND is exclusive, so a single-day event ends the next morning.
   expect(event).toContain("DTEND;VALUE=DATE:20260909");
   expect(event).toContain("SUMMARY:TOS S1E01 · The Man Trap");
   expect(event).toContain("TRANSP:TRANSPARENT");
   expect(event).toContain("URL:https://ninoes.fly.dev/startrek?series=tos");
   expect(
      event.some((line) => line.includes("Originally broadcast 8 September 1966")),
   ).toBe(true);
});

test("labels a double-length broadcast with its span", () => {
   const unfolded = unfold(buildCalendar(series("tng"), origin, now));
   expect(unfolded).toContain("SUMMARY:TNG S1E01–02 · Encounter at Farpoint");
   expect(unfolded).toContain("SUMMARY:TNG S7E25–26 · All Good Things...");
});

test("keeps accented titles intact through folding and escaping", () => {
   const unfolded = unfold(buildCalendar(series("tng"), origin, now));
   expect(unfolded).toContain("SUMMARY:TNG S3E13 · Déjà Q");
   expect(unfolded).toContain("SUMMARY:TNG S3E24 · Ménage à Troi");
});

test("escapes a title containing a comma", () => {
   const unfolded = unfold(buildCalendar(series("tng"), origin, now));
   expect(unfolded).toContain("SUMMARY:TNG S4E07 · Reunion");
   // "Chain of Command, Part I" has a comma, which must be escaped.
   expect(unfolded).toContain("SUMMARY:TNG S6E10 · Chain of Command\\, Part I");
});

test("keeps the non-standard X-WR values free of escaping", () => {
   // Clients disagree about unescaping these, so they must need no escaping.
   for (const target of [null, ...allSeries]) {
      for (const line of unfold(buildCalendar(target, origin, now))) {
         if (line.startsWith("X-WR-")) {
            const value = line.slice(line.indexOf(":") + 1);
            expect(value).not.toContain("\\");
            expect(escapeText(value)).toBe(value);
         }
      }
   }
});
