import { describe, expect, it } from "vitest";
import { buildActivateMessage } from "../src/lib/activate.js";

describe("buildActivateMessage", () => {
  it("builds switch tab message", () => {
    expect(
      buildActivateMessage({ kind: "open", id: 3, windowId: 9 })
    ).toEqual({ type: "SWITCH_TAB", tabId: 3, windowId: 9 });
  });

  it("builds restore session message", () => {
    expect(
      buildActivateMessage({
        kind: "closed",
        sessionId: "s1",
        url: "https://example.com",
      })
    ).toEqual({
      type: "RESTORE_SESSION",
      sessionId: "s1",
      url: "https://example.com",
    });
  });

  it("builds open url message", () => {
    expect(
      buildActivateMessage({ kind: "history", url: "https://example.com" })
    ).toEqual({ type: "OPEN_URL", url: "https://example.com" });
  });

  it("returns null for unknown kinds", () => {
    expect(buildActivateMessage({ kind: "unknown" })).toBeNull();
  });
});
