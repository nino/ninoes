import { PostHog } from "posthog-node";

// Server-side errors (loaders, actions, SSR, the wishlist translation endpoint)
// go to the same PostHog project as the browser's. Same build-time key and
// host as `app/posthog.ts`, so dev builds and PR previews send nothing.
const key: string | undefined = import.meta.env.VITE_POSTHOG_KEY;
const host: string | undefined = import.meta.env.VITE_POSTHOG_HOST;

const client: PostHog | null =
   key == null || key === "" || host == null || host === ""
      ? null
      : // Send each error straight away: a Fly machine can stop when idle.
        new PostHog(key, { host, flushAt: 1, flushInterval: 0 });

export function reportServerError(error: unknown, request: Request): void {
   if (client == null) {
      return;
   }
   const url = new URL(request.url);
   client.captureException(error, "server", {
      $process_person_profile: false,
      method: request.method,
      path: url.pathname,
   });
}
