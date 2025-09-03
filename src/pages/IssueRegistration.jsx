import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function IssueRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vin: "",
    type: "overdue",
    severity: "medium",
    description: "",
  });

  function update(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    try {
      const data = JSON.parse(localStorage.getItem("issueDrafts") || "[]");
      data.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem("issueDrafts", JSON.stringify(data));
    } catch {}
    navigate("/returns");
  }

  return (
    <div className="page">
      <h1>문제 등록</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="vin">VIN</label>
        <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="예: 1HGCM82633A004352" required />

        <label className="form-label" htmlFor="type">유형</label>
        <select id="type" className="form-input" value={form.type} onChange={(e) => update("type", e.target.value)}>
          <option value="overdue">반납 지연</option>
          <option value="stolen">도난 의심</option>
          <option value="damage">파손</option>
          <option value="other">기타</option>
        </select>

        <label className="form-label" htmlFor="severity">심각도</label>
        <select id="severity" className="form-input" value={form.severity} onChange={(e) => update("severity", e.target.value)}>
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>

        <label className="form-label" htmlFor="description">설명</label>
        <textarea id="description" rows="4" className="form-input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="상세 내용을 입력하세요" />

        <div className="form-actions">
          <button type="submit" className="form-button">등록</button>
        </div>
      </form>
    </div>
  );
}

