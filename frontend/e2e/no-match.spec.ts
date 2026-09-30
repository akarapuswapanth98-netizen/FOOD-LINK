import { expect, test } from "@playwright/test";
import { resetAndAssertLive } from "./helpers";

/**
 * Failure path through the REAL UI against the REAL backend: dispatching a
 * dish no shelter can take (non-vegetarian vs vegetarian-only shelters)
 * must render the distinct failed state — never a blank screen.
 */
test.beforeEach(async ({ request }) => {
  await resetAndAssertLive(request);
});

test("incompatible dish renders the failed state, not a blank screen", async ({ page }) => {
  await page.goto("/");
  // Wait for the boot auto-run to settle so lots/registry are live.
  await expect(page.locator(".status-pill").first()).toContainText(/Completed|Failed/, { timeout: 60000 });

  // Drive the control panel with a dish shelters must reject.
  await page.locator("#cp-item").fill("Chicken Biryani");
  await page.locator("#cp-qty").fill("30");
  await page.getByRole("button", { name: /Dispatch workflow/ }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();

  // Distinct failed visual/text state.
  await expect(page.getByText("Match failed", { exact: true })).toBeVisible({ timeout: 90000 });
  await expect(page.getByText("Failed", { exact: true }).first()).toBeVisible();
});
