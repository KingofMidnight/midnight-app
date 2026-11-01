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

// Extension from the MIME type, not the user-supplied file name
export const imageExtension = (file: File) =>
  ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[file.type] ?? "img";
