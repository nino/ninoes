import { expect, test } from "vitest";
import { formatAirDate, formatGap, formatShortDate } from "./startrek-format";

test("formats calendar dates without depending on the runtime's ICU", () => {
   expect(formatAirDate("2026-09-05")).toBe("Sat 5 Sep 2026");
   expect(formatAirDate("2026-01-01")).toBe("Thu 1 Jan 2026");
   expect(formatAirDate("1966-09-08")).toBe("Thu 8 Sep 1966");
   expect(formatShortDate("1987-09-28")).toBe("28 Sep 1987");
});

test("formats gaps like Intl.RelativeTimeFormat with numeric: auto", () => {
   expect(formatGap(0)).toBe("today");
   expect(formatGap(1)).toBe("tomorrow");
   expect(formatGap(-1)).toBe("yesterday");
   expect(formatGap(3)).toBe("in 3 days");
   expect(formatGap(-13)).toBe("13 days ago");
   expect(formatGap(14)).toBe("in 2 weeks");
   expect(formatGap(-8 * 7)).toBe("8 weeks ago");
   expect(formatGap(61)).toBe("in 2 months");
   expect(formatGap(-40)).toBe("6 weeks ago");
   expect(formatGap(-61)).toBe("2 months ago");
   expect(formatGap(200)).toBe("in 7 months");
   expect(formatGap(365)).toBe("next year");
   expect(formatGap(-3 * 365)).toBe("3 years ago");
});
