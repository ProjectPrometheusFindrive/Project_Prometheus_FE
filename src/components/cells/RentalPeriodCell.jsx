import React from "react";

/**
 * RentalPeriodCell - 대여 기간 표시 셀 컴포넌트
 * 시작일과 종료일을 포맷팅하여 표시합니다.
 */
export default function RentalPeriodCell({ rentalPeriod }) {
    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    };

    return (
        <div style={{ fontSize: "0.9rem", lineHeight: "1.4" }}>
            <div>{formatDateTime(rentalPeriod?.start)} ~</div>
            <div>{formatDateTime(rentalPeriod?.end)}</div>
        </div>
    );
}
