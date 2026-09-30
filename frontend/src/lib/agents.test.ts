import { describe, expect, it } from "vitest";
import { agentDisplay, allAgentDisplays } from "./agents";

describe("agentDisplay", () => {
  it("reports idle with a human label when no events exist", () => {
    const d = agentDisplay([], "matching");
    expect(d.status).toBe("idle");
    expect(d.eventCount).toBe(0);
    expect(d.lastAt).toBeNull();
  });
  it("derives status from the latest event and preserves confidence", () => {
    const d = agentDisplay(
      [
        { id: "1", workflowId: "w", agent: "matching", type: "x", status: "started", message: "go", timestamp: "2026-01-01T10:00:00Z" },
        { id: "2", workflowId: "w", agent: "matching", type: "x", status: "completed", message: "done", timestamp: "2026-01-01T10:00:01Z", metadata: { confidence: 0.9 } },
      ],
      "matching",
    );
    expect(d.status).toBe("completed");
    expect(d.confidence).toBe(0.9);
    expect(d.eventCount).toBe(2);
  });
  it("covers all six agents", () => {
    expect(allAgentDisplays([])).toHaveLength(6);
  });
});
