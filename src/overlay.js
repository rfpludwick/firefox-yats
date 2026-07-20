import { buildActivateMessage } from "./lib/activate.js";
import {
  DEFAULT_SETTINGS,
  HISTORY_DEBOUNCE_MS,
  HISTORY_MAX_RESULTS,
  POPUP_WIDTH,
  SETTINGS_PANEL_WIDTH,
} from "./lib/constants.js";
import {
  collectClosedTabsFromSessions,
  entryBadge,
  historyEntryFromItem,
  applyWindowLabels,
  markCurrentTab,
  openEntryFromTab,
  subtitleFor,
} from "./lib/entries.js";
import { highlight } from "./lib/html-utils.js";
import { resultsListHtml } from "./lib/render.js";
import { filterEntries, urlTextFor } from "./lib/scoring.js";
import {
  clampSelectionIndex,
  emptyMessageForSettings,
  nextSelectionIndex,
  placeholderForSettings,
  readSettingsFromToggles,
  resolveActiveWindowId,
} from "./lib/settings-ui.js";
import { isHttpUrl } from "./lib/url-utils.js";

const openerId = Number(new URLSearchParams(location.search).get("opener")) || null;
document.body.classList.add("popup");

const queryEl = document.getElementById("query");
const resultsEl = document.getElementById("results");
const emptyEl = document.getElementById("empty");
const toggleOpenEl = document.getElementById("toggle-open");
const toggleClosedEl = document.getElementById("toggle-closed");
const toggleHistoryEl = document.getElementById("toggle-history");
const toggleLastOpenEl = document.getElementById("toggle-last-open");
const settingsPanelEl = document.getElementById("settings-panel");
const settingsToggleEl = document.getElementById("settings-toggle");
const toggleEls = [toggleOpenEl, toggleClosedEl, toggleHistoryEl, toggleLastOpenEl];

let settingsPanelOpen = false;

let settings = { ...DEFAULT_SETTINGS };
let openEntries = [];
let closedEntries = [];
let historyEntries = [];
let matches = [];
let selectedIndex = 0;
let historySearchToken = 0;
let historyDebounceTimer = null;
let renderFrameId = null;

const renderHelpers = {
  entryBadge,
  highlight,
  subtitleFor,
  urlTextFor,
};

function notifyClosed() {
  browser.runtime.sendMessage({ type: "POPUP_CLOSED" }).catch(() => {});
}

function resultIndexFromEvent(e) {
  const li = e.target.closest("li[data-index]");
  if (!li) return null;
  return Number(li.dataset.index);
}

function updatePlaceholder() {
  queryEl.placeholder = placeholderForSettings(settings);
}

function updateEmptyMessage(query) {
  emptyEl.textContent = emptyMessageForSettings(settings, query);
}

function updateSelection() {
  selectedIndex = clampSelectionIndex(selectedIndex, matches.length);

  if (!matches.length) {
    queryEl.setAttribute("aria-activedescendant", "");
    return;
  }

  for (const li of resultsEl.querySelectorAll("li[data-index]")) {
    const idx = Number(li.dataset.index);
    const isSelected = idx === selectedIndex;
    li.classList.toggle("selected", isSelected);
    li.setAttribute("aria-selected", String(isSelected));
  }

  const id = `result-${selectedIndex}`;
  queryEl.setAttribute("aria-activedescendant", id);
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ block: "nearest" });
}

function renderResults() {
  const query = queryEl.value;
  matches = filterEntries(query, settings, openEntries, closedEntries, historyEntries);
  updateEmptyMessage(query);

  if (!matches.length) {
    resultsEl.innerHTML = "";
    emptyEl.hidden = false;
    queryEl.setAttribute("aria-activedescendant", "");
    return;
  }

  emptyEl.hidden = true;
  resultsEl.innerHTML = resultsListHtml(matches, renderHelpers);
  updateSelection();
}

function scheduleRenderResults() {
  if (renderFrameId != null) return;
  renderFrameId = requestAnimationFrame(() => {
    renderFrameId = null;
    renderResults();
  });
}

function cancelScheduledRender() {
  if (renderFrameId == null) return;
  cancelAnimationFrame(renderFrameId);
  renderFrameId = null;
}

function moveSelection(delta) {
  selectedIndex = nextSelectionIndex(selectedIndex, delta, matches.length);
  updateSelection();
}

async function closeSwitcher() {
  notifyClosed();
  window.close();
}

async function activateSelected() {
  const match = matches[selectedIndex];
  if (!match) return;

  const message = buildActivateMessage(match.entry);
  if (message) {
    await browser.runtime.sendMessage(message);
  }

  notifyClosed();
  window.close();
}

function syncToggleUI() {
  toggleOpenEl.checked = settings.searchOpenTabs;
  toggleClosedEl.checked = settings.searchClosedTabs;
  toggleHistoryEl.checked = settings.searchHistory;
  toggleLastOpenEl.checked = settings.focusLastOpenOnClose;
}

async function resizeForSettingsPanel() {
  try {
    const win = await browser.windows.getCurrent();
    if (win.id == null) return;
    const width = settingsPanelOpen ? POPUP_WIDTH + SETTINGS_PANEL_WIDTH : POPUP_WIDTH;
    const left = win.left != null && win.width != null
      ? Math.round(win.left - (width - win.width) / 2)
      : undefined;
    await browser.windows.update(win.id, { width, ...(left != null ? { left } : {}) });
  } catch {
    // Window may already be closing.
  }
}

function setSettingsPanelOpen(open) {
  settingsPanelOpen = open;
  settingsPanelEl.hidden = !open;
  settingsToggleEl.setAttribute("aria-expanded", String(open));
  resizeForSettingsPanel();
}

async function saveSettings() {
  await browser.storage.local.set(settings);
}

async function onSettingsChanged() {
  settings = readSettingsFromToggles({
    searchOpenTabs: toggleOpenEl.checked,
    searchClosedTabs: toggleClosedEl.checked,
    searchHistory: toggleHistoryEl.checked,
    focusLastOpenOnClose: toggleLastOpenEl.checked,
  });
  await saveSettings();
  selectedIndex = 0;
  await loadAllData();
}

function loadGroupNames() {
  if (!browser.tabGroups || typeof browser.tabGroups.query !== "function") {
    return Promise.resolve(new Map());
  }
  const noneId = browser.tabGroups.TAB_GROUP_ID_NONE ?? -1;
  return browser.tabGroups.query({})
    .then((groups) => {
      const map = new Map();
      for (const g of groups) {
        if (g.id === noneId) continue;
        const name = (g.title || "").trim();
        if (name) map.set(g.id, { name, color: g.color || "" });
      }
      return map;
    })
    .catch(() => new Map());
}

async function loadOpenTabs() {
  const [allTabs, groupInfo] = await Promise.all([
    browser.tabs.query({}),
    loadGroupNames(),
  ]);
  const noneId = browser.tabGroups?.TAB_GROUP_ID_NONE ?? -1;
  openEntries = allTabs
    .filter((t) => t.id != null && isHttpUrl(t.url || ""))
    .map((t) => {
      const groupId = t.groupId;
      const group =
        groupId != null && groupId !== noneId ? groupInfo.get(groupId) : null;
      return openEntryFromTab(t, group?.name || "", group?.color || "");
    });
}

async function loadClosedTabs() {
  if (!browser.sessions || typeof browser.sessions.getRecentlyClosed !== "function") {
    closedEntries = [];
    return;
  }

  try {
    const maxResults = browser.sessions.MAX_SESSION_RESULTS || 25;
    const sessions = await browser.sessions.getRecentlyClosed({ maxResults });
    closedEntries = collectClosedTabsFromSessions(sessions, isHttpUrl);
  } catch {
    closedEntries = [];
  }
}

async function searchHistory(query) {
  const q = query.trim();
  if (!settings.searchHistory || !q) {
    historyEntries = [];
    return;
  }

  const token = ++historySearchToken;
  try {
    const items = await browser.history.search({ text: q, maxResults: HISTORY_MAX_RESULTS });
    if (token !== historySearchToken) return;
    historyEntries = items
      .filter((item) => isHttpUrl(item.url || ""))
      .map((item) => historyEntryFromItem(item));
  } catch {
    if (token === historySearchToken) historyEntries = [];
  }
}

async function loadAllData({ activeId, activeWindowId } = {}) {
  cancelScheduledRender();
  const tasks = [];
  if (settings.searchOpenTabs) {
    tasks.push(loadOpenTabs());
  } else {
    openEntries = [];
  }

  if (settings.searchClosedTabs) {
    tasks.push(loadClosedTabs());
  } else {
    closedEntries = [];
  }

  await Promise.all(tasks);

  if (settings.searchHistory && queryEl.value.trim()) {
    await searchHistory(queryEl.value);
  } else {
    historySearchToken++;
    historyEntries = [];
  }

  if (activeId != null) {
    const windowId = resolveActiveWindowId(activeId, activeWindowId, openEntries);
    openEntries = markCurrentTab(openEntries, activeId, windowId);
    openEntries = applyWindowLabels(openEntries, windowId);
  } else {
    openEntries = applyWindowLabels(openEntries, null);
  }

  updatePlaceholder();
  renderResults();
}

function scheduleHistorySearch() {
  clearTimeout(historyDebounceTimer);
  historyDebounceTimer = setTimeout(() => {
    searchHistory(queryEl.value).then(() => renderResults());
  }, HISTORY_DEBOUNCE_MS);
}

for (const el of toggleEls) {
  el.addEventListener("change", onSettingsChanged);
}

settingsToggleEl.addEventListener("click", () => {
  setSettingsPanelOpen(!settingsPanelOpen);
});

resultsEl.addEventListener("error", (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains("favicon")) return;
  const fallback = document.createElement("div");
  fallback.className = "favicon-fallback";
  fallback.textContent = img.dataset.letter || "?";
  img.replaceWith(fallback);
}, true);

resultsEl.addEventListener("mousemove", (e) => {
  const idx = resultIndexFromEvent(e);
  if (idx == null || idx === selectedIndex) return;
  selectedIndex = idx;
  updateSelection();
});

resultsEl.addEventListener("click", (e) => {
  const idx = resultIndexFromEvent(e);
  if (idx == null) return;
  selectedIndex = idx;
  activateSelected();
});

queryEl.addEventListener("input", () => {
  selectedIndex = 0;
  if (settings.searchHistory && queryEl.value.trim()) {
    scheduleHistorySearch();
  } else {
    clearTimeout(historyDebounceTimer);
    historySearchToken++;
    historyEntries = [];
  }
  scheduleRenderResults();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closeSwitcher();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveSelection(1);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    moveSelection(-1);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    activateSelected();
  }
});

browser.storage.local.get(DEFAULT_SETTINGS).then(async (stored) => {
  settings = { ...DEFAULT_SETTINGS, ...stored };
  syncToggleUI();

  if (openerId != null) {
    await loadAllData({ activeId: openerId });
  } else {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    await loadAllData({
      activeId: active?.id ?? null,
      activeWindowId: active?.windowId ?? null,
    });
  }

  queryEl.focus();
});
