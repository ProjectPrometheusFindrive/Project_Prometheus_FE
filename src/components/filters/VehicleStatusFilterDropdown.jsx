import React from "react";

/**
 * 차량상태 필터 드롭다운
 * 라디오 버튼 스타일의 단일 선택 필터
 */
export default function VehicleStatusFilterDropdown({ value, onChange, onClear, onRequestClose }) {
  const statusOptions = [
    { value: "관심필요", label: "관심필요" },
    { value: "단말필요", label: "단말필요" },
    { value: "심각", label: "심각" },
    { value: "정상", label: "정상" },
  ];

  const currentValue = value?.values?.[0] || null;

  const handleSelect = (selectedValue) => {
    if (onChange) {
      onChange({ type: "select", values: [selectedValue], op: "OR" });
    }
  };

  const handleRefresh = () => {
    if (onClear) {
      onClear();
    }
    if (onRequestClose) {
      onRequestClose();
    }
  };

  return (
    <div
      data-layer="Dropdown_차량상태"
      className="Dropdown"
      style={{
        width: 130,
        height: 190,
        position: "relative",
      }}
    >
      {/* Background container */}
      <div
        data-layer="Rectangle 12"
        className="Rectangle12"
        style={{
          width: 130,
          height: 190,
          left: 0,
          top: 0,
          position: "absolute",
          background: "white",
          boxShadow: "0px 8px 12px 3px rgba(0, 0, 0, 0.10)",
          borderRadius: 8,
          border: "1px rgba(0, 0, 0, 0.08) solid",
        }}
      />

      {/* Divider line */}
      <div
        data-layer="Line 3"
        className="Line3"
        style={{
          width: 90,
          height: 0,
          left: 20,
          top: 50,
          position: "absolute",
          outline: "1px rgba(0, 0, 0, 0.08) solid",
          outlineOffset: "-0.50px",
        }}
      />

      {/* Status options list */}
      <div
        data-layer="Frame 427319158"
        className="Frame427319158"
        style={{
          width: 90,
          left: 20,
          top: 60,
          position: "absolute",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-end",
          gap: 10,
          display: "inline-flex",
        }}
      >
        {statusOptions.map((option) => {
          const isSelected = currentValue === option.value;

          return (
            <div
              key={option.value}
              data-layer={`Frame_${option.value}`}
              className={`Frame${option.value}`}
              style={{
                alignSelf: "stretch",
                justifyContent: "space-between",
                alignItems: "center",
                display: "inline-flex",
                cursor: "pointer",
              }}
              onClick={() => handleSelect(option.value)}
            >
              <div
                data-layer={option.label}
                style={{
                  justifyContent: "center",
                  display: "flex",
                  flexDirection: "column",
                  color: "#1C1C1C",
                  fontSize: 14,
                  fontFamily: "Pretendard",
                  fontWeight: "500",
                  lineHeight: "20px",
                  wordWrap: "break-word",
                }}
              >
                {option.label}
              </div>

              {/* Radio button */}
              {isSelected ? (
                <div
                  data-layer="Radiobtn_selected"
                  className="RadiobtnSelected"
                  style={{
                    width: 18,
                    height: 18,
                    position: "relative",
                    background: "white",
                    overflow: "hidden",
                    borderRadius: 50,
                    outline: "1px #006CEC solid",
                    outlineOffset: "-1px",
                  }}
                >
                  <div
                    data-layer="Ellipse 9"
                    className="Ellipse9"
                    style={{
                      width: 8,
                      height: 8,
                      left: 5,
                      top: 5,
                      position: "absolute",
                      background: "#006CEC",
                      borderRadius: 9999,
                    }}
                  />
                </div>
              ) : (
                <div
                  data-layer="Radiobtn_unselected"
                  className="RadiobtnUnselected"
                  style={{
                    width: 18,
                    height: 18,
                    position: "relative",
                  }}
                >
                  <div
                    data-layer="Ellipse 14"
                    className="Ellipse14"
                    style={{
                      width: 18,
                      height: 18,
                      left: 0,
                      top: 0,
                      position: "absolute",
                      background: "white",
                      borderRadius: 9999,
                      border: "1px #006CEC solid",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresh button */}
      <div
        data-layer="Frame 427319149"
        className="Frame427319149"
        style={{
          width: 90,
          left: 20,
          top: 20,
          position: "absolute",
          justifyContent: "space-between",
          alignItems: "center",
          display: "inline-flex",
          cursor: "pointer",
        }}
        onClick={handleRefresh}
      >
        <div
          data-layer="새로고침"
          style={{
            justifyContent: "center",
            display: "flex",
            flexDirection: "column",
            color: "#006CEC",
            fontSize: 14,
            fontFamily: "Pretendard",
            fontWeight: "500",
            lineHeight: "20px",
            wordWrap: "break-word",
          }}
        >
          새로고침
        </div>
        <div
          data-layer="Frame 427319172"
          className="Frame427319172"
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            paddingTop: 2,
            paddingBottom: 2,
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            gap: 10,
            display: "inline-flex",
          }}
        >
          <svg
            width="15"
            height="14"
            viewBox="0 0 15 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.96452 1.5C11.0257 1.5 13.5 3.96643 13.5 7C13.5 10.0336 11.0257 12.5 7.96452 12.5C6.12055 12.5 4.48831 11.6051 3.48161 10.2273L3.03915 9.6217L1.828 10.5066L2.27046 11.1122C3.54872 12.8617 5.62368 14 7.96452 14C11.8461 14 15 10.87 15 7C15 3.13001 11.8461 0 7.96452 0C5.06835 0 2.57851 1.74164 1.5 4.23347V2.75V2H0V2.75V6.25C0 6.66421 0.335786 7 0.75 7H3.75H4.5V5.5H3.75H2.63724C3.29365 3.19393 5.42843 1.5 7.96452 1.5Z"
              fill="#006CEC"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
