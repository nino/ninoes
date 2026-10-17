import { expect, test } from "bun:test";
import { formatExpectedArrival, formatTimeToStation } from "./bus-format";

test("formats arrival times as 24-hour London time", () => {
   expect(formatExpectedArrival("2026-01-15T11:12:00Z")).toBe("11:12");
   expect(formatExpectedArrival("2026-01-15T23:05:00Z")).toBe("23:05");
   // British Summer Time is UTC+1.
   expect(formatExpectedArrival("2026-07-15T11:12:00Z")).toBe("12:12");
   expect(formatExpectedArrival("2026-07-15T23:30:00Z")).toBe("00:30");
});

test("formats time to station in whole minutes", () => {
   expect(formatTimeToStation(0)).toBe("due");
   expect(formatTimeToStation(59)).toBe("due");
   expect(formatTimeToStation(60)).toBe("in 1 min");
   expect(formatTimeToStation(299)).toBe("in 4 min");
});
