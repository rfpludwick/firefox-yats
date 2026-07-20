import { describe, expect, it } from "vitest";
import {
  displayUrl,
  faviconUrlFromPageUrl,
  isAllowedFaviconUrl,
  isDataImageUrl,
  isHttpUrl,
  normalizeUrlForMatch,
  resolveFaviconUrl,
} from "../src/lib/url-utils.js";

describe("isHttpUrl", () => {
  it("allows http and https", () => {
    expect(isHttpUrl("https://example.com/path")).toBe(true);
    expect(isHttpUrl("http://localhost:3000")).toBe(true);
  });

  it("rejects non-http schemes", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isHttpUrl("moz-extension://id/page.html")).toBe(false);
    expect(isHttpUrl("data:text/html,hi")).toBe(false);
  });

  it("rejects invalid input", () => {
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl("not a url")).toBe(false);
  });
});

describe("normalizeUrlForMatch", () => {
  it("strips trailing slash from parsed URLs", () => {
    expect(normalizeUrlForMatch("https://example.com/foo/")).toBe("https://example.com/foo");
  });

  it("falls back for invalid URLs", () => {
    expect(normalizeUrlForMatch("foo/bar/")).toBe("foo/bar");
  });
});

describe("displayUrl", () => {
  it("shows host path and search", () => {
    expect(displayUrl("https://example.com/path?q=1")).toBe("example.com/path?q=1");
  });

  it("returns raw string when URL parsing fails", () => {
    expect(displayUrl("not-url")).toBe("not-url");
  });
});

describe("isDataImageUrl", () => {
  it("allows base64 image data URLs", () => {
    expect(isDataImageUrl("data:image/png;base64,abc")).toBe(true);
  });

  it("rejects non-image data URLs", () => {
    expect(isDataImageUrl("data:text/html,hi")).toBe(false);
  });
});

describe("isAllowedFaviconUrl", () => {
  it("allows http(s) and image data URLs", () => {
    expect(isAllowedFaviconUrl("https://example.com/f.ico")).toBe(true);
    expect(isAllowedFaviconUrl("data:image/png;base64,abc")).toBe(true);
    expect(isAllowedFaviconUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("faviconUrlFromPageUrl", () => {
  it("builds a Google favicon URL from the page hostname", () => {
    expect(faviconUrlFromPageUrl("https://github.com/repo")).toBe(
      "https://www.google.com/s2/favicons?domain=github.com&sz=32"
    );
  });

  it("returns empty for non-http URLs", () => {
    expect(faviconUrlFromPageUrl("about:blank")).toBe("");
  });
});

describe("resolveFaviconUrl", () => {
  it("prefers a direct http favicon URL", () => {
    expect(
      resolveFaviconUrl({
        favIconUrl: "https://example.com/icon.ico",
        url: "https://example.com/page",
      })
    ).toBe("https://example.com/icon.ico");
  });

  it("falls back to a derived favicon from the page URL", () => {
    expect(
      resolveFaviconUrl({
        favIconUrl: "moz-icon://example.com",
        url: "https://example.com/page",
      })
    ).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=32");
  });

  it("accepts data image favicons from the browser", () => {
    expect(
      resolveFaviconUrl({
        favIconUrl: "data:image/png;base64,abc",
        url: "https://example.com/page",
      })
    ).toBe("data:image/png;base64,abc");
  });
});
