import React, { useState } from "react";

export default function IssueForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
  const [form, setForm] = useState({
    vin: initial.vin || "",
    type: initial.type || "overdue",
    severity: initial.severity || "medium",
    description: initial.description || "",
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
  };

  return (
    <form id={formId} className="form-grid" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor="vin">VIN</label>
      <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required readOnly={readOnly} />

      <label className="form-label" htmlFor="type">Type</label>
      <select id="type" className="form-input" value={form.type} onChange={(e) => update("type", e.target.value)} disabled={readOnly}>
        <option value="overdue">Overdue Return</option>
        <option value="stolen">Suspected Theft</option>
        <option value="damage">Damage</option>
        <option value="other">Other</option>
      </select>

      <label className="form-label" htmlFor="severity">Severity</label>
      <select id="severity" className="form-input" value={form.severity} onChange={(e) => update("severity", e.target.value)} disabled={readOnly}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <label className="form-label" htmlFor="description">Description</label>
      <textarea id="description" rows="4" className="form-input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Enter details" readOnly={readOnly} />

      {!readOnly && showSubmit && (
        <div className="form-actions">
          <button type="submit" className="form-button">등록</button>
        </div>
      )}
    </form>
  );
}
