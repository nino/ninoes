import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
   plugins: [tailwindcss(), reactRouter()],

   resolve: { tsconfigPaths: true },

   build: {
      // Public source maps let PostHog show readable stack traces.
      sourcemap: true,
      cssCodeSplit: false,
      rollupOptions: { output: { assetFileNames: "app.css" } },
   },
});
