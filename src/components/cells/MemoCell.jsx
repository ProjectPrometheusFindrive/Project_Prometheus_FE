import React from "react";
import { FiCheck, FiX } from "react-icons/fi";

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

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      className="memo-cell"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className="memo-cell__text"
        title={value}
        onClick={() => onOpenHistory?.(id)}
        style={{ cursor: 'pointer', textAlign: 'center' }}
      >
        {value || "메모 없음"}
      </span>
      {isHovered && (
        <button
          className="icon-button icon-button--primary-ink memo-cell__edit-button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(id, value);
          }}
          aria-label="메모 편집"
          title="메모 편집"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M-8.37771e-06 9.64157V11.6682C-8.37771e-06 11.8549 0.146658 12.0016 0.333324 12.0016H2.35999C2.44665 12.0016 2.53332 11.9682 2.59332 11.9016L9.8733 4.62825L7.37331 2.12825L0.0999914 9.40157C0.0333249 9.46824 -8.37771e-06 9.54824 -8.37771e-06 9.64157ZM11.8066 2.69498C12.0666 2.43499 12.0666 2.01499 11.8066 1.75499L10.2466 0.19499C10.1221 0.0701551 9.95295 0 9.77661 0C9.60026 0 9.43116 0.0701551 9.30661 0.19499L8.08661 1.41499L10.5866 3.91498L11.8066 2.69498Z"
              fill="black"
              fillOpacity="0.1"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

export default MemoCell;
