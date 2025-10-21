import React, { useMemo, useEffect } from "react";
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

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Helper to open file in new window (robust across data/blob URLs)
  const handleOpenNewWindow = () => {
    if (!src) return;

    // Open synchronously to avoid popup blockers
    const newWin = window.open("", "_blank");
    if (!newWin) {
      // Fallback if blocked
      window.open(src, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      newWin.opener = null; // security
      const doc = newWin.document;
      const safeTitle = String(title || "미리보기");
      const baseStyles = `
        html, body { margin: 0; height: 100%; background: #0b1220; }
        @media (prefers-color-scheme: light) { html, body { background: #fafafa; } }
        .wrap { display:flex; align-items:center; justify-content:center; height:100%; }
        img, video, iframe { max-width: 100%; max-height: 100%; }
        iframe { width: 100%; height: 100%; border: 0; background: #fafafa; }
        video { background: #000; }
      `;

      const content = (() => {
        if (kind === "image") {
          return `<div class=\"wrap\"><img src=\"${src}\" alt=\"${safeTitle}\"/></div>`;
        }
        if (kind === "pdf") {
          return `<iframe src=\"${src}\" title=\"${safeTitle}\"></iframe>`;
        }
        if (kind === "video") {
          return `<div class=\"wrap\"><video src=\"${src}\" controls></video></div>`;
        }
        return `<div class=\"wrap\" style=\"color:#666;font:14px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial\">미리보기를 지원하지 않는 형식입니다.</div>`;
      })();

      doc.open();
      doc.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>${safeTitle}</title><style>${baseStyles}</style></head><body>${content}</body></html>`);
      doc.close();
    } catch (e) {
      // As a last resort, navigate the new tab directly
      try { newWin.location.href = src; } catch (_) { /* ignore */ }
    }
  };

  const customHeaderContent = (
    <div className="flex justify-between items-center w-full">
      <strong>{title}</strong>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} customHeaderContent={customHeaderContent} size="large" showFooter={false} ariaLabel={title} className="document-viewer-modal">
    <div className="document-viewer flex flex-col gap-2">
      <div className="document-viewer__actions flex justify-end gap-2">
          {src && (
            <>
              <button type="button" onClick={handleOpenNewWindow} className="form-button" title="새 창에서 열기">새 창</button>
              {allowDownload && (
                <a href={src} download={downloadName} className="form-button" title="다운로드" rel="noopener noreferrer">다운로드</a>
              )}
            </>
          )}
          <div className="ml-4">
            <button type="button" onClick={onClose} className="form-button bg-gray-900" title="닫기 (ESC)">닫기</button>
          </div>
        </div>
      <div className="document-viewer__content flex justify-center">
          {kind === "image" && (
            <img
              src={src}
              alt={title}
              className="max-w-[90vw] max-h-[80vh] object-contain"
            />
          )}
          {kind === "pdf" && (
            <iframe
              src={src}
              title={title}
              className="w-[90vw] h-[80vh] bg-[#fafafa] border-0 document-viewer__pdf"
            />
          )}
          {kind === "video" && (
            <video
              src={src}
              controls
              className="max-w-[90vw] max-h-[80vh] bg-black"
            />
          )}
          {kind === "unknown" && (
      <div className="p-4 text-gray-600">미리보기를 지원하지 않는 형식입니다.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
