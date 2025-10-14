// GCS upload/download helpers using backend-signed URLs

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return base.replace(/\/$/, "");
};

/**
 * 파일을 GCS에 업로드하고 objectName을 반환
 * @param {File|Blob} file
 * @param {string} folder - 예: 'company/ci'
 * @returns {Promise<string>} objectName
 */
export async function uploadFileToGCS(file, folder = "") {
  if (!file) throw new Error("No file provided");

  const base = getBaseUrl();
  const signUrl = `${base}/uploads/sign`;

  const signResponse = await fetch(signUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
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
    headers: { "Content-Type": file.type || "application/octet-stream" },
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

  const base = getBaseUrl();
  const url = `${base}/uploads/download-url`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

