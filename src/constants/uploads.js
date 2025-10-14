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
  "video/x-msvideo", // avi
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

export function chooseUploadMode(fileSize) {
  return fileSize <= SMALL_FILE_THRESHOLD_BYTES ? "signed-put" : "resumable";
}

