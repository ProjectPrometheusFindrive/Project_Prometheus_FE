import React from "react";
import useFormState from "../../hooks/useFormState";

export default function DeviceInfoForm({ initial = {}, onSubmit, readOnly = false, formId, showSubmit = true }) {
  const initialFormValues = {
    supplier: initial.supplier || "",
    installDate: initial.installDate || "",
    installer: initial.installer || "",
    serial: initial.serial || "",
    photos: initial.photos || [], // in-memory only
  };

  const { form, update, handleSubmit } = useFormState(initialFormValues, { onSubmit });

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files || []);
    update("photos", files);
  };

  return (
    <form id={formId} className="form-grid" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor="supplier">단말 공급 회사명</label>
      <input id="supplier" className="form-input" value={form.supplier} onChange={(e) => update("supplier", e.target.value)} placeholder="예: ABC 디바이스" disabled={readOnly} required />

      <label className="form-label" htmlFor="installDate">단말 장착일</label>
      <input id="installDate" type="date" className="form-input" value={form.installDate} onChange={(e) => update("installDate", e.target.value)} disabled={readOnly} required />

      <label className="form-label" htmlFor="installer">장착자 이름</label>
      <input id="installer" className="form-input" value={form.installer} onChange={(e) => update("installer", e.target.value)} placeholder="예: 홍길동" disabled={readOnly} required />

      <label className="form-label" htmlFor="serial">단말 일련번호</label>
      <input id="serial" className="form-input" value={form.serial} onChange={(e) => update("serial", e.target.value)} placeholder="예: DEV-2024-0001" disabled={readOnly} required />

      <label className="form-label" htmlFor="photos">장착 단말 정보 (사진 업로드)</label>
      <input id="photos" type="file" className="form-input" accept="image/*" capture="environment" multiple onChange={handlePhotos} disabled={readOnly} />
      {Array.isArray(form.photos) && form.photos.length > 0 && (
        <div style={{ fontSize: 12, color: "#555" }}>{form.photos.map((f) => f.name).join(", ")}</div>
      )}

      {!readOnly && showSubmit && (
        <div className="form-actions">
          <button type="submit" className="form-button">저장</button>
        </div>
      )}
    </form>
  );
}

