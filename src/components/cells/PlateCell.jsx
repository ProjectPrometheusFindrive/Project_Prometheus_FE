import React from "react";

/**
 * PlateCell - 차량번호 클릭 버튼 셀 컴포넌트
 * 차량번호를 클릭 가능한 버튼으로 표시합니다.
 */
const PlateCell = React.memo(function PlateCell({ plate, onClick, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title || `차량번호 ${plate || '미등록'} 상세보기`}
            className="plate-cell-button"
            style={{
                width: '100%',
                height: '24px',
                textAlign: 'center',
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#1C1C1C',
                fontSize: '14px',
                fontFamily: 'Pretendard',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '-0.2px',
                wordWrap: 'break-word',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0
            }}
        >
            {plate || "-"}
        </button>
    );
});

export default PlateCell;
