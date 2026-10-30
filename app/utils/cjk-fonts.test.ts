import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { cjkFontGlyphs } from "./cjk-font-glyphs";
import { cjkFonts, cjkGlyphs } from "./cjk-fonts";
import { cultures } from "./name-generator";

describe("CJK name fonts", () => {
   it("cover every character in the name lists", () => {
      // Fails when the lists change without `bun run fonts:cjk`.
      expect(cjkGlyphs()).toEqual(cjkFontGlyphs);
   });

   it("exist for every CJK language", () => {
      for (const culture of cultures.filter((c) => c.style === "cjk")) {
         const font = cjkFonts.find((f) => f.lang === culture.lang);
         expect(font).toBeDefined();
         expect(existsSync(`public${font?.file}`)).toBe(true);
      }
   });
});
