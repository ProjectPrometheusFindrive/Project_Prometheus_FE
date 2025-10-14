import React, { useState } from "react";
import { uploadFileToGCS } from "../utils/gcsApi";

function DragDropUpload({ folder = "", accept = "image/*", onUploadSuccess, onError }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const doUpload = async (file) => {
    setUploading(true);
    setError("");
    try {
      const objectName = await uploadFileToGCS(file, folder);
      onUploadSuccess && onUploadSuccess(objectName, file);
    } catch (e) {
      const msg = e?.message || "Upload failed";
      setError(msg);
      onError && onError(e);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await doUpload(file);
  };

  const onPick = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    await doUpload(file);
  };

  return (
    <div
      className={`drop-zone ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      role="button"
      aria-label="파일을 드래그하거나 클릭하여 업로드"
      tabIndex={0}
    >
      {uploading ? (
        <div className="uploading">업로드 중...</div>
      ) : (
        <>
          <p>파일을 드래그하거나 클릭하여 업로드</p>
          <input type="file" className="hidden-input" accept={accept} onChange={onPick} />
        </>
      )}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default DragDropUpload;

