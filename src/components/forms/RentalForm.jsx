import React, { useState } from "react";

export default function RentalForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
  const [form, setForm] = useState({
    rental_id: initial.rental_id || "",
    vin: initial.vin || "",
    renter_name: initial.renter_name || "",
    contact_number: initial.contact_number || "",
    address: initial.address || "",
    start: initial.start || initial?.rental_period?.start || "",
    end: initial.end || initial?.rental_period?.end || "",
    insurance_name: initial.insurance_name || "",
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
  };

  return (
    <form id={formId} className="form-grid" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor="rental_id">Rental ID</label>
      <input id="rental_id" className="form-input" value={form.rental_id} onChange={(e) => update("rental_id", e.target.value)} placeholder="e.g. R-2024-001" required disabled={readOnly} />

      <label className="form-label" htmlFor="vin">VIN</label>
      <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required disabled={readOnly} />

      <label className="form-label" htmlFor="renter_name">Renter</label>
      <input id="renter_name" className="form-input" value={form.renter_name} onChange={(e) => update("renter_name", e.target.value)} placeholder="e.g. 홍길동" required disabled={readOnly} />

      <label className="form-label" htmlFor="contact_number">Contact</label>
      <input id="contact_number" className="form-input" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="e.g. 010-1234-5678" disabled={readOnly} />

      <label className="form-label" htmlFor="address">Address</label>
      <input id="address" className="form-input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="e.g. 서울특별시 ..." disabled={readOnly} />

      <label className="form-label" htmlFor="start">Start</label>
      <input id="start" type="date" className="form-input" value={form.start} onChange={(e) => update("start", e.target.value)} required disabled={readOnly} />

      <label className="form-label" htmlFor="end">End</label>
      <input id="end" type="date" className="form-input" value={form.end} onChange={(e) => update("end", e.target.value)} required disabled={readOnly} />

      <label className="form-label" htmlFor="insurance_name">Insurance</label>
      <input id="insurance_name" className="form-input" value={form.insurance_name} onChange={(e) => update("insurance_name", e.target.value)} placeholder="e.g. ABC 보험" disabled={readOnly} />

      {!readOnly && showSubmit && (
        <div className="form-actions">
          <button type="submit" className="form-button">등록</button>
        </div>
      )}
    </form>
  );
}
