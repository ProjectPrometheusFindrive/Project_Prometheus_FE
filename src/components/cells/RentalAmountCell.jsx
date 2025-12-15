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

    const tagStyle = {
        paddingLeft: 6,
        paddingRight: 6,
        borderRadius: 3,
        fontSize: 12,
        fontFamily: 'Pretendard',
        fontWeight: 500,
        lineHeight: '16px',
    };

    const shortTagStyle = {
        ...tagStyle,
        background: '#E2F1FE',
        color: '#006CEC',
    };

    const longTagStyle = {
        ...tagStyle,
        background: '#FFDDDD',
        color: '#E50E08',
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 4,
        }}>
            {/* 첫 줄: 총 대여금액 */}
            <div style={{
                color: '#1C1C1C',
                fontSize: 14,
                fontFamily: 'Pretendard',
                fontWeight: 500,
                lineHeight: '24px',
            }}>
                {formattedAmount}
            </div>
            {/* 둘째 줄: 단기/장기 배지 + 금액 */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 6,
            }}>
                <span style={isLongTerm ? longTagStyle : shortTagStyle}>
                    {durationLabel}
                </span>
                <span style={{
                    color: '#1C1C1C',
                    fontSize: 14,
                    fontFamily: 'Pretendard',
                    fontWeight: 700,
                    lineHeight: '24px',
                }}>
                    {secondLineAmount}
                </span>
            </div>
        </div>
    );
});

export default RentalAmountCell;
