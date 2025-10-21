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
    <div className="document-viewer flex flex-col gap-2">
      <div className="document-viewer__actions flex justify-end gap-2">
          {src && (
            <>
              <a href={src} target="_blank" rel="noopener noreferrer" className="form-button" title="새 창에서 열기">새 창</a>
              {allowDownload && (
                <a href={src} download={downloadName} className="form-button" title="다운로드">다운로드</a>
              )}
            </>
          )}
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
