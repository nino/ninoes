/**
 * The origin and host the client actually used, e.g. "https://ninoes.fly.dev".
 *
 * Fly terminates TLS at its edge and forwards to the app over plain http, so
 * `request.url` reports the wrong scheme in production. `X-Forwarded-Proto`
 * carries the one the client really used, and it is the only trustworthy source
 * for building absolute URLs we hand back out.
 */
export function externalOrigin(request: Request): { origin: string; host: string } {
   const url = new URL(request.url);
   // Proxies may append to the header, so the client's own value is first.
   const forwarded = request.headers.get("X-Forwarded-Proto")?.split(",")[0]?.trim();
   const protocol =
      forwarded === undefined || forwarded === "" ? url.protocol : `${forwarded}:`;
   return { origin: `${protocol}//${url.host}`, host: url.host };
}
