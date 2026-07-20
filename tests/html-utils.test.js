// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { highlight } from "../src/lib/html-utils.js";

function textOf(fragment) {
  return Array.from(fragment.childNodes).map((n) => n.textContent).join("");
}

describe("highlight", () => {
  it("returns a single text node when there are no indices", () => {
    const fragment = highlight("<b>", []);
    expect(textOf(fragment)).toBe("<b>");
    expect(fragment.childNodes).toHaveLength(1);
    expect(fragment.childNodes[0].nodeName).toBe("#text");
  });

  it("wraps matched indices in mark elements", () => {
    const fragment = highlight("abc", [1]);
    expect(textOf(fragment)).toBe("abc");
    expect(fragment.childNodes).toHaveLength(3);
    expect(fragment.childNodes[1].nodeName).toBe("MARK");
    expect(fragment.childNodes[1].textContent).toBe("b");
  });

  it("groups contiguous matched indices into a single mark element", () => {
    const fragment = highlight("abcd", [1, 2]);
    expect(fragment.childNodes).toHaveLength(3);
    expect(fragment.childNodes[1].nodeName).toBe("MARK");
    expect(fragment.childNodes[1].textContent).toBe("bc");
  });

  it("never interprets text content as markup", () => {
    const fragment = highlight("<img onerror=x>", [0, 1]);
    expect(fragment.querySelector("img")).toBeNull();
    expect(textOf(fragment)).toBe("<img onerror=x>");
  });
});
