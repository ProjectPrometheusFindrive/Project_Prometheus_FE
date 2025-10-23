import React from "react";
import { FiClock, FiEdit2, FiCheck, FiX } from "react-icons/fi";

const MemoCell = React.memo(function MemoCell({
  id,
  value,
  isEditing,
  memoText,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onOpenHistory,
  maxWidth = 150,
}) {
  const containerStyle = { maxWidth: `${maxWidth}px` };

  if (isEditing) {
    return (
      <div style={containerStyle} className="memo-cell">
        <div className="memo-cell__row">
          <input
            type="text"
            value={memoText}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSave?.(id, memoText);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel?.();
              }
            }}
            className="memo-cell__input"
            autoFocus
          />
          <div className="memo-cell__icons">
            <button
              className="icon-button icon-button--success"
              onClick={() => onSave?.(id, memoText)}
              aria-label="메모 저장"
              title="메모 저장"
            >
              <FiCheck size={12} />
            </button>
            <button
              className="icon-button icon-button--danger"
              onClick={() => onCancel?.()}
              aria-label="취소"
              title="취소"
            >
              <FiX size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="memo-cell">
      <div className="memo-cell__row">
        <span className="memo-cell__text" title={value}>
          {value || "메모 없음"}
        </span>
        <div className="memo-cell__icons">
          <button
            className="icon-button icon-button--primary-ink"
            onClick={() => onEdit?.(id, value)}
            aria-label="메모 편집"
            title="메모 편집"
          >
          <FiEdit2 size={12} />
          </button>
          <button
            className="icon-button icon-button--primary-ink"
            onClick={() => onOpenHistory?.(id)}
            aria-label="메모 히스토리"
            title="메모 히스토리"
          >
            <FiClock size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default MemoCell;
