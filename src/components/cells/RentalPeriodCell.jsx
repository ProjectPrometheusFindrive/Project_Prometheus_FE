import React from "react";

/**
 * RentalPeriodCell - 대여 기간 표시 셀 컴포넌트
 * 디자인: 인수/반납 레이블과 날짜를 2줄로 표시
 * - 인수: 빨강(#E50E08) + 날짜
 * - 반납: 파랑(#006CEC) + 날짜
 * - 날짜 형식: 2024.02.16(목) / 09:30
 */
const RentalPeriodCell = React.memo(function RentalPeriodCell({ rentalPeriod }) {
    const getDayOfWeek = (date) => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return days[date.getDay()];
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dayOfWeek = getDayOfWeek(date);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}.${month}.${day}(${dayOfWeek}) / ${hours}:${minutes}`;
    };

    const baseTextStyle = {
        fontSize: 14,
        fontFamily: 'Pretendard',
        fontWeight: 500,
        lineHeight: '24px',
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
        }}>
            {/* 인수 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ ...baseTextStyle, color: '#E50E08' }}>인수</span>
                <span style={{ ...baseTextStyle, color: '#1C1C1C', marginLeft: 4 }}>
                    {formatDateTime(rentalPeriod?.start)}
                </span>
            </div>
            {/* 반납 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ ...baseTextStyle, color: '#006CEC' }}>반납</span>
                <span style={{ ...baseTextStyle, color: '#1C1C1C', marginLeft: 4 }}>
                    {formatDateTime(rentalPeriod?.end)}
                </span>
            </div>
        </div>
    );
});

export default RentalPeriodCell;
