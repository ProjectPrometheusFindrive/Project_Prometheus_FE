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

    const parts = [];
    parts.push(isLongTerm ? "장기" : "단기");
    if (amount) {
        if (isLongTerm) {
            const days = row.rentalDurationDays || 0;
            const months = Math.max(1, Math.floor(days / 30) || 1);
            const monthly = Math.floor((typeof amount === "number" ? amount : Number(String(amount).replace(/[^0-9.-]/g, "")) || 0) / months);
            parts.push(`월 ${formatCurrencyDisplay(monthly)}`);
        } else {
            parts.push(`총 ${formattedAmount}`);
        }
    }
    if (hasUnpaid) {
        parts.push("미납");
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{formattedAmount}</div>
            <div style={{ fontSize: "0.8rem" }}>
                {parts.join(" · ")}
            </div>
        </div>
    );
});

export default RentalAmountCell;
