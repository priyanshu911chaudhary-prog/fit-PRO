import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["quality-tests/**/*.test.ts"],
    setupFiles: ["quality-tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "./mocks/server-only.ts"),
      "@": path.resolve(import.meta.dirname, "../src"),
    },
  },
});

