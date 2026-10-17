import posthog from "posthog-js";

// PostHog records page views and uncaught exceptions. The key and host come in
// at build time (Fly build args set in fly-deploy.yml) and are only set for
// production deploys: dev builds and PR previews leave them out, so they send
// nothing. It only starts in the browser; server errors go through
// `app/server/posthog.server.ts`.
const key: string | undefined = import.meta.env.VITE_POSTHOG_KEY;
const host: string | undefined = import.meta.env.VITE_POSTHOG_HOST;

export function initPostHog(): void {
   if (import.meta.env.SSR || key == null || key === "" || host == null || host === "") {
      return;
   }
   posthog.init(key, {
      api_host: host,
      // React Router navigates client-side, so count a page view on every
      // history change rather than only on full page loads.
      capture_pageview: "history_change",
      capture_pageleave: true,
      capture_exceptions: true,
      // Core web vitals, in place of Sentry's performance tracing.
      capture_performance: { web_vitals: true },
      // Anonymous visitors get no person profile; nothing here identifies users.
      person_profiles: "identified_only",
      // No session replays: they would use up the free tier.
      disable_session_recording: true,
   });
}

// What `reportError` has already sent, so a boundary that renders the same
// error again doesn't send it twice.
const reported = new WeakSet<object>();

/**
 * Reports an error the root ErrorBoundary shows. Skipped when it is an error
 * React Router serialised from the server render, which `handleError` in
 * `entry.server.tsx` already sent with its real stack (in production the
 * browser only gets this generic stand-in for it).
 */
export function reportError(error: unknown): void {
   if (import.meta.env.SSR || !posthog.__loaded) {
      return;
   }
   if (error instanceof Error && error.message === "Unexpected Server Error") {
      return;
   }
   if (typeof error === "object" && error !== null) {
      if (reported.has(error)) {
         return;
      }
      reported.add(error);
   }
   posthog.captureException(error);
}
