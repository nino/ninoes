import type { User } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { z } from "zod";
import { presignUrl } from "~/server/s3-presign.server";
import { getSupabaseServerClient } from "~/supabase/supabase.server";
import {
   BLOG_IMAGE_CACHE_CONTROL,
   contentTypeFor,
   type SignRequest,
   type SignResponse,
} from "~/utils/blog-images";
import { NINO_USER_ID } from "~/utils/users";

// Server side of /blog-images. The browser does all the image work and uploads
// the files straight to Backblaze B2; the server only checks that it's Nino
// and signs one short-lived S3 PUT URL per file. The B2 key stays here.

/** A problem to show the user as is, rather than a bug. */
export class BlogImageError extends Error {}

// ------------------------------------------------------------ access

export type Viewer =
   { kind: "signed-out" } | { kind: "other" } | { kind: "nino"; user: User };

export async function getViewer(request: Request): Promise<Viewer> {
   const { supabase } = getSupabaseServerClient(request, new Headers());
   const { data } = await supabase.auth.getUser();
   if (data.user == null) return { kind: "signed-out" };
   return data.user.id === NINO_USER_ID
      ? { kind: "nino", user: data.user }
      : { kind: "other" };
}

/** Throws a 401 or 403 response unless Nino is signed in. */
export async function requireNino(request: Request): Promise<User> {
   const viewer = await getViewer(request);
   if (viewer.kind === "signed-out")
      throw new Response("Sign in first", { status: 401 });
   if (viewer.kind === "other") throw new Response("Forbidden", { status: 403 });
   return viewer.user;
}

/** "Keep files locally" only exists under `bun run dev`, for trying things out. */
export const localStorageAvailable = import.meta.env.DEV;

// ------------------------------------------------------------ config

const B2_VARS = [
   "B2_APPLICATION_KEY_ID",
   "B2_APPLICATION_KEY",
   "BUCKET_NAME",
   "BUCKET_URL",
] as const;
type B2Config = Record<(typeof B2_VARS)[number], string>;

/** The standalone uploader's config, used locally for anything `.env` doesn't set. */
export const FALLBACK_CONFIG_FILE = join(homedir(), ".config", "image-uploader", ".env");

function parseEnvFile(path: string): Partial<Record<string, string>> {
   if (!existsSync(path)) return {};
   const values: Partial<Record<string, string>> = {};
   for (const rawLine of readFileSync(path, "utf8").split("\n")) {
      const line = rawLine.trim().replace(/^export\s+/, "");
      if (line === "" || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      let value = line.slice(eq + 1).trim();
      if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
      values[line.slice(0, eq).trim()] = value;
   }
   return values;
}

/**
 * B2 settings from the environment (Fly secrets in production; Bun loads
 * `.env` locally), else the fallback file.
 */
function readB2Config(): { config: B2Config } | { missing: Array<string> } {
   const fallback = parseEnvFile(FALLBACK_CONFIG_FILE);
   // An empty value, as copied from .env.example, counts as unset.
   const lookup = (name: string): string => {
      const value = process.env[name];
      return value == null || value === "" ? (fallback[name] ?? "") : value;
   };
   const missing = B2_VARS.filter((name) => lookup(name) === "");
   if (missing.length > 0) return { missing };
   const config = {
      B2_APPLICATION_KEY_ID: lookup("B2_APPLICATION_KEY_ID"),
      B2_APPLICATION_KEY: lookup("B2_APPLICATION_KEY"),
      BUCKET_NAME: lookup("BUCKET_NAME"),
      BUCKET_URL: lookup("BUCKET_URL"),
   };
   if (!config.BUCKET_URL.endsWith("/")) config.BUCKET_URL += "/";
   return { config };
}

/** B2 variables that are still missing; empty when uploads can go to B2. */
export function missingB2Config(): Array<string> {
   const b2 = readB2Config();
   return "missing" in b2 ? b2.missing : [];
}

// ------------------------------------------------------------ B2 S3 endpoint

const AuthorizeSchema = z.object({
   apiInfo: z.object({ storageApi: z.object({ s3ApiUrl: z.string() }) }),
});

let s3Endpoint:
   { promise: Promise<{ url: string; region: string }>; expires: number } | undefined;

/**
 * The bucket's S3 endpoint and region, e.g. s3.us-west-001.backblazeb2.com,
 * which B2 reports when authorising. Asked once and kept for a day.
 */
function getS3Endpoint(config: B2Config): Promise<{ url: string; region: string }> {
   if (s3Endpoint != null && s3Endpoint.expires > Date.now()) return s3Endpoint.promise;
   const promise = (async () => {
      let response: Response;
      try {
         response = await fetch(
            "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
            {
               headers: {
                  Authorization: `Basic ${btoa(`${config.B2_APPLICATION_KEY_ID}:${config.B2_APPLICATION_KEY}`)}`,
               },
            },
         );
      } catch (error) {
         throw new BlogImageError(
            `Couldn't reach B2: ${error instanceof Error ? error.message : String(error)}`,
         );
      }
      if (!response.ok) {
         throw new BlogImageError(
            `B2 didn't accept the key (HTTP ${response.status}). Check B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY.`,
         );
      }
      const url = AuthorizeSchema.parse(await response.json()).apiInfo.storageApi
         .s3ApiUrl;
      const region = /^https:\/\/s3\.([^.]+)\./.exec(url)?.[1];
      if (region == null) throw new BlogImageError(`Unexpected B2 S3 endpoint: ${url}`);
      return { url, region };
   })();
   s3Endpoint = { promise, expires: Date.now() + 24 * 60 * 60 * 1000 };
   promise.catch(() => (s3Endpoint = undefined));
   return promise;
}

// ------------------------------------------------------------ signing

/** Where "keep files locally" puts files; served by /blog-images/local/*. */
export const LOCAL_ROOT = join(tmpdir(), "ninoes-blog-images");

/** The path under LOCAL_ROOT for `relative`, or undefined if it escapes it. */
export function localPath(relative: string): string | undefined {
   const path = resolve(LOCAL_ROOT, relative);
   return path.startsWith(LOCAL_ROOT + sep) ? path : undefined;
}

/** How long a signed upload URL works. Encoding is done before asking. */
const UPLOAD_URL_SECONDS = 15 * 60;

/** Upload URLs for `request.keys`, which the schema has already checked. */
export async function signUploads(
   request: SignRequest,
   origin: string,
): Promise<SignResponse> {
   const folders = new Set(request.keys.map((key) => key.split("/")[1]));
   if (folders.size !== 1) throw new BlogImageError("All files must be for one image.");

   if (request.storage === "local") {
      if (!localStorageAvailable) throw new BlogImageError("Local storage is dev-only.");
      return {
         uploads: request.keys.map((key) => {
            const url = `${origin}/blog-images/local/${key}`;
            return {
               key,
               uploadUrl: url,
               headers: { "Content-Type": contentTypeFor(key) },
               publicUrl: url,
            };
         }),
      };
   }

   const b2 = readB2Config();
   if ("missing" in b2) {
      throw new BlogImageError(`B2 isn't set up: ${b2.missing.join(", ")} missing.`);
   }
   const { config } = b2;
   const endpoint = await getS3Endpoint(config);
   return {
      uploads: request.keys.map((key) => {
         // Signed, so the upload has to send them with exactly these values.
         const headers = {
            "Content-Type": contentTypeFor(key),
            "Cache-Control": BLOG_IMAGE_CACHE_CONTROL,
         };
         return {
            key,
            uploadUrl: presignUrl({
               method: "PUT",
               url: `${endpoint.url}/${config.BUCKET_NAME}/${key}`,
               region: endpoint.region,
               accessKeyId: config.B2_APPLICATION_KEY_ID,
               secretAccessKey: config.B2_APPLICATION_KEY,
               expiresSeconds: UPLOAD_URL_SECONDS,
               headers,
            }),
            headers,
            publicUrl: config.BUCKET_URL + key,
         };
      }),
   };
}
