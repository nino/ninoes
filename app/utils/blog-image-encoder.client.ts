import type {
   PrepareResult,
   VariantResult,
   WorkerRequest,
   WorkerResponse,
} from "./blog-image-worker";
import {
   type BlogImage,
   type BlogImageFormat,
   type BlogImageVariant,
   chooseWidths,
   imageName,
   SignResponseSchema,
   variantKey,
} from "./blog-images";

// Browser side of /blog-images: encodes a photo in Web Workers, asks the
// server to sign an upload URL per file, and uploads them straight to B2 (or,
// under `bun run dev`, to the dev server's local folder). `.client` keeps it,
// and the WebAssembly codecs it pulls in, out of the server build.

const QUALITY: Record<BlogImageFormat | "full", number> = {
   hdrAvif: 60,
   avif: 55,
   webp: 78,
   jpg: 80,
   png: 100,
   full: 90,
};

/** A worker that answers one request at a time, in order. */
class WorkerClient {
   private readonly worker = new Worker(
      new URL("./blog-image-worker.ts", import.meta.url),
      { type: "module" },
   );
   private nextId = 0;
   private readonly pending = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
   >();
   /** Set once the worker failed to load or crashed; it's no use after that. */
   dead = false;

   constructor() {
      this.worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
         const response = event.data;
         const waiting = this.pending.get(response.id);
         this.pending.delete(response.id);
         if (response.ok) waiting?.resolve(response.value);
         else waiting?.reject(new Error(response.error));
      });
      this.worker.addEventListener("error", (event) => {
         this.kill(new Error(event.message || "The encoder crashed"));
      });
   }

   private kill(error: Error): void {
      this.dead = true;
      this.worker.terminate();
      for (const waiting of this.pending.values()) waiting.reject(error);
      this.pending.clear();
   }

   call<T>(request: WorkerRequest, transfer: Array<Transferable> = []): Promise<T> {
      if (this.dead) return Promise.reject(new Error("The encoder crashed"));
      const id = this.nextId++;
      return new Promise<T>((resolve, reject) => {
         this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
         this.worker.postMessage({ id, ...request }, transfer);
      });
   }

   terminate(): void {
      this.kill(new Error("Stopped"));
   }
}

/**
 * Runs tasks on a few workers, each taking the next task when it's free. A
 * worker that crashed is replaced, so one bad encode doesn't poison the rest.
 */
class WorkerPool {
   private readonly idle: Array<WorkerClient>;
   private readonly queue: Array<(worker: WorkerClient) => void> = [];

   constructor(size: number) {
      this.idle = Array.from({ length: size }, () => new WorkerClient());
   }

   async run<T>(task: (worker: WorkerClient) => Promise<T>): Promise<T> {
      const worker =
         this.idle.pop() ??
         (await new Promise<WorkerClient>((resolve) => this.queue.push(resolve)));
      try {
         return await task(worker);
      } finally {
         const usable = worker.dead ? new WorkerClient() : worker;
         const next = this.queue.shift();
         if (next == null) this.idle.push(usable);
         else next(usable);
      }
   }

   /** Frees the workers' memory; WebAssembly heaps never shrink otherwise. */
   terminate(): void {
      for (const worker of this.idle) worker.terminate();
      this.idle.length = 0;
   }
}

let reader: WorkerClient | undefined;
let encoders: WorkerPool | undefined;
/** Images go one at a time: the reader worker holds one image's pixels. */
let chain: Promise<unknown> = Promise.resolve();
let waiting = 0;

export interface Progress {
   message: string;
   /** 0–1 across encoding and uploading. */
   fraction: number;
}

function randomId(): string {
   return Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) =>
      b.toString(16).padStart(2, "0"),
   ).join("");
}

/** Runs `tasks` with at most `limit` in flight; stops starting new ones after a failure. */
async function pool(limit: number, tasks: Array<() => Promise<void>>): Promise<void> {
   let next = 0;
   let failed = false;
   await Promise.all(
      Array.from({ length: Math.min(limit, tasks.length) }, async () => {
         while (next < tasks.length && !failed) {
            try {
               await tasks[next++]!();
            } catch (error) {
               failed = true;
               throw error;
            }
         }
      }),
   );
}

const sleep = (ms: number): Promise<void> =>
   new Promise((resolve) => setTimeout(resolve, ms));

/** PUTs one file, retrying network errors and 5xx responses twice. */
async function put(
   url: string,
   headers: Record<string, string>,
   body: ArrayBuffer,
   key: string,
): Promise<void> {
   for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
         response = await fetch(url, { method: "PUT", headers, body });
      } catch (error) {
         if (attempt < 3) {
            await sleep(1000 * attempt);
            continue;
         }
         // A CORS rejection looks like any other network error from here.
         throw new Error(
            `Uploading ${key} failed: ${error instanceof Error ? error.message : String(error)}. ` +
               "If this keeps happening, check the bucket’s CORS rule allows S3 PUT " +
               "with Content-Type and Cache-Control from this site.",
         );
      }
      if (response.ok) return;
      if (response.status >= 500 && attempt < 3) {
         await sleep(1000 * attempt);
         continue;
      }
      throw new Error(
         `Uploading ${key} failed (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`,
      );
   }
}

interface Output {
   key: string;
   width: number;
   format: BlogImageFormat;
   bytes: ArrayBuffer;
}

/**
 * Encodes `file` and uploads the results. Calls queue up and run one at a
 * time, wherever they come from.
 */
export function encodeAndUpload(
   file: File,
   storage: "b2" | "local",
   onProgress: (progress: Progress) => void,
): Promise<BlogImage> {
   waiting++;
   const result = chain.then(() => encodeAndUploadNow(file, storage, onProgress));
   chain = result
      .catch(() => undefined)
      .finally(() => {
         // Nothing left to do: give the memory back.
         if (--waiting === 0) {
            encoders?.terminate();
            encoders = undefined;
            reader?.terminate();
            reader = undefined;
         }
      });
   return result;
}

async function encodeAndUploadNow(
   file: File,
   storage: "b2" | "local",
   onProgress: (progress: Progress) => void,
): Promise<BlogImage> {
   if (reader?.dead !== false) reader = new WorkerClient();
   encoders ??= new WorkerPool(
      Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1)),
   );
   const encoderPool = encoders;
   const imageReader = reader;

   onProgress({ message: "Reading the image…", fraction: 0 });
   const meta = await imageReader.call<PrepareResult>({ type: "prepare", file });
   const fallback: BlogImageFormat = meta.hasAlpha ? "png" : "jpg";
   const formats: Array<BlogImageFormat> = [
      ...(meta.hdr ? (["hdrAvif"] as const) : []),
      "avif",
      "webp",
      fallback,
   ];
   const widths = chooseWidths(meta.width);
   const name = imageName(file.name, randomId());
   const total = widths.length * formats.length + 1;
   let encoded = 0;
   const outputs: Array<Output> = [];
   let failure: unknown;
   const encodeOne = async (
      key: string,
      width: number,
      format: BlogImageFormat,
      pixels: VariantResult["sdr"] | NonNullable<VariantResult["hdr"]>,
      quality: number,
   ): Promise<void> => {
      const bytes = await encoderPool.run((worker) =>
         worker.call<ArrayBuffer>({ type: "encode", format, pixels, quality }),
      );
      outputs.push({ key, width, format, bytes });
      encoded++;
      onProgress({
         message: `Encoded ${encoded} of ${total}`,
         fraction: (encoded / total) * 0.85,
      });
   };
   const jobs: Array<Promise<void>> = [];
   const queueJob = (job: Promise<void>): void => {
      // Seen straight away, so a failure stops the loop and isn't reported
      // as an unhandled rejection while later widths are still resizing.
      job.catch((error: unknown) => (failure ??= error));
      jobs.push(job);
   };

   onProgress({
      message: `Encoding ${widths.length} widths × ${formats.length} formats…`,
      fraction: 0,
   });
   try {
      // Resize one width at a time while earlier widths encode; the largest
      // first, since those take longest.
      const resizeWidths = [...new Set([meta.width, ...widths.toReversed()])];
      for (const width of resizeWidths) {
         if (failure != null) break;
         const needed = widths.includes(width);
         const variant = await imageReader.call<VariantResult>({
            type: "variant",
            width,
            // The full-size file is SDR only.
            withHdr: needed && meta.hdr,
         });
         if (width === meta.width) {
            queueJob(
               encodeOne(
                  variantKey(name, "full", fallback),
                  width,
                  fallback,
                  variant.sdr,
                  QUALITY.full,
               ),
            );
         }
         if (!needed) continue;
         for (const format of formats) {
            const pixels = format === "hdrAvif" ? variant.hdr : variant.sdr;
            if (pixels == null) continue;
            queueJob(
               encodeOne(
                  variantKey(name, width, format),
                  width,
                  format,
                  pixels,
                  QUALITY[format],
               ),
            );
         }
      }
      await Promise.all(jobs);
   } finally {
      if (!imageReader.dead) void imageReader.call({ type: "release" }).catch(() => {});
   }

   onProgress({ message: "Getting upload URLs…", fraction: 0.85 });
   const response = await fetch("/blog-images/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage, keys: outputs.map((o) => o.key) }),
   });
   if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
         error?: string;
      } | null;
      throw new Error(
         response.status === 401
            ? "You’ve been signed out. Sign in again and drop the photo again."
            : (body?.error ?? `Couldn’t sign the uploads (HTTP ${response.status})`),
      );
   }
   const { uploads } = SignResponseSchema.parse(await response.json());

   let uploaded = 0;
   const urls = new Map<string, string>();
   await pool(
      4,
      uploads.map((upload) => async () => {
         const output = outputs.find((o) => o.key === upload.key);
         if (output == null) return;
         await put(upload.uploadUrl, upload.headers, output.bytes, upload.key);
         urls.set(upload.key, upload.publicUrl);
         uploaded++;
         onProgress({
            message: `Uploaded ${uploaded} of ${uploads.length}`,
            fraction: 0.85 + (uploaded / uploads.length) * 0.15,
         });
      }),
   );

   const toVariant = (output: Output): BlogImageVariant => ({
      url: urls.get(output.key) ?? "",
      width: output.width,
      bytes: output.bytes.byteLength,
   });
   const sourcesOf = (format: BlogImageFormat): Array<BlogImageVariant> =>
      outputs
         .filter((o) => o.format === format && !o.key.includes("_full."))
         .toSorted((a, b) => a.width - b.width)
         .map(toVariant);
   const full = outputs.find((o) => o.key.includes("_full."));
   if (full == null) throw new Error("The full-size image is missing");
   return {
      name,
      width: meta.width,
      height: meta.height,
      hdr: meta.hdr,
      fallback: fallback === "png" ? "png" : "jpg",
      originalBytes: file.size,
      full: toVariant(full),
      sources: {
         hdrAvif: sourcesOf("hdrAvif"),
         avif: sourcesOf("avif"),
         webp: sourcesOf("webp"),
         fallback: sourcesOf(fallback),
      },
   };
}
