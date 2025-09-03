import React, { useEffect, useState } from "react";

const OPTIONS = [
  { value: "/assets", label: "Asset Status" },
  { value: "/rentals", label: "Rental Contracts" },
  { value: "/returns", label: "Returns / Issues" },
  { value: "/new-asset", label: "New Asset" },
  { value: "/new-rental", label: "New Rental" },
  { value: "/new-issue", label: "New Issue" },
  { value: "/dashboard", label: "Dashboard" },
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
          Default landing after login
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
          <span style={{ marginLeft: 12, color: "#2e7d32" }}>Saved</span>
        ) : null}
      </div>
    </div>
  );
}

