import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit suite only: Playwright specs in e2e/ run via `npm run test:e2e`.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
