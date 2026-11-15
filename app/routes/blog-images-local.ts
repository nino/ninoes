import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
   localPath,
   localStorageAvailable,
   requireNino,
} from "~/server/blog-images.server";
import { contentTypeFor, VARIANT_KEY_PATTERN } from "~/utils/blog-images";
import type { Route } from "./+types/blog-images-local";

// Stands in for B2 under `bun run dev` when "keep files locally" is on: the
// page PUTs files here and the snippet points here. Production 404s.

export async function loader({ params }: Route.LoaderArgs): Promise<Response> {
   if (!localStorageAvailable) return new Response("Not found", { status: 404 });
   const path = localPath(params["*"]);
   if (path == null) return new Response("Bad path", { status: 400 });
   try {
      return new Response(await readFile(path), {
         headers: { "Content-Type": contentTypeFor(path) },
      });
   } catch {
      return new Response("Not found", { status: 404 });
   }
}

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
   if (!localStorageAvailable) return new Response("Not found", { status: 404 });
   if (request.method !== "PUT") return new Response("Use PUT", { status: 405 });
   await requireNino(request);
   const key = params["*"];
   const path = localPath(key);
   if (!VARIANT_KEY_PATTERN.test(key) || path == null) {
      return new Response("Bad path", { status: 400 });
   }
   await mkdir(dirname(path), { recursive: true });
   await writeFile(path, new Uint8Array(await request.arrayBuffer()));
   return new Response(null, { status: 201 });
}
