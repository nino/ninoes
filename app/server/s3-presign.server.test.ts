import { expect, test } from "bun:test";
import { presignUrl, uriEncode } from "./s3-presign.server";

// The worked example from AWS's "Authenticating Requests: Using Query
// Parameters" documentation, with its published signature.
test("matches AWS's presigned URL example", () => {
   const url = presignUrl({
      method: "GET",
      url: "https://examplebucket.s3.amazonaws.com/test.txt",
      region: "us-east-1",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      expiresSeconds: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
   });
   expect(url).toBe(
      "https://examplebucket.s3.amazonaws.com/test.txt" +
         "?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
         "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request" +
         "&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host" +
         "&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
   );
});

test("signs extra headers and lists them", () => {
   const url = new URL(
      presignUrl({
         method: "PUT",
         url: "https://s3.us-west-001.backblazeb2.com/Bucket/images/a_1/a_1_800.avif",
         region: "us-west-001",
         accessKeyId: "key",
         secretAccessKey: "secret",
         expiresSeconds: 600,
         headers: { "Content-Type": "image/avif", "Cache-Control": "public" },
      }),
   );
   expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe(
      "cache-control;content-type;host",
   );
   expect(url.pathname).toBe("/Bucket/images/a_1/a_1_800.avif");
});

test("encodes like SigV4 wants", () => {
   expect(uriEncode("a b+c/~d")).toBe("a%20b%2Bc%2F~d");
   expect(uriEncode("a/b", true)).toBe("a/b");
   expect(uriEncode("é")).toBe("%C3%A9");
});
