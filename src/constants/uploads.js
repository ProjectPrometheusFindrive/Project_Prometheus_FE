// Allowed MIME types for uploads
export const ALLOWED_MIME_TYPES = [
  // Documents & images
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/x-icon",
  "image/webp",
  // Videos
  "video/mp4",
  "video/x-msvideo", // avi (common)
  "video/avi", // avi (some browsers)
  "video/msvideo", // avi (legacy)
  "video/quicktime", // mov
  "video/mpeg",
];

// Threshold to choose between signed PUT vs resumable uploads (bytes)
export const SMALL_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB

// Default chunk size for resumable uploads (bytes)
export const DEFAULT_RESUMABLE_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

// Utility predicates
export function isMimeAllowed(type) {
  if (!type) return true; // Backend also infers by extension; allow empty types here
  return ALLOWED_MIME_TYPES.includes(type);
}

// Extension fallback for cases where browsers set non-standard or generic MIME types
const ALLOWED_EXTENSIONS = new Set([
  // Images
  "png", "jpg", "jpeg", "ico", "webp", "gif",
  // Documents
  "pdf",
  // Videos (blackbox)
  "mp4", "avi", "mov", "mpeg", "mpg",
]);

export function isFileTypeAllowed(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (!type || ALLOWED_MIME_TYPES.includes(type)) return true;
  const name = String(file.name || "");
  const idx = name.lastIndexOf(".");
  const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;
  return false;
}

export function chooseUploadMode(fileSize) {
  return fileSize <= SMALL_FILE_THRESHOLD_BYTES ? "signed-put" : "resumable";
}
