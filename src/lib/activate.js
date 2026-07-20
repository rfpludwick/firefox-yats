export function buildActivateMessage(entry) {
  if (entry.kind === "open") {
    return {
      type: "SWITCH_TAB",
      tabId: entry.id,
      windowId: entry.windowId,
    };
  }
  if (entry.kind === "closed") {
    return {
      type: "RESTORE_SESSION",
      sessionId: entry.sessionId,
      url: entry.url,
    };
  }
  if (entry.kind === "history") {
    return {
      type: "OPEN_URL",
      url: entry.url,
    };
  }
  return null;
}
