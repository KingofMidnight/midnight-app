// Must match the bucket limits in migration_006_cyoa_uploads.sql
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export const MAX_UPLOAD_BYTES: Record<string, number> = {
  covers: 5 * 1024 * 1024,
  "manga-images": 10 * 1024 * 1024,
};

// Returns an error message, or null if the file can be uploaded to this bucket
export function checkImageFile(file: File, bucket: string): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image. Use JPG, PNG, WebP or GIF.`;
  }
  const max = MAX_UPLOAD_BYTES[bucket] ?? 5 * 1024 * 1024;
  if (file.size > max) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${max / 1024 / 1024} MB.`;
  }
  return null;
}

// File signatures ("magic bytes"): the browser-reported type comes from the file
// name, so this confirms the file really is the image format it claims to be.
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
  "image/gif": (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};

// Blob.arrayBuffer() is missing in some older browsers (and jsdom), so fall back to FileReader
function readHead(file: Blob, bytes: number): Promise<Uint8Array> {
  const part = file.slice(0, bytes);
  if (typeof part.arrayBuffer === "function") return part.arrayBuffer().then((b) => new Uint8Array(b));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(part);
  });
}

export async function hasValidImageSignature(file: File): Promise<boolean> {
  const check = SIGNATURES[file.type];
  if (!check) return false;
  return check(await readHead(file, 12));
}

// Full check: type, size and content. Returns an error message or null.
export async function validateImageUpload(file: File, bucket: string): Promise<string | null> {
  const basic = checkImageFile(file, bucket);
  if (basic) return basic;
  if (!(await hasValidImageSignature(file))) {
    return `"${file.name}" doesn't look like a real ${file.type.replace("image/", "").toUpperCase()} image.`;
  }
  return null;
}

// Extension from the MIME type, not the user-supplied file name
export const imageExtension = (file: File) =>
  ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[file.type] ?? "img";
