import React, { useEffect, useRef, useState } from "react";
import "./CiUploadModal.css";

function CiUploadModal({ isOpen, onClose, onSubmit, title = "CI 이미지 업로드" }) {
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
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(String(ev.target?.result || ""));
    reader.readAsDataURL(selected);
  };

  const handleRegister = () => {
    if (file) {
      onSubmit && onSubmit(file, previewUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ci-upload-modal__overlay" role="dialog" aria-modal="true">
      <div className="ci-upload-modal__content">
        <div className="ci-upload-modal__header">
          <h3 className="ci-upload-modal__title">{title}</h3>
          <button className="ci-upload-modal__close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ci-upload-modal__body">
          <div className="ci-upload-modal__preview">
            {previewUrl ? (
              <img src={previewUrl} alt="CI 미리보기" className="ci-upload-modal__image" />
            ) : (
              <div className="ci-upload-modal__placeholder">미리보기가 여기에 표시됩니다</div>
            )}
          </div>
          <div className="ci-upload-modal__controls">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>
        <div className="ci-upload-modal__footer">
          <button className="ci-upload-modal__button ci-upload-modal__button--secondary" onClick={onClose}>
            취소
          </button>
          <button
            className="ci-upload-modal__button ci-upload-modal__button--primary"
            onClick={handleRegister}
            disabled={!file}
          >
            등록하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default CiUploadModal;
