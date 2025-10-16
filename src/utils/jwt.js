/**
 * Lightweight JWT decoder (no verification).
 * Safely decodes a JWT payload part and returns an object or null.
 */

function base64UrlToBase64(input) {
  // Replace URL-safe chars
  let b64 = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '=' to length multiple of 4
  const pad = b64.length % 4;
  if (pad === 2) b64 += "==";
  else if (pad === 3) b64 += "=";
  else if (pad !== 0) b64 += "==="; // len%4===1 is technically invalid, add padding defensively
  return b64;
}

export function decodeJwt(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64 = base64UrlToBase64(parts[1]);
    const json = atob(payloadB64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getJwtPayload(token) {
  const payload = decodeJwt(token);
  return payload && typeof payload === "object" ? payload : null;
}

export default {
  decodeJwt,
  getJwtPayload,
};

