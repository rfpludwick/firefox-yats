import { describe, expect, it } from "vitest";
import {
  isExtensionSender,
  isSpotlightUrl,
  isValidTabRef,
  validateOpenUrlMessage,
  validateRestoreSessionMessage,
  validateSwitchTabMessage,
} from "../src/lib/validation.js";

const runtimeId = "ext-id";
const origin = "moz-extension://ext-id/";

describe("isValidTabRef", () => {
  it("accepts positive integer ids", () => {
    expect(isValidTabRef(1, 2)).toBe(true);
  });

  it("rejects invalid ids", () => {
    expect(isValidTabRef(0, 2)).toBe(false);
    expect(isValidTabRef(1.5, 2)).toBe(false);
    expect(isValidTabRef(1, -1)).toBe(false);
  });
});

describe("isExtensionSender", () => {
  it("accepts extension page senders", () => {
    expect(
      isExtensionSender(
        { id: runtimeId, url: `${origin}overlay.html` },
        runtimeId,
        origin
      )
    ).toBe(true);
  });

  it("rejects other extensions and web pages", () => {
    expect(
      isExtensionSender({ id: "other", url: `${origin}overlay.html` }, runtimeId, origin)
    ).toBe(false);
    expect(
      isExtensionSender({ id: runtimeId, url: "https://evil.test" }, runtimeId, origin)
    ).toBe(false);
  });
});

describe("isSpotlightUrl", () => {
  it("matches overlay URLs", () => {
    const overlay = "moz-extension://id/overlay.html";
    expect(isSpotlightUrl(`${overlay}?opener=1`, overlay)).toBe(true);
    expect(isSpotlightUrl("https://example.com", overlay)).toBe(false);
  });
});

describe("message validators", () => {
  it("validates switch tab messages", () => {
    expect(validateSwitchTabMessage({ tabId: 1, windowId: 2 }).ok).toBe(true);
    expect(validateSwitchTabMessage({ tabId: 0, windowId: 2 }).ok).toBe(false);
  });

  it("validates restore session messages", () => {
    expect(validateRestoreSessionMessage({ sessionId: "abc" }).ok).toBe(true);
    expect(validateRestoreSessionMessage({ sessionId: "" }).ok).toBe(false);
  });

  it("validates open url messages", () => {
    const isHttp = (url) => url.startsWith("https://");
    expect(validateOpenUrlMessage({ url: "https://example.com" }, isHttp).ok).toBe(true);
    expect(validateOpenUrlMessage({ url: "javascript:1" }, isHttp).ok).toBe(false);
  });
});
