import React from "react";

/**
 * PlateCell - 차량번호 클릭 버튼 셀 컴포넌트
 * 차량번호를 클릭 가능한 버튼으로 표시합니다.
 */
export default function PlateCell({ plate, onClick, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="simple-button"
            title={title}
            aria-label={title || `차량번호 ${plate || '미등록'} 상세보기`}
        >
            {plate || "-"}
        </button>
    );
}
