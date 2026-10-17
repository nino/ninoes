/**
 * Forwards PostHog traffic from `/relay/*` to PostHog's EU cloud.
 *
 * Tracker blockers (browser extensions, and DNS blockers on phones) block
 * `*.posthog.com`, so error reports from a blocked device never arrive. Sent
 * to this site instead, they get through. Nino's other apps (health-tracker,
 * timelapse-app, worktree-manager) use `https://ninoes.fly.dev/relay` as their
 * PostHog host too, so this route has to keep working for them.
 *
 * The path deliberately avoids words like "posthog", "analytics" or "ingest",
 * which blocker lists match on.
 */
export const relayPrefix = "/relay";

const apiHost = "https://eu.i.posthog.com";
// posthog-js loads its extension scripts and remote config from here.
const assetsHost = "https://eu-assets.i.posthog.com";

/** Where a request for `path` (the part after `/relay/`) goes. */
export function upstreamUrl(path: string, search: string): string {
   const host =
      path.startsWith("static/") || path.startsWith("array/") ? assetsHost : apiHost;
   return `${host}/${path}${search}`;
}

// Request headers worth passing on. Everything else stays here: above all
// cookies, which carry this site's Supabase session.
const forwardedRequestHeaders = [
   "accept",
   "content-encoding",
   "content-type",
   "origin",
   "user-agent",
];

export function upstreamRequestHeaders(request: Request): Headers {
   const headers = new Headers();
   for (const name of forwardedRequestHeaders) {
      const value = request.headers.get(name);
      if (value != null) {
         headers.set(name, value);
      }
   }
   // Fly puts the caller's address here; without it PostHog would see Fly's.
   const client = request.headers.get("Fly-Client-IP");
   if (client != null) {
      headers.set("X-Forwarded-For", client);
   }
   return headers;
}

// Response headers that no longer describe the body once fetch has read and
// decompressed it, or that belong to the hop rather than the content.
const droppedResponseHeaders = [
   "connection",
   "content-encoding",
   "content-length",
   "set-cookie",
   "transfer-encoding",
];

export function relayResponseHeaders(upstream: Headers): Headers {
   const headers = new Headers(upstream);
   for (const name of droppedResponseHeaders) {
      headers.delete(name);
   }
   return headers;
}

export async function relay(request: Request, path: string): Promise<Response> {
   const url = new URL(request.url);
   const hasBody = request.method !== "GET" && request.method !== "HEAD";
   let upstream: Response;
   try {
      upstream = await fetch(upstreamUrl(path, url.search), {
         method: request.method,
         headers: upstreamRequestHeaders(request),
         body: hasBody ? await request.arrayBuffer() : undefined,
      });
   } catch {
      // PostHog being unreachable is not this site's error, so it isn't reported.
      return new Response("PostHog is unreachable", { status: 502 });
   }
   return new Response(upstream.body, {
      status: upstream.status,
      headers: relayResponseHeaders(upstream.headers),
   });
}
