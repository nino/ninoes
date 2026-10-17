import posthog from "posthog-js";

// PostHog records page views and uncaught exceptions. The key and host come in
// at build time (Fly build args from repository secrets) and are only set for
// production deploys: dev builds and PR previews leave them out, so they send
// nothing. Like Sentry, it only starts in the browser.
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
      // Anonymous visitors get no person profile; nothing here identifies users.
      person_profiles: "identified_only",
      // Sentry already records session replays.
      disable_session_recording: true,
   });
}
