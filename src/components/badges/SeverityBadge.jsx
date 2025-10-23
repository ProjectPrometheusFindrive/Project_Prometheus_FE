import React from "react";

export default function SeverityBadge({ value }) {
  if (value == null) return <>-</>;
  const v = Number(value);
  if (Number.isNaN(v)) return <>-</>;
  return (
    <span className="badge" title={`심각도 ${v.toFixed(1)} / 10`}>
      {v.toFixed(1)} / 10
    </span>
  );
}

