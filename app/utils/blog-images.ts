import { z } from "zod";

// Shared by the /blog-images page, which encodes images in the browser, and the
// server, which signs their uploads: the widths and file names, the result
// shape, and the snippet that gets pasted into a ninoan.com post.

/** Widths to encode. Anything wider than the original is skipped. */
export const BLOG_IMAGE_WIDTHS = [480, 800, 1200, 1600, 2400] as const;

/** Default for "shown at most … px wide", the widest the post ever shows it. */
export const DEFAULT_DISPLAY_WIDTH = 800;

/**
 * The widths to encode an image `originalWidth` wide at: every standard width
 * it covers, plus the original itself when it's narrower than the widest one
 * and not within 10% of a standard width (that would be a near-duplicate).
 */
export function chooseWidths(originalWidth: number): Array<number> {
   const widths: Array<number> = BLOG_IMAGE_WIDTHS.filter((w) => w <= originalWidth);
   const largest = widths.at(-1);
   if (
      originalWidth < BLOG_IMAGE_WIDTHS[BLOG_IMAGE_WIDTHS.length - 1] &&
      (largest == null || originalWidth > largest * 1.1)
   ) {
      widths.push(originalWidth);
   }
   return widths;
}

const VariantSchema = z.object({
   url: z.string(),
   width: z.number(),
   bytes: z.number(),
});
export type BlogImageVariant = z.infer<typeof VariantSchema>;

export const BlogImageSchema = z.object({
   name: z.string(),
   width: z.number(),
   height: z.number(),
   /** True when the input was HDR; then `sources.hdrAvif` is filled. */
   hdr: z.boolean(),
   /** PNG when the image has transparency, JPEG otherwise. */
   fallback: z.enum(["jpg", "png"]),
   originalBytes: z.number(),
   full: VariantSchema,
   sources: z.object({
      /** 10-bit BT.2100 PQ, for screens that can show HDR. */
      hdrAvif: z.array(VariantSchema),
      avif: z.array(VariantSchema),
      webp: z.array(VariantSchema),
      /** JPEG or PNG, per `fallback`. */
      fallback: z.array(VariantSchema),
   }),
});
export type BlogImage = z.infer<typeof BlogImageSchema>;

/** The output formats, by the suffix and extension they get in file names. */
export const BLOG_IMAGE_FORMATS = {
   hdrAvif: { suffix: "_hdr", extension: "avif", type: "image/avif" },
   avif: { suffix: "", extension: "avif", type: "image/avif" },
   webp: { suffix: "", extension: "webp", type: "image/webp" },
   jpg: { suffix: "", extension: "jpg", type: "image/jpeg" },
   png: { suffix: "", extension: "png", type: "image/png" },
} as const;
export type BlogImageFormat = keyof typeof BLOG_IMAGE_FORMATS;

export function slugify(name: string): string {
   const slug = name
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60);
   return slug === "" ? "image" : slug;
}

/** "cat_3fa9c1": the slug of the file name plus a random ID, so names never clash. */
export function imageName(fileName: string, id: string): string {
   return `${slugify(fileName.replace(/\.[^.]*$/, ""))}_${id}`;
}

/** Where a variant is stored: images/<name>/<name>_<width>[_hdr].<ext>, or _full. */
export function variantKey(
   name: string,
   width: number | "full",
   format: BlogImageFormat,
): string {
   const { suffix, extension } = BLOG_IMAGE_FORMATS[format];
   return `images/${name}/${name}_${width}${suffix}.${extension}`;
}

/** The keys the server will sign uploads for; see `variantKey`. */
export const VARIANT_KEY_PATTERN =
   /^images\/([a-z0-9-]{1,60}_[0-9a-f]{6})\/\1_(?:\d{1,5}(?:_hdr)?|full)\.(?:avif|webp|jpg|png)$/;

/** The content type for a key, from its extension. */
export function contentTypeFor(key: string): string {
   const extension = key.slice(key.lastIndexOf(".") + 1);
   const format = Object.values(BLOG_IMAGE_FORMATS).find((f) => f.extension === extension);
   return format?.type ?? "application/octet-stream";
}

/** Browsers may keep every file forever: names carry a random ID and never change. */
export const BLOG_IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const SignRequestSchema = z.object({
   storage: z.enum(["b2", "local"]),
   keys: z.array(z.string().regex(VARIANT_KEY_PATTERN)).min(1).max(40),
});
export type SignRequest = z.infer<typeof SignRequestSchema>;

export const SignResponseSchema = z.object({
   uploads: z.array(
      z.object({
         key: z.string(),
         /** Send a PUT here with `headers`. */
         uploadUrl: z.string(),
         headers: z.record(z.string(), z.string()),
         /** Where the file can be read once uploaded. */
         publicUrl: z.string(),
      }),
   ),
});
export type SignResponse = z.infer<typeof SignResponseSchema>;

export interface SnippetOptions {
   alt: string;
   /** The widest the post shows the image, in CSS pixels. */
   displayWidth: number;
   linkFull: boolean;
   lazy: boolean;
}

const escapeAttribute = (value: string): string =>
   value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

/** The variant to put in the plain `src`: the narrowest that fills `width`. */
function nearestVariant(
   variants: Array<BlogImageVariant>,
   width: number,
): BlogImageVariant | undefined {
   return variants.find((v) => v.width >= width) ?? variants.at(-1);
}

/**
 * The HTML to paste into a post: a `<picture>` with an HDR AVIF source (when
 * there is one), SDR AVIF and WebP sources, and a JPEG or PNG `<img>`,
 * optionally wrapped in a link to the full-size image.
 *
 * Posts are Markdown, so the snippet is shaped to survive it:
 * - No whitespace between tags. Line breaks only sit inside tags, between
 *   attributes or `srcset` candidates, so no stray text nodes end up inside
 *   `<picture>`.
 * - No line starts with `>`, which would turn into a blockquote.
 * - No blank lines, which would end the HTML block.
 *
 * `width` and `height` are the size it's shown at, not the file's own size.
 * With the intrinsic size and only `img { max-width: 100% }` in the blog's CSS,
 * a 4032×3024 photo came out 587 wide and still 3024 tall. The inline style
 * keeps the aspect ratio when the column is narrower still.
 */
export function buildSnippet(image: BlogImage, options: SnippetOptions): string {
   // Never wider than the widest file, which can be up to 10% narrower than
   // the original (see chooseWidths); showing it wider would stretch it.
   const widest = Math.min(image.width, image.sources.fallback.at(-1)?.width ?? Infinity);
   const display = Math.max(1, Math.min(Math.round(options.displayWidth), widest));
   const displayHeight = Math.max(1, Math.round((display * image.height) / image.width));
   const sizes = `(max-width: ${display}px) 100vw, ${display}px`;
   const indent = "\n  ";
   const srcset = (variants: Array<BlogImageVariant>): string =>
      variants.map((v) => `${escapeAttribute(v.url)} ${v.width}w`).join(`,${indent}  `);
   const source = (
      type: string,
      variants: Array<BlogImageVariant>,
      media?: string,
   ): string =>
      variants.length === 0
         ? ""
         : `<source type="${type}"${media == null ? "" : ` media="${media}"`}` +
           `${indent}sizes="${sizes}"${indent}srcset="${srcset(variants)}">`;

   const fallback = image.sources.fallback;
   const src = nearestVariant(fallback, display)?.url ?? image.full.url;
   const lazy = options.lazy ? ` loading="lazy" decoding="async"` : "";
   const img =
      `<img src="${escapeAttribute(src)}"` +
      `${indent}srcset="${srcset(fallback)}"` +
      `${indent}sizes="${sizes}"` +
      `${indent}width="${display}" height="${displayHeight}" alt="${escapeAttribute(options.alt)}"${lazy}` +
      `${indent}style="max-width:100%;height:auto">`;

   const picture =
      "<picture>" +
      source("image/avif", image.sources.hdrAvif, "(dynamic-range: high)") +
      source("image/avif", image.sources.avif) +
      source("image/webp", image.sources.webp) +
      img +
      "</picture>";
   return options.linkFull
      ? `<a href="${escapeAttribute(image.full.url)}">${picture}</a>`
      : picture;
}

/** "740 KB", "12.3 MB". */
export function formatBytes(bytes: number): string {
   return bytes >= 1e6
      ? `${(bytes / 1e6).toFixed(1)} MB`
      : `${Math.round(bytes / 1e3)} KB`;
}
