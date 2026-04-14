import { sentryVitePlugin } from "@sentry/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    sentryVitePlugin({
      org: "none-9or",
      project: "ninoes",
    }),
  ],

  resolve: {
    tsconfigPaths: true,
  },

  build: {
    sourcemap: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: "app.css",
      },
    },
  },
});
