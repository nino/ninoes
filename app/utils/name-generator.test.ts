import { describe, expect, it } from "bun:test";
import {
   formatName,
   generateName,
   inventWord,
   realFirstNames,
   realLastNames,
} from "./name-generator";

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

describe("generateName", () => {
   it("builds a real name from the lists", () => {
      // Real, no middle name, then the first entry of each list.
      const name = generateName(sequence(0.1, 0.9, 0));
      expect(name).toEqual({
         first: realFirstNames[0],
         middle: null,
         last: realLastNames[0],
         real: true,
      });
   });

   it("invents a name when the coin lands the other way", () => {
      const name = generateName(sequence(0.9, 0.9, 0.5));
      expect(name.real).toBe(false);
      expect(realFirstNames).not.toContain(name.first);
   });

   it("adds a middle name that differs from the first", () => {
      for (let seed = 1; seed < 200; seed++) {
         const name = generateName(seeded(seed));
         if (name.real && name.middle != null) {
            expect(name.middle).not.toBe(name.first);
         }
      }
      expect(generateName(sequence(0.1, 0.1, 0)).middle).toBe(realFirstNames[1]);
   });

   it("gives a middle name about 15% of the time and a real name about half", () => {
      const random = seeded(42);
      const names = Array.from({ length: 4000 }, () => generateName(random));
      const middles = names.filter((name) => name.middle != null).length / names.length;
      const real = names.filter((name) => name.real).length / names.length;
      expect(middles).toBeGreaterThan(0.12);
      expect(middles).toBeLessThan(0.18);
      expect(real).toBeGreaterThan(0.45);
      expect(real).toBeLessThan(0.55);
   });
});

describe("inventWord", () => {
   it("returns a capitalised word of letters", () => {
      const random = seeded(7);
      for (let i = 0; i < 500; i++) {
         expect(inventWord(2, 3, random)).toMatch(/^[A-Z][a-z]+$/);
      }
   });
});

describe("formatName", () => {
   it("joins the parts and skips a missing middle name", () => {
      expect(
         formatName({ first: "Ada", middle: null, last: "Lovelace", real: true }),
      ).toBe("Ada Lovelace");
      expect(
         formatName({ first: "Zev", middle: "Oran", last: "Thaleiga", real: false }),
      ).toBe("Zev Oran Thaleiga");
   });
});
