import React, { useState } from "react";

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
    setForm((p) => ({ ...p, [key]: file }));
  };

  const handleSave = () => {
    if (!onSubmit) return;
    if (!isEdit && requireDocs) {
      if (!form.insuranceDoc || !form.registrationDoc) {
        alert("원리금 상환 계획표와 자동차 등록증은 필수입니다.");
        return;
      }
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

  const dateItem = (label, value) => (
    <div className="asset-dates__item">
      <div className="asset-dates__label">{label}</div>
      <div className="asset-dates__value">{value || <span className="empty">-</span>}</div>
    </div>
  );

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
              <input className="form-input" value={form.plate} onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))} placeholder="예: 28가2345" />
            )}
            {infoRow(
              "차대번호(VIN)",
              <input className="form-input" value={form.vin} onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))} placeholder="예: KMHxxxxxxxxxxxxxx" />
            )}
            {infoRow(
              "차량가액",
              <input className="form-input" type="number" value={form.vehicleValue} onChange={(e) => setForm((p) => ({ ...p, vehicleValue: e.target.value }))} placeholder="예: 25000000" />
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
          <button type="button" className="form-button" onClick={handleSave} style={{ marginRight: 8 }}>저장</button>
        )}
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
