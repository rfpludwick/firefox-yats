export function isValidTabRef(tabId, windowId) {
  return Number.isInteger(tabId) && tabId > 0 && Number.isInteger(windowId) && windowId > 0;
}

export function isExtensionSender(sender, runtimeId, extensionOrigin) {
  return (
    sender?.id === runtimeId &&
    typeof sender.url === "string" &&
    sender.url.startsWith(extensionOrigin)
  );
}

export function isSpotlightUrl(url, overlayUrl) {
  return typeof url === "string" && url.startsWith(overlayUrl);
}

export function validateRestoreSessionMessage(msg) {
  if (typeof msg.sessionId !== "string" || !msg.sessionId) {
    return { ok: false, reason: "invalid sessionId" };
  }
  return { ok: true };
}

export function validateOpenUrlMessage(msg, isAllowedUrl) {
  if (!isAllowedUrl(msg.url)) {
    return { ok: false, reason: "disallowed url" };
  }
  return { ok: true };
}

export function validateSwitchTabMessage(msg) {
  if (!isValidTabRef(msg.tabId, msg.windowId)) {
    return { ok: false, reason: "invalid tab ref" };
  }
  return { ok: true };
}
