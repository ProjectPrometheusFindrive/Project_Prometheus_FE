import React from "react";

// Display vehicle model with year part small and muted (e.g., "아반떼 23년형")
export default function VehicleTypeText({ vehicleType }) {
  if (!vehicleType) return <>-</>;
  const yearPattern = /(\d{2,4}년형)/;
  const match = vehicleType.match(yearPattern);
  if (!match) return <>{vehicleType}</>;

  const yearPart = match[1];
  const modelPart = vehicleType.replace(yearPattern, "").trim();
  return (
    <span>
      {modelPart}
      {modelPart && yearPart && " "}
      <span className="text-xs text-muted">{yearPart}</span>
    </span>
  );
}

