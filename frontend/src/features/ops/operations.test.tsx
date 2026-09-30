/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OperationsSection } from "./OperationsSection";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import type { MatchWorkflow } from "../../data/schemas";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }),
});

// jsdom has no IntersectionObserver (framer-motion reveals need it).
class StubObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
Object.defineProperty(window, "IntersectionObserver", { writable: true, value: StubObserver });
Object.defineProperty(globalThis, "IntersectionObserver", { writable: true, value: StubObserver });

afterEach(() => {
  cleanup();
  useFoodlinkStore.setState({
    workflow: null,
    revealedCount: 0,
    playing: false,
    loading: false,
    error: null,
    source: null,
    lastUpdated: null,
    stale: false,
    selectedAgent: null,
    lastRequest: null,
  });
});

function completedRun(): MatchWorkflow {
  const at = "2026-01-01T10:00:00Z";
  return {
    id: "abc123",
    status: "completed",
    createdAt: at,
    updatedAt: at,
    source: { id: "rest-001", name: "Green Leaf Restaurant", kind: "source" },
    destinations: [{ id: "shelter-a", name: "Shelter A", kind: "destination" }],
    allocations: [
      { id: "a1", item: "Cooked meals", quantity: 50, unit: "meals", destinationId: "shelter-a", destinationName: "Shelter A", distanceKm: 2.11, etaMinutes: 5.1, confidence: 0.85, status: "confirmed" },
      { id: "a2", item: "Cooked meals", quantity: 30, unit: "meals", destinationId: "shelter-b", destinationName: "Shelter B", distanceKm: 4.73, etaMinutes: 11.4, confidence: 0.62, status: "confirmed" },
    ],
    agentEvents: [
      { id: "e0", workflowId: "abc123", agent: "matching", type: "workflow.started", status: "started", message: "workflow started", timestamp: at },
      { id: "e1", workflowId: "abc123", agent: "verification", type: "live-update", status: "completed", message: "80/80 verified", timestamp: at },
    ],
    connections: [],
    summary: {
      totalQuantity: 80, unit: "meals", allocationsCount: 2, confirmedCount: 2,
      avgConfidence: 0.74, matchDurationMs: 15, mealsRescued: 80, weightKg: 36, co2AvoidedKg: 90,
    },
  };
}

describe("OperationsSection HUD wiring", () => {
  it("renders the pinned A50/B30 numbers from a fixed response", () => {
    const now = Date.now();
    useFoodlinkStore.setState({
      workflow: completedRun(),
      revealedCount: 2,
      source: "live",
      lastUpdated: "2026-01-01T10:00:05Z",
      lastRequest: {
        restaurant_id: "rest-001",
        surplus_items: [{ item: "Cooked meals", quantity: 80, unit: "meals", expires_at: new Date(now + 3600000).toISOString() }],
        constraints: {
          max_distance_km: 10,
          pickup_window_start: new Date(now).toISOString(),
          pickup_window_end: new Date(now + 3600000).toISOString(),
        },
      },
    });
    render(<OperationsSection />);
    // Status, offered vs allocated split, confirmed count, ledger.
    expect(screen.getByText("completed · 1", { exact: true })).toBeTruthy();
    expect(screen.getByText("Meals offered")).toBeTruthy();
    expect(screen.getByText("Meals allocated")).toBeTruthy();
    expect(screen.getByText("Confirmed deliveries")).toBeTruthy();
    // Agent health grid covers the run.
    expect(screen.getByText("Agent health — this run")).toBeTruthy();
  });

  it("reads zero honestly before any run", () => {
    render(<OperationsSection />);
    expect(screen.getByText("Active workflows")).toBeTruthy();
    expect(screen.getByText("none running")).toBeTruthy();
    expect(screen.getByText("No runs yet — dispatch from the surplus board or control panel.")).toBeTruthy();
  });
});
