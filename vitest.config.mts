import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
   test: {
      environment: "jsdom",
      include: ["app/**/*.test.{ts,tsx}"],
      // Expose afterEach etc. as globals so Testing Library's automatic
      // cleanup-between-tests registers itself.
      globals: true,
   },
   resolve: {
      alias: {
         "~": fileURLToPath(new URL("./app", import.meta.url)),
      },
   },
});
