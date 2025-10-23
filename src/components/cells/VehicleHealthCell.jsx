import React from "react";

const CLASS_BY_LABEL = {
  "-": "badge--default",
  정상: "badge--normal",
  관심필요: "badge--overdue",
  심각: "badge--maintenance",
};

const VehicleHealthCell = React.memo(function VehicleHealthCell({ label, onClick }) {
  if (!label || label === "-") return <>-</>;
  const cls = CLASS_BY_LABEL[label] || "badge--default";
  return (
    <button
      type="button"
      className={`badge ${cls} badge--clickable`}
      onClick={onClick}
      title="진단 코드 상세 보기"
      aria-label={`차량 상태 ${label} 진단 코드 상세 보기`}
    >
      {label}
    </button>
  );
});

export default VehicleHealthCell;

