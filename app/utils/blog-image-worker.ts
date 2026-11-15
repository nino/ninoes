/// <reference lib="webworker" />
import encodeAvif from "@jsquash/avif/encode.js";
import encodeJpeg from "@jsquash/jpeg/encode.js";
import optimisePng from "@jsquash/oxipng/optimise.js";
import encodeWebp from "@jsquash/webp/encode.js";
import {
   decodePng,
   hasTransparency,
   type Pixels,
   pqToSrgb,
   PRIMARIES_BT2020,
   readPngCicp,
   resize,
   PRIMARIES_BT709,
   tagAvifColour,
   to10Bit,
   to8Bit,
   TRANSFER_PQ,
   TRANSFER_SRGB,
} from "./blog-image-pixels";
import type { BlogImageFormat } from "./blog-images";

// Runs in a Web Worker. One worker reads the photo and keeps it ("prepare",
// then "variant" per width); a few more do the slow part, encoding ("encode").

export type WorkerRequest =
   | { type: "prepare"; file: File }
   | {
        type: "variant";
        width: number;
        /** Also make the 10-bit PQ copy, for the HDR AVIF. */
        withHdr: boolean;
     }
   | {
        type: "encode";
        format: BlogImageFormat;
        /** 8-bit sRGB for SDR formats; 10-bit PQ for "hdrAvif". */
        pixels: Pixels<Uint8ClampedArray> | Pixels<Uint16Array>;
        quality: number;
     }
   | { type: "release" };

export interface PrepareResult {
   width: number;
   height: number;
   hdr: boolean;
   hasAlpha: boolean;
}

export interface VariantResult {
   sdr: Pixels<Uint8ClampedArray>;
   hdr: Pixels<Uint16Array> | undefined;
}

export type WorkerResponse =
   | { id: number; ok: true; value: PrepareResult | VariantResult | ArrayBuffer | null }
   | { id: number; ok: false; error: string };

let sdrMaster: Pixels<Uint16Array> | undefined;
let hdrMaster: Pixels<Uint16Array> | undefined;

/** Lets the browser decode it, with EXIF orientation applied, as 8-bit sRGB. */
async function decodeWithBrowser(file: File): Promise<Pixels<Uint16Array>> {
   let bitmap: ImageBitmap;
   try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
   } catch {
      throw new Error(
         "This browser can’t read that file. (HEIC only works in Safari; try a JPEG or PNG.)",
      );
   }
   const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
   const context = canvas.getContext("2d", { colorSpace: "srgb" });
   if (context == null) throw new Error("No 2D canvas in this browser");
   context.drawImage(bitmap, 0, 0);
   bitmap.close();
   const { data } = context.getImageData(0, 0, canvas.width, canvas.height, {
      colorSpace: "srgb",
   });
   const wide = new Uint16Array(data.length);
   for (let i = 0; i < data.length; i++) wide[i] = (data[i] ?? 0) * 257;
   return { data: wide, width: canvas.width, height: canvas.height };
}

async function prepare(file: File): Promise<PrepareResult> {
   sdrMaster = undefined;
   hdrMaster = undefined;
   const bytes = new Uint8Array(await file.arrayBuffer());
   const cicp = readPngCicp(bytes);
   if (cicp?.transfer === TRANSFER_PQ && cicp.primaries === PRIMARIES_BT2020) {
      // HDR from Photos: browsers would clip or tone-map it on their own terms
      // when drawing to a canvas, so decode the PQ values ourselves. The
      // decoder only reads RGB(A) and isn't interlaced, which is what Photos
      // writes; anything else gets the browser's SDR rendering instead.
      try {
         hdrMaster = await decodePng(bytes);
         sdrMaster = pqToSrgb(hdrMaster).pixels;
      } catch {
         hdrMaster = undefined;
      }
   }
   sdrMaster ??= await decodeWithBrowser(file);
   return {
      width: sdrMaster.width,
      height: sdrMaster.height,
      hdr: hdrMaster != null,
      hasAlpha: hasTransparency(sdrMaster),
   };
}

function variant(
   width: number,
   withHdr: boolean,
): {
   value: VariantResult;
   transfer: Array<Transferable>;
} {
   if (sdrMaster == null) throw new Error("Nothing prepared");
   const sdr = to8Bit(resize(sdrMaster, width));
   const hdr =
      hdrMaster == null || !withHdr ? undefined : to10Bit(resize(hdrMaster, width));
   return {
      value: { sdr, hdr },
      transfer: [sdr.data.buffer, ...(hdr == null ? [] : [hdr.data.buffer])],
   };
}

async function encode(
   format: BlogImageFormat,
   pixels: Pixels<Uint8ClampedArray> | Pixels<Uint16Array>,
   quality: number,
): Promise<ArrayBuffer> {
   if (format === "hdrAvif") {
      if (!(pixels.data instanceof Uint16Array))
         throw new Error("HDR needs 16-bit data");
      const avif = await encodeAvif(
         { data: pixels.data, width: pixels.width, height: pixels.height },
         { bitDepth: 10, quality, speed: 6 },
      );
      return tagAvifColour(new Uint8Array(avif), PRIMARIES_BT2020, TRANSFER_PQ)
         .buffer as ArrayBuffer;
   }
   if (!(pixels.data instanceof Uint8ClampedArray))
      throw new Error("SDR needs 8-bit data");
   const image = new ImageData(
      pixels.data as Uint8ClampedArray<ArrayBuffer>,
      pixels.width,
      pixels.height,
   );
   switch (format) {
      case "avif": {
         const avif = await encodeAvif(image, { quality, speed: 6 });
         return tagAvifColour(new Uint8Array(avif), PRIMARIES_BT709, TRANSFER_SRGB)
            .buffer as ArrayBuffer;
      }
      case "webp":
         return encodeWebp(image, { quality, method: 4 });
      case "jpg":
         return encodeJpeg(image, { quality, progressive: true });
      case "png":
         return optimisePng(image, { level: 2 });
   }
}

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener(
   "message",
   (event: MessageEvent<{ id: number } & WorkerRequest>) => {
      const { id, ...request } = event.data;
      const reply = (
         response: WorkerResponse,
         transfer: Array<Transferable> = [],
      ): void => scope.postMessage(response, transfer);
      void (async () => {
         try {
            switch (request.type) {
               case "prepare":
                  reply({ id, ok: true, value: await prepare(request.file) });
                  break;
               case "variant": {
                  const { value, transfer } = variant(request.width, request.withHdr);
                  reply({ id, ok: true, value }, transfer);
                  break;
               }
               case "encode": {
                  const bytes = await encode(
                     request.format,
                     request.pixels,
                     request.quality,
                  );
                  reply({ id, ok: true, value: bytes }, [bytes]);
                  break;
               }
               case "release":
                  sdrMaster = undefined;
                  hdrMaster = undefined;
                  reply({ id, ok: true, value: null });
                  break;
            }
         } catch (error) {
            reply({
               id,
               ok: false,
               error: error instanceof Error ? error.message : String(error),
            });
         }
      })();
   },
);
