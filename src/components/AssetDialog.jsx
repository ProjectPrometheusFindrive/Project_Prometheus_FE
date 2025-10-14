import React, { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatters";
import { formatDateShort } from "../utils/date";
import { isValidKoreanPlate, normalizeKoreanPlate } from "../utils/validators";
import { getSignedDownloadUrl } from "../utils/gcsApi";
import GCSImage from "./GCSImage";
import FilePreview from "./FilePreview";
import DocumentViewer from "./DocumentViewer";

export default function AssetDialog({ asset = {}, mode = "create", onClose, onSubmit, requireDocs = true }) {
  const isEdit = mode === "edit";
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

  // State for displaying documents in view mode
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
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (file) {
      console.debug("[upload-ui] asset dialog file selected:", { key, name: file.name, size: file.size, type: file.type });
    } else {
      console.debug("[upload-ui] asset dialog file cleared:", { key });
    }
    setForm((p) => ({ ...p, [key]: file }));
  };

  const normalizedPlate = normalizeKoreanPlate(form.plate);
  const isPlateInvalid = !!form.plate && !isValidKoreanPlate(normalizedPlate);

  const handleSave = () => {
    if (!onSubmit) return;
    // Normalize on save; UI disables invalid state
    if (!isEdit && form.plate && normalizedPlate !== form.plate) {
      setForm((p) => ({ ...p, plate: normalizedPlate }));
    }
    onSubmit(form);
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
          onChange={onFile(key)}
          required={requireDocs}
        />
      </div>
      <FilePreview file={form[key]} />
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

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__body">
        <div className="asset-docs-section" style={{ marginBottom: 16 }}>
          {isEdit ? (
            <>
              {docBoxView("원리금 상환 계획표", insuranceDocUrl, asset.insuranceDocName)}
              {docBoxView("자동차 등록증", registrationDocUrl, asset.registrationDocName)}
            </>
          ) : (
            <>
              {docBoxEdit("원리금 상환 계획표", "insuranceDoc")}
              {docBoxEdit("자동차 등록증", "registrationDoc")}
            </>
          )}
        </div>

        {isEdit ? (
          <div className="asset-info grid-info">
            {infoRow("제조사", asset.make || "")}
            {infoRow("차종", asset.model || "")}
            {infoRow("연식", asset.year || "")}
            {infoRow("연료 타입", asset.fuelType || "")}
            {infoRow("차량번호", asset.plate || "")}
            {infoRow("차대번호(VIN)", asset.vin || "")}
            {infoRow("차량가액", asset.vehicleValue || "")}
          </div>
        ) : (
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
        )}

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

      <div className="asset-dialog__footer">
        {!isEdit && onSubmit && (
          <button type="button" className="form-button" onClick={handleSave} disabled={isPlateInvalid} style={{ marginRight: 8 }}>저장</button>
        )}
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
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
