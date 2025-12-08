import React, { useEffect, useMemo, useState } from "react";
import FilePreview from "./FilePreview";

// Horizontal carousel for previewing multiple files one-by-one.
// Uses existing FilePreview for rendering per-file.
// If onChange is provided, shows a remove button for the current file.
export default function FilesPreviewCarousel({ files = [], className = "", onChange }) {
  const items = useMemo(() => Array.isArray(files) ? files.filter(Boolean) : [], [files]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (!items || items.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);
  const canRemove = typeof onChange === "function";

  const handleRemove = () => {
    if (!canRemove) return;
    const nextItems = items.filter((_, i) => i !== index);
    onChange(nextItems);
    setIndex((prev) => {
      if (nextItems.length === 0) return 0;
      return prev >= nextItems.length ? nextItems.length - 1 : prev;
    });
  };

  return (
    <div className={`files-carousel ${className}`} aria-label="파일 미리보기" role="group">
      <div className="files-carousel__header">
        <span className="files-carousel__counter">{index + 1} / {items.length}</span>
      </div>
      <div className="files-carousel__body">
        {items.length > 1 && (
          <button
            type="button"
            className="files-carousel__arrow files-carousel__arrow--left"
            onClick={prev}
            aria-label="이전 파일"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect opacity="0.5" width="28" height="28" fill="#1C1C1C" />
              <path
                d="M11 8L17 14L11 20"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                transform="matrix(-1 0 0 1 28 0)"
              />
            </svg>
          </button>
        )}
        <FilePreview file={items[index]} />
        {canRemove && (
          <button
            type="button"
            className="files-carousel__remove"
            onClick={handleRemove}
            aria-label="현재 파일 제거"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5L15 15" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M15 5L5 15" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {items.length > 1 && (
          <button
            type="button"
            className="files-carousel__arrow files-carousel__arrow--right"
            onClick={next}
            aria-label="다음 파일"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect opacity="0.5" width="28" height="28" fill="#1C1C1C" />
              <path d="M11 8L17 14L11 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <style>{`
        .files-carousel { width: 100%; }
        .files-carousel__header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .files-carousel__counter { font-size: 12px; color:#666; }
        .files-carousel__body { width: 100%; position: relative; }
        .files-carousel__arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          z-index: 2;
        }
        .files-carousel__arrow--left { left: 0; }
        .files-carousel__arrow--right { right: 0; }
        .files-carousel__arrow svg { display: block; }
        .files-carousel__remove {
          position: absolute;
          top: 8px;
          right: 8px;
          border: none;
          background: rgba(0,0,0,0.45);
          padding: 4px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}

