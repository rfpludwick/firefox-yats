import {
  CLOSE_ACTIVATION_WINDOW_MS,
  MAX_MRU_DEPTH,
  POPUP_HEIGHT,
  POPUP_WIDTH,
} from "./lib/constants.js";
import {
  isCloseCausedActivation,
  pushTabMru,
  removeTabMru,
  shouldFocusLastOpenTab,
} from "./lib/mru.js";
import { isHttpUrl, normalizeUrlForMatch } from "./lib/url-utils.js";
import {
  isExtensionSender,
  isSpotlightUrl,
  validateOpenUrlMessage,
  validateRestoreSessionMessage,
  validateSwitchTabMessage,
} from "./lib/validation.js";

let popupWindowId = null;
let focusLastOpenOnClose = true;

/** Per-window most-recently-used tab stack (front = most recent). */
const tabMruByWindow = new Map();
const activeTabByWindow = new Map();
/** Tracks a tab activation that may have been caused by closing the previous tab. */
let pendingActivation = null;

const OVERLAY_HTML = "assets/html/overlay.html";
const OVERLAY_URL = browser.runtime.getURL(OVERLAY_HTML);
const EXTENSION_ORIGIN = browser.runtime.getURL("");

function senderAllowed(sender) {
  return isExtensionSender(sender, browser.runtime.id, EXTENSION_ORIGIN);
}

async function loadBehaviorSettings() {
  const stored = await browser.storage.local.get({ focusLastOpenOnClose: true });
  focusLastOpenOnClose = stored.focusLastOpenOnClose;
}

async function focusLastOpenTab(windowId) {
  const stack = tabMruByWindow.get(windowId) || [];
  for (const nextId of stack) {
    try {
      const tab = await browser.tabs.get(nextId);
      if (tab.windowId === windowId) {
        await browser.tabs.update(nextId, { active: true });
        activeTabByWindow.set(windowId, nextId);
        return;
      }
    } catch {
      // Tab no longer exists.
    }
  }
}

loadBehaviorSettings();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.focusLastOpenOnClose) {
    focusLastOpenOnClose = changes.focusLastOpenOnClose.newValue;
  }
});

browser.tabs.query({}).then((tabs) => {
  for (const tab of tabs) {
    if (tab.id != null && tab.windowId != null && tab.active) {
      activeTabByWindow.set(tab.windowId, tab.id);
      pushTabMru(tabMruByWindow, tab.windowId, tab.id, MAX_MRU_DEPTH);
    }
  }
});

browser.tabs.onActivated.addListener(({ tabId, windowId, previousTabId }) => {
  if (previousTabId != null && previousTabId !== tabId) {
    pendingActivation = {
      tabId,
      previousTabId,
      windowId,
      time: Date.now(),
    };
  } else {
    pendingActivation = null;
  }
  activeTabByWindow.set(windowId, tabId);
  pushTabMru(tabMruByWindow, windowId, tabId, MAX_MRU_DEPTH);
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const { windowId, isWindowClosing } = removeInfo;
  if (isWindowClosing) {
    tabMruByWindow.delete(windowId);
    activeTabByWindow.delete(windowId);
    pendingActivation = null;
    return;
  }

  const pending = isCloseCausedActivation(
    pendingActivation,
    tabId,
    windowId,
    Date.now(),
    CLOSE_ACTIVATION_WINDOW_MS
  );

  const wasActive = activeTabByWindow.get(windowId) === tabId || pending;

  removeTabMru(tabMruByWindow, windowId, tabId);

  if (pending) {
    removeTabMru(tabMruByWindow, windowId, pendingActivation.tabId);
    pendingActivation = null;
  }

  if (wasActive) {
    activeTabByWindow.delete(windowId);
  }

  if (!shouldFocusLastOpenTab(focusLastOpenOnClose, wasActive)) return;

  await focusLastOpenTab(windowId);
});

/** Keep the switcher out of Cmd/Ctrl+Shift+T (recently closed) history. */
async function forgetSpotlightSessions() {
  try {
    const closed = await browser.sessions.getRecentlyClosed({ maxResults: 25 });
    for (const item of closed) {
      if (item.window) {
        const tabs = item.window.tabs || [];
        if (tabs.some((t) => isSpotlightUrl(t.url, OVERLAY_URL))) {
          await browser.sessions.forgetClosedWindow(item.window.sessionId);
        }
      } else if (item.tab && isSpotlightUrl(item.tab.url, OVERLAY_URL)) {
        await browser.sessions.forgetClosedTab(
          item.tab.windowId,
          item.tab.sessionId
        );
      }
    }
  } catch {
    // sessions API unavailable.
  }
}

function scrubSpotlightFromHistory() {
  forgetSpotlightSessions();
  setTimeout(forgetSpotlightSessions, 50);
  setTimeout(forgetSpotlightSessions, 250);
  setTimeout(forgetSpotlightSessions, 1000);
}

function clearPopupState() {
  popupWindowId = null;
  scrubSpotlightFromHistory();
}

async function closePopup() {
  if (popupWindowId == null) return;
  try {
    await browser.windows.remove(popupWindowId);
  } catch {
    // Already closed.
  }
  clearPopupState();
}

async function openSwitcher() {
  if (popupWindowId != null) {
    await closePopup();
    return;
  }

  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  const current = await browser.windows.getCurrent();
  const left = Math.round(current.left + (current.width - POPUP_WIDTH) / 2);
  const top = Math.round(current.top + (current.height - POPUP_HEIGHT) / 3);

  const win = await browser.windows.create({
    url: browser.runtime.getURL(
      `${OVERLAY_HTML}?opener=${activeTab?.id ?? ""}`
    ),
    type: "popup",
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    left,
    top,
    allowScriptsToClose: true,
  });
  popupWindowId = win.id;
}

browser.commands.onCommand.addListener((command) => {
  if (command === "yats") openSwitcher();
});

browser.browserAction.onClicked.addListener(() => {
  openSwitcher();
});

async function focusTab(tabId, windowId) {
  await browser.tabs.update(tabId, { active: true });
  await browser.windows.update(windowId, { focused: true });
}

async function findOpenTabByUrl(url) {
  if (!url) return null;
  const target = normalizeUrlForMatch(url);
  const tabs = await browser.tabs.query({});
  return tabs.find((t) => normalizeUrlForMatch(t.url || "") === target) || null;
}

async function switchToUrl(url) {
  if (!isHttpUrl(url)) {
    throw new Error("disallowed url");
  }
  const existing = await findOpenTabByUrl(url);
  if (existing?.id != null) {
    await focusTab(existing.id, existing.windowId);
    return;
  }
  const tab = await browser.tabs.create({ url, active: true });
  if (tab.windowId != null) {
    await browser.windows.update(tab.windowId, { focused: true });
  }
}

function handleAction(action, sendResponse) {
  action()
    .then(() => closePopup())
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));
  return true;
}

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!senderAllowed(sender)) {
    sendResponse({ ok: false });
    return false;
  }
  if (!msg || typeof msg.type !== "string") {
    sendResponse({ ok: false });
    return false;
  }

  if (msg.type === "SWITCH_TAB") {
    if (!validateSwitchTabMessage(msg).ok) {
      sendResponse({ ok: false });
      return false;
    }
    return handleAction(() => focusTab(msg.tabId, msg.windowId), sendResponse);
  }

  if (msg.type === "RESTORE_SESSION") {
    const restoreCheck = validateRestoreSessionMessage(msg);
    if (!restoreCheck.ok) {
      sendResponse({ ok: false });
      return false;
    }
    if (msg.url != null && msg.url !== "" && !isHttpUrl(msg.url)) {
      sendResponse({ ok: false });
      return false;
    }
    return handleAction(async () => {
      const existing = await findOpenTabByUrl(msg.url);
      if (existing?.id != null) {
        await focusTab(existing.id, existing.windowId);
        return;
      }
      const restored = await browser.sessions.restore(msg.sessionId);
      const tab = restored?.tab;
      if (tab?.id != null && tab.windowId != null) {
        await focusTab(tab.id, tab.windowId);
      }
    }, sendResponse);
  }

  if (msg.type === "OPEN_URL") {
    if (!validateOpenUrlMessage(msg, isHttpUrl).ok) {
      sendResponse({ ok: false });
      return false;
    }
    return handleAction(() => switchToUrl(msg.url), sendResponse);
  }

  if (msg.type === "POPUP_CLOSED") {
    clearPopupState();
  }
});

browser.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    clearPopupState();
  }
});

browser.windows.onFocusChanged.addListener((focusedWindowId) => {
  if (popupWindowId == null) return;
  if (focusedWindowId === browser.windows.WINDOW_ID_NONE) return;
  if (focusedWindowId === popupWindowId) return;
  closePopup();
});

if (browser.sessions?.onChanged) {
  browser.sessions.onChanged.addListener(() => {
    forgetSpotlightSessions();
  });
}
