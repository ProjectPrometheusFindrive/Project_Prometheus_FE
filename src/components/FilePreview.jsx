import React, { useEffect, useState } from "react";
import "./FilePreview.css";

/**
 * FilePreview Component
 *
 * Displays a preview of selected file:
 * - Images (png, jpg, jpeg, webp, etc.): Shows image preview
 * - PDFs: Shows embedded PDF viewer
 * - Other files: Shows "Preview not supported" message with file info
 *
 * @param {File|null} file - The file to preview
 * @param {string} className - Optional additional CSS class
 */
export default function FilePreview({ file, className = "" }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState(""); // "image", "pdf", "video", "unsupported"

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      setPreviewType("");
      return;
    }

    const fileType = file.type || "";

    // Determine preview type
    if (fileType.startsWith("image/")) {
      setPreviewType("image");
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result || "");
      };
      reader.readAsDataURL(file);
    } else if (fileType === "application/pdf") {
      setPreviewType("pdf");
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Cleanup object URL on unmount
      return () => URL.revokeObjectURL(url);
    } else if (fileType.startsWith("video/")) {
      setPreviewType("video");
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Cleanup object URL on unmount
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewType("unsupported");
      setPreviewUrl("");
    }
  }, [file]);

  if (!file) {
    return (
      <div className={`file-preview file-preview--empty ${className}`}>
        <div className="file-preview__placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <p>파일을 선택하면 미리보기가 표시됩니다</p>
        </div>
      </div>
    );
  }

  if (previewType === "image") {
    return (
      <div className={`file-preview file-preview--image ${className}`}>
        <img
          src={previewUrl}
          alt={file.name}
          className="file-preview__image"
        />
        <div className="file-preview__info">
          <span className="file-preview__filename">{file.name}</span>
          <span className="file-preview__filesize">{formatFileSize(file.size)}</span>
        </div>
      </div>
    );
  }

  if (previewType === "pdf") {
    return (
      <div className={`file-preview file-preview--pdf ${className}`}>
        <iframe
          src={previewUrl}
          className="file-preview__pdf-viewer"
          title={file.name}
        />
        <div className="file-preview__info">
          <span className="file-preview__filename">{file.name}</span>
          <span className="file-preview__filesize">{formatFileSize(file.size)}</span>
        </div>
      </div>
    );
  }

  if (previewType === "video") {
    return (
      <div className={`file-preview file-preview--video ${className}`}>
        <video
          src={previewUrl}
          className="file-preview__video"
          controls
          preload="metadata"
          aria-label={file.name}
        />
        <div className="file-preview__info">
          <span className="file-preview__filename">{file.name}</span>
          <span className="file-preview__filesize">{formatFileSize(file.size)}</span>
          <span className="file-preview__filetype">{file.type || "video"}</span>
        </div>
      </div>
    );
  }

  // Unsupported file type
  return (
    <div className={`file-preview file-preview--unsupported ${className}`}>
      <div className="file-preview__placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="12" y1="9" x2="12" y2="9" />
        </svg>
        <p className="file-preview__unsupported-message">
          이 파일은 미리보기를 지원하지 않습니다
        </p>
        <div className="file-preview__info">
          <span className="file-preview__filename">{file.name}</span>
          <span className="file-preview__filesize">{formatFileSize(file.size)}</span>
          <span className="file-preview__filetype">{file.type || "알 수 없는 형식"}</span>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
