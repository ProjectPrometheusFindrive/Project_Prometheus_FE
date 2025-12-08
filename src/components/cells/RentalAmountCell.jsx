import React from "react";
import { formatCurrencyDisplay } from "../../utils/formatters";

/**
 * RentalAmountCell - 대여 금액 표시 셀 컴포넌트
 * 금액, 장기/단기 구분, 미납 여부 등을 표시합니다.
 */
const RentalAmountCell = React.memo(function RentalAmountCell({ row }) {
    const amount = row.rentalAmount || 0;
    const formattedAmount = formatCurrencyDisplay(amount);
    const isLongTerm = (row.rentalDurationDays || 0) > 30;
    const hasUnpaid = (row.unpaidAmount || 0) > 0;

    const durationLabel = isLongTerm ? "장기" : "단기";
    let amountLabel = "";
    if (amount) {
        if (isLongTerm) {
            const days = row.rentalDurationDays || 0;
            const months = Math.max(1, Math.floor(days / 30) || 1);
            const numericAmount =
                typeof amount === "number"
                    ? amount
                    : Number(String(amount).replace(/[^0-9.-]/g, "")) || 0;
            const monthly = Math.floor(numericAmount / months);
            amountLabel = `월 ${formatCurrencyDisplay(monthly)}`;
        } else {
            amountLabel = `총 ${formattedAmount}`;
        }
    }

    return (
        <div className="rental-amount-cell">
            <div className="rental-amount-cell__value">{formattedAmount}</div>
            <div className="rental-amount-cell__meta">
                <span
                    className={
                        "rental-amount-tag " +
                        (isLongTerm
                            ? "rental-amount-tag--long"
                            : "rental-amount-tag--short")
                    }
                >
                    {durationLabel}
                </span>
                {amountLabel && (
                    <span className="rental-amount-tag rental-amount-tag--amount">
                        {amountLabel}
                    </span>
                )}
                {hasUnpaid && (
                    <span className="rental-amount-tag rental-amount-tag--unpaid">
                        미납
                    </span>
                )}
            </div>
        </div>
    );
});

export default RentalAmountCell;
