import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Unit tests: `npm test` (no network). Database tests: `npm run test:db` (needs DIRECT_URL in .env).
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside the Next.js server build; tests run server code directly.
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: mode === "db" ? ["tests/db/**/*.test.ts"] : ["tests/unit/**/*.test.ts"],
    env: loadEnv("", process.cwd(), ""),
    testTimeout: mode === "db" ? 60_000 : 5_000,
    hookTimeout: mode === "db" ? 120_000 : 10_000,
    fileParallelism: mode !== "db",
  },
}));
