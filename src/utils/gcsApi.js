// GCS upload/download helpers using backend-signed URLs

import { typedStorage } from "./storage";

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return base.replace(/\/$/, "");
};

/**
 * 파일을 GCS에 업로드하고 objectName을 반환
 * @param {File|Blob} file
 * @param {string} folder - 예: 'company/ci/docs'
 * @returns {Promise<string>} objectName
 */
export async function uploadFileToGCS(file, folder = "") {
  if (!file) throw new Error("No file provided");

  const base = getBaseUrl();
  const signUrl = `${base}/uploads/sign`;

  const token = typedStorage.auth.getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Sanitize contentType for folder-specific rules (company docs and biz-certs allow only pdf or image/*)
  const sanitizeContentType = (f, folderPath) => {
    const t = f?.type ? String(f.type) : "";
    const n = f?.name ? String(f.name) : "";
    const dot = n.lastIndexOf(".");
    const ext = dot >= 0 ? n.slice(dot + 1).toLowerCase() : "";
    const isCompanyDocs = typeof folderPath === "string" && /^company\/[A-Za-z0-9_-]+\/docs$/.test(folderPath);
    const isBizCert = typeof folderPath === "string" && /^business-certificates\/[A-Za-z0-9_-]+$/.test(folderPath);
    if (isCompanyDocs || isBizCert) {
      if (t.startsWith("image/")) return t;
      if (t === "application/pdf") return t;
      if (ext === "pdf") return "application/pdf";
      if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico"].includes(ext)) {
        if (ext === "jpg") return "image/jpeg";
        return `image/${ext}`;
      }
      return "image/png";
    }
    return t || "application/octet-stream";
  };

  const signResponse = await fetch(signUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({
      fileName: file.name,
      contentType: sanitizeContentType(file, folder),
      folder: folder || "",
    }),
  });

  if (!signResponse.ok) {
    const text = await safeReadText(signResponse);
    throw new Error(text || "Failed to get upload URL");
  }

  const { uploadUrl, objectName } = await signResponse.json();
  if (!uploadUrl || !objectName) {
    throw new Error("Malformed signing response");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": sanitizeContentType(file, folder) },
    body: file,
  });

  if (!uploadResponse.ok) {
    const text = await safeReadText(uploadResponse);
    throw new Error(text || "Failed to upload file");
  }

  return objectName;
}

/**
 * objectName을 Signed Download URL로 변환
 * @param {string} objectName
 * @param {number} ttlSeconds
 * @returns {Promise<string>} downloadUrl
 */
export async function getSignedDownloadUrl(objectName, ttlSeconds = 3600) {
  if (!objectName) throw new Error("No objectName provided");

  // Allow data URLs to bypass signing during local preview
  if (typeof objectName === "string" && objectName.startsWith("data:")) {
    return objectName;
  }

  // If a full GCS URL is passed, try to derive the object name
  if (typeof objectName === "string" && /(storage\.(googleapis|cloud)\.com)|^gs:\/\//i.test(objectName)) {
    const derived = deriveObjectName(objectName);
    if (derived) objectName = derived;
  }

  const base = getBaseUrl();
  const url = `${base}/uploads/download-url`;

  const token = typedStorage.auth.getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ objectName, ttlSeconds }),
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    throw new Error(text || "Failed to get download URL");
  }

  const { downloadUrl } = await response.json();
  if (!downloadUrl) throw new Error("Malformed download-url response");
  return downloadUrl;
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// Try to derive objectName from common GCS URL shapes
export function deriveObjectName(input) {
  if (!input || typeof input !== "string") return "";
  try {
    // gs://bucket/object
    if (input.startsWith("gs://")) {
      const rest = input.slice(5); // skip gs://
      const idx = rest.indexOf("/");
      return idx >= 0 ? decodeURIComponent(rest.slice(idx + 1)) : "";
    }
    const u = new URL(input);
    const host = u.hostname || "";
    const pathname = u.pathname || "/";
    // https://storage.googleapis.com/bucket/object
    if (host === "storage.googleapis.com" || host === "storage.cloud.google.com") {
      const parts = pathname.replace(/^\/+/, "").split("/");
      if (parts.length >= 2) {
        return decodeURIComponent(parts.slice(1).join("/"));
      }
      return "";
    }
    // https://bucket.storage.googleapis.com/object
    if (/\.storage\.googleapis\.com$/i.test(host)) {
      const p = pathname.replace(/^\/+/, "");
      return decodeURIComponent(p);
    }
  } catch {}
  return "";
}
