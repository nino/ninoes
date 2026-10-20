import type { Config } from "@react-router/dev/config";

// Fly ends TLS before the app, so the server sees each request as http:// while
// the browser's Origin header says https://. React Router's check on form
// submissions compares the two and rejects the mismatch, so list our own hosts
// here. PR previews pass theirs in as PREVIEW_HOST (see fly-preview.yml).
const previewHost = process.env.PREVIEW_HOST;

export default {
   // Config options...
   // Server-side render by default, to enable SPA mode set this to `false`
   ssr: true,
   allowedActionOrigins: [
      "ninoes.fly.dev",
      ...(previewHost == null || previewHost === "" ? [] : [previewHost]),
   ],
} satisfies Config;
