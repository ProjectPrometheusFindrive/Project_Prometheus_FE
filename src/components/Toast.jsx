import React, { useEffect } from "react";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => {
      try {
        if (typeof onClose === "function") onClose();
      } catch {}
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className={`toast toast--${type}`}>
        <span className="toast__message">{message}</span>
        <button
          type="button"
          className="toast__close"
          aria-label="닫기"
          onClick={() => {
            try {
              if (typeof onClose === "function") onClose();
            } catch {}
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

