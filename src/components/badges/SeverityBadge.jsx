import React from "react";

export default function SeverityBadge({ value }) {
  if (value == null) return <>-</>;
  const v = Number(value);
  if (Number.isNaN(v)) return <>-</>;
  return (
    <span
      title={`심각도 ${v.toFixed(1)} / 10`}
      style={{
        textAlign: 'center',
        color: '#1C1C1C',
        fontSize: '14px',
        fontFamily: 'Pretendard',
        fontWeight: 500,
        lineHeight: '27px',
        wordWrap: 'break-word'
      }}
    >
      {v.toFixed(1)}
    </span>
  );
}

