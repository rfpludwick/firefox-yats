import { describe, expect, it } from "vitest";
import { KIND_BOOST } from "../src/lib/constants.js";
import {
  bestCandidate,
  emptyMatchScore,
  filterEntries,
  pushMatch,
  scoreEntry,
} from "../src/lib/scoring.js";

const settings = {
  searchOpenTabs: true,
  searchClosedTabs: true,
  searchHistory: true,
};

const openEntry = {
  kind: "open",
  id: 1,
  windowId: 10,
  title: "GitHub",
  url: "https://github.com/",
  urlDisplay: "github.com/",
  pinned: false,
};

const closedEntry = {
  kind: "closed",
  sessionId: "s1",
  title: "Docs",
  url: "https://docs.example.com/",
  urlDisplay: "docs.example.com/",
};

const historyEntry = {
  kind: "history",
  title: "Example",
  url: "https://example.com/page",
  urlDisplay: "example.com/page",
};

describe("scoreEntry", () => {
  it("scores open tabs without query by kind boost", () => {
    const result = scoreEntry("", openEntry, -1);
    expect(result.score).toBe(KIND_BOOST.open);
  });

  it("prefers pinned open tabs when query is empty", () => {
    const pinned = scoreEntry("", { ...openEntry, pinned: true }, -1);
    const normal = scoreEntry("", openEntry, -1);
    expect(pinned.score).toBeGreaterThan(normal.score);
  });

  it("ranks closed tabs by recency when query is empty", () => {
    const recent = scoreEntry("", closedEntry, 0);
    const older = scoreEntry("", closedEntry, 10);
    expect(recent.score).toBeGreaterThan(older.score);
  });

  it("returns null for history without query", () => {
    expect(scoreEntry("", historyEntry, -1)).toBeNull();
  });

  it("matches title text", () => {
    const result = scoreEntry("git", openEntry, -1);
    expect(result).not.toBeNull();
    expect(result.titleIndices.length).toBeGreaterThan(0);
  });
});

describe("bestCandidate", () => {
  it("returns highest scoring candidate", () => {
    const candidates = [
      { score: 10, titleIndices: [], urlIndices: [], groupIndices: [] },
      { score: 25, titleIndices: [], urlIndices: [], groupIndices: [] },
    ];
    expect(bestCandidate(candidates).score).toBe(25);
  });
});

describe("pushMatch", () => {
  it("ignores null matches", () => {
    const candidates = [];
    pushMatch(candidates, 100, null, 5, {});
    expect(candidates).toHaveLength(0);
  });
});

describe("emptyMatchScore", () => {
  it("returns zeroed index arrays", () => {
    expect(emptyMatchScore(42)).toEqual({
      score: 42,
      titleIndices: [],
      urlIndices: [],
      groupIndices: [],
    });
  });
});

describe("filterEntries", () => {
  it("includes enabled sources only", () => {
    const matches = filterEntries(
      "",
      { searchOpenTabs: true, searchClosedTabs: false, searchHistory: false },
      [openEntry],
      [closedEntry],
      [historyEntry]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].entry.kind).toBe("open");
  });

  it("deduplicates by URL keeping higher score", () => {
    const dupeOpen = { ...openEntry, id: 2, title: "GitHub duplicate" };
    const dupeHistory = {
      ...historyEntry,
      title: "GitHub history",
      url: "https://github.com/",
      urlDisplay: "github.com/",
    };
    const matches = filterEntries(
      "git",
      settings,
      [openEntry, dupeOpen],
      [],
      [dupeHistory]
    );
    const urls = matches.map((m) => m.entry.url);
    expect(urls.filter((u) => u === "https://github.com/")).toHaveLength(1);
  });

  it("includes history only when query is non-empty", () => {
    const withoutQuery = filterEntries(
      "",
      settings,
      [],
      [],
      [historyEntry]
    );
    const withQuery = filterEntries(
      "example",
      settings,
      [],
      [],
      [historyEntry]
    );
    expect(withoutQuery).toHaveLength(0);
    expect(withQuery).toHaveLength(1);
  });
});
