import { describe, expect, it } from "vitest";
import { checkImageFile, hasValidImageSignature, imageExtension, validateImageUpload } from "./uploads";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const file = (bytes: number[] | Uint8Array, name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

describe("checkImageFile", () => {
  it("accepts supported images under the limit", () => {
    expect(checkImageFile(file(PNG_HEADER, "a.png", "image/png"), "covers")).toBeNull();
  });

  it("rejects unsupported types", () => {
    expect(checkImageFile(file([1, 2, 3], "a.svg", "image/svg+xml"), "covers")).toMatch(/not a supported image/);
    expect(checkImageFile(file([1, 2, 3], "a.html", "text/html"), "covers")).toMatch(/not a supported image/);
  });

  it("applies per-bucket size limits", () => {
    const big = file(new Uint8Array(6 * 1024 * 1024), "big.png", "image/png");
    expect(checkImageFile(big, "covers")).toMatch(/limit is 5 MB/);
    expect(checkImageFile(big, "manga-images")).toBeNull();
  });
});

describe("hasValidImageSignature", () => {
  it("recognises real PNG and JPEG headers", async () => {
    expect(await hasValidImageSignature(file(PNG_HEADER, "a.png", "image/png"))).toBe(true);
    expect(await hasValidImageSignature(file(JPEG_HEADER, "a.jpg", "image/jpeg"))).toBe(true);
  });

  it("rejects a file whose content doesn't match its type", async () => {
    const fake = file([...new TextEncoder().encode("<script>alert(1)</script>")], "evil.png", "image/png");
    expect(await hasValidImageSignature(fake)).toBe(false);
    expect(await validateImageUpload(fake, "covers")).toMatch(/doesn't look like a real PNG/);
  });
});

describe("imageExtension", () => {
  it("uses the MIME type, not the file name", () => {
    expect(imageExtension(file(PNG_HEADER, "photo.exe", "image/png"))).toBe("png");
    expect(imageExtension(file(JPEG_HEADER, "x", "image/jpeg"))).toBe("jpg");
  });
});
