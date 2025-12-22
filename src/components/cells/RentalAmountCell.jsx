import React from "react";
import { formatCurrencyDisplay } from "../../utils/formatters";

/**
 * RentalAmountCell - 대여 금액 표시 셀 컴포넌트
 * 디자인: 2줄 레이아웃
 * - 첫 줄: 총 대여금액 (일반 weight)
 * - 둘째 줄: 단기/장기 배지 + 금액 (bold)
 */
const RentalAmountCell = React.memo(function RentalAmountCell({ row }) {
    const amount = row.rentalAmount || 0;
    const formattedAmount = formatCurrencyDisplay(amount);
    const isLongTerm = (row.rentalDurationDays || 0) > 30;

    const durationLabel = isLongTerm ? "장기" : "단기";

    // 둘째 줄 금액 계산 (장기: 월 금액, 단기: 총 금액)
    let secondLineAmount = formattedAmount;
    if (isLongTerm && amount) {
        const days = row.rentalDurationDays || 0;
        const months = Math.max(1, Math.floor(days / 30) || 1);
        const numericAmount =
            typeof amount === "number"
                ? amount
                : Number(String(amount).replace(/[^0-9.-]/g, "")) || 0;
        const monthly = Math.floor(numericAmount / months);
        secondLineAmount = formatCurrencyDisplay(monthly);
    }

    return (
        <div className="rental-amount-cell">
            <div className="rental-amount-cell__value">{formattedAmount}</div>
            <div className="rental-amount-cell__second">
                <span className={`rental-amount-tag ${isLongTerm ? "rental-amount-tag--long" : "rental-amount-tag--short"}`}>
                    {durationLabel}
                </span>
                <span className="rental-amount-cell__value rental-amount-cell__value--bold">
                    {secondLineAmount}
                </span>
            </div>
        </div>
    );
});

export default RentalAmountCell;
