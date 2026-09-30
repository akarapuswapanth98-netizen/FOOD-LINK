import { describe, expect, it } from "vitest";
import { compressedGap, formatCountdown, timeAgo } from "./format";

describe("formatCountdown", () => {
  it("formats h:mm:ss and expiry", () => {
    expect(formatCountdown(3723000)).toBe("01:02:03");
    expect(formatCountdown(0)).toBe("expired");
    expect(formatCountdown(-5)).toBe("expired");
  });
});

describe("timeAgo", () => {
  it("handles now, seconds, minutes", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(timeAgo(new Date(now - 2000).toISOString(), now)).toBe("just now");
    expect(timeAgo(new Date(now - 30000).toISOString(), now)).toBe("30s ago");
    expect(timeAgo(new Date(now - 5 * 60000).toISOString(), now)).toBe("5m ago");
  });
  it("handles missing input", () => {
    expect(timeAgo(null)).toBe("no updates yet");
  });
});

describe("compressedGap", () => {
  it("clamps into replay pacing bounds", () => {
    const g = compressedGap("2026-01-01T12:00:00Z", "2026-01-01T12:00:01Z");
    expect(g).toBeGreaterThanOrEqual(450);
    expect(g).toBeLessThanOrEqual(2500);
    expect(compressedGap("bad", "also-bad")).toBe(900);
  });
});
