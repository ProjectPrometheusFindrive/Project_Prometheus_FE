import React from "react";

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
      style={style}
    >
      {children}
    </span>
  );
};

const RentalStatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    if (status === "도난 의심") {
      return { type: "suspicious", text: "도난 의심" };
    } else if (status?.startsWith("연체")) {
      return { type: "overdue", text: status };
    } else if (status === "대여 중") {
      return { type: "rented", text: "대여 중" };
    } else {
      return { type: "available", text: status || "-" };
    }
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
