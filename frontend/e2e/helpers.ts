import type { APIRequestContext } from "@playwright/test";

/**
 * Shared E2E precondition: backend reachable, seed reset, and provably in
 * LIVE mode serving the Green Leaf registry. Fails fast with a message that
 * points at VITE_API_URL / backend state instead of a downstream assertion.
 */
export async function resetAndAssertLive(request: APIRequestContext): Promise<void> {
  const reset = await request.post("http://localhost:8000/api/foodbridge/demo/reset");
  if (!reset.ok()) {
    throw new Error(
      "E2E precondition failed: backend not reachable at http://localhost:8000 — " +
        "start it (uvicorn app.main:app --port 8000) before running test:e2e.",
    );
  }
  const catalog = await request.get("http://localhost:8000/api/foodbridge/restaurants");
  const body = (await catalog.json().catch(() => null)) as {
    restaurants?: Array<{ name?: string }>;
  } | null;
  const names = (body?.restaurants ?? []).map((r) => r?.name ?? "").join(",");
  if (!names.includes("Green Leaf")) {
    throw new Error(
      "E2E precondition failed: live backend is not serving the Green Leaf registry — " +
        "check the backend seed data and that VITE_API_URL points at the live server.",
    );
  }
}
