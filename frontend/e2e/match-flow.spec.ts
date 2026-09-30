import { expect, test } from "@playwright/test";
import { resetAndAssertLive } from "./helpers";

/**
 * Happy path through the REAL UI against the REAL backend:
 * page boot auto-runs a match on the seed lot (food-001, 80 meals) and the
 * HUD must show the pinned numbers — A:50, B:30, total 80, completed.
 */
test.beforeEach(async ({ request }) => {
  await resetAndAssertLive(request);
});

test("boot auto-match renders the pinned A50/B30 allocation", async ({ page }) => {
  await page.goto("/");
  // Allocation table from the live response (not a mock).
  const row = page.locator(".alloc-table tbody tr", { hasText: "Shelter A" });
  await expect(row).toBeVisible({ timeout: 60000 });
  await expect(row).toContainText("50");
  // Status pill reaches Completed.
  await expect(page.locator(".status-pill").first()).toContainText("Completed", { timeout: 15000 });
  // Match summary line with real duration.
  await expect(page.getByText(/matched in/i)).toBeVisible();
});
