import React, { useState } from "react";

export default function InsuranceDialog({ asset = {}, onClose, onSubmit }) {
  const [form, setForm] = useState({
    insuranceInfo: asset.insuranceInfo || "",
    insuranceExpiryDate: asset.insuranceExpiryDate || "",
    insuranceDoc: null,
  });

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setForm((p) => ({ ...p, insuranceDoc: file }));
  };

  const handleSave = () => {
    if (!form.insuranceInfo || !form.insuranceExpiryDate) {
      alert("보험사와 만료일을 입력해 주세요.");
      return;
    }
    onSubmit && onSubmit({ insuranceInfo: form.insuranceInfo, insuranceExpiryDate: form.insuranceExpiryDate, insuranceDoc: form.insuranceDoc });
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
            <div className="asset-doc__title">보험 가입증명서</div>
            <div className="asset-doc__box" aria-label="보험 가입증명서 업로드">
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input type="file" accept="image/*,application/pdf" onChange={onFile} />
                <div className="asset-doc__placeholder">{form.insuranceDoc?.name || "파일 선택"}</div>
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
              "보험사",
              <input className="form-input" value={form.insuranceInfo} onChange={(e) => setForm((p) => ({ ...p, insuranceInfo: e.target.value }))} placeholder="예: 현대해상" />
            )}
            {infoRow(
              "보험 만료일",
              <input className="form-input" type="date" value={form.insuranceExpiryDate} onChange={(e) => setForm((p) => ({ ...p, insuranceExpiryDate: e.target.value }))} />
            )}
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

