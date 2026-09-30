import { defineConfig } from "@playwright/test";

/**
 * E2E against the REAL backend (http://localhost:8000, reset per test).
 * The dev server is reused when already running; backend must be up
 * (uvicorn app.main:app --port 8000) — asserted implicitly by reset.
 * Chromium only. Unit suite (`npm test`) is untouched and stays fast.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90000,
  retries: 0,
  // Serial: both specs share one backend + seed lot; parallel workers race it.
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
