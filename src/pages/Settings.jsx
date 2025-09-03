import React, { useEffect, useState } from "react";

const OPTIONS = [
  { value: "/assets", label: "자산 현황" },
  { value: "/rentals", label: "대여 계약 현황" },
  { value: "/returns", label: "반납/연장 현황" },
  { value: "/new-asset", label: "신규 자산 등록" },
  { value: "/dashboard", label: "대시보드" },
];

export default function Settings() {
  const [landing, setLanding] = useState("/assets");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("defaultLanding");
      if (stored) setLanding(stored);
    } catch {}
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setLanding(val);
    try {
      localStorage.setItem("defaultLanding", val);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {}
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <div style={{ marginTop: 16 }}>
        <label htmlFor="default-landing" style={{ display: "block", marginBottom: 8 }}>
          로그인 후 기본 랜딩
        </label>
        <select
          id="default-landing"
          value={landing}
          onChange={handleChange}
          style={{ padding: "8px 12px" }}
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {saved ? (
          <span style={{ marginLeft: 12, color: "#2e7d32" }}>저장됨</span>
        ) : null}
      </div>
    </div>
  );
}
