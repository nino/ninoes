import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
   plugins: [tailwindcss(), reactRouter()],

   resolve: { tsconfigPaths: true },

   // The /blog-images encoders load their .wasm files relative to their own
   // modules, which pre-bundling would break; their worker splits into chunks.
   optimizeDeps: {
      exclude: ["@jsquash/avif", "@jsquash/jpeg", "@jsquash/oxipng", "@jsquash/webp"],
   },
   worker: { format: "es" },

   build: {
      // Public source maps let PostHog show readable stack traces.
      sourcemap: true,
      cssCodeSplit: false,
      rollupOptions: { output: { assetFileNames: "app.css" } },
   },
});
