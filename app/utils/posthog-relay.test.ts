import { afterEach, expect, mock, test } from "bun:test";
import {
   relay,
   relayResponseHeaders,
   upstreamRequestHeaders,
   upstreamUrl,
} from "./posthog-relay";

const realFetch = globalThis.fetch;
afterEach(() => {
   globalThis.fetch = realFetch;
});

test("sends events to the API host and scripts to the assets host", () => {
   expect(upstreamUrl("i/v0/e/", "")).toBe("https://eu.i.posthog.com/i/v0/e/");
   expect(upstreamUrl("flags/", "?v=2")).toBe("https://eu.i.posthog.com/flags/?v=2");
   expect(upstreamUrl("static/array.js", "")).toBe(
      "https://eu-assets.i.posthog.com/static/array.js",
   );
   expect(upstreamUrl("array/phc_x/config.js", "")).toBe(
      "https://eu-assets.i.posthog.com/array/phc_x/config.js",
   );
});

test("passes on the body's headers and the caller's address, but not cookies", () => {
   const request = new Request("https://ninoes.fly.dev/relay/e/", {
      method: "POST",
      headers: {
         "Content-Type": "text/plain",
         Cookie: "sb-access-token=secret",
         Authorization: "Bearer secret",
         "Fly-Client-IP": "203.0.113.7",
      },
   });
   const headers = upstreamRequestHeaders(request);
   expect(headers.get("content-type")).toBe("text/plain");
   expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
   expect(headers.get("cookie")).toBeNull();
   expect(headers.get("authorization")).toBeNull();
});

test("drops response headers that no longer match the body", () => {
   const headers = relayResponseHeaders(
      new Headers({
         "Content-Type": "application/json",
         "Content-Encoding": "gzip",
         "Content-Length": "12",
         "Set-Cookie": "x=1",
      }),
   );
   expect(headers.get("content-type")).toBe("application/json");
   expect(headers.get("content-encoding")).toBeNull();
   expect(headers.get("content-length")).toBeNull();
   expect(headers.get("set-cookie")).toBeNull();
});

test("forwards a POST with its body and returns PostHog's answer", async () => {
   const fetchMock = mock(
      async (): Promise<Response> =>
         new Response('{"status":"Ok"}', {
            status: 200,
            headers: { "Content-Type": "application/json" },
         }),
   );
   globalThis.fetch = fetchMock as unknown as typeof fetch;

   const response = await relay(
      new Request("https://ninoes.fly.dev/relay/i/v0/e/?ip=0", {
         method: "POST",
         body: '{"event":"x"}',
         headers: { "Content-Type": "application/json" },
      }),
      "i/v0/e/",
   );

   expect(response.status).toBe(200);
   expect(await response.text()).toBe('{"status":"Ok"}');
   const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
   expect(url).toBe("https://eu.i.posthog.com/i/v0/e/?ip=0");
   expect(init.method).toBe("POST");
   expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"event":"x"}');
});

test("answers 502 when PostHog can't be reached", async () => {
   globalThis.fetch = mock(async (): Promise<Response> => {
      throw new TypeError("fetch failed");
   }) as unknown as typeof fetch;
   const response = await relay(
      new Request("https://ninoes.fly.dev/relay/flags/"),
      "flags/",
   );
   expect(response.status).toBe(502);
});
