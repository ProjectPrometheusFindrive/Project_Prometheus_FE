import React, { useMemo } from "react";
import Modal from "./Modal";

// Infer content type from URL or explicit prop
function inferType(src, explicit) {
  if (explicit) return explicit;
  const url = String(src || "").toLowerCase();
  if (!url) return "unknown";
  if (/(?:^|[.?=&])content-type=application%2Fpdf/.test(url) || url.endsWith(".pdf")) return "pdf";
  if (/\.(mp4|webm|mov|avi|mpeg|mpg)$/.test(url) || /[?&]type=video\//.test(url)) return "video";
  if (/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/.test(url) || /[?&]type=image\//.test(url)) return "image";
  return "unknown";
}

export default function DocumentViewer({
  isOpen,
  onClose,
  src,
  type,
  title = "미리보기",
  allowDownload = true,
  downloadName = "download",
}) {
  const kind = useMemo(() => inferType(src, type), [src, type]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="large" showFooter={false} ariaLabel={title} className="document-viewer-modal">
      <div className="document-viewer" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="document-viewer__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {src && (
            <>
              <a href={src} target="_blank" rel="noopener noreferrer" className="form-button" title="새 창에서 열기">새 창</a>
              {allowDownload && (
                <a href={src} download={downloadName} className="form-button" title="다운로드">다운로드</a>
              )}
            </>
          )}
        </div>
        <div className="document-viewer__content" style={{ display: "flex", justifyContent: "center" }}>
          {kind === "image" && (
            <img
              src={src}
              alt={title}
              style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain" }}
            />
          )}
          {kind === "pdf" && (
            <iframe
              src={src}
              title={title}
              style={{ width: "90vw", height: "80vh", border: "none", background: "#fafafa" }}
            />
          )}
          {kind === "video" && (
            <video
              src={src}
              controls
              style={{ maxWidth: "90vw", maxHeight: "80vh", background: "black" }}
            />
          )}
          {kind === "unknown" && (
            <div style={{ padding: 16, color: "#555" }}>미리보기를 지원하지 않는 형식입니다.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
