import { displayUrl } from "./url-utils.js";
import { formatLastVisit } from "./format.js";

export function closedEntryFromTab(t) {
  const url = t.url || "";
  return {
    kind: "closed",
    sessionId: t.sessionId,
    title: t.title || "Untitled",
    url,
    urlDisplay: displayUrl(url),
    favIconUrl: t.favIconUrl || "",
  };
}

export function openEntryFromTab(t, groupName = "", groupColor = "") {
  const url = t.url || "";
  return {
    kind: "open",
    id: t.id,
    windowId: t.windowId,
    title: t.title || "Untitled",
    url,
    urlDisplay: displayUrl(url),
    favIconUrl: t.favIconUrl || "",
    pinned: !!t.pinned,
    groupName,
    groupColor,
    current: false,
  };
}

export function historyEntryFromItem(item) {
  const url = item.url || "";
  return {
    kind: "history",
    title: item.title || url || "Untitled",
    url,
    urlDisplay: displayUrl(url),
    lastVisitTime: item.lastVisitTime,
    visitCount: item.visitCount,
  };
}

export function collectClosedTabsFromSessions(sessions, isAllowedUrl) {
  const entries = [];
  for (const session of sessions) {
    const tabs = session.tab ? [session.tab] : (session.window?.tabs || []);
    for (const t of tabs) {
      if (!isAllowedUrl(t.url || "")) continue;
      entries.push(closedEntryFromTab(t));
    }
  }
  return entries;
}

export function faviconLetter(entry) {
  return (entry.title || "?").trim().charAt(0).toUpperCase() || "?";
}

export function entryBadge(entry) {
  if (entry.kind === "open") {
    if (entry.pinned) return "Pinned";
    if (entry.current) return "Current";
    return "";
  }
  if (entry.kind === "closed") return "Closed";
  if (entry.kind === "history") return "History";
  return "";
}

export function subtitleFor(entry, urlText, now = Date.now()) {
  if (entry.kind === "history") {
    return formatLastVisit(entry.lastVisitTime, now) || urlText;
  }
  return urlText;
}

export function markCurrentTab(openEntries, activeId, activeWindowId) {
  let entries = openEntries;
  if (activeId != null) {
    entries = entries.map((e) => ({ ...e, current: e.id === activeId }));
  }
  if (activeWindowId != null) {
    entries = [...entries].sort((a, b) => {
      if (a.windowId === activeWindowId && b.windowId !== activeWindowId) return -1;
      if (b.windowId === activeWindowId && a.windowId !== activeWindowId) return 1;
      return 0;
    });
  }
  return entries;
}

/** @returns {Map<number, string>} empty when only one window is open */
export function buildWindowLabelMap(windowIds, activeWindowId) {
  const unique = [...new Set(windowIds.filter((id) => id != null))];
  if (unique.length <= 1) return new Map();

  const sorted = unique.sort((a, b) => {
    if (activeWindowId != null) {
      if (a === activeWindowId) return -1;
      if (b === activeWindowId) return 1;
    }
    return a - b;
  });

  return new Map(
    sorted.map((id, index) => [id, { label: `Window ${index + 1}`, index: index + 1 }])
  );
}

export function applyWindowLabels(openEntries, activeWindowId) {
  const labelMap = buildWindowLabelMap(
    openEntries.map((e) => e.windowId),
    activeWindowId
  );
  if (labelMap.size === 0) {
    return openEntries.map(({ windowLabel: _w, windowIndex: _i, ...entry }) => entry);
  }
  return openEntries.map((entry) => {
    const info = labelMap.get(entry.windowId);
    return {
      ...entry,
      windowLabel: info?.label || "",
      windowIndex: info?.index || 0,
    };
  });
}
