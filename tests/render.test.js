// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { highlight } from "../src/lib/html-utils.js";
import { entryBadge, subtitleFor } from "../src/lib/entries.js";
import { faviconEl, resultRowEl, resultsListFragment } from "../src/lib/render.js";
import { urlTextFor } from "../src/lib/scoring.js";

const helpers = {
  entryBadge,
  highlight,
  subtitleFor: (entry, urlText) => subtitleFor(entry, urlText, Date.parse("2026-01-10T12:00:00Z")),
  urlTextFor,
};

describe("faviconEl", () => {
  it("renders an http favicon image", () => {
    const el = faviconEl({
      title: "GitHub",
      favIconUrl: "https://github.com/favicon.ico",
    });
    expect(el.tagName).toBe("IMG");
    expect(el.className).toBe("favicon");
    expect(el.src).toBe("https://github.com/favicon.ico");
  });

  it("falls back to a letter div for javascript favicon URLs", () => {
    const el = faviconEl({
      title: "X",
      favIconUrl: "javascript:alert(1)",
      url: "about:blank",
    });
    expect(el.tagName).toBe("DIV");
    expect(el.className).toBe("favicon-fallback");
  });

  it("falls back to a derived favicon from the page URL", () => {
    const el = faviconEl({
      title: "GitHub",
      url: "https://github.com/repo",
    });
    expect(el.tagName).toBe("IMG");
    expect(el.src).toContain("google.com/s2/favicons");
  });
});

describe("resultRowEl", () => {
  it("never turns a malicious title into markup", () => {
    const li = resultRowEl(
      {
        entry: {
          kind: "open",
          title: '<script>alert("x")</script>',
          url: "https://example.com",
          urlDisplay: "example.com",
        },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      0,
      helpers
    );
    expect(li.querySelector("script")).toBeNull();
    expect(li.querySelector(".title").textContent).toBe('<script>alert("x")</script>');
  });

  it("uses stable index-based ids", () => {
    const li = resultRowEl(
      {
        entry: { kind: "open", title: "A", url: "https://a.test", urlDisplay: "a.test" },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      2,
      helpers
    );
    expect(li.id).toBe("result-2");
    expect(li.dataset.index).toBe("2");
  });

  it("shows a window badge for open tabs in multi-window mode", () => {
    const li = resultRowEl(
      {
        entry: {
          kind: "open",
          title: "A",
          url: "https://a.test",
          urlDisplay: "a.test",
          windowLabel: "Window 2",
          windowIndex: 2,
        },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      0,
      helpers
    );
    const badge = li.querySelector(".badge-window");
    expect(badge.className).toBe("badge badge-window badge-window-2");
    expect(badge.textContent).toBe("Window 2");
  });

  it("shows a colored group badge for open tabs with a tab group", () => {
    const li = resultRowEl(
      {
        entry: {
          kind: "open",
          title: "A",
          url: "https://a.test",
          urlDisplay: "a.test",
          groupName: "Work",
          groupColor: "cyan",
        },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      0,
      helpers
    );
    const badge = li.querySelector(".badge-group");
    expect(badge.className).toBe("badge badge-group badge-group-cyan");
    expect(badge.textContent).toBe("Work");
  });

  it("falls back to grey for an unrecognized or missing group color", () => {
    const li = resultRowEl(
      {
        entry: {
          kind: "open",
          title: "A",
          url: "https://a.test",
          urlDisplay: "a.test",
          groupName: "Work",
        },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      0,
      helpers
    );
    expect(li.querySelector(".badge-group").className).toBe("badge badge-group badge-group-grey");
  });

  it("omits window badge when windowLabel is absent", () => {
    const li = resultRowEl(
      {
        entry: { kind: "open", title: "A", url: "https://a.test", urlDisplay: "a.test" },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      0,
      helpers
    );
    expect(li.querySelector(".badge-window")).toBeNull();
  });
});

describe("resultsListFragment", () => {
  it("builds one <li> per match", () => {
    const fragment = resultsListFragment(
      [
        {
          entry: { kind: "open", title: "A", url: "https://a.test", urlDisplay: "a.test" },
          titleIndices: [],
          groupIndices: [],
          urlIndices: [],
        },
        {
          entry: { kind: "open", title: "B", url: "https://b.test", urlDisplay: "b.test" },
          titleIndices: [],
          groupIndices: [],
          urlIndices: [],
        },
      ],
      helpers
    );
    expect(fragment.querySelectorAll("li")).toHaveLength(2);
  });
});

describe("favicon src with an untrusted URL", () => {
  it("never lets a quote in the URL break out of the src attribute", () => {
    const el = faviconEl({
      title: "A",
      favIconUrl: 'https://example.com/x" onerror="alert(1)',
    });
    expect(el.getAttribute("onerror")).toBeNull();
    expect(el.src).toBe("https://example.com/x%22%20onerror=%22alert(1)");
  });
});
