import React, { useEffect, useMemo, useState } from "react";
import FilePreview from "./FilePreview";

// Simple horizontal carousel for previewing multiple files one-by-one.
// Uses existing FilePreview for rendering per-file.
export default function FilesPreviewCarousel({ files = [], className = "" }) {
  const items = useMemo(() => Array.isArray(files) ? files.filter(Boolean) : [], [files]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (!items || items.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <div className={`files-carousel ${className}`} aria-label="파일 미리보기" role="group">
      <div className="files-carousel__header">
        <span className="files-carousel__counter">{index + 1} / {items.length}</span>
        <div className="flex gap-1">
          {items.length > 1 && (
            <button type="button" className="form-button form-button--muted" onClick={prev} aria-label="이전">
              ◀
            </button>
          )}
          {items.length > 1 && (
            <button type="button" className="form-button form-button--muted" onClick={next} aria-label="다음">
              ▶
            </button>
          )}
        </div>
      </div>
      <div className="files-carousel__body">
        <FilePreview file={items[index]} />
      </div>
      {items.length > 1 && (
        <div className="files-carousel__dots" aria-hidden>
          {items.map((_, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              className={`files-carousel__dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번째 보기`}
            />)
          )}
        </div>
      )}
      <style>{`
        .files-carousel { width: 100%; }
        .files-carousel__header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .files-carousel__counter { font-size: 12px; color:#666; }
        .files-carousel__body { width: 100%; }
        .files-carousel__dots { display:flex; gap:6px; justify-content:center; margin-top:6px; }
        .files-carousel__dot { width:8px; height:8px; border-radius:50%; border:none; background:#cfd8dc; cursor:pointer; padding:0; }
        .files-carousel__dot.is-active { background:#4caf50; }
      `}</style>
    </div>
  );
}

