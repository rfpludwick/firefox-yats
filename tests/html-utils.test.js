import { describe, expect, it } from "vitest";
import { escHtml, highlight } from "../src/lib/html-utils.js";

describe("escHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escHtml(`<img src="x" onerror='a&b'>`)).toBe(
      "&lt;img src=&quot;x&quot; onerror='a&amp;b'&gt;"
    );
  });
});

describe("highlight", () => {
  it("escapes text without indices", () => {
    expect(highlight("<b>", [])).toBe("&lt;b&gt;");
  });

  it("wraps matched indices in mark tags", () => {
    expect(highlight("abc", [1])).toBe("a<mark>b</mark>c");
  });
});
