import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Tests that touch the database read DIRECT_URL and BLIND_INDEX_KEY from .env / .env.local.
loadEnvConfig(process.cwd());

// End-to-end tests: `npm run test:e2e`. Starts the dev server on port 3400 unless one is already running.
const PORT = 3400;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    // PRD 7 common rules: responsive from 360 px phone width to desktop.
    // channel "chrome" uses the installed Google Chrome, so no browser download is needed locally.
    { name: "phone-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 760 }, channel: process.env.CI ? undefined : "chrome" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 }, channel: process.env.CI ? undefined : "chrome" } },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
