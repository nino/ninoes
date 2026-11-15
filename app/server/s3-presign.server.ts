import { createHash, createHmac } from "node:crypto";

// AWS Signature Version 4 query-string signing ("presigned URLs"), enough for
// Backblaze B2's S3-compatible API. The URL grants one request to one object
// until it expires; the secret never leaves the server.

export interface PresignOptions {
   method: "GET" | "PUT";
   /** e.g. https://s3.us-west-001.backblazeb2.com/Bucket/path/to/file.avif */
   url: string;
   region: string;
   accessKeyId: string;
   secretAccessKey: string;
   expiresSeconds: number;
   /** Headers the request must send with exactly these values. */
   headers?: Record<string, string>;
   now?: Date;
}

/** RFC 3986 encoding, as SigV4 wants: only A–Z a–z 0–9 - . _ ~ stay as they are. */
export function uriEncode(value: string, keepSlash = false): string {
   return Array.from(new TextEncoder().encode(value), (byte) => {
      const char = String.fromCharCode(byte);
      if (/[A-Za-z0-9\-._~]/.test(char) || (keepSlash && char === "/")) return char;
      return `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
   }).join("");
}

const hmac = (key: Buffer | string, data: string): Buffer =>
   createHmac("sha256", key).update(data).digest();

export function presignUrl(options: PresignOptions): string {
   const url = new URL(options.url);
   const now = options.now ?? new Date();
   const amzDate = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
   const day = amzDate.slice(0, 8);
   const scope = `${day}/${options.region}/s3/aws4_request`;

   const headers: Record<string, string> = { host: url.host };
   for (const [name, value] of Object.entries(options.headers ?? {})) {
      headers[name.toLowerCase()] = value.trim();
   }
   const headerNames = Object.keys(headers).toSorted();
   const signedHeaders = headerNames.join(";");

   const query: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${options.accessKeyId}/${scope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(options.expiresSeconds),
      "X-Amz-SignedHeaders": signedHeaders,
   };
   const canonicalQuery = Object.keys(query)
      .toSorted()
      .map((key) => `${uriEncode(key)}=${uriEncode(query[key] ?? "")}`)
      .join("&");
   // The path is already percent-encoded in a URL; decode and re-encode it
   // per segment so it matches what S3 computes.
   const canonicalPath = decodeURIComponent(url.pathname)
      .split("/")
      .map((segment) => uriEncode(segment))
      .join("/");

   const canonicalRequest = [
      options.method,
      canonicalPath,
      canonicalQuery,
      headerNames.map((name) => `${name}:${headers[name]}\n`).join(""),
      signedHeaders,
      "UNSIGNED-PAYLOAD",
   ].join("\n");
   const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
   ].join("\n");

   const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${options.secretAccessKey}`, day), options.region), "s3"),
      "aws4_request",
   );
   const signature = hmac(signingKey, stringToSign).toString("hex");
   return `${url.origin}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
