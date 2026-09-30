/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MatchEngine } from "./MatchEngine";
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

const SUMMARY_TEXT =
  "[DEMO MODE] Green Leaf Restaurant has 80 surplus meals to distribute. Plan: Shelter A: 50 meals; Shelter B: 30 meals.";

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
    ],
    agentEvents: [
      { id: "e0", workflowId: "abc123", agent: "matching", type: "workflow.started", status: "started", message: "workflow started", timestamp: at },
    ],
    connections: [],
    summary: {
      totalQuantity: 50, unit: "meals", allocationsCount: 1, confirmedCount: 1,
      avgConfidence: 0.85, matchDurationMs: 15, mealsRescued: 50, weightKg: 22.5, co2AvoidedKg: 56.3,
      summaryText: SUMMARY_TEXT,
    },
  };
}

describe("MatchEngine backend summary", () => {
  it("renders the backend verdict string verbatim, not reworded", () => {
    useFoodlinkStore.setState({ workflow: completedRun(), revealedCount: 1, source: "live" });
    render(<MatchEngine />);
    expect(screen.getByText(SUMMARY_TEXT)).toBeTruthy();
  });

  it("renders nothing extra when the response carries no summary", () => {
    const wf = completedRun();
    if (wf.summary) delete wf.summary.summaryText;
    useFoodlinkStore.setState({ workflow: wf, revealedCount: 1, source: "live" });
    render(<MatchEngine />);
    expect(screen.queryByText(/DEMO MODE/)).toBeNull();
    // Allocations still render normally.
    expect(screen.getByText("Shelter A")).toBeTruthy();
  });
});
