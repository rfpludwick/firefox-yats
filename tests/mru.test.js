import { describe, expect, it } from "vitest";
import {
  isCloseCausedActivation,
  pushTabMru,
  removeTabMru,
  shouldFocusLastOpenTab,
} from "../src/lib/mru.js";

describe("pushTabMru", () => {
  it("moves tab to front and deduplicates", () => {
    const map = new Map([[1, [2, 3, 4]]]);
    pushTabMru(map, 1, 3, 50);
    expect(map.get(1)).toEqual([3, 2, 4]);
  });

  it("caps stack depth", () => {
    const map = new Map();
    for (let i = 1; i <= 5; i++) {
      pushTabMru(map, 1, i, 3);
    }
    expect(map.get(1)).toEqual([5, 4, 3]);
  });
});

describe("removeTabMru", () => {
  it("removes tab from stack", () => {
    const map = new Map([[1, [5, 4, 3]]]);
    removeTabMru(map, 1, 4);
    expect(map.get(1)).toEqual([5, 3]);
  });
});

describe("shouldFocusLastOpenTab", () => {
  it("requires setting and active close", () => {
    expect(shouldFocusLastOpenTab(true, true)).toBe(true);
    expect(shouldFocusLastOpenTab(false, true)).toBe(false);
    expect(shouldFocusLastOpenTab(true, false)).toBe(false);
  });
});

describe("isCloseCausedActivation", () => {
  const pending = {
    tabId: 9,
    previousTabId: 8,
    windowId: 1,
    time: 1000,
  };

  it("detects recent activation caused by closing previous tab", () => {
    expect(isCloseCausedActivation(pending, 8, 1, 1100, 150)).toBe(true);
    expect(isCloseCausedActivation(pending, 8, 1, 2000, 150)).toBe(false);
    expect(isCloseCausedActivation(pending, 7, 1, 1100, 150)).toBe(false);
  });
});
