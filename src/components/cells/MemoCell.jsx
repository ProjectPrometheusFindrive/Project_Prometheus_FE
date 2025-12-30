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
  const [isButtonHovered, setIsButtonHovered] = React.useState(false);

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
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          aria-label="메모 편집"
          title="메모 편집"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: 0,
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          {isButtonHovered ? (
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="26.0016" height="26.0016" rx="13.0008" fill="black" fillOpacity="0.1"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M6.99999 16.6416V18.6682C6.99999 18.8549 7.14666 19.0016 7.33332 19.0016H9.35999C9.44665 19.0016 9.53332 18.9682 9.59332 18.9016L16.8733 11.6282L14.3733 9.12825L7.09999 16.4016C7.03332 16.4682 6.99999 16.5482 6.99999 16.6416ZM18.8066 9.69498C19.0666 9.43499 19.0666 9.01499 18.8066 8.75499L17.2466 7.19499C17.1221 7.07016 16.953 7 16.7766 7C16.6003 7 16.4312 7.07016 16.3066 7.19499L15.0866 8.41499L17.5866 10.915L18.8066 9.69498Z" fill="white"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.99999 16.6416V18.6682C6.99999 18.8549 7.14666 19.0016 7.33332 19.0016H9.35999C9.44665 19.0016 9.53332 18.9682 9.59332 18.9016L16.8733 11.6282L14.3733 9.12825L7.09999 16.4016C7.03332 16.4682 6.99999 16.5482 6.99999 16.6416ZM18.8066 9.69498C19.0666 9.43499 19.0666 9.01499 18.8066 8.75499L17.2466 7.19499C17.1221 7.07016 16.953 7 16.7766 7C16.6003 7 16.4312 7.07016 16.3066 7.19499L15.0866 8.41499L17.5866 10.915L18.8066 9.69498Z" fill="black" fillOpacity="0.1"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
});

export default MemoCell;
