export function isHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function isDataImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^data:image\/[\w+.-]+;base64,/i.test(url);
}

export function isAllowedFaviconUrl(url) {
  return isHttpUrl(url) || isDataImageUrl(url);
}

/** Fallback when the browser does not provide a loadable favIconUrl. */
export function faviconUrlFromPageUrl(pageUrl) {
  if (!isHttpUrl(pageUrl)) return "";
  try {
    const { hostname } = new URL(pageUrl);
    if (!hostname) return "";
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
  } catch {
    return "";
  }
}

export function resolveFaviconUrl(entry) {
  const direct = entry.favIconUrl || "";
  if (direct && isAllowedFaviconUrl(direct)) return direct;
  return faviconUrlFromPageUrl(entry.url || "");
}

export function normalizeUrlForMatch(url) {
  try {
    const u = new URL(url);
    return u.href.replace(/\/$/, "");
  } catch {
    return String(url).replace(/\/$/, "");
  }
}

export function displayUrl(url) {
  try {
    const u = new URL(url);
    return u.host + u.pathname + u.search;
  } catch {
    return url;
  }
}
