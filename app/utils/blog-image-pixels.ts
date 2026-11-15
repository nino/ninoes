// Pixel work for /blog-images, done in the browser (in a worker): reading
// 16-bit PNGs with their cICP chunk, tone-mapping PQ HDR down to sRGB, and
// resizing. Images are RGBA, 16 bits per channel, in a Uint16Array.

/** Pixels plus size; `data` is RGBA, four samples per pixel. */
export interface Pixels<T extends Uint8ClampedArray | Uint16Array> {
   data: T;
   width: number;
   height: number;
}

/** What a PNG's cICP chunk says about its colour. */
export interface Cicp {
   primaries: number;
   transfer: number;
   matrix: number;
   fullRange: boolean;
}

/** CICP transfer characteristics for SMPTE ST 2084 (PQ). */
export const TRANSFER_PQ = 16;
/** CICP colour primaries for BT.2020. */
export const PRIMARIES_BT2020 = 9;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Reads a PNG's cICP chunk, if it has one, without decoding the image. */
export function readPngCicp(bytes: Uint8Array): Cicp | undefined {
   if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return undefined;
   const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
   for (let offset = 8; offset + 8 <= bytes.length;) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (type === "cICP" && length >= 4) {
         return {
            primaries: bytes[offset + 8] ?? 0,
            transfer: bytes[offset + 9] ?? 0,
            matrix: bytes[offset + 10] ?? 0,
            fullRange: bytes[offset + 11] === 1,
         };
      }
      // cICP has to come before the image data.
      if (type === "IDAT" || type === "IEND") return undefined;
      offset += 12 + length;
   }
   return undefined;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
   const stream = new Blob([data as Uint8Array<ArrayBuffer>])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
   return new Uint8Array(await new Response(stream).arrayBuffer());
}

function paeth(a: number, b: number, c: number): number {
   const p = a + b - c;
   const pa = Math.abs(p - a);
   const pb = Math.abs(p - b);
   const pc = Math.abs(p - c);
   return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Decodes an RGB or RGBA PNG, 8 or 16 bits per channel, not interlaced. That
 * covers HDR exports from Photos; for anything else, decode with the browser.
 * Throws for PNGs it can't read.
 */
export async function decodePng(bytes: Uint8Array): Promise<Pixels<Uint16Array>> {
   if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) throw new Error("Not a PNG");
   const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
   let width = 0;
   let height = 0;
   let bitDepth = 0;
   let colourType = 0;
   const idat: Array<Uint8Array> = [];
   for (let offset = 8; offset + 8 <= bytes.length;) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      const body = bytes.subarray(offset + 8, offset + 8 + length);
      if (type === "IHDR") {
         width = view.getUint32(offset + 8);
         height = view.getUint32(offset + 12);
         bitDepth = body[8];
         colourType = body[9];
         if (body[12] !== 0) throw new Error("Interlaced PNGs aren't supported");
      } else if (type === "IDAT") {
         idat.push(body);
      } else if (type === "IEND") {
         break;
      }
      offset += 12 + length;
   }
   if (colourType !== 2 && colourType !== 6) {
      throw new Error(`PNG colour type ${colourType} isn't supported`);
   }
   if (bitDepth !== 8 && bitDepth !== 16) {
      throw new Error(`PNG bit depth ${bitDepth} isn't supported`);
   }

   const compressed = new Uint8Array(idat.reduce((sum, chunk) => sum + chunk.length, 0));
   let position = 0;
   for (const chunk of idat) {
      compressed.set(chunk, position);
      position += chunk.length;
   }
   const raw = await inflate(compressed);

   const channels = colourType === 6 ? 4 : 3;
   const bytesPerSample = bitDepth / 8;
   const bpp = channels * bytesPerSample;
   const stride = width * bpp;
   if (raw.length < height * (stride + 1)) throw new Error("PNG data is truncated");

   // Undo the per-row filters in place.
   const rows = new Uint8Array(height * stride);
   for (let y = 0; y < height; y++) {
      const filter = raw[y * (stride + 1)];
      const source = y * (stride + 1) + 1;
      const row = y * stride;
      const previous = row - stride;
      for (let x = 0; x < stride; x++) {
         const value = raw[source + x] ?? 0;
         const left = x >= bpp ? (rows[row + x - bpp] ?? 0) : 0;
         const up = y > 0 ? (rows[previous + x] ?? 0) : 0;
         const upLeft = y > 0 && x >= bpp ? (rows[previous + x - bpp] ?? 0) : 0;
         let predicted: number;
         switch (filter) {
            case 0:
               predicted = 0;
               break;
            case 1:
               predicted = left;
               break;
            case 2:
               predicted = up;
               break;
            case 3:
               predicted = (left + up) >> 1;
               break;
            case 4:
               predicted = paeth(left, up, upLeft);
               break;
            default:
               throw new Error(`Unknown PNG filter ${filter}`);
         }
         rows[row + x] = (value + predicted) & 0xff;
      }
   }

   const data = new Uint16Array(width * height * 4);
   for (let i = 0, p = 0; i < width * height; i++, p += bpp) {
      for (let c = 0; c < 4; c++) {
         if (c === 3 && channels === 3) {
            data[i * 4 + 3] = 65535;
            continue;
         }
         const at = p + c * bytesPerSample;
         data[i * 4 + c] =
            bytesPerSample === 2
               ? ((rows[at] ?? 0) << 8) | (rows[at + 1] ?? 0)
               : (rows[at] ?? 0) * 257;
      }
   }
   return { data, width, height };
}

/** True if any pixel is less than fully opaque. */
export function hasTransparency(pixels: Pixels<Uint16Array>): boolean {
   const { data } = pixels;
   for (let i = 3; i < data.length; i += 4) if (data[i] !== 65535) return true;
   return false;
}

/** SDR reference white in PQ content, per ITU-R BT.2408. */
const REFERENCE_WHITE_NITS = 203;

/** PQ signal (0–1) to light, relative to reference white. */
export function pqToLinear(signal: number): number {
   const m1 = 2610 / 16384;
   const m2 = (2523 / 4096) * 128;
   const c1 = 3424 / 4096;
   const c2 = (2413 / 4096) * 32;
   const c3 = (2392 / 4096) * 32;
   const e = Math.pow(Math.max(signal, 0), 1 / m2);
   const nits = 10000 * Math.pow(Math.max(e - c1, 0) / (c2 - c3 * e), 1 / m1);
   return nits / REFERENCE_WHITE_NITS;
}

/** Linear sRGB (0–1) to the sRGB transfer curve. */
export function linearToSrgb(value: number): number {
   const v = Math.min(Math.max(value, 0), 1);
   return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/**
 * Compresses light above `knee` so that `headroom` lands on 1 (SDR white),
 * leaving everything below the knee alone. The curve is a rational function
 * with slope 1 at the knee, so there's no visible kink.
 */
export function toneMap(value: number, headroom: number, knee: number): number {
   if (value <= knee || headroom <= 1) return value;
   const t = value - knee;
   return knee + t / (1 + t * (1 / (1 - knee) - 1 / (headroom - knee)));
}

// BT.2020 to BT.709 (sRGB) primaries, in linear light.
const BT2020_TO_BT709 = [
   [1.6605, -0.5876, -0.0728],
   [-0.1246, 1.1329, -0.0083],
   [-0.0182, -0.1006, 1.1187],
] as const;

/** Where tone-mapping starts compressing, relative to SDR white. */
export const TONE_MAP_KNEE = 0.6;

/**
 * Tone-maps PQ BT.2020 pixels down to 16-bit sRGB. The headroom (brightest
 * level to fit into SDR white) is the 99.99th percentile of the image's
 * brightest channel, so a few specular highlights don't darken everything.
 */
export function pqToSrgb(pixels: Pixels<Uint16Array>): {
   pixels: Pixels<Uint16Array>;
   headroom: number;
} {
   const { data, width, height } = pixels;
   // Light for every possible 16-bit PQ sample.
   const linear = new Float32Array(65536);
   for (let i = 0; i < 65536; i++) linear[i] = pqToLinear(i / 65535);

   // The 99.99th percentile of max(R, G, B), from a histogram of samples.
   const histogram = new Uint32Array(65536);
   for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      histogram[max] = (histogram[max] ?? 0) + 1;
   }
   let remaining = Math.ceil((width * height) / 10000);
   let peak = 65535;
   for (; peak > 0; peak--) {
      remaining -= histogram[peak] ?? 0;
      if (remaining <= 0) break;
   }
   const headroom = Math.max(1, linear[peak] ?? 1);

   // sRGB encoding for 4096 linear steps, interpolated.
   const steps = 4096;
   const encode = new Float32Array(steps + 2);
   for (let i = 0; i <= steps + 1; i++) encode[i] = linearToSrgb(i / steps);
   const toSrgb16 = (value: number): number => {
      const v = Math.min(Math.max(value, 0), 1) * steps;
      const i = Math.floor(v);
      const a = encode[i] ?? 1;
      const b = encode[i + 1] ?? 1;
      return Math.round((a + (b - a) * (v - i)) * 65535);
   };

   const [m0, m1, m2] = BT2020_TO_BT709;
   const out = new Uint16Array(data.length);
   for (let i = 0; i < data.length; i += 4) {
      const r2020 = linear[data[i] ?? 0] ?? 0;
      const g2020 = linear[data[i + 1] ?? 0] ?? 0;
      const b2020 = linear[data[i + 2] ?? 0] ?? 0;
      let r = Math.max(0, m0[0] * r2020 + m0[1] * g2020 + m0[2] * b2020);
      let g = Math.max(0, m1[0] * r2020 + m1[1] * g2020 + m1[2] * b2020);
      let b = Math.max(0, m2[0] * r2020 + m2[1] * g2020 + m2[2] * b2020);
      // Scale all three channels by the same factor, keeping the hue.
      const max = Math.max(r, g, b);
      if (max > TONE_MAP_KNEE) {
         const scale = toneMap(max, headroom, TONE_MAP_KNEE) / max;
         r *= scale;
         g *= scale;
         b *= scale;
      }
      out[i] = toSrgb16(r);
      out[i + 1] = toSrgb16(g);
      out[i + 2] = toSrgb16(b);
      out[i + 3] = data[i + 3] ?? 65535;
   }
   return { pixels: { data: out, width, height }, headroom };
}

function lanczos3(x: number): number {
   if (x === 0) return 1;
   if (x <= -3 || x >= 3) return 0;
   const px = Math.PI * x;
   return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px);
}

/** For each output index, the first input index and the weights from there. */
function weights(
   inSize: number,
   outSize: number,
): Array<{ start: number; weights: Float32Array }> {
   const scale = inSize / outSize;
   const support = 3 * Math.max(scale, 1);
   const filterScale = Math.max(scale, 1);
   return Array.from({ length: outSize }, (_, i) => {
      const centre = (i + 0.5) * scale - 0.5;
      const start = Math.max(0, Math.ceil(centre - support));
      const end = Math.min(inSize - 1, Math.floor(centre + support));
      const w = new Float32Array(end - start + 1);
      let sum = 0;
      for (let j = start; j <= end; j++) {
         const value = lanczos3((j - centre) / filterScale);
         w[j - start] = value;
         sum += value;
      }
      for (let k = 0; k < w.length; k++) w[k] = (w[k] ?? 0) / sum;
      return { start, weights: w };
   });
}

/**
 * Resizes to `width` wide, keeping the aspect ratio, with a Lanczos-3 filter.
 * Colour is weighted by alpha so transparent pixels don't bleed in.
 */
export function resize(pixels: Pixels<Uint16Array>, width: number): Pixels<Uint16Array> {
   const { data, width: inWidth, height: inHeight } = pixels;
   if (width >= inWidth) return pixels;
   const height = Math.max(1, Math.round((inHeight * width) / inWidth));

   // Horizontal pass into premultiplied floats, then vertical.
   const columns = weights(inWidth, width);
   const mid = new Float32Array(width * inHeight * 4);
   for (let y = 0; y < inHeight; y++) {
      const rowIn = y * inWidth * 4;
      const rowOut = y * width * 4;
      for (let x = 0; x < width; x++) {
         const { start, weights: w } = columns[x] ?? {
            start: 0,
            weights: new Float32Array(),
         };
         let r = 0;
         let g = 0;
         let b = 0;
         let a = 0;
         for (let k = 0; k < w.length; k++) {
            const p = rowIn + (start + k) * 4;
            const alpha = (data[p + 3] ?? 0) * (w[k] ?? 0);
            r += (data[p] ?? 0) * alpha;
            g += (data[p + 1] ?? 0) * alpha;
            b += (data[p + 2] ?? 0) * alpha;
            a += alpha;
         }
         const o = rowOut + x * 4;
         mid[o] = r;
         mid[o + 1] = g;
         mid[o + 2] = b;
         mid[o + 3] = a;
      }
   }

   const rows = weights(inHeight, height);
   const out = new Uint16Array(width * height * 4);
   const clamp = (v: number): number => Math.min(65535, Math.max(0, Math.round(v)));
   for (let y = 0; y < height; y++) {
      const { start, weights: w } = rows[y] ?? { start: 0, weights: new Float32Array() };
      for (let x = 0; x < width; x++) {
         let r = 0;
         let g = 0;
         let b = 0;
         let a = 0;
         for (let k = 0; k < w.length; k++) {
            const p = ((start + k) * width + x) * 4;
            const weight = w[k] ?? 0;
            r += (mid[p] ?? 0) * weight;
            g += (mid[p + 1] ?? 0) * weight;
            b += (mid[p + 2] ?? 0) * weight;
            a += (mid[p + 3] ?? 0) * weight;
         }
         const o = (y * width + x) * 4;
         if (a > 0) {
            out[o] = clamp(r / a);
            out[o + 1] = clamp(g / a);
            out[o + 2] = clamp(b / a);
         }
         out[o + 3] = clamp(a);
      }
   }
   return { data: out, width, height };
}

/** 16-bit to 8-bit, for the SDR encoders. */
export function to8Bit(pixels: Pixels<Uint16Array>): Pixels<Uint8ClampedArray> {
   const out = new Uint8ClampedArray(pixels.data.length);
   // Uint8ClampedArray rounds to nearest on its own.
   for (let i = 0; i < out.length; i++) out[i] = (pixels.data[i] ?? 0) / 257;
   return { data: out, width: pixels.width, height: pixels.height };
}

/** 16-bit to 10-bit (still in a Uint16Array), for the HDR AVIF. */
export function to10Bit(pixels: Pixels<Uint16Array>): Pixels<Uint16Array> {
   const out = new Uint16Array(pixels.data.length);
   for (let i = 0; i < out.length; i++) {
      out[i] = Math.round(((pixels.data[i] ?? 0) * 1023) / 65535);
   }
   return { data: out, width: pixels.width, height: pixels.height };
}

/** CICP colour primaries for BT.709 / sRGB. */
export const PRIMARIES_BT709 = 1;
/** CICP transfer characteristics for the sRGB curve. */
export const TRANSFER_SRGB = 13;

/**
 * Sets the colour primaries and transfer in an AVIF's `colr` (nclx) box: BT.2020
 * and PQ for HDR, BT.709 and sRGB otherwise. The WebAssembly encoder always
 * writes "unspecified" there. The matrix and range describe how it built the
 * YUV planes, so they stay. Changes `avif` in place and returns it; throws if
 * there's no box.
 */
export function tagAvifColour(
   avif: Uint8Array,
   primaries: number,
   transfer: number,
): Uint8Array {
   const marker = [0x63, 0x6f, 0x6c, 0x72, 0x6e, 0x63, 0x6c, 0x78]; // "colrnclx"
   for (let i = 0; i + 15 <= avif.length; i++) {
      if (marker.every((byte, k) => avif[i + k] === byte)) {
         avif[i + 8] = primaries >> 8;
         avif[i + 9] = primaries & 0xff;
         avif[i + 10] = transfer >> 8;
         avif[i + 11] = transfer & 0xff;
         return avif;
      }
   }
   throw new Error("The AVIF has no colr box to tag");
}
