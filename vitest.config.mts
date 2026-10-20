import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/qa/**", "tests/e2e/**", "node_modules/**", ".next/**"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
