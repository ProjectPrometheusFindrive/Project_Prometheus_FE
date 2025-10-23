import React from "react";

export default function UploadProgress({
  status = "idle", // 'idle' | 'uploading' | 'ocr' | 'success' | 'error'
  percent = 0,
  label,
  onCancel,
  error,
}) {
  if (status === "idle") return null;
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const isError = status === "error";
  const isSuccess = status === "success";
  const barColor = isError ? "#c62828" : isSuccess ? "#2e7d32" : "#4caf50";
  const text = label || (status === "ocr" ? "OCR 처리 중..." : status === "uploading" ? "업로드 중..." : isError ? "업로드 실패" : isSuccess ? "완료" : "");
  return (
    <div className="upload-progress" role="status" aria-live="polite" style={{ width: "100%" }}>
      {text && <div className="text-[12px] text-gray-600 mb-1">{text}</div>}
      <div className="bg-gray-200 rounded h-2 overflow-hidden" aria-label="업로드 진행률">
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width .2s ease" }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[12px] text-gray-700">{pct}%</span>
        {typeof onCancel === "function" && status === "uploading" && (
          <button type="button" className="form-button form-button--muted" onClick={onCancel} aria-label="업로드 취소">취소</button>
        )}
      </div>
      {isError && error && (
        <div className="text-[12px] text-red-700 mt-1">{error}</div>
      )}
    </div>
  );
}

