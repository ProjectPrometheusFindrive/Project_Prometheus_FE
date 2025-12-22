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

    return (
        <div className="rental-period">
            <div className="rental-period__row">
                <span className="rental-period__label rental-period__label--start">인수</span>
                <span className="rental-period__value">{formatDateTime(rentalPeriod?.start)}</span>
            </div>
            <div className="rental-period__row">
                <span className="rental-period__label rental-period__label--end">반납</span>
                <span className="rental-period__value">{formatDateTime(rentalPeriod?.end)}</span>
            </div>
        </div>
    );
});

export default RentalPeriodCell;
