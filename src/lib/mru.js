export function pushTabMru(stackByWindow, windowId, tabId, maxDepth) {
  const stack = stackByWindow.get(windowId) || [];
  const next = [tabId, ...stack.filter((id) => id !== tabId)].slice(0, maxDepth);
  stackByWindow.set(windowId, next);
  return next;
}

export function removeTabMru(stackByWindow, windowId, tabId) {
  const stack = stackByWindow.get(windowId);
  if (!stack) return [];
  const next = stack.filter((id) => id !== tabId);
  stackByWindow.set(windowId, next);
  return next;
}

export function shouldFocusLastOpenTab(focusLastOpenOnClose, wasActive) {
  return focusLastOpenOnClose && wasActive;
}

export function isCloseCausedActivation(pendingActivation, tabId, windowId, now, windowMs) {
  return (
    pendingActivation?.windowId === windowId &&
    pendingActivation.previousTabId === tabId &&
    now - pendingActivation.time < windowMs
  );
}
