import React, { useMemo, useRef, useState } from "react";
import { uploadOne } from "../utils/uploadHelpers";
import { emitToast } from "../utils/toast";
import { sendFax } from "../api";

// Allowed types for fax attachments: PDF and images
const FAX_ACCEPT = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
];

function isFaxFileAllowed(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (FAX_ACCEPT.includes(type)) return true;
  // Extension fallback for browsers that miss content-type
  const name = String(file.name || "");
  const idx = name.lastIndexOf(".");
  const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
  return ["pdf", "png", "jpg", "jpeg", "webp", "ico"].includes(ext);
}

export default function FaxSendPanel({ rentalId, defaultTitle = "사고 접수 서류", compact = false }) {
  const [receiverNum, setReceiverNum] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [title, setTitle] = useState(defaultTitle || "");
  const [items, setItems] = useState([]); // { fileName, objectName, size }
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const maxReached = items.length >= 20;
  const acceptAttr = useMemo(() => FAX_ACCEPT.join(","), []);

  const handlePickFiles = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFilesSelected = async (ev) => {
    const files = Array.from(ev.target?.files || []);
    if (!files.length) return;
    if (maxReached) {
      emitToast("최대 20개까지 첨부할 수 있습니다.", "warning");
      return;
    }
    const remaining = 20 - items.length;
    const selected = files.slice(0, remaining);

    // Filter by allowed types
    const allowed = selected.filter(isFaxFileAllowed);
    const skipped = selected.length - allowed.length;
    if (skipped > 0) emitToast("PDF 또는 이미지 파일만 첨부 가능합니다.", "warning");

    if (!allowed.length) return;

    setUploading(true);
    try {
      const folder = `rentals/${rentalId}/contracts`;
      const uploaded = [];
      for (const file of allowed) {
        try {
          const res = await uploadOne(file, { folder, label: "fax-attachment" });
          if (res && res.objectName) {
            uploaded.push({
              fileName: file.name,
              objectName: res.objectName,
              size: file.size || 0,
            });
          } else {
            emitToast(`${file.name} 업로드 실패`, "error");
          }
        } catch (e) {
          emitToast(`${file.name} 업로드 중 오류`, "error");
        }
      }
      if (uploaded.length) setItems((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading(false);
      // reset input to allow selecting same file again if needed
      try { if (ev.target) ev.target.value = ""; } catch {}
    }
  };

  const handleRemove = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!receiverNum.trim()) {
      emitToast("수신자 번호를 입력하세요.", "warning");
      return;
    }
    if (!items.length) {
      emitToast("첨부할 파일을 추가하세요 (최대 20개).", "warning");
      return;
    }
    const files = items.map((it) => ({ objectName: it.objectName, fileName: it.fileName }));
    setBusy(true);
    try {
      const resp = await sendFax({
        receiverNum: receiverNum.trim(),
        receiverName: receiverName.trim() || undefined,
        title: title.trim() || undefined,
        files,
      });
      
      // BE 변경: { status: 'success'|'error', data?: { receiptNum, testMode, success, historyId }, error?: { type, message, details? } }
      if (resp?.status === 'success' && resp?.data) {
        const { receiptNum, testMode, historyId } = resp.data;
        const suffix = testMode ? " (테스트 모드)" : "";
        const receiptText = receiptNum ? `접수번호: ${receiptNum}` : "접수됨";
        emitToast(`팩스 전송 완료: ${receiptText}${suffix}`, "success", 5000);
        // 성공 시 입력 필드 초기화
        setReceiverNum("");
        setReceiverName("");
        setTitle(defaultTitle || "");
        setItems([]);
      } else if (resp?.status === 'error' && resp?.error) {
        // 에러 타입별 메시지 처리
        const errorType = resp.error.type;
        const errorMessage = resp.error.message || "팩스 전송 실패";
        let userMessage = errorMessage;
        
        // 에러 타입별 사용자 친화적 메시지
        switch (errorType) {
          case 'VALIDATION_ERROR':
            userMessage = `입력 정보 오류: ${errorMessage}`;
            break;
          case 'FAX_SERVICE_DISABLED':
            userMessage = "FAX 서비스가 비활성화되어 있습니다.";
            break;
          case 'UNSUPPORTED_FILE_TYPE':
            userMessage = "지원하지 않는 파일 형식입니다. PDF 또는 이미지 파일만 가능합니다.";
            break;
          case 'FILE_TOO_LARGE':
            userMessage = "파일 크기가 너무 큽니다.";
            break;
          case 'DOWNLOAD_ERROR':
            userMessage = "파일 다운로드 중 오류가 발생했습니다.";
            break;
          case 'FAX_PROVIDER_ERROR':
            userMessage = `FAX 서비스 제공자 오류: ${errorMessage}`;
            break;
          case 'FAX_SEND_FAILED':
            userMessage = `FAX 전송 실패: ${errorMessage}`;
            break;
          case 'CONFIG_ERROR':
            userMessage = "FAX 서비스 설정 오류가 발생했습니다.";
            break;
          case 'SERVER_ERROR':
            userMessage = "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            break;
          default:
            userMessage = errorMessage;
        }
        
        emitToast(userMessage, "error", 6000);
      } else {
        emitToast("팩스 전송 중 알 수 없는 오류가 발생했습니다.", "error", 4000);
      }
    } catch (e) {
      const msg = e?.message || "팩스 전송 실패";
      emitToast(msg, "error", 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3 p-3 border rounded-md"}>
      {!compact && (
        <div className="text-[0.95rem] font-semibold text-gray-800">FAX 보내기</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[0.85rem] text-gray-600">수신자 번호</span>
          <input
            type="text"
            placeholder="예: 02-1234-5678"
            value={receiverNum}
            onChange={(e) => setReceiverNum(e.target.value)}
            className="px-2 py-2 border rounded"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.85rem] text-gray-600">수신자 이름 (선택)</span>
          <input
            type="text"
            placeholder="예: 보험사 담당자"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            className="px-2 py-2 border rounded"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[0.85rem] text-gray-600">제목 (선택)</span>
        <input
          type="text"
          placeholder="예: 사고 접수 서류"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-2 py-2 border rounded"
        />
      </label>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAttr}
          multiple
          onChange={handleFilesSelected}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="form-button"
          onClick={handlePickFiles}
          disabled={uploading || maxReached}
          title={maxReached ? "최대 20개 첨부됨" : undefined}
        >
          파일 추가
        </button>
        <span className="text-[0.85rem] text-gray-600">PDF, 이미지 (최대 20개)</span>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((it, idx) => (
            <div key={`${it.objectName}-${idx}`} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
              <div className="text-[0.9rem] text-gray-800 truncate">{it.fileName}</div>
              <div className="flex items-center gap-2">
                <span className="text-[0.8rem] text-gray-500">{(it.size / 1024 / 1024).toFixed(2)} MB</span>
                <button type="button" className="form-button form-button--muted" onClick={() => handleRemove(idx)} disabled={busy || uploading}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="form-button" onClick={handleSend} disabled={busy || uploading || items.length === 0}>
          {busy ? "전송 중..." : "팩스 보내기"}
        </button>
      </div>
    </div>
  );
}

