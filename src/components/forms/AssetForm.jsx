import React, { useState } from "react";

export default function AssetForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
  const [form, setForm] = useState({
    vin: initial.vin || "",
    make: initial.make || "",
    model: initial.model || "",
    year: initial.year || "",
    fuelType: initial.fuelType || "",
    plate: initial.plate || "",
    // Files (kept in-memory only for now)
    registrationDoc: initial.registrationDoc || null,
    insuranceDoc: initial.insuranceDoc || null,
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
  };

  return (
    <form id={formId} className="form-grid" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor="vin">VIN</label>
      <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required disabled={readOnly} />

      <label className="form-label" htmlFor="make">Make</label>
      <input id="make" className="form-input" value={form.make} onChange={(e) => update("make", e.target.value)} placeholder="e.g. Hyundai" required disabled={readOnly} />

      <label className="form-label" htmlFor="model">Model</label>
      <input id="model" className="form-input" value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="e.g. Avante" required disabled={readOnly} />

      <label className="form-label" htmlFor="year">Year</label>
      <input id="year" type="number" className="form-input" value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="e.g. 2022" disabled={readOnly} />

      <label className="form-label" htmlFor="fuelType">Fuel</label>
      <input id="fuelType" className="form-input" value={form.fuelType} onChange={(e) => update("fuelType", e.target.value)} placeholder="e.g. Gasoline" disabled={readOnly} />

      <label className="form-label" htmlFor="plate">Plate</label>
      <input id="plate" className="form-input" value={form.plate} onChange={(e) => update("plate", e.target.value)} placeholder="e.g. 12가 3456" disabled={readOnly} />

      {/* Vehicle registration certificate (image or PDF) */}
      <label className="form-label" htmlFor="registrationDoc">Registration Doc</label>
      <input
        id="registrationDoc"
        type="file"
        className="form-input"
        accept="image/*,application/pdf"
        onChange={(e) => update("registrationDoc", e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        disabled={readOnly}
      />
      {form.registrationDoc && (
        <div style={{ fontSize: 12, color: "#555" }}>{form.registrationDoc.name}</div>
      )}

      {/* Insurance policy (image or PDF) */}
      <label className="form-label" htmlFor="insuranceDoc">Insurance Policy</label>
      <input
        id="insuranceDoc"
        type="file"
        className="form-input"
        accept="image/*,application/pdf"
        onChange={(e) => update("insuranceDoc", e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        disabled={readOnly}
      />
      {form.insuranceDoc && (
        <div style={{ fontSize: 12, color: "#555" }}>{form.insuranceDoc.name}</div>
      )}

      {!readOnly && showSubmit && (
        <div className="form-actions">
          <button type="submit" className="form-button">등록</button>
        </div>
      )}
    </form>
  );
}
