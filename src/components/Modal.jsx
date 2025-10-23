import React, { useEffect, useRef } from "react";
import { COLORS } from "../constants";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  showFooter = true,
  footerContent,
  formId,
  onSubmit,
  submitText = "확인",
  cancelText = "닫기",
  ariaLabel,
  customHeaderContent,
  className = "",
  size = "default",
  showHeaderClose = true
}) => {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before the modal opened
    previousActiveElementRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape") {
        try { onClose && onClose(); } catch {}
      }
    };
    document.addEventListener("keydown", onKey);

    // Set initial focus to modal container for better tab order
    setTimeout(() => {
      try { containerRef.current && containerRef.current.focus(); } catch {}
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to the previously focused element when modal closes
      setTimeout(() => {
        try {
          if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
            previousActiveElementRef.current.focus();
          }
        } catch {}
      }, 0);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderDefaultFooter = () => (
    <div className="flex gap-2 mt-2">
      {onSubmit && formId && (
        <button type="submit" className="form-button" form={formId}>
          {submitText}
        </button>
      )}
      <button 
        type="button" 
        className="form-button bg-gray-900" 
        onClick={onClose}
      >
        {cancelText}
      </button>
    </div>
  );

  const getModalSizeClass = () => {
    switch (size) {
      case "large":
        return "modal-large";
      case "small":
        return "modal-small";
      default:
        return "";
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div
        className={`modal ${getModalSizeClass()} ${className}`}
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        tabIndex={-1}
      >
        {(title || customHeaderContent) && (
          <div className="header-row mb-2">
            {customHeaderContent ? (
              customHeaderContent
            ) : (
              <>
                <strong>{title}</strong>
              </>
            )}
          </div>
        )}

        {!title && !customHeaderContent && (
          <h2 className="mt-0 mb-3" />
        )}

        {children}

        {showFooter && (
          footerContent || renderDefaultFooter()
        )}
      </div>
    </div>
  );
};

export default Modal;
