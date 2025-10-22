import React from 'react';

/**
 * 심각도를 숫자로 변환하는 함수
 */
const severityNumber = (s) => {
  if (typeof s === "number") return Math.max(0, Math.min(10, s));
  if (typeof s === "string") {
    const m = s.trim();
    if (m === "낮음") return 2;
    if (m === "보통") return 5;
    if (m === "높음") return 8;
    const n = parseFloat(m);
    return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
  }
  return 0;
};

/**
 * 진단 코드 심각도 셀 컴포넌트
 * 서버에서 제공한 최대 심각도 또는 진단 코드 배열에서 계산한 최대 심각도를 표시합니다.
 */
const SeverityCell = React.memo(({ row }) => {
  // Prefer server-provided max severity when available
  const fromField = typeof row?.diagnosticMaxSeverity === "number" ? row.diagnosticMaxSeverity : null;
  let max = fromField;

  if (max == null) {
    const arr = Array.isArray(row?.diagnosticCodes) ? row.diagnosticCodes : [];
    if (arr.length === 0) return "-";
    max = arr.reduce((acc, it) => Math.max(acc, severityNumber(it?.severity)), 0);
  }

  return (
    <span className="badge" title={`심각도 ${Number(max).toFixed(1)} / 10`}>
      {Number(max).toFixed(1)} / 10
    </span>
  );
});

SeverityCell.displayName = 'SeverityCell';

export default SeverityCell;
