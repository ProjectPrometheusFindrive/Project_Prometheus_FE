import React from "react";

/**
 * VehicleTypeText - 차종 표시 컴포넌트
 * 디자인: 차종명(검정) + 연도(회색 #888888)
 * 예: "아반떼 CN7 23년"
 */
export default function VehicleTypeText({ vehicleType }) {
  if (!vehicleType) return <>-</>;
  const yearPattern = /(\d{2,4})년형?/;
  const match = vehicleType.match(yearPattern);
  if (!match) {
    return <span className="vehicle-type-text">{vehicleType}</span>;
  }

  const yearDigits = match[1];
  const modelPart = vehicleType.replace(yearPattern, "").trim();
  return (
    <span className="vehicle-type-text">
      {modelPart}
      {modelPart && yearDigits && "  "}
      <span className="vehicle-type-text__year">{yearDigits}년</span>
    </span>
  );
}

