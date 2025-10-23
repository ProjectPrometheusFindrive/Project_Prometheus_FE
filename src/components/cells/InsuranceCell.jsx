import React from 'react';
import { formatDateShort } from '../../utils/date';

/**
 * 보험 만료일 셀 컴포넌트
 * 보험 정보가 있으면 만료일을 표시하고, 없으면 등록 버튼을 표시합니다.
 */
const InsuranceCell = React.memo(({ insuranceExpiryDate, onViewInsurance, onRegisterInsurance }) => {
  if (insuranceExpiryDate) {
    return (
      <button
        type="button"
        className="simple-button"
        onClick={onViewInsurance}
        title="보험 정보 보기"
        aria-label={`보험 만료일 ${formatDateShort(insuranceExpiryDate)} 상세보기`}
      >
        {formatDateShort(insuranceExpiryDate)}
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
