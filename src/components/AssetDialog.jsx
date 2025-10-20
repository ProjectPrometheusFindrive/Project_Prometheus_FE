import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatCurrency } from "../utils/formatters";
import { formatDateShort } from "../utils/date";
import { isValidKoreanPlate, normalizeKoreanPlate } from "../utils/validators";
import { getSignedDownloadUrl } from "../utils/gcsApi";
import GCSImage from "./GCSImage";
import FilePreview from "./FilePreview";
import DocumentViewer from "./DocumentViewer";
import MultiDocGallery from "./MultiDocGallery";
import { chooseUploadMode } from "../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";
import { ocrExtract } from "../api";
import { randomId } from "../utils/id";

export default function AssetDialog({ asset = {}, mode = "create", onClose, onSubmit, requireDocs = true }) {
  const isEdit = mode === "edit";
  const [step, setStep] = useState(isEdit ? "details" : "upload");
  const tmpIdRef = useRef(randomId("asset"));
  const [busy, setBusy] = useState({ status: "idle", message: "", percent: 0 });
  const [preUploaded, setPreUploaded] = useState({ registration: [], insurance: [] });
  const [ocrSuggest, setOcrSuggest] = useState({});
  const [form, setForm] = useState({
    make: asset.make || "",
    model: asset.model || "",
    year: asset.year || "",
    fuelType: asset.fuelType || "",
    plate: asset.plate || "",
    vin: asset.vin || "",
    vehicleValue: asset.vehicleValue || "",
    registrationDoc: null,
    insuranceDoc: null, // 원리금 상환 계획표 (placeholder)
  });

  // State for displaying documents in view mode (single legacy)
  const [insuranceDocUrl, setInsuranceDocUrl] = useState("");
  const [registrationDocUrl, setRegistrationDocUrl] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Fetch signed URLs for documents when in view mode
  useEffect(() => {
    if (!isEdit || !asset) return;

    let cancelled = false;
    const fetchUrls = async () => {
      setLoadingDocs(true);
      try {
        const promises = [];
        if (asset.insuranceDocGcsObjectName) {
          promises.push(
            getSignedDownloadUrl(asset.insuranceDocGcsObjectName)
              .then(url => !cancelled && setInsuranceDocUrl(url))
              .catch(err => console.error("Failed to get insurance doc URL:", err))
          );
        }
        if (asset.registrationDocGcsObjectName) {
          promises.push(
            getSignedDownloadUrl(asset.registrationDocGcsObjectName)
              .then(url => !cancelled && setRegistrationDocUrl(url))
              .catch(err => console.error("Failed to get registration doc URL:", err))
          );
        }
        await Promise.all(promises);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    };

    fetchUrls();
    return () => { cancelled = true; };
  }, [isEdit, asset]);

  const onFile = (key) => (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (e.target.multiple) {
        console.debug("[upload-ui] asset dialog files selected:", { key, count: files.length, names: files.map(f => f.name) });
        setForm((p) => ({ ...p, [key]: files }));
      } else {
        const file = files[0];
        console.debug("[upload-ui] asset dialog file selected:", { key, name: file.name, size: file.size, type: file.type });
        setForm((p) => ({ ...p, [key]: file }));
      }
    } else {
      console.debug("[upload-ui] asset dialog file cleared:", { key });
      setForm((p) => ({ ...p, [key]: e.target.multiple ? [] : null }));
    }
  };

  const normalizedPlate = normalizeKoreanPlate(form.plate);
  const isPlateInvalid = !!form.plate && !isValidKoreanPlate(normalizedPlate);

  const handleSave = () => {
    if (!onSubmit) return;
    // Normalize on save; UI disables invalid state
    if (!isEdit && form.plate && normalizedPlate !== form.plate) {
      setForm((p) => ({ ...p, plate: normalizedPlate }));
    }
    onSubmit({
      ...form,
      preUploaded,
      ocrSuggestions: ocrSuggest,
    });
  };

  const [viewer, setViewer] = useState({ open: false, src: "", type: "", title: "" });

  const openViewer = (src, name) => {
    if (!src) return;
    const lower = String(name || "").toLowerCase();
    const isPdf = lower.endsWith(".pdf") || /(?:^|[.?=&])content-type=application%2Fpdf/.test(src);
    const isVideo = /\.(mp4|webm|mov|avi|mpeg|mpg)$/.test(lower) || /[?&]type=video\//.test(src);
    const type = isPdf ? "pdf" : isVideo ? "video" : "image";
    const t = name ? `${title} - ${name}` : title;
    setViewer({ open: true, src, type, title: t });
  };

  const docBoxView = (title, url, docName) => {
    const renderContent = () => {
      if (loadingDocs) {
        return <div className="asset-doc__placeholder">로딩 중...</div>;
      }
      if (!url) {
        return <div className="asset-doc__placeholder">문서 없음</div>;
      }
      // Check if it's a PDF or image
      const isPdf = docName?.toLowerCase().endsWith('.pdf') || url.includes('content-type=application%2Fpdf');
      if (isPdf) {
        return (
          <button type="button" className="simple-button" onClick={() => openViewer(url, docName)} title="문서 미리보기">
            {docName || "문서 보기"}
          </button>
        );
      }
      // Display as image
      return (
        <img
          src={url}
          alt={title}
          style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', cursor: 'zoom-in' }}
          onClick={() => openViewer(url, docName)}
        />
      );
    };

    return (
      <div className="asset-doc">
        <div className="asset-doc__title">{title}</div>
        <div className="asset-doc__box" aria-label={`${title} 미리보기 영역`} style={{ height: 'auto', minHeight: 80, padding: 8 }}>
          {renderContent()}
        </div>
      </div>
    );
  };

  const docBoxEdit = (title, key, accept = "image/*,application/pdf") => (
    <div className="asset-doc">
      <div className="asset-doc__title">{title}</div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="file"
          accept={accept}
          multiple
          onChange={onFile(key)}
          required={requireDocs}
        />
      </div>
      {Array.isArray(form[key]) ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {form[key].map((f, idx) => (
            <FilePreview key={f.name + idx} file={f} />
          ))}
        </div>
      ) : (
        <FilePreview file={form[key]} />
      )}
    </div>
  );

  const infoRow = (label, value) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div className="asset-info__value">{value ?? <span className="empty">-</span>}</div>
    </>
  );

  const dateItem = (label, value) => {
    // Normalize incoming value (can be Date object or string) to display-safe string
    const display = value ? formatDateShort(value) : "";
    return (
      <div className="asset-dates__item">
        <div className="asset-dates__label">{label}</div>
        <div className="asset-dates__value">{display || <span className="empty">-</span>}</div>
      </div>
    );
  };

  // Step 1: upload & OCR helpers (create mode only)
  const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
  const uploadOne = async (file, folder) => {
    const mode = chooseUploadMode(file.size || 0);
    if (mode === "signed-put") {
      const { promise } = uploadViaSignedPut(file, { folder, onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })) });
      const res = await promise;
      return { name: file.name, objectName: res.objectName || "" };
    } else {
      const { promise } = uploadResumable(file, { folder, onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })) });
      const res = await promise;
      return { name: file.name, objectName: res.objectName || "" };
    }
  };

  const handleUploadAndOcr = async () => {
    const regFiles = toArray(form.registrationDoc);
    const planFiles = toArray(form.insuranceDoc); // 원리금 상환 계획표
    if (requireDocs && regFiles.length === 0 && planFiles.length === 0) {
      alert("업로드할 파일을 선택해 주세요.");
      return;
    }
    const tmpFolder = `uploads/tmp/${tmpIdRef.current}/assets`;
    setBusy({ status: "uploading", message: "업로드 중...", percent: 0 });
    try {
      const uploaded = { registration: [], insurance: [] };
      if (regFiles.length > 0) {
        for (const f of regFiles) {
          const item = await uploadOne(f, `${tmpFolder}/registrationDoc`);
          if (item.objectName) uploaded.registration.push(item);
        }
      }
      if (planFiles.length > 0) {
        for (const f of planFiles) {
          const item = await uploadOne(f, `${tmpFolder}/amortizationSchedule`);
          if (item.objectName) uploaded.insurance.push(item);
        }
      }
      setPreUploaded(uploaded);

      setBusy({ status: "ocr", message: "OCR 처리 중...", percent: 0 });
      const suggestions = {};
      // registrationDoc OCR → prefill
      if (uploaded.registration[0]?.objectName) {
        try {
          const resp = await ocrExtract({
            docType: "registrationDoc",
            objectName: uploaded.registration[0].objectName,
            sourceName: uploaded.registration[0].name,
            saveOutput: true,
          });
          if (resp && resp.ocrSuggestions && resp.ocrSuggestions.registrationDoc) {
            suggestions.registrationDoc = resp.ocrSuggestions.registrationDoc;
            // map fields into form conservatively (only empty fields)
            const fields = suggestions.registrationDoc.fields || [];
            const next = { ...form };
            const map = { plate: "plate", vin: "vin", registrationDate: "registrationDate", make: "make", model: "model", year: "year" };
            fields.forEach(({ name, value }) => {
              const key = map[name];
              if (key && (next[key] == null || next[key] === "")) {
                next[key] = String(value || "");
              }
            });
            // Compose vehicleType if possible
            if (!next.vehicleType && next.model && next.year) {
              next.vehicleType = `${next.model} ${next.year}년형`;
            }
            setForm(next);
          }
        } catch (e) {
          console.warn("registrationDoc OCR failed", e);
        }
      }

      // amortizationSchedule OCR (optional, store suggestions only)
      if (uploaded.insurance[0]?.objectName) {
        try {
          const resp = await ocrExtract({
            docType: "amortizationSchedule",
            objectName: uploaded.insurance[0].objectName,
            sourceName: uploaded.insurance[0].name,
            saveOutput: true,
          });
          if (resp && resp.ocrSuggestions && resp.ocrSuggestions.amortizationSchedule) {
            suggestions.amortizationSchedule = resp.ocrSuggestions.amortizationSchedule;
          }
        } catch (e) {
          console.warn("amortizationSchedule OCR failed", e);
        }
      }

      setOcrSuggest(suggestions);
      setBusy({ status: "idle", message: "", percent: 0 });
      setStep("details");
    } catch (e) {
      console.error("upload/OCR error", e);
      setBusy({ status: "idle", message: "", percent: 0 });
      // allow proceeding without OCR
      alert("업로드 또는 OCR 처리 중 오류가 발생했습니다. 수동으로 진행해 주세요.");
      setStep("details");
    }
  };

  const UploadStep = () => (
    <>
      <div className="asset-docs-section" style={{ marginBottom: 16 }}>
        {docBoxEdit("원리금 상환 계획표", "insuranceDoc")}
        {docBoxEdit("자동차 등록증", "registrationDoc")}
      </div>
      {busy.status !== "idle" && (
        <div style={{ marginBottom: 12, color: "#555", fontSize: 13 }}>
          {busy.message} {busy.percent ? `${busy.percent}%` : ""}
        </div>
      )}
      <div className="asset-dialog__footer">
        <button type="button" className="form-button" onClick={handleUploadAndOcr} disabled={busy.status !== "idle"} style={{ marginRight: 8 }}>
          업로드 및 OCR
        </button>
        <button type="button" className="form-button form-button--muted" onClick={() => setStep("details")} disabled={busy.status !== "idle"} style={{ marginRight: 8 }}>
          OCR 없이 진행
        </button>
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </>
  );

  const DetailsStep = () => (
    <>
      <div className="asset-info grid-info">
        {infoRow(
          "제조사",
          <input className="form-input" value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} placeholder="예: 현대" />
        )}
        {infoRow(
          "차종",
          <input className="form-input" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="예: 쏘나타" />
        )}
        {infoRow(
          "연식",
          <select className="form-input" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}>
            {(() => {
              const CURRENT_YEAR = new Date().getFullYear();
              const YEAR_START = 1990;
              const options = [{ value: "", label: "선택" }].concat(
                Array.from({ length: CURRENT_YEAR - YEAR_START + 1 }, (_, i) => {
                  const y = CURRENT_YEAR - i;
                  return { value: String(y), label: String(y) };
                })
              );
              return options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ));
            })()}
          </select>
        )}
        {infoRow(
          "연료 타입",
          <select className="form-input" value={form.fuelType} onChange={(e) => setForm((p) => ({ ...p, fuelType: e.target.value }))}>
            {["", "가솔린", "디젤", "전기", "하이브리드", "LPG", "수소", "기타"].map((v) => (
              <option key={v} value={v}>{v || "선택"}</option>
            ))}
          </select>
        )}
        {infoRow(
          "차량번호",
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <input
              className={`form-input${isPlateInvalid ? " is-invalid" : ""}`}
              value={form.plate}
              onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))}
              onBlur={(e) => {
                const v = normalizeKoreanPlate(e.target.value);
                if (v !== form.plate) setForm((p) => ({ ...p, plate: v }));
              }}
              aria-invalid={isPlateInvalid ? true : undefined}
              placeholder="예: 28가2345"
            />
            {isPlateInvalid && (
              <span aria-live="polite" style={{ color: "#d32f2f", fontSize: 12 }}>올바르지 않은 형식</span>
            )}
          </div>
        )}
        {infoRow(
          "차대번호(VIN)",
          <input className="form-input" value={form.vin} onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))} placeholder="예: KMHxxxxxxxxxxxxxx" />
        )}
        {infoRow(
          "차량가액",
          <input
            className="form-input"
            type="text"
            value={form.vehicleValue}
            onChange={(e) => setForm((p) => ({ ...p, vehicleValue: formatCurrency(e.target.value) }))}
            inputMode="numeric"
            maxLength={20}
            placeholder="예: 25,000,000"
          />
        )}
      </div>
      <div className="asset-dialog__footer">
        <button type="button" className="form-button form-button--muted" onClick={() => setStep("upload")} style={{ marginRight: 8 }}>이전</button>
        <button type="button" className="form-button" onClick={handleSave} disabled={isPlateInvalid} style={{ marginRight: 8 }}>저장</button>
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </>
  );

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__body">
        {isEdit ? (
          <>
            <div className="asset-docs-section" style={{ marginBottom: 16 }}>
              {/* Multi-doc gallery (preferred) */}
              {Array.isArray(asset.insuranceDocGcsObjectNames) && asset.insuranceDocGcsObjectNames.length > 0 ? (
                <MultiDocGallery
                  title="원리금 상환 계획표"
                  items={asset.insuranceDocGcsObjectNames.map((obj, idx) => ({ name: (asset.insuranceDocNames && asset.insuranceDocNames[idx]) || `보험서류 ${idx + 1}` , objectName: obj }))}
                />
              ) : (
                docBoxView("원리금 상환 계획표", insuranceDocUrl, asset.insuranceDocName)
              )}
              {Array.isArray(asset.registrationDocGcsObjectNames) && asset.registrationDocGcsObjectNames.length > 0 ? (
                <MultiDocGallery
                  title="자동차 등록증"
                  items={asset.registrationDocGcsObjectNames.map((obj, idx) => ({ name: (asset.registrationDocNames && asset.registrationDocNames[idx]) || `등록증 ${idx + 1}`, objectName: obj }))}
                />
              ) : (
                docBoxView("자동차 등록증", registrationDocUrl, asset.registrationDocName)
              )}
            </div>
          <div className="asset-info grid-info">
            {infoRow("제조사", asset.make || "")}
            {infoRow("차종", asset.model || "")}
            {infoRow("연식", asset.year || "")}
            {infoRow("연료 타입", asset.fuelType || "")}
            {infoRow("차량번호", asset.plate || "")}
            {infoRow("차대번호(VIN)", asset.vin || "")}
            {infoRow("차량가액", asset.vehicleValue || "")}
          </div>
          </>
        ) : (step === "upload" ? <UploadStep /> : <DetailsStep />)}

        {(asset.purchaseDate || asset.registrationDate || asset.systemRegDate || asset.systemDelDate) && (
          <div style={{ marginTop: 16 }}>
            <div className="asset-doc__title" style={{ marginBottom: 8 }}>등록 정보</div>
            <div className="asset-dates">
              {asset.purchaseDate && dateItem("차량 구매일", asset.purchaseDate)}
              {(asset.registrationDate || asset.systemRegDate) && dateItem("전산 등록일", asset.registrationDate || asset.systemRegDate)}
              {asset.systemDelDate && dateItem("전산 삭제일", asset.systemDelDate)}
            </div>
          </div>
        )}
      </div>

      {isEdit && (
        <div className="asset-dialog__footer">
          <button type="button" className="form-button" onClick={onClose}>닫기</button>
        </div>
      )}
      <DocumentViewer
        isOpen={viewer.open}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
        src={viewer.src}
        type={viewer.type}
        title={viewer.title}
      />
    </div>
  );
}
