import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RentalRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    rental_id: "",
    vin: "",
    renter_name: "",
    contact_number: "",
    address: "",
    start: "",
    end: "",
    insurance_name: "",
  });

  function update(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    try {
      const data = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
      data.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem("rentalDrafts", JSON.stringify(data));
    } catch {}
    navigate("/rentals");
  }

  return (
    <div className="page">
      <h1>대여 등록</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="rental_id">Rental ID</label>
        <input id="rental_id" className="form-input" value={form.rental_id} onChange={(e) => update("rental_id", e.target.value)} placeholder="예: R-2024-001" required />

        <label className="form-label" htmlFor="vin">VIN</label>
        <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="예: 1HGCM82633A004352" required />

        <label className="form-label" htmlFor="renter_name">대여자</label>
        <input id="renter_name" className="form-input" value={form.renter_name} onChange={(e) => update("renter_name", e.target.value)} placeholder="예: 홍길동" required />

        <label className="form-label" htmlFor="contact_number">연락처</label>
        <input id="contact_number" className="form-input" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="예: 010-1234-5678" />

        <label className="form-label" htmlFor="address">주소</label>
        <input id="address" className="form-input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="예: 서울특별시 ..." />

        <label className="form-label" htmlFor="start">대여 시작</label>
        <input id="start" type="date" className="form-input" value={form.start} onChange={(e) => update("start", e.target.value)} required />

        <label className="form-label" htmlFor="end">대여 종료</label>
        <input id="end" type="date" className="form-input" value={form.end} onChange={(e) => update("end", e.target.value)} required />

        <label className="form-label" htmlFor="insurance_name">보험</label>
        <input id="insurance_name" className="form-input" value={form.insurance_name} onChange={(e) => update("insurance_name", e.target.value)} placeholder="예: ABC 보험" />

        <div className="form-actions">
          <button type="submit" className="form-button">등록</button>
        </div>
      </form>
    </div>
  );
}

