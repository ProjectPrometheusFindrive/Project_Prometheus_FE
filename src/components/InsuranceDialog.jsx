import React, { useState } from "react";

export default function InsuranceDialog({ asset = {}, onClose, onSubmit }) {
  const [form, setForm] = useState({
    insuranceCompany: asset.insuranceInfo || "",
    insuranceProduct: asset.insuranceProduct || "",
    insuranceStartDate: asset.insuranceStartDate || "",
    insuranceExpiryDate: asset.insuranceExpiryDate || "",
    specialTerms: asset.insuranceSpecialTerms || "",
    insuranceDoc: null,
    insuranceDocDataUrl: asset.insuranceDocDataUrl || "",
  });

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) { setForm((p) => ({ ...p, insuranceDoc: null, insuranceDocDataUrl: "" })); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, insuranceDoc: file, insuranceDocDataUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.insuranceCompany || !form.insuranceExpiryDate) {
      alert("보험사 명과 만료일을 입력해 주세요.");
      return;
    }
    onSubmit && onSubmit({
      insuranceInfo: form.insuranceCompany,
      insuranceCompany: form.insuranceCompany,
      insuranceProduct: form.insuranceProduct,
      insuranceStartDate: form.insuranceStartDate,
      insuranceExpiryDate: form.insuranceExpiryDate,
      insuranceSpecialTerms: form.specialTerms,
      insuranceDocDataUrl: form.insuranceDocDataUrl,
    });
  };

  const infoRow = (label, input) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div>{input}</div>
    </>
  );

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__grid">
        <div className="asset-dialog__left">
          <div className="asset-doc">
            <div className="asset-doc__title">보험증권 등록</div>
            <div className="asset-doc__box" aria-label="보험증권 파일 업로드 또는 촬영 첨부">
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={onFile} />
                <div className="asset-doc__placeholder">{form.insuranceDoc?.name || (form.insuranceDocDataUrl ? "첨부됨" : "파일 선택/촬영")}</div>
              </label>
            </div>
          </div>
          <div className="asset-doc">
            <div className="asset-doc__title">추가 서류(선택)</div>
            <div className="asset-doc__box">
              <div className="asset-doc__placeholder">프리뷰/업로드</div>
            </div>
          </div>
        </div>

        <div className="asset-dialog__right">
          <div className="asset-info grid-info">
            {infoRow(
              "보험사 명",
              <input className="form-input" value={form.insuranceCompany} onChange={(e) => setForm((p) => ({ ...p, insuranceCompany: e.target.value }))} placeholder="예: 현대해상" />
            )}
            {infoRow(
              "보험 상품명",
              <input className="form-input" value={form.insuranceProduct} onChange={(e) => setForm((p) => ({ ...p, insuranceProduct: e.target.value }))} placeholder="예: 자동차종합보험(자차특약)" />
            )}
            {infoRow(
              "보험 가입일",
              <input className="form-input" type="date" value={form.insuranceStartDate} onChange={(e) => setForm((p) => ({ ...p, insuranceStartDate: e.target.value }))} />
            )}
            {infoRow(
              "보험 만료일",
              <input className="form-input" type="date" value={form.insuranceExpiryDate} onChange={(e) => setForm((p) => ({ ...p, insuranceExpiryDate: e.target.value }))} />
            )}
            <div className="asset-info__label">특약사항</div>
            <textarea className="form-input" rows={3} value={form.specialTerms} onChange={(e) => setForm((p) => ({ ...p, specialTerms: e.target.value }))} placeholder="예: 긴급출동 포함, 자기부담금 20만원" />
          </div>
        </div>
      </div>

      <div className="asset-dialog__footer">
        <button type="button" className="form-button" onClick={handleSave} style={{ marginRight: 8 }}>등록</button>
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
