import React from "react";
import StatusBadge from "../badges/StatusBadge";
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontWeight: "500", fontSize: "0.9rem" }}>{formattedAmount}</div>
            <div className="flex gap-4 flex-wrap">
                <StatusBadge variant={isLongTerm ? "badge--contract-term" : "badge--contract-term-short"}>
                    {isLongTerm ? "장기" : "단기"}
                </StatusBadge>
                <StatusBadge variant="badge--contract-amount">
                    {(() => {
                        if (isLongTerm) {
                            const months = Math.max(1, Math.floor((row.rentalDurationDays || 1) / 30));
                            const monthly = Math.floor(amount / months);
                            return `월 ${formatCurrencyDisplay(monthly)}`;
                        }
                        return `총 ${formattedAmount}`;
                    })()}
                </StatusBadge>
                {hasUnpaid && <StatusBadge variant="badge--contract-unpaid">미납</StatusBadge>}
            </div>
        </div>
    );
});

export default RentalAmountCell;
