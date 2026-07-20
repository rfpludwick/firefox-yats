import { describe, expect, it } from "vitest";
import {
  fuzzyScore,
  fuzzySplitScore,
  isWholeWordMatch,
  trySplitOrientation,
} from "../src/lib/fuzzy.js";

describe("fuzzyScore", () => {
  it("returns empty match for empty query", () => {
    expect(fuzzyScore("", "GitHub")).toEqual({ score: 0, indices: [] });
  });

  it("matches subsequence case-insensitively", () => {
    const result = fuzzyScore("gh", "GitHub");
    expect(result).not.toBeNull();
    expect(result.indices).toEqual([0, 3]);
  });

  it("returns null when query cannot match", () => {
    expect(fuzzyScore("zzz", "GitHub")).toBeNull();
  });

  it("prefers consecutive matches", () => {
    const loose = fuzzyScore("git", "GitHub Issues");
    const tight = fuzzyScore("git", "git");
    expect(tight.score).toBeGreaterThan(loose.score);
  });
});

describe("isWholeWordMatch", () => {
  it("detects whole-word boundaries", () => {
    const match = fuzzyScore("inbox", "Inbox");
    expect(isWholeWordMatch("inbox", "Inbox", match.indices)).toBe(true);
  });
});

describe("fuzzySplitScore", () => {
  it("matches query split across two fields", () => {
    const result = fuzzySplitScore("prod inbox", "Productivity", "Inbox");
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns null for single-word queries", () => {
    expect(fuzzySplitScore("inbox", "Productivity", "Inbox")).toBeNull();
  });
});

describe("trySplitOrientation", () => {
  it("keeps the better orientation", () => {
    const best = trySplitOrientation(null, "prod", "inbox", "Productivity", "Inbox", false);
    expect(best).not.toBeNull();
    expect(best.indicesA.length).toBeGreaterThan(0);
    expect(best.indicesB.length).toBeGreaterThan(0);
  });
});
