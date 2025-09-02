import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function AssetForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ vin: "", make: "", model: "", year: "", fuelType: "", plate: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const onSubmit = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(localStorage.getItem("assetDrafts") || "[]");
      data.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem("assetDrafts", JSON.stringify(data));
    } catch {}
    navigate("/assets");
  };
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="form-label" htmlFor="vin">VIN</label>
      <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required />

      <label className="form-label" htmlFor="make">Make</label>
      <input id="make" className="form-input" value={form.make} onChange={(e) => update("make", e.target.value)} placeholder="e.g. Hyundai" required />

      <label className="form-label" htmlFor="model">Model</label>
      <input id="model" className="form-input" value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="e.g. Avante" required />

      <label className="form-label" htmlFor="year">Year</label>
      <input id="year" type="number" className="form-input" value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="e.g. 2022" />

      <label className="form-label" htmlFor="fuelType">Fuel</label>
      <input id="fuelType" className="form-input" value={form.fuelType} onChange={(e) => update("fuelType", e.target.value)} placeholder="e.g. Gasoline" />

      <label className="form-label" htmlFor="plate">Plate</label>
      <input id="plate" className="form-input" value={form.plate} onChange={(e) => update("plate", e.target.value)} placeholder="e.g. 12가 3456" />

      <div className="form-actions">
        <button type="submit" className="form-button">등록</button>
      </div>
    </form>
  );
}

function RentalForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ rental_id: "", vin: "", renter_name: "", contact_number: "", address: "", start: "", end: "", insurance_name: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const onSubmit = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
      data.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem("rentalDrafts", JSON.stringify(data));
    } catch {}
    navigate("/rentals");
  };
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="form-label" htmlFor="rental_id">Rental ID</label>
      <input id="rental_id" className="form-input" value={form.rental_id} onChange={(e) => update("rental_id", e.target.value)} placeholder="e.g. R-2024-001" required />

      <label className="form-label" htmlFor="vin">VIN</label>
      <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required />

      <label className="form-label" htmlFor="renter_name">Renter</label>
      <input id="renter_name" className="form-input" value={form.renter_name} onChange={(e) => update("renter_name", e.target.value)} placeholder="e.g. 홍길동" required />

      <label className="form-label" htmlFor="contact_number">Contact</label>
      <input id="contact_number" className="form-input" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="e.g. 010-1234-5678" />

      <label className="form-label" htmlFor="address">Address</label>
      <input id="address" className="form-input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="e.g. 서울특별시 ..." />

      <label className="form-label" htmlFor="start">Start</label>
      <input id="start" type="date" className="form-input" value={form.start} onChange={(e) => update("start", e.target.value)} required />

      <label className="form-label" htmlFor="end">End</label>
      <input id="end" type="date" className="form-input" value={form.end} onChange={(e) => update("end", e.target.value)} required />

      <label className="form-label" htmlFor="insurance_name">Insurance</label>
      <input id="insurance_name" className="form-input" value={form.insurance_name} onChange={(e) => update("insurance_name", e.target.value)} placeholder="e.g. ABC 보험" />

      <div className="form-actions">
        <button type="submit" className="form-button">등록</button>
      </div>
    </form>
  );
}

function IssueForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ vin: "", type: "overdue", severity: "medium", description: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const onSubmit = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(localStorage.getItem("issueDrafts") || "[]");
      data.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem("issueDrafts", JSON.stringify(data));
    } catch {}
    navigate("/returns");
  };
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="form-label" htmlFor="vin">VIN</label>
      <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required />

      <label className="form-label" htmlFor="type">Type</label>
      <select id="type" className="form-input" value={form.type} onChange={(e) => update("type", e.target.value)}>
        <option value="overdue">Overdue Return</option>
        <option value="stolen">Suspected Theft</option>
        <option value="damage">Damage</option>
        <option value="other">Other</option>
      </select>

      <label className="form-label" htmlFor="severity">Severity</label>
      <select id="severity" className="form-input" value={form.severity} onChange={(e) => update("severity", e.target.value)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <label className="form-label" htmlFor="description">Description</label>
      <textarea id="description" rows="4" className="form-input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Enter details" />

      <div className="form-actions">
        <button type="submit" className="form-button">등록</button>
      </div>
    </form>
  );
}

export default function Registration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = (searchParams.get("type") || "asset").toLowerCase();
  const mode = useMemo(() => (typeParam === "rental" || typeParam === "issue" ? typeParam : "asset"), [typeParam]);

  useEffect(() => {
    // Normalize invalid values to a valid one
    if (typeParam !== mode) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("type", mode);
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const changeMode = (next) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set("type", next);
      return sp;
    });
  };

  return (
    <div className="page">
      <h1>Registration</h1>

      <div className="sticky-header">
        <div className="view-toggle" role="tablist" aria-label="Registration type">
          <button type="button" className={`toggle-btn ${mode === "asset" ? "is-active" : ""}`} onClick={() => changeMode("asset")} role="tab" aria-selected={mode === "asset"}>
            Asset
          </button>
          <button type="button" className={`toggle-btn ${mode === "rental" ? "is-active" : ""}`} onClick={() => changeMode("rental")} role="tab" aria-selected={mode === "rental"}>
            Rental
          </button>
          <button type="button" className={`toggle-btn ${mode === "issue" ? "is-active" : ""}`} onClick={() => changeMode("issue")} role="tab" aria-selected={mode === "issue"}>
            Issue
          </button>
        </div>
      </div>

      {mode === "asset" && <AssetForm />}
      {mode === "rental" && <RentalForm />}
      {mode === "issue" && <IssueForm />}
    </div>
  );
}
