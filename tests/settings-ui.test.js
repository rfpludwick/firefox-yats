import { describe, expect, it } from "vitest";
import {
  anySourceEnabled,
  clampSelectionIndex,
  emptyMessageForSettings,
  nextSelectionIndex,
  placeholderForSettings,
  readSettingsFromToggles,
  resolveActiveWindowId,
  searchSourceLabels,
} from "../src/lib/settings-ui.js";

describe("anySourceEnabled", () => {
  it("is true when any source is enabled", () => {
    expect(anySourceEnabled({ searchOpenTabs: true, searchClosedTabs: false, searchHistory: false })).toBe(true);
    expect(anySourceEnabled({ searchOpenTabs: false, searchClosedTabs: false, searchHistory: false })).toBe(false);
  });
});

describe("searchSourceLabels", () => {
  it("lists enabled sources", () => {
    expect(
      searchSourceLabels({
        searchOpenTabs: true,
        searchClosedTabs: false,
        searchHistory: true,
      })
    ).toEqual(["open tabs", "history"]);
  });
});

describe("placeholderForSettings", () => {
  it("builds placeholder from enabled sources", () => {
    expect(
      placeholderForSettings({
        searchOpenTabs: true,
        searchClosedTabs: true,
        searchHistory: false,
      })
    ).toBe("Search open tabs, closed tabs");
  });
});

describe("emptyMessageForSettings", () => {
  it("returns guidance when no sources enabled", () => {
    expect(
      emptyMessageForSettings(
        { searchOpenTabs: false, searchClosedTabs: false, searchHistory: false },
        ""
      )
    ).toBe("Enable at least one search source in settings");
  });

  it("prompts for history-only mode", () => {
    expect(
      emptyMessageForSettings(
        { searchOpenTabs: false, searchClosedTabs: false, searchHistory: true },
        ""
      )
    ).toBe("Type to search history");
  });
});

describe("readSettingsFromToggles", () => {
  it("copies toggle values", () => {
    expect(
      readSettingsFromToggles({
        searchOpenTabs: true,
        searchClosedTabs: false,
        searchHistory: true,
        focusLastOpenOnClose: false,
      })
    ).toEqual({
      searchOpenTabs: true,
      searchClosedTabs: false,
      searchHistory: true,
      focusLastOpenOnClose: false,
    });
  });
});

describe("selection helpers", () => {
  it("clamps selection index", () => {
    expect(clampSelectionIndex(5, 3)).toBe(2);
    expect(clampSelectionIndex(-1, 3)).toBe(0);
    expect(clampSelectionIndex(1, 0)).toBe(0);
  });

  it("wraps selection with modulo", () => {
    expect(nextSelectionIndex(0, -1, 3)).toBe(2);
    expect(nextSelectionIndex(2, 1, 3)).toBe(0);
  });
});

describe("resolveActiveWindowId", () => {
  const openEntries = [{ id: 7, windowId: 42 }];

  it("prefers explicit window id", () => {
    expect(resolveActiveWindowId(7, 99, openEntries)).toBe(99);
  });

  it("looks up window id from open entries", () => {
    expect(resolveActiveWindowId(7, null, openEntries)).toBe(42);
  });
});
