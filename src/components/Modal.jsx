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
  submitText = "확인",
  cancelText = "취소",
  ariaLabel,
  customHeaderContent,
  className = "",
  size = "default",
  showHeaderClose = true
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
      <div className={`modal ${getModalSizeClass()} ${className}`} onClick={(e) => e.stopPropagation()}>
        {(title || customHeaderContent) && (
          <div className="header-row" style={{ marginBottom: 8 }}>
            {customHeaderContent ? (
              customHeaderContent
            ) : (
              <>
                <strong>{title}</strong>
                {showHeaderClose && (
                  <div style={{ marginLeft: "auto" }}>
                    <button 
                      type="button" 
                      className="form-button" 
                      style={{ background: COLORS.GRAY_900 }} 
                      onClick={onClose}
                    >
                      Close
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!title && !customHeaderContent && (
          <h2 style={{ marginTop: 0, marginBottom: 12 }} />
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
