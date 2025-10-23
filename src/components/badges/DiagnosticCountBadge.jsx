import React from "react";

export default function DiagnosticCountBadge({ count, onClick }) {
  const n = Number(count || 0);
  if (!n) return <span className="badge badge--normal">정상</span>;
  return (
    <button
      type="button"
      className="badge badge--diagnostic badge--clickable badge--compact"
      onClick={onClick}
      title="진단 코드 상세 보기"
      aria-label={`진단 코드 ${n}개 상세 보기`}
    >
      진단 {n}개
    </button>
  );
}

