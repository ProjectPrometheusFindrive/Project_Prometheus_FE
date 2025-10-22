import { requestUploadSign, requestResumableSession } from "../api";
import { DEFAULT_RESUMABLE_CHUNK_SIZE } from "../constants/uploads";
import log, { isDebug } from "./logger";

// Ensure contentType complies with folder-specific rules
function sanitizeUploadContentType(file, folder) {
  const type = (file && file.type) ? String(file.type) : "";
  const name = (file && file.name) ? String(file.name) : "";
  const idx = name.lastIndexOf(".");
  const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";

  const isCompanyDocs = typeof folder === "string" && /^company\/[A-Za-z0-9_-]+\/docs$/.test(folder);
  const isBizCert = typeof folder === "string" && /^business-certificates\/[A-Za-z0-9_-]+$/.test(folder);

  if (isCompanyDocs || isBizCert) {
    if (type.startsWith("image/")) return type;
    if (type === "application/pdf") return type;
    if (ext === "pdf") return "application/pdf";
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico"].includes(ext)) {
      if (ext === "jpg") return "image/jpeg";
      return `image/${ext}`;
    }
    // Fallback within allowed categories; prefer image/png as a safe default
    return "image/png";
  }

  // Other folders: keep original or generic default
  return type || "application/octet-stream";
}

// Small file upload via signed PUT URL with progress and cancel support
export function uploadViaSignedPut(file, { folder, onProgress, signal } = {}) {
  let xhr = null;
  let aborted = false;

  const promise = (async () => {
    const fileName = file?.name || "upload.bin";
    const contentType = sanitizeUploadContentType(file, folder);

    if (isDebug()) { console.groupCollapsed("[upload] 업로드 시작 (소용량)"); }
    log.debug("file:", { name: fileName, size: file?.size, type: contentType });
    log.debug("folder:", folder || "(none)");
    const sign = await requestUploadSign({ fileName, contentType, folder, fileSize: file?.size || 0 });
    log.debug("sign response:", sign);
    if (!sign || !sign.uploadUrl) {
      throw new Error("Failed to obtain signed upload URL");
    }

    const startedAt = Date.now();
    await new Promise((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open("PUT", sign.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", sign.contentType || contentType);

      log.debug("XHR 업로드 요청", {
        url: sign.uploadUrl,
        contentType: sign.contentType || contentType,
      });

      if (signal) {
        const onAbort = () => {
          try { xhr.abort(); } catch {}
          aborted = true;
          console.warn("[upload] signed-put aborted by signal");
        };
        if (signal.aborted) onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
      }

      xhr.upload.onprogress = (evt) => {
        if (onProgress && evt && evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress({ loaded: evt.loaded, total: evt.total, percent: pct, phase: "upload" });
        }
        if (import.meta && import.meta.env && import.meta.env.DEV && evt && evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          log.debug(`[upload] 진행률: ${pct}% (${evt.loaded}/${evt.total})`);
        }
      };

      xhr.onload = () => {
        log.debug("[upload] 완료 상태:", xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      };
      xhr.onerror = () => {
        log.error("[upload] 네트워크 오류");
        reject(new Error("Network error during upload"));
      };
      xhr.onabort = () => {
        log.warn("[upload] 업로드 취소 (XHR abort)");
        reject(new Error("Upload aborted"));
      };
      xhr.send(file);
    });

    const result = {
      objectName: sign.objectName,
      publicUrl: sign.publicUrl,
      contentType: sign.contentType || contentType,
      bytesSent: file.size,
      durationMs: Date.now() - startedAt,
      uploadUrl: sign.uploadUrl,
    };
    log.debug("[upload] 완료:", result);
    if (isDebug()) if (isDebug()) console.groupEnd();
    return result;
  })();

  const cancel = () => {
    aborted = true;
    try { xhr && xhr.abort(); } catch {}
    log.warn("[upload] 업로드 취소 호출");
  };

  return { promise, cancel, get aborted() { return aborted; } };
}

// Resumable upload with chunking and progress/cancel/resume support
export function uploadResumable(file, { folder, onProgress, signal, chunkSize = DEFAULT_RESUMABLE_CHUNK_SIZE } = {}) {
  let xhr = null;
  let aborted = false;
  let offset = 0; // next byte index to send
  let session = null; // { sessionUrl, objectName, publicUrl, contentType }

  const doUpload = async () => {
    const fileName = file?.name || "upload.bin";
    const contentType = sanitizeUploadContentType(file, folder);

    if (!session) {
      if (isDebug()) console.groupCollapsed("[upload] 업로드 시작 (대용량)");
      log.debug("file:", { name: fileName, size: file?.size, type: contentType });
      log.debug("folder:", folder || "(none)");
      session = await requestResumableSession({ fileName, contentType, folder, fileSize: file?.size || 0 });
      log.debug("resumable session:", session);
      if (!session || !session.sessionUrl) {
        throw new Error("Failed to obtain resumable session URL");
      }
    }

    const total = file.size || 0;
    const startedAt = Date.now();

    const sendChunk = (start, end) =>
      new Promise((resolve, reject) => {
        // Slice end-exclusive, header end is inclusive
        const blob = file.slice(start, end);
        const endInclusive = end - 1;
        xhr = new XMLHttpRequest();
        xhr.open("PUT", session.sessionUrl, true);
        xhr.setRequestHeader("Content-Type", session.contentType || contentType);
        xhr.setRequestHeader("Content-Range", `bytes ${start}-${endInclusive}/${total}`);
        console.debug("[upload] resumable send chunk:", { start, end: endInclusive, total });

        if (signal) {
          const onAbort = () => {
            try { xhr.abort(); } catch {}
            aborted = true;
            console.warn("[upload] resumable aborted by signal");
          };
          if (signal.aborted) onAbort();
          signal.addEventListener("abort", onAbort, { once: true });
        }

        xhr.upload.onprogress = (evt) => {
          if (onProgress && evt && evt.lengthComputable) {
            const loadedOverall = start + evt.loaded;
            const pct = Math.round((loadedOverall / total) * 100);
            onProgress({ loaded: loadedOverall, total, percent: pct, phase: "upload" });
          }
          if (evt && evt.lengthComputable) {
            const loadedOverall = start + evt.loaded;
            const pct = Math.round((loadedOverall / total) * 100);
            log.debug(`[upload] 진행률: ${pct}% (${loadedOverall}/${total})`)
          }
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return;
          const status = xhr.status;
          if (status >= 200 && status < 300) {
            // Completed upload
            offset = total;
            onProgress && onProgress({ loaded: total, total, percent: 100, phase: "commit" });
            log.debug("[upload] 완료 상태:", status)
            resolve({ done: true });
            return;
          }
          if (status === 308) {
            // Resume Incomplete, parse Range header
            const range = xhr.getResponseHeader("Range");
            log.debug("[upload] 308 Range:", range)
            if (range) {
              const m = range.match(/bytes=(\d+)-(\d+)/);
              if (m) {
                const last = parseInt(m[2], 10);
                offset = last + 1;
                log.debug("[upload] 다음 오프셋(헤더):", offset)
              }
            } else {
              offset = end; // assume full chunk accepted
              log.debug("[upload] 다음 오프셋(추정):", offset)
            }
            resolve({ done: false });
            return;
          }
          console.error("[upload] resumable unexpected status:", status);
          reject(new Error(`Resumable upload error: HTTP ${status}`));
        };

        xhr.onerror = () => {
          console.error("[upload] resumable network error");
          reject(new Error("Network error during resumable upload"));
        };
        xhr.onabort = () => {
          console.warn("[upload] resumable xhr aborted");
          reject(new Error("Upload aborted"));
        };
        xhr.send(blob);
      });

    while (offset < total) {
      if (aborted) throw new Error("Upload aborted");
      const nextEnd = Math.min(offset + chunkSize, total);
      const res = await sendChunk(offset, nextEnd);
      if (res.done) break;
    }

    const result = {
      objectName: session.objectName,
      publicUrl: session.publicUrl,
      contentType: session.contentType || contentType,
      bytesSent: total,
      durationMs: Date.now() - startedAt,
      sessionUrl: session.sessionUrl,
    };
    log.debug("[upload] 완료:", result);
    console.groupEnd();
    return result;
  };

  const promise = doUpload();

  const cancel = () => {
    aborted = true;
    try { xhr && xhr.abort(); } catch {}
    log.warn("[upload] 업로드 취소 호출");
  };

  const resume = () => {
    // continues with existing session and current offset
    aborted = false;
    log.warn("[upload] 업로드 재개 (offset):", offset);
    return doUpload();
  };

  return { promise, cancel, resume, get aborted() { return aborted; }, get sessionUrl() { return session?.sessionUrl; } };
}
