import { KIND_BOOST, MAX_VISIBLE_RESULTS } from "./constants.js";
import { fuzzyScore, fuzzySplitScore } from "./fuzzy.js";
import { normalizeUrlForMatch, displayUrl } from "./url-utils.js";

export function emptyMatchScore(score) {
  return { score, titleIndices: [], urlIndices: [], groupIndices: [] };
}

export function pushMatch(candidates, kindBoost, match, bonus, indices = {}) {
  if (!match) return;
  candidates.push({
    score: kindBoost + match.score + bonus,
    titleIndices: indices.titleIndices || [],
    urlIndices: indices.urlIndices || [],
    groupIndices: indices.groupIndices || [],
  });
}

export function pushSplit(candidates, kindBoost, split, indices) {
  if (!split) return;
  candidates.push({
    score: kindBoost + split.score + 8,
    titleIndices: indices.title?.(split) || [],
    urlIndices: indices.url?.(split) || [],
    groupIndices: indices.group?.(split) || [],
  });
}

export function bestCandidate(candidates) {
  if (!candidates.length) return null;
  return candidates.reduce((best, c) => (c.score > best.score ? c : best));
}

export function urlTextFor(entry) {
  return entry.urlDisplay || displayUrl(entry.url || "");
}

export function scoreEntry(query, entry, closedIndex) {
  const q = query.trim();
  const kindBoost = KIND_BOOST[entry.kind] || 0;

  if (!q) {
    if (entry.kind === "open") {
      return emptyMatchScore(kindBoost + (entry.pinned ? 1 : 0));
    }
    if (entry.kind === "closed") {
      return emptyMatchScore(kindBoost + Math.max(0, 100 - closedIndex));
    }
    return null;
  }

  const title = entry.title || "";
  const urlText = urlTextFor(entry);
  const group = entry.groupName || "";

  const titleMatch = fuzzyScore(q, title);
  const urlMatch = urlText ? fuzzyScore(q, urlText) : null;
  const groupMatch = group ? fuzzyScore(q, group) : null;
  const titleGroupSplit = group ? fuzzySplitScore(q, title, group) : null;
  const titleUrlSplit = urlText ? fuzzySplitScore(q, title, urlText) : null;
  const groupUrlSplit = group && urlText ? fuzzySplitScore(q, group, urlText) : null;

  const candidates = [];
  pushMatch(candidates, kindBoost, titleMatch, 5, { titleIndices: titleMatch?.indices });
  pushMatch(candidates, kindBoost, urlMatch, 0, { urlIndices: urlMatch?.indices });
  pushMatch(candidates, kindBoost, groupMatch, 3, { groupIndices: groupMatch?.indices });
  pushSplit(candidates, kindBoost, titleGroupSplit, {
    title: (s) => s.indicesA,
    group: (s) => s.indicesB,
  });
  pushSplit(candidates, kindBoost, titleUrlSplit, {
    title: (s) => s.indicesA,
    url: (s) => s.indicesB,
  });
  pushSplit(candidates, kindBoost, groupUrlSplit, {
    group: (s) => s.indicesA,
    url: (s) => s.indicesB,
  });

  return bestCandidate(candidates);
}

export function filterEntries(query, settings, openEntries, closedEntries, historyEntries) {
  const sources = [];
  if (settings.searchOpenTabs) sources.push(...openEntries);
  if (settings.searchClosedTabs) sources.push(...closedEntries);
  if (settings.searchHistory && query.trim()) sources.push(...historyEntries);

  const closedIndexBySession = new Map();
  if (settings.searchClosedTabs) {
    for (let i = 0; i < closedEntries.length; i++) {
      closedIndexBySession.set(closedEntries[i].sessionId, i);
    }
  }

  const scored = [];
  for (const entry of sources) {
    const closedIndex = entry.kind === "closed"
      ? (closedIndexBySession.get(entry.sessionId) ?? -1)
      : -1;
    const result = scoreEntry(query, entry, closedIndex);
    if (!result) continue;
    scored.push({ entry, ...result });
  }

  scored.sort((a, b) => b.score - a.score);

  const seenUrls = new Set();
  const deduped = [];
  for (const match of scored) {
    const key = normalizeUrlForMatch(match.entry.url || "");
    if (key && seenUrls.has(key)) continue;
    if (key) seenUrls.add(key);
    deduped.push(match);
  }

  return deduped.slice(0, MAX_VISIBLE_RESULTS);
}
