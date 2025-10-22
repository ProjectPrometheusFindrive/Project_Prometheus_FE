import React, { useState } from "react";
import { uploadFileToGCS } from "../utils/gcsApi";

function DragDropUpload({ folder = "", accept = "image/*", multiple = true, onUploadSuccess, onError }) {
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
    const list = Array.from(e.dataTransfer?.files || []);
    if (list.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!multiple && i > 0) break;
        // Upload sequentially to keep UI simple and predictable
        // eslint-disable-next-line no-await-in-loop
        await doUpload(f);
      }
    } finally {
      setUploading(false);
    }
  };

  const onPick = async (e) => {
    const list = Array.from(e.target?.files || []);
    if (list.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!multiple && i > 0) break;
        // eslint-disable-next-line no-await-in-loop
        await doUpload(f);
      }
    } finally {
      setUploading(false);
      // Clear the input value so selecting the same file again triggers change
      try { e.target.value = ""; } catch {}
    }
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
          <input type="file" className="hidden-input" accept={accept} multiple={multiple} onChange={onPick} />
        </>
      )}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default DragDropUpload;
