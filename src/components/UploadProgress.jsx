import React, { useMemo } from "react";

export default function UploadProgress({
  status = "idle", // 'idle' | 'uploading' | 'ocr' | 'success' | 'error'
  percent = 0,
  label,
  onCancel,
  error,
  variant = "bar", // 'bar' | 'circle'
}) {
  if (status === "idle") return null;
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const isError = status === "error";
  const isSuccess = status === "success";
  const color = isError ? "#c62828" : isSuccess ? "#2e7d32" : "#4caf50";
  const text = label || (status === "ocr" ? "자동 채움 처리 중..." : status === "uploading" ? "업로드 중..." : isError ? "업로드 실패" : isSuccess ? "완료" : "");

  const circle = useMemo(() => {
    const size = 48;
    const stroke = 5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = `${(c * pct) / 100} ${c}`;
    return { size, stroke, r, c, dash };
  }, [pct]);

  return (
    <div className="upload-progress" role="status" aria-live="polite" style={{ width: "100%" }}>
      {text && <div className="text-[12px] text-gray-600 mb-1 truncate" title={text}>{text}</div>}
      {variant === "circle" ? (
        <div className="flex items-center gap-3">
          <svg width={circle.size} height={circle.size} viewBox={`0 0 ${circle.size} ${circle.size}`} aria-label="업로드 진행률 원형">
            <circle cx={circle.size/2} cy={circle.size/2} r={circle.r} stroke="#d1d5db" strokeWidth={circle.stroke} fill="none" />
            <circle
              cx={circle.size/2}
              cy={circle.size/2}
              r={circle.r}
              stroke={color}
              strokeWidth={circle.stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circle.dash}
              transform={`rotate(-90 ${circle.size/2} ${circle.size/2})`}
              style={{ transition: "stroke-dasharray .5s ease" }}
            />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fill="#374151">{pct}%</text>
          </svg>
          {typeof onCancel === "function" && status === "uploading" && (
            <button type="button" className="form-button form-button--muted" onClick={onCancel} aria-label="업로드 취소">취소</button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-gray-200 rounded overflow-hidden" aria-label="업로드 진행률" style={{ height: 8, background: "#e5e7eb" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width .5s ease" }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[12px] text-gray-700">{pct}%</span>
            {typeof onCancel === "function" && status === "uploading" && (
              <button type="button" className="form-button form-button--muted" onClick={onCancel} aria-label="업로드 취소">취소</button>
            )}
          </div>
        </>
      )}
      {isError && error && (
        <div className="text-[12px] text-red-700 mt-1">{error}</div>
      )}
    </div>
  );
}
