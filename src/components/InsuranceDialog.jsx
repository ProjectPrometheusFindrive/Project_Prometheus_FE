import React, { useMemo, useState, useEffect } from "react";
import { formatDateShort } from "../utils/date";
import { ALLOWED_MIME_TYPES, chooseUploadMode } from "../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";
import FilePreview from "./FilePreview";
import MultiDocGallery from "./MultiDocGallery";
import { ocrExtract } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import OcrSuggestionPicker from "./OcrSuggestionPicker";

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
  const [busy, setBusy] = useState({ status: "idle", message: "", percent: 0 });
  const [ocrSuggest, setOcrSuggest] = useState({});
  const [preUploaded, setPreUploaded] = useState([]); // [{ name, objectName }]
  const auth = useAuth();
  const { companyInfo } = useCompany();
  const companyId = (auth?.user?.companyId || companyInfo?.companyId || "ci");
  const ocrFolderBase = `company/${companyId}/docs`;
  const hasExisting = !!(asset?.insuranceExpiryDate || asset?.insuranceCompany || (Array.isArray(asset?.insuranceHistory) && asset.insuranceHistory.length > 0));
  const [step, setStep] = useState((readOnly || hasExisting) ? "details" : "upload");

  useEffect(() => {
    // If toggled to read-only or when asset has existing insurance, show details step
    if (readOnly || hasExisting) setStep("details");
    setIsReadOnly(!!readOnly);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, asset?.id]);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      setForm((p) => ({ ...p, insuranceDoc: e.target.multiple ? [] : null, insuranceDocDataUrl: "" }));
      return;
    }
    const allowed = files.filter((f) => !f.type || ALLOWED_MIME_TYPES.includes(f.type));
    if (allowed.length === 0) {
      alert("허용되지 않는 파일 형식입니다.");
      return;
    }
    // For OCR flow, keep the selected file(s) as-is; previews will show
    setForm((p) => ({ ...p, insuranceDoc: e.target.multiple ? allowed : allowed[0] }));
  };

  // Map OCR suggestions to picker items per field name
  const fieldSuggestions = useMemo(() => {
    const map = {};
    const push = (name, value, confidence, source) => {
      if (!name) return;
      if (!map[name]) map[name] = [];
      map[name].push({ value, confidence, source });
    };
    const doc = ocrSuggest && ocrSuggest.insuranceDoc;
    const fields = (doc && Array.isArray(doc.fields)) ? doc.fields : [];
    const source = doc && doc.source;
    fields.forEach((f) => push(f.name, f.value, f.confidence, source));
    return map;
  }, [ocrSuggest]);

  const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
  const uploadOne = async (file, label) => {
    const newName = `ocr-insurance-${asset?.id || "asset"}-${label}-${file.name}`;
    const wrapped = new File([file], newName, { type: file.type });
    const mode = chooseUploadMode(wrapped.size || 0);
    if (mode === "signed-put") {
      const { promise } = uploadViaSignedPut(wrapped, { folder: ocrFolderBase, onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })) });
      const res = await promise;
      return { name: newName, objectName: res.objectName || "" };
    } else {
      const { promise } = uploadResumable(wrapped, { folder: ocrFolderBase, onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })) });
      const res = await promise;
      return { name: newName, objectName: res.objectName || "" };
    }
  };

  const handleUploadAndOcr = async () => {
    const docs = toArray(form.insuranceDoc);
    if (docs.length === 0) {
      // allow proceed even if no file (manual entry)
      setStep("details");
      return;
    }
    setBusy({ status: "uploading", message: "업로드 중...", percent: 0 });
    try {
      const uploaded = [];
      for (const f of docs) {
        const item = await uploadOne(f, `insurance`);
        if (item.objectName) uploaded.push(item);
      }
      setPreUploaded(uploaded);

      // OCR only the first file for suggestions
      setBusy({ status: "ocr", message: "OCR 처리 중...", percent: 0 });
      if (uploaded[0]?.objectName) {
        try {
          const resp = await ocrExtract({ docType: "insuranceDoc", objectName: uploaded[0].objectName, sourceName: uploaded[0].name, saveOutput: true });
          if (resp && resp.ocrSuggestions && resp.ocrSuggestions.insuranceDoc) {
            const suggestion = resp.ocrSuggestions.insuranceDoc;
            setOcrSuggest({ insuranceDoc: suggestion });
            // Auto-merge into form conservatively (only empty fields)
            const fields = suggestion.fields || [];
            const updates = {};
            fields.forEach(({ name, value }) => {
              const v = String(value ?? "");
              if (name === "insuranceCompany" && !form.insuranceCompany) updates.insuranceCompany = v;
              if (name === "insuranceProduct" && !form.insuranceProduct) updates.insuranceProduct = v;
              if (name === "insuranceStartDate" && !form.insuranceStartDate) updates.insuranceStartDate = v;
              if (name === "insuranceExpiryDate" && !form.insuranceExpiryDate) updates.insuranceExpiryDate = v;
              if (name === "insuranceSpecialTerms" && !form.specialTerms) updates.specialTerms = v;
            });
            if (Object.keys(updates).length > 0) setForm((p) => ({ ...p, ...updates }));
          }
        } catch (e) {
          // ignore; proceed to details step
        }
      }
    } finally {
      setBusy({ status: "idle", message: "", percent: 0 });
      setStep("details");
    }
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
      docName: (preUploaded[0]?.name) || (Array.isArray(form.insuranceDoc) ? (form.insuranceDoc[0]?.name) : form.insuranceDoc?.name) || asset.insuranceDocName || "",
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
      // Avoid sending data URL to backend (ignored for security)
      // insuranceDocDataUrl: form.insuranceDocDataUrl,
      insuranceDocName: (preUploaded[0]?.name) || (Array.isArray(form.insuranceDoc) ? (form.insuranceDoc[0]?.name) : form.insuranceDoc?.name) || asset.insuranceDocName || "",
      // Full history array
      insuranceHistory: nextHistory,
    };

    // Prefer using pre-uploaded docs from OCR step; otherwise upload now
    if (preUploaded.length > 0) {
      patch.insuranceDocList = preUploaded.slice();
      patch.insuranceDocName = preUploaded[0].name;
      patch.insuranceDocGcsObjectName = preUploaded[0].objectName;
    } else {
      const files = Array.isArray(form.insuranceDoc) ? form.insuranceDoc : (form.insuranceDoc ? [form.insuranceDoc] : []);
      if (files.length > 0 && asset?.id) {
      const folder = `assets/${encodeURIComponent(asset.id)}/insurance`;
      try {
        let uploaded = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const mode = chooseUploadMode(file.size);
          setUploadState({ status: "uploading", percent: Math.round((i / files.length) * 100), error: "", cancel: null, mode });
          const onProgress = (p) => {
            const overall = Math.min(100, Math.round(((i + p.percent / 100) / files.length) * 100));
            setUploadState((s) => ({ ...s, percent: overall, mode }));
          };
          if (mode === "signed-put") {
            const { promise, cancel } = uploadViaSignedPut(file, { folder, onProgress });
            setUploadState((s) => ({ ...s, cancel }));
            const result = await promise;
            uploaded.push({ name: file.name, objectName: result.objectName || "" });
          } else {
            const { promise, cancel } = uploadResumable(file, { folder, onProgress });
            setUploadState((s) => ({ ...s, cancel }));
            const result = await promise;
            uploaded.push({ name: file.name, objectName: result.objectName || "" });
          }
        }
        if (uploaded.length > 0) {
          patch.insuranceDocList = uploaded;
          patch.insuranceDocName = uploaded[0].name;
          patch.insuranceDocGcsObjectName = uploaded[0].objectName;
        }
        setUploadState((s) => ({ ...s, status: "success", percent: 100, cancel: null }));
      } catch (e) {
        console.error("Insurance doc upload failed", e);
        setUploadState((s) => ({ status: "error", percent: 0, error: e?.message || "문서 업로드 실패", cancel: null, mode: s.mode }));
        alert("문서 업로드에 실패했습니다.");
        return;
      }
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
        {/* Step 1: Upload & OCR (new registration) */}
        {(!isReadOnly && step === "upload") && (
          <div className="asset-doc" style={{ marginBottom: 12 }}>
            <div className="asset-doc__title">Step 1 · 보험증권 업로드 (OCR)</div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                multiple
                onChange={onFile}
                style={{ marginBottom: 8 }}
              />
            </div>
            {Array.isArray(form.insuranceDoc) ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {form.insuranceDoc.map((f, idx) => (
                  <FilePreview key={f.name + idx} file={f} />
                ))}
              </div>
            ) : (
              <FilePreview file={form.insuranceDoc} />
            )}
            {(busy.status === "uploading" || busy.status === "ocr") && (
              <div style={{ width: "100%", marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{busy.message}</div>
                <div aria-label="처리 진행률" style={{ background: "#eee", borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${busy.percent}%`, height: "100%", background: "#4caf50" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {(step === "details") && (
          <>
            <div className="asset-doc" style={{ marginBottom: 12 }}>
              <div className="asset-doc__title">{isReadOnly ? "보험증권" : "Step 2 · 세부 정보 확인/수정"}</div>
              {/* Existing saved docs (read-only or when editing with previous history) */}
              {(() => {
                // Prefer insuranceDocList [{name, objectName}]
                const list = Array.isArray(asset.insuranceDocList)
                  ? asset.insuranceDocList
                  : (Array.isArray(asset.insuranceDocGcsObjectNames)
                      ? asset.insuranceDocGcsObjectNames.map((obj, idx) => ({ name: (asset.insuranceDocNames && asset.insuranceDocNames[idx]) || `보험서류 ${idx + 1}`, objectName: obj }))
                      : []);
                return list.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <MultiDocGallery title="등록된 보험 서류" items={list} />
                  </div>
                ) : null;
              })()}
            </div>

            <div className="asset-info grid-info">
              {infoRow(
                "보험사명",
                <>
                  <input
                    className="form-input"
                    value={form.insuranceCompany}
                    onChange={(e) => setForm((p) => ({ ...p, insuranceCompany: e.target.value }))}
                    placeholder={isReadOnly ? undefined : "예: 현대해상"}
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && <OcrSuggestionPicker items={fieldSuggestions.insuranceCompany || []} onApply={(v) => setForm((p) => ({ ...p, insuranceCompany: String(v || "") }))} showLabel={false} maxWidth={220} />}
                </>
              )}
              {infoRow(
                "보험 상품",
                <>
                  <input
                    className="form-input"
                    value={form.insuranceProduct}
                    onChange={(e) => setForm((p) => ({ ...p, insuranceProduct: e.target.value }))}
                    placeholder={isReadOnly ? undefined : "예: 자동차종합보험(개인용)"}
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && <OcrSuggestionPicker items={fieldSuggestions.insuranceProduct || []} onApply={(v) => setForm((p) => ({ ...p, insuranceProduct: String(v || "") }))} showLabel={false} maxWidth={240} />}
                </>
              )}
              {infoRow(
                "보험 가입일",
                <>
                  <input className="form-input" type="date" value={form.insuranceStartDate} onChange={(e) => setForm((p) => ({ ...p, insuranceStartDate: e.target.value }))} disabled={isReadOnly} />
                  {!isReadOnly && <OcrSuggestionPicker items={fieldSuggestions.insuranceStartDate || []} onApply={(v) => setForm((p) => ({ ...p, insuranceStartDate: String(v || "") }))} showLabel={false} maxWidth={180} />}
                </>
              )}
              {infoRow(
                "보험 만료일",
                <>
                  <input className="form-input" type="date" value={form.insuranceExpiryDate} onChange={(e) => setForm((p) => ({ ...p, insuranceExpiryDate: e.target.value }))} disabled={isReadOnly} />
                  {!isReadOnly && <OcrSuggestionPicker items={fieldSuggestions.insuranceExpiryDate || []} onApply={(v) => setForm((p) => ({ ...p, insuranceExpiryDate: String(v || "") }))} showLabel={false} maxWidth={180} />}
                </>
              )}
              <div className="asset-info__label">특약사항</div>
              <div>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.specialTerms}
                  onChange={(e) => setForm((p) => ({ ...p, specialTerms: e.target.value }))}
                  placeholder={isReadOnly ? undefined : "예: 긴급출동 포함, 자기부담금 20만원"}
                  disabled={isReadOnly}
                />
                {!isReadOnly && <div style={{ marginTop: 6 }}><OcrSuggestionPicker items={fieldSuggestions.insuranceSpecialTerms || []} onApply={(v) => setForm((p) => ({ ...p, specialTerms: String(v || "") }))} showLabel={true} maxWidth={360} /></div>}
              </div>
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
          </>
        )}
      </div>

      <div className="asset-dialog__footer">
        {!isReadOnly && step === "upload" && (
          <>
            <button type="button" className="form-button form-button--muted" onClick={() => setStep("details")} style={{ marginRight: 8 }}>건너뛰기</button>
            <button type="button" className="form-button" onClick={handleUploadAndOcr}>다음</button>
          </>
        )}
        {!isReadOnly && step === "details" && (
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
