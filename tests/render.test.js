import { describe, expect, it } from "vitest";
import { highlight } from "../src/lib/html-utils.js";
import { entryBadge, subtitleFor } from "../src/lib/entries.js";
import { faviconHtml, resultRowHtml, resultsListHtml } from "../src/lib/render.js";
import { urlTextFor } from "../src/lib/scoring.js";

const helpers = {
  entryBadge,
  highlight,
  subtitleFor: (entry, urlText) => subtitleFor(entry, urlText, Date.parse("2026-01-10T12:00:00Z")),
  urlTextFor,
};

describe("faviconHtml", () => {
  it("renders http favicon image", () => {
    const html = faviconHtml({
      title: "GitHub",
      favIconUrl: "https://github.com/favicon.ico",
    });
    expect(html).toContain('<img class="favicon"');
    expect(html).toContain("https://github.com/favicon.ico");
  });

  it("escapes javascript favicon URLs via fallback", () => {
    const html = faviconHtml({
      title: "X",
      favIconUrl: "javascript:alert(1)",
      url: "about:blank",
    });
    expect(html).toContain("favicon-fallback");
    expect(html).not.toContain("<img");
  });

  it("falls back to derived favicon from page URL", () => {
    const html = faviconHtml({
      title: "GitHub",
      url: "https://github.com/repo",
    });
    expect(html).toContain('<img class="favicon"');
    expect(html).toContain("google.com/s2/favicons");
  });
});

describe("resultRowHtml", () => {
  it("escapes malicious titles", () => {
    const html = resultRowHtml(
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
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uses stable index-based ids", () => {
    const html = resultRowHtml(
      {
        entry: { kind: "open", title: "A", url: "https://a.test", urlDisplay: "a.test" },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      2,
      helpers
    );
    expect(html).toContain('id="result-2"');
  });

  it("shows a window badge for open tabs in multi-window mode", () => {
    const html = resultRowHtml(
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
    expect(html).toContain('class="badge badge-window badge-window-2"');
    expect(html).toContain("Window 2");
  });

  it("shows a colored group badge for open tabs with a tab group", () => {
    const html = resultRowHtml(
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
    expect(html).toContain('class="badge badge-group badge-group-cyan"');
    expect(html).toContain("Work");
    expect(html).not.toContain("group-name");
  });

  it("falls back to grey for an unrecognized or missing group color", () => {
    const html = resultRowHtml(
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
    expect(html).toContain('class="badge badge-group badge-group-grey"');
  });

  it("omits window badge when windowLabel is absent", () => {
    const html = resultRowHtml(
      {
        entry: { kind: "open", title: "A", url: "https://a.test", urlDisplay: "a.test" },
        titleIndices: [],
        groupIndices: [],
        urlIndices: [],
      },
      0,
      helpers
    );
    expect(html).not.toContain("badge-window");
  });
});

describe("resultsListHtml", () => {
  it("joins multiple rows", () => {
    const html = resultsListHtml(
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
    expect(html.match(/<li /g)).toHaveLength(2);
  });
});

describe("escHtml in attributes", () => {
  it("prevents quote breaking in favicon src", () => {
    const html = faviconHtml({
      title: "A",
      favIconUrl: 'https://example.com/x" onerror="alert(1)',
    });
    expect(html).toContain("&quot;");
    expect(html).not.toContain('onerror="alert(1)"');
  });
});
