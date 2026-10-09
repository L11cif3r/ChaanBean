import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/__tests__/**/*.test.ts", "supabase/functions/**/*.test.ts"],
    // Database tests only run when asked: RUN_DB_TESTS=1 npm test
    exclude: process.env.RUN_DB_TESTS ? [] : ["src/**/__tests__/**/*.db.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
