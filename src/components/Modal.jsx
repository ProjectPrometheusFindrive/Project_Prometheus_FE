import React from "react";
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
  submitText = "저장",
  cancelText = "취소",
  ariaLabel,
  customHeaderContent,
  className = ""
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderDefaultFooter = () => (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      {onSubmit && formId && (
        <button type="submit" className="form-button" form={formId}>
          {submitText}
        </button>
      )}
      <button 
        type="button" 
        className="form-button" 
        style={{ background: COLORS.GRAY_900 }} 
        onClick={onClose}
      >
        {cancelText}
      </button>
    </div>
  );

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div className={`modal ${className}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {(title || customHeaderContent) && (
          <div className="header-row" style={{ marginBottom: 8 }}>
            {customHeaderContent ? (
              customHeaderContent
            ) : (
              <>
                <strong>{title}</strong>
                <div style={{ marginLeft: "auto" }}>
                  <button 
                    type="button" 
                    className="form-button" 
                    style={{ background: COLORS.GRAY_900 }} 
                    onClick={onClose}
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Legacy h2 title support for backward compatibility */}
        {!title && !customHeaderContent && (
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>
            {/* This will be passed via children for legacy modals */}
          </h2>
        )}

        {/* Content */}
        {children}

        {/* Footer */}
        {showFooter && (
          footerContent || renderDefaultFooter()
        )}
      </div>
    </div>
  );
};

export default Modal;