import React from "react";

const CLASS_BY_LABEL = {
  "-": "badge--default",
  정상: "badge--normal",
  관심필요: "badge--overdue",
  심각: "badge--maintenance",
};

export default function VehicleHealthCell({ label, onClick }) {
  if (!label || label === "-") return <>-</>;
  const cls = CLASS_BY_LABEL[label] || "badge--default";
  return (
    <button type="button" className={`badge ${cls} badge--clickable`} onClick={onClick} title="진단 코드 상세 보기">
      {label}
    </button>
  );
}

