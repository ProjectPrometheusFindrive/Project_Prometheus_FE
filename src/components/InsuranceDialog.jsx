import React, { useMemo, useState, useEffect } from "react";
import { ALLOWED_MIME_TYPES } from "../constants/uploads";
import { uploadOneOCR } from "../utils/uploadHelpers";
import FilePreview from "./FilePreview";
import FilesPreviewCarousel from "./FilesPreviewCarousel";
import UploadProgress from "./UploadProgress";
import MultiDocGallery from "./MultiDocGallery";
import { ocrExtract } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import OcrSuggestionPicker from "./OcrSuggestionPicker";
import { emitToast } from "../utils/toast";

function formatFullDateDot(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}. ${mm}. ${dd}`;
  } catch {
    return "";
  }
}

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

  useEffect(() => {
    // Keep read-only state in sync
    setIsReadOnly(!!readOnly);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, asset?.id]);
  useEffect(() => {
    setIsReadOnly(!!readOnly);
  }, [readOnly]);

  // Sync form fields when asset prop updates (e.g., after fetching /assets/{id}/insurance)
  useEffect(() => {
    setForm(() => ({
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
      emitToast("허용되지 않는 파일 형식입니다.", "warning");
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

    // Alias mapping: accept short field names from OCR
    const alias = {
      company: 'insuranceCompany',
      product: 'insuranceProduct',
      startDate: 'insuranceStartDate',
      expiryDate: 'insuranceExpiryDate',
      specialTerms: 'insuranceSpecialTerms',
    };
    Object.entries(alias).forEach(([shortKey, longKey]) => {
      if (map[shortKey]) {
        map[longKey] = (map[longKey] || []).concat(map[shortKey]);
      }
    });
    return map;
  }, [ocrSuggest]);

  const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
  const uploadOneFile = async (file, label) => {
    return uploadOneOCR(file, {
      folder: ocrFolderBase,
      type: "insurance",
      tmpId: asset?.id || "asset",
      label,
      onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })),
    });
  };

  const handleUploadAndOcr = async () => {
    const docs = toArray(form.insuranceDoc);
    if (docs.length === 0) {
      // allow manual entry without upload
      return;
    }
    setBusy({ status: "uploading", message: "업로드 중...", percent: 0 });
    try {
      const uploaded = [];
      for (const f of docs) {
        const item = await uploadOneFile(f, `insurance`);
        if (item?.objectName) uploaded.push(item);
      }
      setPreUploaded(uploaded);

      // OCR only the first file for suggestions
      setBusy({ status: "ocr", message: "자동 채움 처리 중...", percent: 0 });
      if (uploaded[0]?.objectName) {
        try {
          const resp = await ocrExtract({ docType: "insuranceDoc", objectName: uploaded[0].objectName, sourceName: uploaded[0].name, saveOutput: true });
          try { console.debug('[InsuranceDialog] OCR response', resp); } catch {}
          if (resp && resp.ocrSuggestions && resp.ocrSuggestions.insuranceDoc) {
            const suggestion = resp.ocrSuggestions.insuranceDoc;
            setOcrSuggest({ insuranceDoc: suggestion });
            // Auto-merge into form conservatively (only empty fields)
            const fields = suggestion.fields || [];
            const updates = {};
            fields.forEach(({ name, value }) => {
              const v = String(value ?? "");
              const norm = (n) => {
                if (n === 'company') return 'insuranceCompany';
                if (n === 'product') return 'insuranceProduct';
                if (n === 'startDate') return 'insuranceStartDate';
                if (n === 'expiryDate') return 'insuranceExpiryDate';
                if (n === 'specialTerms') return 'insuranceSpecialTerms';
                return n;
              };
              const key = norm(name);
              if (key === "insuranceCompany" && !form.insuranceCompany) updates.insuranceCompany = v;
              if (key === "insuranceProduct" && !form.insuranceProduct) updates.insuranceProduct = v;
              if (key === "insuranceStartDate" && !form.insuranceStartDate) updates.insuranceStartDate = v;
              if (key === "insuranceExpiryDate" && !form.insuranceExpiryDate) updates.insuranceExpiryDate = v;
              if ((key === "insuranceSpecialTerms" || key === "specialTerms") && !form.specialTerms) updates.specialTerms = v;
            });
            if (Object.keys(updates).length > 0) setForm((p) => ({ ...p, ...updates }));
          } else {
            try { console.warn('[InsuranceDialog] No insuranceDoc suggestions in OCR response'); } catch {}
          }
        } catch (e) {
          // ignore; proceed to details step
          try { console.warn('[InsuranceDialog] OCR request failed', e); } catch {}
        }
      }
    } finally {
      setBusy({ status: "idle", message: "", percent: 0 });
    }
  };

  const handleSave = async () => {
    if (!form.insuranceCompany || !form.insuranceExpiryDate) {
      emitToast("보험사명과 만료일을 입력해 주세요.", "warning");
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
      const folder = `assets/${asset.id}/insurance`;
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
        emitToast("문서 업로드에 실패했습니다.", "error");
        return;
      }
      }
    }

    onSubmit && onSubmit(patch);
  };

  const infoRow = (label, value) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div className="asset-info__value">{value ?? <span className="empty">-</span>}</div>
    </>
  );

  const docBoxEdit = (title, key, accept = "image/*,application/pdf") => {
    const value = form[key];
    const files = Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
    const count = files.length;

    return (
      <div className="asset-doc asset-doc--upload">
        <div className="asset-doc__title">{title}</div>
        <div className="asset-doc__box">
          {count === 0 ? (
            <div className="asset-doc__placeholder">
              파일을 선택하면 미리보기가 표시됩니다.
            </div>
          ) : Array.isArray(value) ? (
            <FilesPreviewCarousel
              files={value}
              className="asset-doc__carousel"
              onChange={(next) => setForm((p) => ({ ...p, [key]: next }))}
            />
          ) : (
            <FilePreview file={value} />
          )}
        </div>
        <div className="asset-doc__upload-row">
          <label className="asset-doc__upload-button" htmlFor={`insurance-${key}`}>
            <span className="asset-doc__upload-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17 10.0944L10.8539 15.8909C10.101 16.6011 9.07974 17 8.01492 17C6.9501 17 5.92889 16.6011 5.17594 15.8909C4.423 15.1808 4 14.2177 4 13.2134C4 12.2092 4.423 11.246 5.17594 10.5359L11.322 4.73937C11.824 4.26596 12.5048 4 13.2147 4C13.9246 4 14.6054 4.26596 15.1073 4.73937C15.6093 5.21279 15.8913 5.85487 15.8913 6.52438C15.8913 7.19389 15.6093 7.83598 15.1073 8.30939L8.95456 14.1059C8.70358 14.3426 8.36317 14.4756 8.00823 14.4756C7.65329 14.4756 7.31289 14.3426 7.06191 14.1059C6.81093 13.8692 6.66993 13.5482 6.66993 13.2134C6.66993 12.8787 6.81093 12.5576 7.06191 12.3209L12.7399 6.97221"
                  stroke="#1C1C1C"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="asset-doc__upload-label">파일 및 사진 추가</span>
            <input
              id={`insurance-${key}`}
              name={key}
              type="file"
              accept={accept}
              multiple
              onChange={onFile}
              className="sr-only"
            />
          </label>
          <div className="asset-doc__upload-count">
            {count > 0 ? `${count} / ${count}` : "0 / 0"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`asset-dialog ${isReadOnly ? "asset-dialog--edit" : "asset-dialog--create"}`}>
      <div className="asset-dialog__body">
        {isReadOnly ? (
          // 보험 확인 모드 (View Mode)
          <>
            <div className="asset-docs-section mb-4">
              {(() => {
                const list = Array.isArray(asset.insuranceDocList)
                  ? asset.insuranceDocList
                  : (Array.isArray(asset.insuranceDocGcsObjectNames)
                      ? asset.insuranceDocGcsObjectNames.map((obj, idx) => ({ name: (asset.insuranceDocNames && asset.insuranceDocNames[idx]) || `보험서류 ${idx + 1}`, objectName: obj }))
                      : []);
                return list.length > 0 ? (
                  <MultiDocGallery title="보험증권" items={list} />
                ) : (
                  <div className="asset-doc asset-doc--view">
                    <div className="asset-doc__title">보험증권</div>
                    <div
                      className="asset-doc__box Box32"
                      style={{
                        width: 330,
                        height: 198,
                        background: "#FAFAFA",
                        borderRadius: 6,
                        border: "1px rgba(0, 0, 0, 0.08) solid",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div className="asset-doc__placeholder">등록하신 문서가 없습니다.</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="asset-info grid-info asset-info--two-col">
              {infoRow("보험사명", asset.insuranceCompany || "")}
              {infoRow("보험 상품", asset.insuranceProduct || "")}
              {infoRow("보험 가입일", asset.insuranceStartDate ? formatFullDateDot(asset.insuranceStartDate) : "")}
              {infoRow("보험 만료일", asset.insuranceExpiryDate ? formatFullDateDot(asset.insuranceExpiryDate) : "")}
              {infoRow("특약사항", <span className="insurance-full-row">{asset.insuranceSpecialTerms || ""}</span>)}
            </div>
          </>
        ) : (
          // 보험 등록/수정 모드 (Create/Edit Mode)
          <>
            <div className="asset-docs-section">
              {docBoxEdit("보험증권", "insuranceDoc")}
            </div>
            {busy.status === "idle" ? (
              <button
                type="button"
                className="asset-upload-action-btn"
                onClick={handleUploadAndOcr}
                disabled={!form.insuranceDoc}
              >
                <span>업로드 및 자동채움</span>
              </button>
            ) : (
              <div className="asset-upload-action-btn">
                <UploadProgress
                  status={busy.status}
                  percent={busy.percent}
                  label={busy.message || (busy.status === 'ocr' ? '자동 채움 처리 중...' : undefined)}
                  variant="bar"
                />
              </div>
            )}
            <div className="asset-form-separator" />

            <div className="asset-info grid-info asset-info--two-col">
              {infoRow(
                "보험사명",
                <div className="flex items-center gap-2 flex-nowrap">
                  <input
                    id="insurance-company"
                    name="insuranceCompany"
                    className="form-input flex-1 min-w-0"
                    value={form.insuranceCompany}
                    onChange={(e) => setForm((p) => ({ ...p, insuranceCompany: e.target.value }))}
                    placeholder="예: 현대해상"
                  />
                  <OcrSuggestionPicker items={fieldSuggestions.insuranceCompany || []} onApply={(v) => setForm((p) => ({ ...p, insuranceCompany: String(v || "") }))} showLabel={false} maxWidth={200} />
                </div>
              )}
              {infoRow(
                "보험 상품",
                <div className="flex items-center gap-2 flex-nowrap">
                  <input
                    id="insurance-product"
                    name="insuranceProduct"
                    className="form-input flex-1 min-w-0"
                    value={form.insuranceProduct}
                    onChange={(e) => setForm((p) => ({ ...p, insuranceProduct: e.target.value }))}
                    placeholder="예: 자동차종합보험(개인용)"
                  />
                  <OcrSuggestionPicker items={fieldSuggestions.insuranceProduct || []} onApply={(v) => setForm((p) => ({ ...p, insuranceProduct: String(v || "") }))} showLabel={false} maxWidth={200} />
                </div>
              )}
              {infoRow(
                "보험 가입일",
                <div className="flex items-center gap-2 flex-nowrap">
                  <input
                    id="insurance-start-date"
                    name="insuranceStartDate"
                    className="form-input flex-1 min-w-0"
                    type="date"
                    value={form.insuranceStartDate}
                    onChange={(e) => setForm((p) => ({ ...p, insuranceStartDate: e.target.value }))}
                  />
                  <OcrSuggestionPicker items={fieldSuggestions.insuranceStartDate || []} onApply={(v) => setForm((p) => ({ ...p, insuranceStartDate: String(v || "") }))} showLabel={false} maxWidth={180} />
                </div>
              )}
              {infoRow(
                "보험 만료일",
                <div className="flex items-center gap-2 flex-nowrap">
                  <input
                    id="insurance-expiry-date"
                    name="insuranceExpiryDate"
                    className="form-input flex-1 min-w-0"
                    type="date"
                    value={form.insuranceExpiryDate}
                    onChange={(e) => setForm((p) => ({ ...p, insuranceExpiryDate: e.target.value }))}
                  />
                  <OcrSuggestionPicker items={fieldSuggestions.insuranceExpiryDate || []} onApply={(v) => setForm((p) => ({ ...p, insuranceExpiryDate: String(v || "") }))} showLabel={false} maxWidth={180} />
                </div>
              )}
              {infoRow(
                "특약사항",
                <div className="flex items-center gap-2 flex-nowrap insurance-full-row">
                  <input
                    id="insurance-special-terms"
                    name="specialTerms"
                    className="form-input flex-1 min-w-0"
                    value={form.specialTerms}
                    onChange={(e) => setForm((p) => ({ ...p, specialTerms: e.target.value }))}
                    placeholder="예: 긴급출동 포함, 자기부담금 20만원"
                  />
                  <OcrSuggestionPicker items={fieldSuggestions.insuranceSpecialTerms || []} onApply={(v) => setForm((p) => ({ ...p, specialTerms: String(v || "") }))} showLabel={false} maxWidth={200} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="asset-dialog__footer asset-dialog__footer--main">
        {isReadOnly && Array.isArray(asset.insuranceHistory) && asset.insuranceHistory.length > 0 && (
          <div className="asset-history-lines">
            {(
              asset.insuranceHistory
                .slice()
                .sort((a, b) => new Date(a.startDate || a.date || 0) - new Date(b.startDate || b.date || 0))
                .map((h, idx) => {
                  const when = formatFullDateDot(h.date || h.startDate || "");
                  const label = h.type === "등록" ? "보험 등록" : "보험 갱신";
                  const info = (h.company || "") + (h.product ? ` ${h.product}` : "");
                  return (
                    <div key={`${h.date || h.startDate || idx}-${h.company || ''}`} className="asset-history__line asset-history__line--reg">
                      <div
                        style={{
                          justifyContent: "center",
                          display: "flex",
                          flexDirection: "column",
                          color: "#888888",
                          fontSize: 12,
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          lineHeight: "18px",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          justifyContent: "center",
                          display: "flex",
                          flexDirection: "column",
                          color: "#1C1C1C",
                          fontSize: 12,
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          lineHeight: "18px",
                        }}
                      >
                        {when}{info ? ` (${info})` : ""}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
        <div className="asset-dialog__footer-actions">
          {allowEditToggle && isReadOnly && (asset?.insuranceExpiryDate || asset?.insuranceInfo || (Array.isArray(asset?.insuranceHistory) && asset.insuranceHistory.length > 0)) && (
            <button type="button" className="form-button form-button--close" onClick={() => setIsReadOnly(false)}>수정</button>
          )}
          <button type="button" className="form-button form-button--close" onClick={onClose}>닫기</button>
          {!isReadOnly && (
            <button type="button" className="form-button form-button--save" onClick={handleSave} disabled={uploadState.status === 'uploading'}>
              {(asset?.insuranceExpiryDate || asset?.insuranceInfo || (Array.isArray(asset?.insuranceHistory) && asset.insuranceHistory.length > 0)) ? '저장' : '등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
