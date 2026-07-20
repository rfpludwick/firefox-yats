import { describe, expect, it } from "vitest";
import { formatLastVisit } from "../src/lib/format.js";

describe("formatLastVisit", () => {
  const now = Date.parse("2026-01-10T12:00:00Z");

  it("returns empty for falsy timestamps", () => {
    expect(formatLastVisit(0, now)).toBe("");
  });

  it("formats recent visits", () => {
    expect(formatLastVisit(now - 30_000, now)).toBe("Visited just now");
    expect(formatLastVisit(now - 5 * 60_000, now)).toBe("Visited 5m ago");
    expect(formatLastVisit(now - 3 * 60 * 60_000, now)).toBe("Visited 3h ago");
    expect(formatLastVisit(now - 2 * 24 * 60 * 60_000, now)).toBe("Visited 2d ago");
  });
});
