import { describe, expect, it } from "vitest";
import {
  ApiError,
  eventStatusToAgent,
  normalizeWorkflow,
  statusLabel,
  validateMatchRequest,
} from "./schemas";
import type { MatchRequest } from "./schemas";

const req = (): MatchRequest => ({
  restaurant_id: "r-meghana",
  surplus_items: [
    { item: "Chicken Dum Biryani", quantity: 32, unit: "meals", expires_at: new Date(Date.now() + 3600000).toISOString() },
  ],
  constraints: {
    max_distance_km: 8,
    pickup_window_start: new Date(Date.now() + 60000).toISOString(),
    pickup_window_end: new Date(Date.now() + 3600000).toISOString(),
  },
});

describe("validateMatchRequest", () => {
  it("accepts a valid request", () => {
    expect(() => validateMatchRequest(req())).not.toThrow();
  });
  it("rejects empty restaurant", () => {
    const r = req();
    r.restaurant_id = "  ";
    expect(() => validateMatchRequest(r)).toThrowError(ApiError);
  });
  it("rejects zero quantity", () => {
    const r = req();
    r.surplus_items[0].quantity = 0;
    try {
      validateMatchRequest(r);
      expect.unreachable();
    } catch (e) {
      expect((e as ApiError).status).toBe(422);
    }
  });
  it("rejects inverted pickup window", () => {
    const r = req();
    const tmp = r.constraints.pickup_window_start;
    r.constraints.pickup_window_start = r.constraints.pickup_window_end;
    r.constraints.pickup_window_end = tmp;
    expect(() => validateMatchRequest(r)).toThrowError(/window/i);
  });
  it("skips item checks for direct lot rescue", () => {
    const r = req();
    r.surplus_items = [];
    r.surplus_id = "food-001";
    expect(() => validateMatchRequest(r)).not.toThrow();
  });
});

describe("normalizeWorkflow", () => {
  it("throws on unknown shapes", () => {
    expect(() => normalizeWorkflow(null)).toThrowError(ApiError);
    expect(() => normalizeWorkflow("nope")).toThrowError(ApiError);
    expect(() => normalizeWorkflow([])).toThrowError(ApiError);
  });
  it("normalizes a minimal payload with safe defaults", () => {
    const wf = normalizeWorkflow({ id: "w1", status: "completed" });
    expect(wf.id).toBe("w1");
    expect(wf.status).toBe("completed");
    expect(wf.allocations).toEqual([]);
    expect(wf.agentEvents).toEqual([]);
    expect(wf.connections).toEqual([]);
  });
  it("coerces unknown statuses safely", () => {
    const wf = normalizeWorkflow({ status: "exploded", agentEvents: [{ agent: "chef", status: "dancing" }] });
    expect(wf.status).toBe("failed");
    expect(wf.agentEvents[0].agent).toBe("matching");
  });
});

describe("labels", () => {
  it("maps event status to agent status", () => {
    expect(eventStatusToAgent("started")).toBe("listening");
    expect(eventStatusToAgent("progress")).toBe("processing");
    expect(eventStatusToAgent("completed")).toBe("completed");
    expect(eventStatusToAgent("warning")).toBe("warning");
    expect(eventStatusToAgent("failed")).toBe("failed");
  });
  it("labels every workflow status with text (never color alone)", () => {
    for (const s of ["queued", "running", "completed", "partial", "failed", "timed_out", "empty"] as const) {
      expect(statusLabel(s).length).toBeGreaterThan(0);
    }
  });
});
