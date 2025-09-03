import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AssetRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: "",
    fuelType: "",
    plate: "",
  });

  function update(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    try {
      const data = JSON.parse(localStorage.getItem("assetDrafts") || "[]");
      data.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem("assetDrafts", JSON.stringify(data));
    } catch {}
    navigate("/assets");
  }

  return (
    <div className="page">
      <h1>자산 등록</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="vin">VIN</label>
        <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="예: 1HGCM82633A004352" required />

        <label className="form-label" htmlFor="make">제조사</label>
        <input id="make" className="form-input" value={form.make} onChange={(e) => update("make", e.target.value)} placeholder="예: Hyundai" required />

        <label className="form-label" htmlFor="model">모델</label>
        <input id="model" className="form-input" value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="예: Avante" required />

        <label className="form-label" htmlFor="year">연식</label>
        <input id="year" type="number" className="form-input" value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="예: 2022" />

        <label className="form-label" htmlFor="fuelType">연료</label>
        <input id="fuelType" className="form-input" value={form.fuelType} onChange={(e) => update("fuelType", e.target.value)} placeholder="예: Gasoline" />

        <label className="form-label" htmlFor="plate">번호판</label>
        <input id="plate" className="form-input" value={form.plate} onChange={(e) => update("plate", e.target.value)} placeholder="예: 12가 3456" />

        <div className="form-actions">
          <button type="submit" className="form-button">등록</button>
        </div>
      </form>
    </div>
  );
}

