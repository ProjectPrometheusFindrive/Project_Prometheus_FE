import React, { useMemo, useState } from "react";
import { formatDateShort } from "../utils/date";

import { useEffect } from "react";
import { ALLOWED_MIME_TYPES, SMALL_FILE_THRESHOLD_BYTES, chooseUploadMode } from "../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";

export default function InsuranceDialog({ asset = {}, onClose, onSubmit, readOnly = false, allowEditToggle = false }) {
  const [form, setForm] = useState({
    insuranceCompany: asset.insuranceCompany || "",
    insuranceProduct: asset.insuranceProduct || "",
    insuranceStartDate: asset.insuranceStartDate || "",
    insuranceExpiryDate: asset.insuranceExpiryDate || "",
    specialTerms: asset.insuranceSpecialTerms || "",
    insuranceDoc: null,
    insuranceDocDataUrl: asset.insuranceDocDataUrl || "",
  });

  const [isReadOnly, setIsReadOnly] = useState(!!readOnly);
  const [uploadState, setUploadState] = useState({ status: "idle", percent: 0, error: "", cancel: null, mode: "" });
  useEffect(() => {
    setIsReadOnly(!!readOnly);
  }, [readOnly]);

  // Sync form fields when asset prop updates (e.g., after fetching /assets/{id}/insurance)
  useEffect(() => {
    setForm((prev) => ({
      insuranceCompany: asset.insuranceCompany || "",
      insuranceProduct: asset.insuranceProduct || "",
      insuranceStartDate: asset.insuranceStartDate || "",
      insuranceExpiryDate: asset.insuranceExpiryDate || "",
      specialTerms: asset.insuranceSpecialTerms || "",
      insuranceDoc: null,
      insuranceDocDataUrl: asset.insuranceDocDataUrl || "",
    }));
  }, [
    asset?.id,
    asset?.insuranceCompany,
    asset?.insuranceProduct,
    asset?.insuranceStartDate,
    asset?.insuranceExpiryDate,
    asset?.insuranceSpecialTerms,
    asset?.insuranceDocDataUrl,
  ]);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) {
      setForm((p) => ({ ...p, insuranceDoc: null, insuranceDocDataUrl: "" }));
      return;
    }
    // Pre-validate type
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      alert("허용되지 않는 파일 형식입니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, insuranceDoc: file, insuranceDocDataUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.insuranceCompany || !form.insuranceExpiryDate) {
      alert("보험사명과 만료일을 입력해 주세요.");
      return;
    }
    const isRenewal = (Array.isArray(asset.insuranceHistory) && asset.insuranceHistory.length > 0) || !!asset.insuranceInfo;
    const today = new Date().toISOString().slice(0, 10);
    const historyEntry = {
      type: isRenewal ? "갱신" : "등록",
      date: form.insuranceStartDate || today,
      company: form.insuranceCompany,
      product: form.insuranceProduct,
      startDate: form.insuranceStartDate || today,
      expiryDate: form.insuranceExpiryDate,
      specialTerms: form.specialTerms || "",
      docName: form.insuranceDoc?.name || asset.insuranceDocName || "",
      docDataUrl: form.insuranceDocDataUrl || asset.insuranceDocDataUrl || "",
    };
    const nextHistory = [...(Array.isArray(asset.insuranceHistory) ? asset.insuranceHistory : []), historyEntry];
    const insuranceInfo = [form.insuranceCompany, form.insuranceProduct].filter(Boolean).join(" ").trim();
    const patch = {
      // Top-level current info for compatibility
      insuranceInfo,
      insuranceCompany: form.insuranceCompany,
      insuranceProduct: form.insuranceProduct,
      insuranceStartDate: form.insuranceStartDate || today,
      insuranceExpiryDate: form.insuranceExpiryDate,
      insuranceSpecialTerms: form.specialTerms,
      insuranceDocDataUrl: form.insuranceDocDataUrl,
      insuranceDocName: form.insuranceDoc?.name || asset.insuranceDocName || "",
      // Full history array
      insuranceHistory: nextHistory,
    };

    // Upload insurance document first (prefer private mode → store object name)
    if (form.insuranceDoc && asset?.id) {
      const folder = `assets/${encodeURIComponent(asset.id)}/insurance`;
      const mode = chooseUploadMode(form.insuranceDoc.size);
      setUploadState({ status: "uploading", percent: 0, error: "", cancel: null, mode });
      const onProgress = (p) => setUploadState((s) => ({ ...s, percent: p.percent }));
      try {
        if (mode === "signed-put") {
          const { promise, cancel } = uploadViaSignedPut(form.insuranceDoc, { folder, onProgress });
          setUploadState((s) => ({ ...s, cancel }));
          const result = await promise;
          // Private mode: do not expose public URL for sensitive docs
          patch.insuranceDocGcsObjectName = result.objectName || "";
          // For backward compatibility, keep name
          patch.insuranceDocName = form.insuranceDoc.name;
        } else {
          const { promise, cancel } = uploadResumable(form.insuranceDoc, { folder, onProgress });
          setUploadState((s) => ({ ...s, cancel }));
          const result = await promise;
          patch.insuranceDocGcsObjectName = result.objectName || "";
          patch.insuranceDocName = form.insuranceDoc.name;
        }
        setUploadState((s) => ({ ...s, status: "success", percent: 100, cancel: null }));
      } catch (e) {
        console.error("Insurance doc upload failed", e);
        setUploadState({ status: "error", percent: 0, error: e?.message || "문서 업로드 실패", cancel: null, mode });
        alert("문서 업로드에 실패했습니다.");
        return;
      }
    }

    onSubmit && onSubmit(patch);
  };

  const infoRow = (label, input) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div>{input}</div>
    </>
  );

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__body">
        <div className="asset-doc" style={{ marginBottom: 12 }}>
          <div className="asset-doc__title">보험증권 등록</div>
          <div className="asset-doc__box" aria-label="보험증권 파일 업로드">
            {isReadOnly ? (
              <div className="asset-doc__placeholder">
                {asset.insuranceDocName || (asset.insuranceDocDataUrl ? "등록된 파일" : "등록된 파일 없음")}
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={onFile} />
                <div className="asset-doc__placeholder">{form.insuranceDoc?.name || asset.insuranceDocName || "파일 선택/촬영"}</div>
                {form.insuranceDoc && (
                  <div style={{ width: "100%", marginTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>업로드 방식: {uploadState.mode === 'resumable' ? '대용량(Resumable)' : '서명 PUT'}</div>
                    {uploadState.status === 'uploading' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div aria-label="업로드 진행률" style={{ flex: 1, background: '#eee', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${uploadState.percent}%`, height: '100%', background: '#4caf50' }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#333', minWidth: 40, textAlign: 'right' }}>{uploadState.percent}%</span>
                        <button type="button" className="form-button form-button--muted" onClick={() => { try { uploadState.cancel && uploadState.cancel(); } catch {} }}>취소</button>
                      </div>
                    )}
                    {uploadState.status === 'error' && (
                      <div style={{ marginTop: 6, color: '#c62828', fontSize: 12 }}>업로드 실패: {uploadState.error || '알 수 없는 오류'}</div>
                    )}
                  </div>
                )}
              </label>
            )}
          </div>
        </div>

        <div className="asset-info grid-info">
          {infoRow(
            "보험사명",
            <input
              className="form-input"
              value={form.insuranceCompany}
              onChange={(e) => setForm((p) => ({ ...p, insuranceCompany: e.target.value }))}
              placeholder={isReadOnly ? undefined : "예: 현대해상"}
              disabled={isReadOnly}
            />
          )}
          {infoRow(
            "보험 상품",
            <input
              className="form-input"
              value={form.insuranceProduct}
              onChange={(e) => setForm((p) => ({ ...p, insuranceProduct: e.target.value }))}
              placeholder={isReadOnly ? undefined : "예: 자동차종합보험(개인용)"}
              disabled={isReadOnly}
            />
          )}
          {infoRow(
            "보험 가입일",
            <input className="form-input" type="date" value={form.insuranceStartDate} onChange={(e) => setForm((p) => ({ ...p, insuranceStartDate: e.target.value }))} disabled={isReadOnly} />
          )}
          {infoRow(
            "보험 만료일",
            <input className="form-input" type="date" value={form.insuranceExpiryDate} onChange={(e) => setForm((p) => ({ ...p, insuranceExpiryDate: e.target.value }))} disabled={isReadOnly} />
          )}
          <div className="asset-info__label">특약사항</div>
          <textarea
            className="form-input"
            rows={3}
            value={form.specialTerms}
            onChange={(e) => setForm((p) => ({ ...p, specialTerms: e.target.value }))}
            placeholder={isReadOnly ? undefined : "예: 긴급출동 포함, 자기부담금 20만원"}
            disabled={isReadOnly}
          />
        </div>

        {Array.isArray(asset.insuranceHistory) && asset.insuranceHistory.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="asset-doc__title" style={{ marginBottom: 6 }}>변경 이력</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {asset.insuranceHistory
                .slice()
                .sort((a, b) => new Date(a.startDate || a.date || 0) - new Date(b.startDate || b.date || 0))
                .map((h, idx) => {
                  const when = formatDateShort(h.date || h.startDate || "");
                  const label = h.type === "등록" ? "보험 등록" : "보험 갱신(기존 보험 만료 또는 변경으로 인한)";
                  return (
                    <div key={`${h.date || h.startDate || idx}-${h.company || ''}`} className="asset-history__item">
                      <div style={{ fontSize: 12 }}>{label} {when}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {(h.company || "") + (h.product ? ` ${h.product}` : "")} · {h.startDate || "-"} ~ {h.expiryDate || "-"}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div className="asset-dialog__footer">
        {(!isReadOnly) && (
          <button type="button" className="form-button" onClick={handleSave} disabled={uploadState.status === 'uploading'} style={{ marginRight: 8 }}>
            {(asset?.insuranceExpiryDate || asset?.insuranceInfo || (Array.isArray(asset?.insuranceHistory) && asset.insuranceHistory.length > 0)) ? '저장' : '등록'}
          </button>
        )}
        {allowEditToggle && isReadOnly && (asset?.insuranceExpiryDate || asset?.insuranceInfo || (Array.isArray(asset?.insuranceHistory) && asset.insuranceHistory.length > 0)) && (
          <button type="button" className="form-button" onClick={() => setIsReadOnly(false)} style={{ marginRight: 8 }}>수정</button>
        )}
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
