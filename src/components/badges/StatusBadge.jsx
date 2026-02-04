import React from "react";

// Base layout styles only - colors are handled by CSS for dark mode support
const BADGE_BASE_STYLE = {
  paddingLeft: '14px',
  paddingRight: '14px',
  paddingTop: '2px',
  paddingBottom: '2px',
  borderRadius: '100px',
  outline: '1px rgba(0, 0, 0, 0.05) solid',
  outlineOffset: '-1px',
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '5px',
  textAlign: 'center',
  fontSize: '14px',
  fontFamily: 'Pretendard',
  fontWeight: 500,
  lineHeight: '24px',
  wordWrap: 'break-word',
};

const StatusBadge = ({ type, variant, children, className = "", style = {} }) => {
  const getClassNames = () => {
    const baseClass = "badge";

    if (type) {
      return `${baseClass} badge--${type}`;
    }

    if (variant) {
      return `${baseClass} ${variant}`;
    }

    return baseClass;
  };

  return (
    <span
      className={`${getClassNames()} ${className}`.trim()}
      style={{ ...BADGE_BASE_STYLE, ...style }}
    >
      {children}
    </span>
  );
};

const RentalStatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    const map = {
      문의: { type: "contract-inquiry", text: "문의" },
      예약확정: { type: "contract-reserved", text: "예약확정" },
      체크아웃대기: { type: "contract-checkout-pending", text: "체크아웃대기" },
      대여중: { type: "contract-active", text: "대여중" },
      연장요청: { type: "contract-extension", text: "연장요청" },
      반납대기: { type: "contract-return-pending", text: "반납대기" },
      종결: { type: "contract-closed", text: "종결" },
      취소: { type: "contract-canceled", text: "취소" },
      노쇼: { type: "contract-no-show", text: "노쇼" },
    };
    return map[status] || { type: "default", text: status || "-" };
  };

  const config = getStatusConfig();
  return config.text !== "-" ? (
    <StatusBadge type={config.type}>{config.text}</StatusBadge>
  ) : (
    "-"
  );
};

const DeviceStatusBadge = ({ installed }) => (
  <StatusBadge type={installed ? "on" : "off"}>
    {installed ? "설치됨" : "없음"}
  </StatusBadge>
);

const EngineStatusBadge = ({ engineOn }) => (
  <StatusBadge type={engineOn ? "on" : "off"}>
    {engineOn ? "ON" : "OFF"}
  </StatusBadge>
);

const GeofenceBadge = ({ index }) => (
  <StatusBadge type="available">#{index + 1}</StatusBadge>
);

const CountBadge = ({ count, label = "" }) => (
  <StatusBadge>
    {count}{label && `${label}`}
  </StatusBadge>
);

const FileBadge = ({ children, color = "#1e40af", backgroundColor = "#eef2ff" }) => (
  <StatusBadge style={{ background: backgroundColor, color }}>
    {children}
  </StatusBadge>
);

export default StatusBadge;
export {
  RentalStatusBadge,
  DeviceStatusBadge, 
  EngineStatusBadge,
  GeofenceBadge,
  CountBadge,
  FileBadge
};
