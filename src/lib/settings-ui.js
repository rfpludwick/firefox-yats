export function anySourceEnabled(settings) {
  return settings.searchOpenTabs || settings.searchClosedTabs || settings.searchHistory;
}

export function searchSourceLabels(settings) {
  const parts = [];
  if (settings.searchOpenTabs) parts.push("open tabs");
  if (settings.searchClosedTabs) parts.push("closed tabs");
  if (settings.searchHistory) parts.push("history");
  return parts;
}

export function placeholderForSettings(settings) {
  const parts = searchSourceLabels(settings);
  return parts.length
    ? `Search ${parts.join(", ")}`
    : "Enable a search source in settings";
}

export function emptyMessageForSettings(settings, query) {
  if (!anySourceEnabled(settings)) {
    return "Enable at least one search source in settings";
  }
  if (
    settings.searchHistory &&
    !settings.searchOpenTabs &&
    !settings.searchClosedTabs &&
    !query.trim()
  ) {
    return "Type to search history";
  }
  return "No matching results";
}

export function readSettingsFromToggles(toggles) {
  return {
    searchOpenTabs: toggles.searchOpenTabs,
    searchClosedTabs: toggles.searchClosedTabs,
    searchHistory: toggles.searchHistory,
    focusLastOpenOnClose: toggles.focusLastOpenOnClose,
  };
}

export function clampSelectionIndex(index, length) {
  if (length <= 0) return 0;
  if (index >= length) return length - 1;
  if (index < 0) return 0;
  return index;
}

export function nextSelectionIndex(index, delta, length) {
  if (length <= 0) return 0;
  return (index + delta + length) % length;
}

export function resolveActiveWindowId(activeId, activeWindowId, openEntries) {
  if (activeWindowId != null) return activeWindowId;
  if (activeId == null) return null;
  return openEntries.find((e) => e.id === activeId)?.windowId ?? null;
}
