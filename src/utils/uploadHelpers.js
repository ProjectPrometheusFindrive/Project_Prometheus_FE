import { ALLOWED_MIME_TYPES, chooseUploadMode } from "../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "./uploads";

/**
 * Upload a single File to GCS using either signed PUT or resumable upload.
 * Returns { url, objectName } when successful, or null on failure/skip.
 */
export async function uploadOne(file, { folder, label, onProgress } = {}) {
  if (!file) return null;
  const type = file.type || "";
  if (type && !ALLOWED_MIME_TYPES.includes(type)) {
    console.warn(`[upload-ui] ${label || "file"} skipped: disallowed type`, type);
    return null;
  }
  const mode = chooseUploadMode(file.size || 0);
  try {
    if (mode === "signed-put") {
      const { promise } = uploadViaSignedPut(file, { folder, onProgress });
      const res = await promise;
      return { url: res?.publicUrl || null, objectName: res?.objectName || null };
    }
    const { promise } = uploadResumable(file, { folder, onProgress });
    const res = await promise;
    return { url: res?.publicUrl || null, objectName: res?.objectName || null };
  } catch (e) {
    console.error(`[upload-ui] ${label || "file"} upload failed`, e);
    return null;
  }
}

/**
 * Like uploadOne, but returns a cancel function and mode along with a promise.
 * Caller can set UI state with { mode, cancel } and await .promise for result.
 */
export function uploadOneCancelable(file, { folder, label, onProgress } = {}) {
  if (!file) return { mode: "", cancel: null, promise: Promise.resolve(null) };
  const type = file.type || "";
  if (type && !ALLOWED_MIME_TYPES.includes(type)) {
    console.warn(`[upload-ui] ${label || "file"} skipped: disallowed type`, type);
    return { mode: "", cancel: null, promise: Promise.resolve(null) };
  }
  const mode = chooseUploadMode(file.size || 0);
  if (mode === "signed-put") {
    const { promise, cancel } = uploadViaSignedPut(file, { folder, onProgress });
    const mapped = promise
      .then((res) => ({ url: res?.publicUrl || null, objectName: res?.objectName || null }))
      .catch((e) => {
        console.error(`[upload-ui] ${label || "file"} upload failed`, e);
        return null;
      });
    return { mode, cancel, promise: mapped };
  }
  const { promise, cancel } = uploadResumable(file, { folder, onProgress });
  const mapped = promise
    .then((res) => ({ url: res?.publicUrl || null, objectName: res?.objectName || null }))
    .catch((e) => {
      console.error(`[upload-ui] ${label || "file"} upload failed`, e);
      return null;
    });
  return { mode, cancel, promise: mapped };
}

/**
 * Upload multiple files and return batched names/urls/objects arrays.
 * @returns {{ names: string[], urls: string[], objects: string[] }}
 */
export async function uploadMany(files, { folder, label, onProgress } = {}) {
  const list = Array.isArray(files) ? files : [];
  const names = [];
  const urls = [];
  const objects = [];
  for (const f of list) {
    const res = await uploadOne(f, { folder, label, onProgress });
    if (res && (res.url || res.objectName)) {
      names.push(f.name);
      if (res.url) urls.push(res.url);
      if (res.objectName) objects.push(res.objectName);
    }
  }
  return { names, urls, objects };
}
