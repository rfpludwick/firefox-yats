import { describe, expect, it } from "vitest";
import {
  applyWindowLabels,
  buildWindowLabelMap,
  closedEntryFromTab,
  collectClosedTabsFromSessions,
  entryBadge,
  faviconLetter,
  historyEntryFromItem,
  markCurrentTab,
  openEntryFromTab,
  subtitleFor,
} from "../src/lib/entries.js";

describe("closedEntryFromTab", () => {
  it("builds a closed entry with display URL", () => {
    const entry = closedEntryFromTab({
      sessionId: "abc",
      title: "Test",
      url: "https://example.com/path",
      favIconUrl: "https://example.com/favicon.ico",
    });
    expect(entry).toMatchObject({
      kind: "closed",
      sessionId: "abc",
      title: "Test",
      url: "https://example.com/path",
      urlDisplay: "example.com/path",
    });
  });
});

describe("collectClosedTabsFromSessions", () => {
  const isAllowed = (url) => url.startsWith("https://");

  it("collects tabs from single-tab and window sessions", () => {
    const sessions = [
      { tab: { sessionId: "1", title: "A", url: "https://a.test" } },
      {
        window: {
          tabs: [
            { sessionId: "2", title: "B", url: "https://b.test" },
            { sessionId: "3", title: "Bad", url: "javascript:void(0)" },
          ],
        },
      },
    ];
    const entries = collectClosedTabsFromSessions(sessions, isAllowed);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.sessionId)).toEqual(["1", "2"]);
  });
});

describe("openEntryFromTab", () => {
  it("maps tab fields and group name/color", () => {
    const entry = openEntryFromTab(
      {
        id: 5,
        windowId: 2,
        title: "Tab",
        url: "https://example.com",
        pinned: true,
      },
      "Work",
      "cyan"
    );
    expect(entry.groupName).toBe("Work");
    expect(entry.groupColor).toBe("cyan");
    expect(entry.pinned).toBe(true);
  });
});

describe("historyEntryFromItem", () => {
  it("maps history item fields", () => {
    const entry = historyEntryFromItem({
      title: "Page",
      url: "https://example.com/x",
      lastVisitTime: 100,
      visitCount: 3,
    });
    expect(entry.kind).toBe("history");
    expect(entry.visitCount).toBe(3);
  });
});

describe("entryBadge", () => {
  it("returns labels by kind and state", () => {
    expect(entryBadge({ kind: "open", pinned: true })).toBe("Pinned");
    expect(entryBadge({ kind: "open", current: true })).toBe("Current");
    expect(entryBadge({ kind: "closed" })).toBe("Closed");
    expect(entryBadge({ kind: "history" })).toBe("History");
    expect(entryBadge({ kind: "open" })).toBe("");
  });
});

describe("faviconLetter", () => {
  it("uses first letter of title", () => {
    expect(faviconLetter({ title: "github" })).toBe("G");
    expect(faviconLetter({ title: "" })).toBe("?");
  });
});

describe("subtitleFor", () => {
  it("uses last-visit text for history entries", () => {
    const now = Date.now();
    const text = subtitleFor(
      { kind: "history", lastVisitTime: now - 60_000 },
      "example.com",
      now
    );
    expect(text).toMatch(/^Visited /);
  });

  it("uses URL text for non-history entries", () => {
    expect(subtitleFor({ kind: "open" }, "example.com")).toBe("example.com");
  });
});

describe("markCurrentTab", () => {
  const entries = [
    { id: 1, windowId: 10, kind: "open" },
    { id: 2, windowId: 20, kind: "open" },
    { id: 3, windowId: 10, kind: "open" },
  ];

  it("marks current tab and sorts active window first", () => {
    const result = markCurrentTab(entries, 2, 20);
    expect(result.find((e) => e.id === 2).current).toBe(true);
    expect(result[0].windowId).toBe(20);
  });
});

describe("buildWindowLabelMap", () => {
  it("returns empty map for a single window", () => {
    expect(buildWindowLabelMap([10, 10, 10], 10)).toEqual(new Map());
  });

  it("numbers windows with the active window as Window 1", () => {
    const labels = buildWindowLabelMap([10, 20, 30], 20);
    expect(labels.get(20)).toEqual({ label: "Window 1", index: 1 });
    expect(labels.get(10)).toEqual({ label: "Window 2", index: 2 });
    expect(labels.get(30)).toEqual({ label: "Window 3", index: 3 });
  });
});

describe("applyWindowLabels", () => {
  const entries = [
    { id: 1, windowId: 10, kind: "open" },
    { id: 2, windowId: 20, kind: "open" },
  ];

  it("adds windowLabel when multiple windows are open", () => {
    const result = applyWindowLabels(entries, 10);
    expect(result[0].windowLabel).toBe("Window 1");
    expect(result[0].windowIndex).toBe(1);
    expect(result[1].windowLabel).toBe("Window 2");
    expect(result[1].windowIndex).toBe(2);
  });

  it("omits windowLabel when only one window is open", () => {
    const single = [{ id: 1, windowId: 10, kind: "open" }];
    const result = applyWindowLabels(single, 10);
    expect(result[0].windowLabel).toBeUndefined();
    expect(result[0].windowIndex).toBeUndefined();
  });
});
