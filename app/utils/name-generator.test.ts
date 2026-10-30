import { describe, expect, it } from "bun:test";
import { cultures, formatName, generateName, inventWord } from "./name-generator";

/** A seeded random source, so runs repeat. */
function seeded(seed: number): () => number {
   let state = seed;
   return () => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      return state / 2_147_483_648;
   };
}

/** Plays back the given values in turn, then repeats the last one. */
function sequence(...values: Array<number>): () => number {
   let i = 0;
   return () => values[Math.min(i++, values.length - 1)];
}

const english = cultures[0];
const allGiven = cultures.flatMap((culture) => culture.given);

describe("generateName", () => {
   it("builds a real name from one culture's lists", () => {
      // Real, no middle name, the first culture, then the first entry of each list.
      expect(generateName(sequence(0.1, 0.9, 0))).toEqual({
         given: english.given[0],
         middle: null,
         family: english.family[0],
         style: "given-first",
         lang: "en",
         real: true,
      });
   });

   it("picks the last culture for a roll near 1", () => {
      const name = generateName(sequence(0.1, 0.9, 0.999, 0));
      const last = cultures[cultures.length - 1];
      expect(name.style).toBe(last.style);
      expect(last.given).toContain(name.given);
   });

   it("invents a name when the coin lands the other way", () => {
      const name = generateName(sequence(0.9, 0.9, 0.5));
      expect(name.real).toBe(false);
      expect(allGiven).not.toContain(name.given);
   });

   it("adds a middle name that differs from the given name, except in CJK names", () => {
      for (let seed = 1; seed < 500; seed++) {
         const name = generateName(seeded(seed));
         if (name.real && name.middle != null) {
            expect(name.middle).not.toBe(name.given);
         }
         if (name.style === "cjk") expect(name.middle).toBeNull();
      }
      expect(generateName(sequence(0.1, 0.1, 0, 0)).middle).toBe(english.given[1]);
   });

   it("gives a middle name about 15% of the time and a real name about half", () => {
      const random = seeded(42);
      const names = Array.from({ length: 4000 }, () => generateName(random));
      const share = (test: (name: (typeof names)[number]) => boolean): number =>
         names.filter(test).length / names.length;
      expect(share((name) => name.middle != null)).toBeGreaterThan(0.11);
      expect(share((name) => name.real)).toBeGreaterThan(0.45);
      expect(share((name) => name.real)).toBeLessThan(0.55);
      // Every culture comes up.
      for (const culture of cultures) {
         expect(names.some((name) => culture.family.includes(name.family))).toBe(true);
      }
   });
});

describe("cultures", () => {
   it("has no name in both the given and family lists of one culture", () => {
      for (const culture of cultures) {
         const overlap = culture.given.filter((name) => culture.family.includes(name));
         expect({ language: culture.language, overlap }).toEqual({
            language: culture.language,
            overlap: [],
         });
      }
   });
});

describe("inventWord", () => {
   it("returns a capitalised word of letters, sometimes accented", () => {
      const random = seeded(7);
      const words = Array.from({ length: 500 }, () => inventWord(2, 3, random));
      for (const word of words) expect(word).toMatch(/^\p{Lu}\p{Ll}+$/u);
      expect(words.some((word) => /[^A-Za-z]/.test(word))).toBe(true);
   });
});

describe("formatName", () => {
   it("orders and joins the parts by style", () => {
      expect(
         formatName({
            given: "Ada",
            middle: null,
            family: "Lovelace",
            style: "given-first",
            lang: "en",
            real: true,
         }),
      ).toBe("Ada Lovelace");
      expect(
         formatName({
            given: "An",
            middle: "Bảo",
            family: "Nguyễn",
            style: "family-first",
            lang: "vi",
            real: true,
         }),
      ).toBe("Nguyễn Bảo An");
      expect(
         formatName({
            given: "浩然",
            middle: null,
            family: "王",
            style: "cjk",
            lang: "zh-Hans",
            real: true,
         }),
      ).toBe("王浩然");
   });
});
