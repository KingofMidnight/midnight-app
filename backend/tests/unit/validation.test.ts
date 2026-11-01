import { describe, expect, it } from "vitest";
import { sanitizeChapterHtml, sanitizeCommentHtml, validateImageUrl, validateTextContent } from "../../src/utils/validation";

describe("sanitizeCommentHtml", () => {
  it("keeps basic formatting", () => {
    expect(sanitizeCommentHtml("<p>hi <strong>there</strong></p>")).toBe("<p>hi <strong>there</strong></p>");
  });

  it.each([
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    "<iframe src=//evil></iframe>",
  ])("strips %s", (dirty) => {
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).not.toMatch(/script|onerror|javascript:|iframe/i);
  });
});

describe("sanitizeChapterHtml", () => {
  it("allows headings and lists but no images or scripts", () => {
    const clean = sanitizeChapterHtml('<h2>Title</h2><ul><li>a</li></ul><img src="x"><script>1</script>');
    expect(clean).toContain("<h2>Title</h2>");
    expect(clean).toContain("<li>a</li>");
    expect(clean).not.toMatch(/<img|<script/);
  });
});

describe("validateTextContent", () => {
  it("enforces length limits", () => {
    expect(validateTextContent("", 1, 10).valid).toBe(false);
    expect(validateTextContent("x".repeat(11), 1, 10).valid).toBe(false);
    expect(validateTextContent("hello", 1, 10).valid).toBe(true);
  });

  it("rejects null bytes", () => {
    expect(validateTextContent("a\0b").valid).toBe(false);
  });
});

describe("validateImageUrl", () => {
  it("accepts http(s) image URLs", () => {
    expect(validateImageUrl("https://example.com/a.png").valid).toBe(true);
  });

  it.each(["javascript:alert(1)", "https://example.com/a.svg", "https://example.com/page.html", "data:image/png;base64,AAAA"])(
    "rejects %s",
    (url) => {
      expect(validateImageUrl(url).valid).toBe(false);
    }
  );
});
