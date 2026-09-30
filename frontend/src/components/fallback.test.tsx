/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NetworkFallback } from "./NetworkFallback";
import { useFoodlinkStore } from "../store/useFoodlinkStore";
import type { MatchWorkflow } from "../data/schemas";

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
  });
});

function liveStyleWorkflow(): MatchWorkflow {
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
      { id: "e1", workflowId: "abc123", agent: "restaurant", type: "live-update", status: "completed", message: "Green Leaf Restaurant offers 80 cooked meals", timestamp: at },
      { id: "e2", workflowId: "abc123", agent: "shelter", type: "live-update", status: "completed", message: "3 candidate shelters", timestamp: at },
      { id: "e3", workflowId: "abc123", agent: "matching", type: "live-update", status: "completed", message: "allocated 80/80 meals", timestamp: at },
      { id: "e4", workflowId: "abc123", agent: "logistics", type: "live-update", status: "completed", message: "2 delivery stops", timestamp: at },
      { id: "e5", workflowId: "abc123", agent: "verification", type: "live-update", status: "completed", message: "80/80 meals verified", timestamp: at },
    ],
    connections: [],
    summary: {
      totalQuantity: 80, unit: "meals", allocationsCount: 2, confirmedCount: 2,
      avgConfidence: 0.74, matchDurationMs: 15, mealsRescued: 80, weightKg: 36, co2AvoidedKg: 90,
    },
  };
}

describe("NetworkFallback (no-WebGL DOM equivalent)", () => {
  it("renders all six agents with live status, no 3D required", () => {
    useFoodlinkStore.setState({ workflow: liveStyleWorkflow(), revealedCount: 6, source: "live" });
    render(<NetworkFallback />);
    for (const name of [
      "Restaurant Agent", "Matching Agent", "Shelter Agent",
      "Negotiation Agent", "Logistics Agent", "Verification Agent",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // Real data reaches the DOM: quantities, allocation verdict, event count.
    expect(screen.getByText(/offers 80 cooked meals/)).toBeTruthy();
    expect(screen.getByText(/allocated 80\/80 meals/)).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("stays honest with zero events", () => {
    const wf = liveStyleWorkflow();
    wf.agentEvents = [];
    useFoodlinkStore.setState({ workflow: wf, revealedCount: 0, source: "live" });
    render(<NetworkFallback />);
    expect(screen.getAllByText(/Awaiting/).length).toBe(6);
  });
});
