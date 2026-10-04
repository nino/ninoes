import { describe, expect, it } from "vitest";
import {
   formatPrice,
   isSpoilerFreeName,
   linkLabel,
   normalizeLink,
   parsePrice,
   sameName,
} from "./wishlist";

describe("isSpoilerFreeName", () => {
   it("matches the couple regardless of case and whitespace", () => {
      expect(isSpoilerFreeName("Nino")).toBe(true);
      expect(isSpoilerFreeName("  KATHERINE ")).toBe(true);
      expect(isSpoilerFreeName("katherine")).toBe(true);
   });

   it("doesn't match anyone else", () => {
      expect(isSpoilerFreeName("Ingrid")).toBe(false);
      expect(isSpoilerFreeName("Nino A.")).toBe(false);
      expect(isSpoilerFreeName("")).toBe(false);
   });
});

describe("sameName", () => {
   it("ignores case and surrounding whitespace", () => {
      expect(sameName(" Tobias", "tobias ")).toBe(true);
      expect(sameName("Tobias", "Tobi")).toBe(false);
   });
});

describe("parsePrice", () => {
   it.each([
      ["240", 240],
      ["240,50", 240.5],
      ["240.5", 240.5],
      ["£ 1.200", 1200],
      ["1.200,00 £", 1200],
      ["1,200.00 GBP", 1200],
      ["12.000", 12000],
   ])("reads %j as %d", (input, expected) => {
      expect(parsePrice(input)).toBe(expected);
   });

   it("returns null for an empty field", () => {
      expect(parsePrice("  ")).toBeNull();
   });

   it("returns NaN for something that isn't a price", () => {
      expect(parsePrice("about 50")).toBeNaN();
      expect(parsePrice("-5")).toBeNaN();
   });
});

describe("formatPrice", () => {
   it("drops cents for whole amounts", () => {
      expect(formatPrice(240, "en")).toBe("£240");
      expect(formatPrice(240, "de")).toBe("240\u00A0£");
   });

   it("shows cents otherwise", () => {
      expect(formatPrice(19.5, "en")).toBe("£19.50");
   });
});

describe("normalizeLink", () => {
   it("adds https to bare domains", () => {
      expect(normalizeLink("lecreuset.de/braeter")).toBe("https://lecreuset.de/braeter");
   });

   it("keeps http(s) links", () => {
      expect(normalizeLink("http://example.com/x")).toBe("http://example.com/x");
   });

   it("returns null for an empty field", () => {
      expect(normalizeLink("")).toBeNull();
   });

   it("rejects other schemes and non-addresses", () => {
      expect(normalizeLink("javascript:alert(1)")).toBeUndefined();
      expect(normalizeLink("mailto:a@b.de")).toBeUndefined();
      expect(normalizeLink("not a link")).toBeUndefined();
   });
});

describe("linkLabel", () => {
   it("shows the host without www", () => {
      expect(linkLabel("https://www.lecreuset.de/de_DE/p/123")).toBe("lecreuset.de");
   });
});
