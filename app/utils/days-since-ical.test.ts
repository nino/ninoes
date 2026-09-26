import { expect, test } from "vitest";
import { buildDaysSinceCalendar, parseCalendarParams } from "./days-since-ical";

const now = new Date("2026-09-26T09:00:00Z");

function params(query: string): URLSearchParams {
   return new URLSearchParams(query);
}

test("accepts a valid query", () => {
   expect(
      parseCalendarParams(params("title=Moving+in&start_date=2024-02-01&interval=7")),
   ).toEqual({
      ok: true,
      params: { title: "Moving in", start_date: "2024-02-01", interval: 7 },
   });
});

test("reports every missing param", () => {
   expect(parseCalendarParams(params(""))).toEqual({
      ok: false,
      error: "title is required, start_date is required, interval is required",
   });
});

test("rejects bad values", () => {
   const result = parseCalendarParams(
      params("title=+&start_date=2024-02-30&interval=0"),
   );
   expect(result.ok).toBe(false);
   if (result.ok) return;
   expect(result.error).toContain("title can't be blank");
   expect(result.error).toContain("start_date must be a date");
   expect(result.error).toContain("interval must be at least 1");
   expect(
      parseCalendarParams(params("title=x&start_date=2024-02-01&interval=1.5")).ok,
   ).toBe(false);
});

test("builds 101 all-day events, one per interval", () => {
   const ics = buildDaysSinceCalendar(
      { title: "Moving in", start_date: "2024-02-01", interval: 7 },
      now,
   );
   const lines = ics.split("\r\n");
   expect(lines[0]).toBe("BEGIN:VCALENDAR");
   expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
   expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(101);

   const summaries = lines.filter((line) => line.startsWith("SUMMARY:"));
   expect(summaries[0]).toBe("SUMMARY:0 days since Moving in");
   expect(summaries[1]).toBe("SUMMARY:7 days since Moving in");
   expect(summaries[100]).toBe("SUMMARY:700 days since Moving in");

   // 2024 is a leap year: 28 days after 1 Feb is 29 Feb.
   expect(lines).toContain("DTSTART;VALUE=DATE:20240229");
   expect(lines).toContain("DTEND;VALUE=DATE:20240301");
});

test("uses the singular for one day, and escapes the title", () => {
   const ics = buildDaysSinceCalendar(
      { title: "a, b; c", start_date: "2024-12-31", interval: 1 },
      now,
   );
   expect(ics).toContain("SUMMARY:1 day since a\\, b\\; c\r\n");
   expect(ics).toContain("DTSTART;VALUE=DATE:20250101\r\n");
});

test("UIDs are unique within a feed and stable across builds", () => {
   const input = { title: "Moving in", start_date: "2024-02-01", interval: 3 };
   const uids = (ics: string): Array<string> =>
      ics.split("\r\n").filter((line) => line.startsWith("UID:"));
   const first = uids(buildDaysSinceCalendar(input, now));
   expect(new Set(first).size).toBe(first.length);
   expect(uids(buildDaysSinceCalendar(input, new Date()))).toEqual(first);
   expect(uids(buildDaysSinceCalendar({ ...input, title: "Other" }, now))[0]).not.toBe(
      first[0],
   );
});
