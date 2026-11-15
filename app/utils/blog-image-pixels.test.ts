import { describe, expect, test } from "bun:test";
import {
   decodePng,
   hasTransparency,
   pqToLinear,
   pqToSrgb,
   readPngCicp,
   resize,
   tagAvifColour,
   to8Bit,
   toneMap,
} from "./blog-image-pixels";

function crc32(bytes: Uint8Array): number {
   let crc = ~0;
   for (const byte of bytes) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
   }
   return ~crc >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
   const out = new Uint8Array(12 + body.length);
   const view = new DataView(out.buffer);
   view.setUint32(0, body.length);
   out.set(new TextEncoder().encode(type), 4);
   out.set(body, 8);
   view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
   return out;
}

/** A 16-bit RGB PNG with a cICP chunk, every row with the "up" filter. */
async function makePng(
   width: number,
   height: number,
   pixel: (x: number, y: number) => [number, number, number],
): Promise<Uint8Array> {
   const stride = width * 6;
   const raw = new Uint8Array(height * (stride + 1));
   const plain = new Uint8Array(height * stride);
   for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
         pixel(x, y).forEach((value, c) => {
            plain[y * stride + x * 6 + c * 2] = value >> 8;
            plain[y * stride + x * 6 + c * 2 + 1] = value & 0xff;
         });
      }
      raw[y * (stride + 1)] = 2;
      for (let i = 0; i < stride; i++) {
         const up = y > 0 ? (plain[(y - 1) * stride + i] ?? 0) : 0;
         raw[y * (stride + 1) + 1 + i] = ((plain[y * stride + i] ?? 0) - up) & 0xff;
      }
   }
   const compressed = new Uint8Array(
      await new Response(
         new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate")),
      ).arrayBuffer(),
   );
   const ihdr = new Uint8Array(13);
   new DataView(ihdr.buffer).setUint32(0, width);
   new DataView(ihdr.buffer).setUint32(4, height);
   ihdr.set([16, 2, 0, 0, 0], 8);
   const parts = [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("cICP", new Uint8Array([9, 16, 0, 1])),
      chunk("IDAT", compressed),
      chunk("IEND", new Uint8Array()),
   ];
   const png = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
   let offset = 0;
   for (const part of parts) {
      png.set(part, offset);
      offset += part.length;
   }
   return png;
}

describe("PNG", () => {
   test("reads the cICP chunk", async () => {
      const png = await makePng(2, 2, () => [0, 0, 0]);
      expect(readPngCicp(png)).toEqual({
         primaries: 9,
         transfer: 16,
         matrix: 0,
         fullRange: true,
      });
      expect(readPngCicp(new Uint8Array([1, 2, 3]))).toBeUndefined();
   });

   test("decodes 16-bit RGB samples exactly", async () => {
      const png = await makePng(3, 2, (x, y) => [x * 1000 + y, 40000, 65535 - x]);
      const { data, width, height } = await decodePng(png);
      expect([width, height]).toEqual([3, 2]);
      expect([...data.subarray(0, 8)]).toEqual([
         0, 40000, 65535, 65535, 1000, 40000, 65534, 65535,
      ]);
      expect(data[(1 * 3 + 2) * 4]).toBe(2001);
      expect(hasTransparency({ data, width, height })).toBe(false);
   });
});

describe("tone mapping", () => {
   test("PQ at 203 nits is SDR white", () => {
      expect(pqToLinear(0.5807)).toBeCloseTo(1, 2);
      expect(pqToLinear(0)).toBe(0);
   });

   test("leaves light below the knee alone and lands the headroom on white", () => {
      expect(toneMap(0.3, 5, 0.6)).toBe(0.3);
      expect(toneMap(5, 5, 0.6)).toBeCloseTo(1, 6);
      expect(toneMap(2, 5, 0.6)).toBeLessThan(1);
      expect(toneMap(2, 5, 0.6)).toBeGreaterThan(toneMap(1, 5, 0.6));
   });

   test("brings HDR highlights into range without clipping them all to white", async () => {
      // Grey at SDR white, and 1000 nits.
      const white = Math.round(0.5807 * 65535);
      const bright = Math.round(0.7518 * 65535);
      const png = await makePng(2000, 1, (x) =>
         x < 1990 ? [white, white, white] : [bright, bright, bright],
      );
      const { pixels, headroom } = pqToSrgb(await decodePng(png));
      expect(headroom).toBeGreaterThan(4);
      const sdrWhite = pixels.data.at(0) ?? 0;
      const highlight = pixels.data.at(1999 * 4) ?? 0;
      expect(highlight).toBe(65535);
      expect(sdrWhite).toBeLessThan(highlight);
      expect(sdrWhite).toBeGreaterThan(50000);
   });
});

test("resizing keeps a flat colour and the aspect ratio", () => {
   const data = new Uint16Array(40 * 30 * 4);
   for (let i = 0; i < data.length; i += 4) data.set([1000, 30000, 65535, 65535], i);
   const small = resize({ data, width: 40, height: 30 }, 10);
   expect([small.width, small.height]).toEqual([10, 8]);
   expect([...small.data.subarray(0, 4)]).toEqual([1000, 30000, 65535, 65535]);
   expect([...to8Bit(small).data.subarray(0, 4)]).toEqual([4, 117, 255, 255]);
});

test("rounds 16-bit to the nearest 8-bit value", () => {
   const data = new Uint16Array([0, 128, 129, 300, 385, 386, 65535, 65407]);
   expect([...to8Bit({ data, width: 2, height: 1 }).data]).toEqual([0, 0, 1, 1, 1, 2, 255, 255]);
});

test("tags an AVIF's colr box with primaries and transfer", () => {
   const box = new Uint8Array([
      ...new TextEncoder().encode("xxcolrnclx"),
      0,
      2,
      0,
      2,
      0,
      6,
      0x80,
   ]);
   tagAvifColour(box, 9, 16);
   expect([...box.subarray(10)]).toEqual([0, 9, 0, 16, 0, 6, 0x80]);
   expect(() => tagAvifColour(new Uint8Array(20), 1, 13)).toThrow();
});
