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
  if (!match) return <span style={{
    color: '#1C1C1C',
    fontSize: 14,
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
  }}>{vehicleType}</span>;

  const yearDigits = match[1];
  const modelPart = vehicleType.replace(yearPattern, "").trim();
  return (
    <span style={{
      color: '#1C1C1C',
      fontSize: 14,
      fontFamily: 'Pretendard',
      fontWeight: 500,
      lineHeight: '24px',
    }}>
      {modelPart}
      {modelPart && yearDigits && "  "}
      <span style={{
        color: '#888888',
        fontSize: 14,
        fontFamily: 'Pretendard',
        fontWeight: 500,
        lineHeight: '24px',
      }}>{yearDigits}년</span>
    </span>
  );
}

