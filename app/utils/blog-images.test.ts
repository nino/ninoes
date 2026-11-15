import { describe, expect, test } from "bun:test";
import {
   type BlogImage,
   buildSnippet,
   chooseWidths,
   VARIANT_KEY_PATTERN,
   variantKey,
} from "./blog-images";

const variants = (format: string, widths: Array<number>): BlogImage["sources"]["avif"] =>
   widths.map((width) => ({
      url: `https://cdn.example/images/cat_ab12cd/cat_ab12cd_${width}${format}`,
      width,
      bytes: 1000,
   }));

const widths = [480, 800, 1200, 1600, 2400];
const photo: BlogImage = {
   name: "cat_ab12cd",
   width: 4032,
   height: 3024,
   hdr: true,
   fallback: "jpg",
   originalBytes: 50_000_000,
   full: {
      url: "https://cdn.example/images/cat_ab12cd/cat_ab12cd_full.jpg",
      width: 4032,
      bytes: 1,
   },
   sources: {
      hdrAvif: variants("_hdr.avif", widths),
      avif: variants(".avif", widths),
      webp: variants(".webp", widths),
      fallback: variants(".jpg", widths),
   },
};
const options = { alt: "A cat", displayWidth: 800, linkFull: true, lazy: true };

describe("chooseWidths", () => {
   test("caps at the widest standard width", () => {
      expect(chooseWidths(4032)).toEqual([480, 800, 1200, 1600, 2400]);
      expect(chooseWidths(2400)).toEqual([480, 800, 1200, 1600, 2400]);
   });

   test("adds the original width when it's narrower than the widest", () => {
      expect(chooseWidths(1000)).toEqual([480, 800, 1000]);
      expect(chooseWidths(300)).toEqual([300]);
   });

   test("skips an original within 10% of a standard width", () => {
      expect(chooseWidths(850)).toEqual([480, 800]);
   });
});

describe("buildSnippet", () => {
   const snippet = buildSnippet(photo, options);

   test("sizes the img at the display size, not the file's", () => {
      expect(snippet).toContain(`width="800" height="600"`);
      expect(snippet).toContain(`style="max-width:100%;height:auto"`);
      expect(snippet).toContain(`sizes="(max-width: 800px) 100vw, 800px"`);
   });

   test("never shows an image wider than it is", () => {
      const small = { ...photo, width: 600, height: 400 };
      expect(buildSnippet(small, options)).toContain(`width="600" height="400"`);
   });

   test("never shows an image wider than its widest file", () => {
      // 520 wide: only a 480 file, since 520 is within 10% of it.
      const narrow = {
         ...photo,
         width: 520,
         height: 390,
         sources: {
            hdrAvif: [],
            avif: variants(".avif", [480]),
            webp: variants(".webp", [480]),
            fallback: variants(".jpg", [480]),
         },
      };
      expect(buildSnippet(narrow, options)).toContain(`width="480" height="360"`);
   });

   test("survives Markdown: no whitespace between tags, no > at a line start, no blank lines", () => {
      expect(snippet).not.toMatch(/>\s+</);
      for (const line of snippet.split("\n")) {
         expect(line.trim()).not.toBe("");
         expect(line.trimStart().startsWith(">")).toBe(false);
      }
   });

   test("parses into a link around a picture with only element children", () => {
      const container = document.createElement("div");
      container.innerHTML = snippet;
      const link = container.firstElementChild;
      expect(link?.tagName).toBe("A");
      expect(link?.childNodes.length).toBe(1);
      const picture = link?.firstElementChild;
      expect(picture?.tagName).toBe("PICTURE");
      const children = [...(picture?.childNodes ?? [])];
      expect(children.map((node) => node.nodeName)).toEqual([
         "SOURCE",
         "SOURCE",
         "SOURCE",
         "IMG",
      ]);
   });

   test("puts the HDR source first, behind a dynamic-range query", () => {
      const container = document.createElement("div");
      container.innerHTML = snippet;
      const sources = [...container.querySelectorAll("source")];
      const [hdr, sdr] = [sources.at(0), sources.at(1)];
      expect(hdr?.getAttribute("media")).toBe("(dynamic-range: high)");
      expect(hdr?.getAttribute("srcset")).toContain("_hdr.avif 480w");
      expect(sdr?.hasAttribute("media")).toBe(false);
   });

   test("leaves out the HDR source and the link when there are none", () => {
      const sdr = buildSnippet(
         { ...photo, hdr: false, sources: { ...photo.sources, hdrAvif: [] } },
         { ...options, linkFull: false, lazy: false },
      );
      expect(sdr.startsWith("<picture>")).toBe(true);
      expect(sdr).not.toContain("dynamic-range");
      expect(sdr).not.toContain("loading=");
   });

   test("escapes the alt text", () => {
      const tricky = buildSnippet(photo, { ...options, alt: `"Hi" <b>&` });
      expect(tricky).toContain(`alt="&quot;Hi&quot; &lt;b&gt;&amp;"`);
   });

   test("uses the narrowest fallback that fills the display width as src", () => {
      expect(buildSnippet(photo, { ...options, displayWidth: 900 })).toContain(
         `<img src="https://cdn.example/images/cat_ab12cd/cat_ab12cd_1200.jpg"`,
      );
   });
});

describe("variant keys", () => {
   test("the server accepts every key the page makes, even for tiny images", () => {
      for (const width of [9, 480, 2400] as const) {
         expect(VARIANT_KEY_PATTERN.test(variantKey("cat_ab12cd", width, "avif"))).toBe(true);
      }
      expect(VARIANT_KEY_PATTERN.test(variantKey("cat_ab12cd", 800, "hdrAvif"))).toBe(true);
      expect(VARIANT_KEY_PATTERN.test(variantKey("cat_ab12cd", "full", "jpg"))).toBe(true);
   });

   test("rejects keys outside the image's own folder", () => {
      for (const key of [
         "images/cat_ab12cd/dog_ab12cd_800.avif",
         "images/cat_ab12cd/../x_ab12cd_800.avif",
         "other/cat_ab12cd/cat_ab12cd_800.avif",
         "images/cat_ab12cd/cat_ab12cd_800.avif\n",
         "images/cat_ab12cd/cat_ab12cd_800.html",
      ]) {
         expect(VARIANT_KEY_PATTERN.test(key)).toBe(false);
      }
   });
});
