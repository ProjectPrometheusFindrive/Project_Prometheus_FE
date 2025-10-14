import React, { useState } from "react";
import { formatCurrency } from "../utils/formatters";
import { formatDateShort } from "../utils/date";
import { isValidKoreanPlate, normalizeKoreanPlate } from "../utils/validators";

export default function AssetDialog({ asset = {}, mode = "create", onClose, onSubmit, requireDocs = true }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    make: asset.make || "",
    model: asset.model || "",
    plate: asset.plate || "",
    vin: asset.vin || "",
    vehicleValue: asset.vehicleValue || "",
    registrationDoc: null,
    insuranceDoc: null, // 원리금 상환 계획표 (placeholder)
  });

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

  const docBoxView = (title) => (
    <div className="asset-doc">
      <div className="asset-doc__title">{title}</div>
      <div className="asset-doc__box" aria-label={`${title} 미리보기 영역`}>
        <div className="asset-doc__placeholder">프리뷰</div>
      </div>
    </div>
  );

  const docBoxEdit = (title, key, accept = "image/*,application/pdf") => (
    <div className="asset-doc">
      <div className="asset-doc__title">{title}</div>
      <div className="asset-doc__box" aria-label={`${title} 업로드 영역`}>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <input type="file" accept={accept} onChange={onFile(key)} required={requireDocs} />
          <div className="asset-doc__placeholder">{form[key]?.name || "파일 선택"}</div>
        </label>
      </div>
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
              {docBoxView("원리금 상환 계획표")}
              {docBoxView("자동차 등록증")}
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
    </div>
  );
}
