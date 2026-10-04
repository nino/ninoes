import { describe, expect, it } from "vitest";
import {
   contributionState,
   formatPrice,
   isSpoilerFreeName,
   linkLabel,
   localizedWish,
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

describe("localizedWish", () => {
   const wish = {
      title: "Gusseisenbräter",
      description: "Jede Farbe außer Orange.",
      language: "de" as const,
      translated_title: "Cast-iron casserole",
      translated_description: "Any colour except orange.",
   };

   it("shows the translation to readers of the other language", () => {
      expect(localizedWish(wish, "en")).toEqual({
         title: "Cast-iron casserole",
         description: "Any colour except orange.",
         translatedFrom: "de",
      });
   });

   it("shows the original to readers of the same language", () => {
      expect(localizedWish(wish, "de")).toEqual({
         title: "Gusseisenbräter",
         description: "Jede Farbe außer Orange.",
         translatedFrom: null,
      });
   });

   it("shows the original while a translation is pending", () => {
      const pending = {
         ...wish,
         language: null,
         translated_title: null,
         translated_description: null,
      };
      expect(localizedWish(pending, "en").title).toBe("Gusseisenbräter");
      expect(localizedWish(pending, "en").translatedFrom).toBeNull();
   });
});

describe("contributionState", () => {
   const share = (
      name: string,
      amount: number | null = null,
   ): { name: string; amount: number | null; complete: boolean } => ({
      name,
      amount,
      complete: false,
   });
   const whole = (
      name: string,
   ): { name: string; amount: number | null; complete: boolean } => ({
      name,
      amount: null,
      complete: true,
   });

   it("lets anyone give the whole gift or chip in while nobody has", () => {
      const state = contributionState([], "Ingrid");
      expect(state).toMatchObject({ whole: null, mine: null, total: 0 });
      expect(state.canGiveWhole).toBe(true);
      expect(state.canChipIn).toBe(true);
   });

   it("closes the wish to others once someone gives the whole gift", () => {
      const state = contributionState([whole("Tobias")], "Ingrid");
      expect(state.whole?.name).toBe("Tobias");
      expect(state.canGiveWhole).toBe(false);
      expect(state.canChipIn).toBe(false);
   });

   it("only allows sharing once others chip in, and sums the amounts", () => {
      const state = contributionState(
         [share("Tobias", 50), share("Oma", 70.5)],
         "Ingrid",
      );
      expect(state.total).toBe(120.5);
      expect(state.canGiveWhole).toBe(false);
      expect(state.canChipIn).toBe(true);
   });

   it("finds the viewer's own contribution regardless of case", () => {
      const state = contributionState([share("ingrid ", 20)], "Ingrid");
      expect(state.mine?.amount).toBe(20);
      expect(state.canChipIn).toBe(false);
      // Alone on the wish, a share can still become the whole gift.
      expect(state.canGiveWhole).toBe(true);
   });
});
