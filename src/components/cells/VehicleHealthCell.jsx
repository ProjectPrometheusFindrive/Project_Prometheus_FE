import React from "react";

const STYLE_BY_LABEL = {
  "정상": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: 'rgba(26.22, 129.17, 255, 0.05)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.02) solid',
    outlineOffset: '-1px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#006CEC',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "단말필요": {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '11px',
    paddingRight: '12px',
    background: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.02) solid',
    outlineOffset: '-1px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#1C1C1C',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "조치필요": {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '11px',
    paddingRight: '12px',
    background: 'rgba(0, 163.81, 26.33, 0.15)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.02) solid',
    outlineOffset: '-1px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#2D6536',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "관심필요": {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '11px',
    paddingRight: '12px',
    background: 'rgba(232, 136, 0, 0.15)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.02) solid',
    outlineOffset: '-1px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#E88800',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "심각": {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '11px',
    paddingRight: '12px',
    background: 'rgba(235, 74, 69, 0.15)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.02) solid',
    outlineOffset: '-1px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#EB4A45',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  }
};

const VehicleHealthCell = React.memo(function VehicleHealthCell({ label, onClick }) {
  if (!label || label === "-") return <>-</>;

  const style = STYLE_BY_LABEL[label] || STYLE_BY_LABEL["단말필요"];

  return (
    <button
      type="button"
      className="asset-pill asset-pill--vehicle-health"
      onClick={onClick}
      title="진단 코드 상세 보기"
      aria-label={`차량 상태 ${label} 진단 코드 상세 보기`}
      style={style}
    >
      {label}
    </button>
  );
});

export default VehicleHealthCell;
