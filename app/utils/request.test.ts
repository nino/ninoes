import { expect, test } from "vitest";
import { externalOrigin } from "./request";

function build(url: string, headers: Record<string, string> = {}): Request {
   return new Request(url, { headers });
}

test("uses the request's own scheme when nothing is forwarded", () => {
   expect(externalOrigin(build("http://localhost:5173/startrek"))).toStrictEqual({
      origin: "http://localhost:5173",
      host: "localhost:5173",
   });
});

test("prefers the forwarded scheme, which is what the client actually used", () => {
   // What Fly does: TLS at the edge, plain http to the app.
   const request = build("http://ninoes.fly.dev/startrek.ics", {
      "X-Forwarded-Proto": "https",
   });
   expect(externalOrigin(request)).toStrictEqual({
      origin: "https://ninoes.fly.dev",
      host: "ninoes.fly.dev",
   });
});

test("takes the first value when a proxy chain appends to the header", () => {
   const request = build("http://ninoes.fly.dev/startrek.ics", {
      "X-Forwarded-Proto": "https, http",
   });
   expect(externalOrigin(request).origin).toBe("https://ninoes.fly.dev");
});

test("falls back to the request's scheme when the header is empty", () => {
   const request = build("http://ninoes.fly.dev/startrek.ics", {
      "X-Forwarded-Proto": "",
   });
   expect(externalOrigin(request).origin).toBe("http://ninoes.fly.dev");
});
