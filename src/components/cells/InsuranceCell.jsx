import React from 'react';
import { formatDateShort, getInsuranceExpiryStatus } from '../../utils/date';

/**
 * 보험 만료일 셀 컴포넌트
 * 보험 정보가 있으면 만료일을 표시하고, 없으면 등록 버튼을 표시합니다.
 */
const InsuranceCell = React.memo(({ insuranceExpiryDate, onViewInsurance, onRegisterInsurance }) => {
  if (insuranceExpiryDate) {
    const status = getInsuranceExpiryStatus(insuranceExpiryDate);
    const colorByStatus = {
      expired: "#d32f2f",
      warning: "#f9a825",
      caution: "#fbc02d",
      valid: "#006CEC",
      none: "#006CEC",
    };
    const labelByStatus = {
      expired: "만료",
      warning: "만료 임박",
      caution: "만료 예정",
    };
    const statusLabel = labelByStatus[status];
    const displayDate = formatDateShort(insuranceExpiryDate);
    const displayText = status === "expired" ? `${statusLabel} ${displayDate}` : displayDate;
    const ariaStatus = statusLabel ? `(${statusLabel}) ` : "";
    return (
      <button
        type="button"
        className="simple-button"
        onClick={onViewInsurance}
        title="보험 정보 보기"
        aria-label={`보험 만료일 ${ariaStatus}${displayDate} 상세보기`}
        style={{ color: colorByStatus[status] || "#006CEC" }}
      >
        {displayText}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="badge badge--default badge--clickable"
      onClick={onRegisterInsurance}
      title="보험 등록"
      aria-label="보험 정보 등록하기"
    >
      보험 등록
    </button>
  );
});

InsuranceCell.displayName = 'InsuranceCell';

export default InsuranceCell;
