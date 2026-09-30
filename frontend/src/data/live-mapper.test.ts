import { describe, expect, it } from "vitest";
import { mapLiveMatch, prettifyFoodType } from "./live-mapper";
import type { LiveMatchResponse } from "./live-mapper";

const resp = (over: Partial<LiveMatchResponse> = {}): LiveMatchResponse => ({
  success: true,
  workflow_id: "abc123",
  workflow_status: "completed",
  allocation: [
    { shelter_id: "shelter-a", shelter_name: "Shelter A", meals: 50, distance_km: 2.11, score: 0.8516 },
    { shelter_id: "shelter-b", shelter_name: "Shelter B", meals: 30, distance_km: 4.73, score: 0.6178 },
  ],
  agent_events: [
    { workflow_id: "abc123", agent: "coordinator", status: "running", detail: "workflow started", timestamp: "2026-01-01T10:00:00Z" },
    { workflow_id: "abc123", agent: "restaurant", status: "completed", detail: "offers 80", timestamp: "2026-01-01T10:00:01Z" },
    { workflow_id: "abc123", agent: "matching", status: "completed", detail: "allocated", timestamp: "2026-01-01T10:00:02Z" },
    { workflow_id: "abc123", agent: "logistics", status: "completed", detail: "routed", timestamp: "2026-01-01T10:00:03Z" },
    { workflow_id: "abc123", agent: "verification", status: "completed", detail: "verified", timestamp: "2026-01-01T10:00:04Z" },
  ],
  total_allocated: 80,
  unallocated: 0,
  summary: "done",
  summary_source: "deterministic",
  retry_count: 0,
  metadata: {
    duration_ms: 15,
    logistics: { batches: [
      { shelter_id: "shelter-a", eta_minutes: 5.1 },
      { shelter_id: "shelter-b", eta_minutes: 11.4 },
    ] },
  },
  ...over,
});

const ctx = {
  lot: {
    id: "food-001", restaurant_id: "rest-001", meal_count: 80,
    food_type: "cooked_meals", dietary_tags: ["vegetarian"],
    expires_at: "2026-01-01T15:00:00Z", status: "available",
  },
  restaurant: {
    id: "rest-001", name: "Green Leaf Restaurant", lat: 17.42, lon: 78.48,
    address: "12 Banjara Lane", cuisine_types: ["veg"],
  },
  shelters: [
    { id: "shelter-a", name: "Shelter A", lat: 0, lon: 0, capacity: 60, current_occupancy: 10, urgency: "high", address: "" },
    { id: "shelter-b", name: "Shelter B", lat: 0, lon: 0, capacity: 40, current_occupancy: 10, urgency: "medium", address: "" },
  ],
};

describe("mapLiveMatch", () => {
  it("maps the pinned A50/B30 regression", () => {
    const wf = mapLiveMatch(resp(), ctx);
    expect(wf.status).toBe("completed");
    expect(wf.allocations.map((a) => a.quantity)).toEqual([50, 30]);
    expect(wf.summary?.mealsRescued).toBe(80);
  });
  it("maps coordinator onto matching and keeps real timestamps", () => {
    const wf = mapLiveMatch(resp(), ctx);
    expect(wf.agentEvents[0]).toMatchObject({ agent: "matching", status: "started" });
    expect(wf.agentEvents[0].timestamp).toBe("2026-01-01T10:00:00Z");
    expect(wf.createdAt).toBe("2026-01-01T10:00:00Z");
  });
  it("uses real per-stop ETAs and scores", () => {
    const wf = mapLiveMatch(resp(), ctx);
    expect(wf.allocations[0].etaMinutes).toBe(5.1);
    expect(wf.allocations[0].confidence).toBe(0.85);
  });
  it("maps failed and timeout statuses", () => {
    expect(mapLiveMatch(resp({ workflow_status: "failed" }), ctx).status).toBe("failed");
    expect(mapLiveMatch(resp({ workflow_status: "timeout" }), ctx).status).toBe("timed_out");
  });
  it("prettifies food types", () => {
    expect(prettifyFoodType("cooked_meals")).toBe("Cooked Meals");
    expect(prettifyFoodType("")).toBe("");
  });
});
