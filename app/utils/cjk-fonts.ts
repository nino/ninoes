import { cultures } from "./name-generator";

/**
 * Heavy serif fonts for Chinese, Japanese and Korean names, cut down to the
 * characters in the name lists by scripts/subset-cjk-fonts.ts. The @font-face
 * rules in app.css point at these files.
 */
export const cjkFonts: ReadonlyArray<{
   lang: string;
   googleFamily: string;
   file: string;
}> = [
   {
      lang: "zh-Hans",
      googleFamily: "Noto Serif SC",
      file: "/fonts/noto-serif-sc-names.woff2",
   },
   {
      lang: "ja",
      googleFamily: "Noto Serif JP",
      file: "/fonts/noto-serif-jp-names.woff2",
   },
   {
      lang: "ko",
      googleFamily: "Noto Serif KR",
      file: "/fonts/noto-serif-kr-names.woff2",
   },
];

/** The distinct characters in each CJK language's names, sorted. */
export function cjkGlyphs(): Record<string, string> {
   const glyphs: Record<string, string> = {};
   for (const font of cjkFonts) {
      const names = cultures
         .filter((culture) => culture.lang === font.lang)
         .flatMap((culture) => [...culture.given, ...culture.family]);
      glyphs[font.lang] = [...new Set(names.flatMap((name) => Array.from(name)))]
         .toSorted()
         .join("");
   }
   return glyphs;
}
