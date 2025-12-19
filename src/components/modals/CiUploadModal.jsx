import React, { useEffect, useRef, useState } from "react";
import "./CiUploadModal.css";
import log from "../../utils/logger";

function CiUploadModal({ isOpen, onClose, onSubmit, title = "로고관리" }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewUrl("");
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (!selected) return;
    log.debug("[upload-ui] file selected:", { name: selected.name, size: selected.size, type: selected.type });
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = String(ev.target?.result || "");
      log.debug("[upload-ui] preview url size:", url.length);
      setPreviewUrl(url);
    };
    reader.readAsDataURL(selected);
  };

  const handleRegister = () => {
    if (file) {
      onSubmit && onSubmit(file, previewUrl);
    }
  };

  const handleControlsClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="ci-upload-modal__overlay" role="dialog" aria-modal="true">
      <div className="ci-upload-modal__content">
        {/* Header */}
        <div className="ci-upload-modal__header">
          <h3 className="ci-upload-modal__title">{title}</h3>
          <button className="ci-upload-modal__close" aria-label="닫기" onClick={onClose}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z" fill="#1C1C1C"/>
              <path d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z" fill="#1C1C1C"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="ci-upload-modal__body">
          {/* Preview Area */}
          <div className="ci-upload-modal__preview">
            {previewUrl ? (
              <img src={previewUrl} alt="로고 미리보기" className="ci-upload-modal__image" />
            ) : (
              <div className="ci-upload-modal__placeholder">파일을 선택하면 미리보기가 표시됩니다.</div>
            )}
          </div>

          {/* File Upload Controls */}
          <div className="ci-upload-modal__controls" onClick={handleControlsClick}>
            <div className="ci-upload-modal__controls-left">
              <div className="ci-upload-modal__attach-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.5 9.16667L10.4167 16.25C9.37 17.2967 7.98833 17.9167 6.5 17.9167C5.01167 17.9167 3.63 17.2967 2.58333 16.25C1.53667 15.2033 0.916667 13.8217 0.916667 12.3333C0.916667 10.845 1.53667 9.46333 2.58333 8.41667L9.66667 1.33333C10.3333 0.666667 11.2667 0.25 12.25 0.25C13.2333 0.25 14.1667 0.666667 14.8333 1.33333C15.5 2 15.9167 2.93333 15.9167 3.91667C15.9167 4.9 15.5 5.83333 14.8333 6.5L7.75 13.5833C7.41667 13.9167 6.95 14.125 6.45833 14.125C5.96667 14.125 5.5 13.9167 5.16667 13.5833C4.83333 13.25 4.625 12.7833 4.625 12.2917C4.625 11.8 4.83333 11.3333 5.16667 11L11.5 4.66667" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ci-upload-modal__controls-text">파일 및 사진 추가</span>
            </div>
            <span className="ci-upload-modal__controls-count">{file ? "1 / 1" : "0 / 0"}</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="ci-upload-modal__file-input"
          />
        </div>

        {/* Separator */}
        <div className="ci-upload-modal__separator"></div>

        {/* Footer */}
        <div className="ci-upload-modal__footer">
          <button className="ci-upload-modal__button ci-upload-modal__button--secondary" onClick={onClose}>
            닫기
          </button>
          <button
            className="ci-upload-modal__button ci-upload-modal__button--primary"
            onClick={handleRegister}
            disabled={!file}
          >
            등록완료
          </button>
        </div>
      </div>
    </div>
  );
}

export default CiUploadModal;
