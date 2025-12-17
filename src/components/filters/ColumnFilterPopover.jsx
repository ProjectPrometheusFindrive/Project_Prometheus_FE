import React, { useEffect, useMemo, useRef, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function ColumnFilterPopover({
  column,
  value,
  onChange,
  onClear,
  options = [],
  anchorRef,
  onRequestClose,
  alignRight,
}) {
  const type = column?.filterType;
  const containerRef = useRef(null);
  const isMulti = type === "multi-select";
  const isManagementStageFilter = column?.key === "managementStage";
  const isContractStatusFilter = column?.key === "contractStatus";
  const isCompanyFilter = column?.key === "company";
  const isEngineStatusFilter = column?.key === "engineStatus";
  const isRestartBlockedFilter = column?.key === "restartBlocked";
  const isAccidentFilter = column?.key === "accident";
  const isVehicleHealthFilter = column?.key === "vehicleHealth";
  const isDeviceStatusFilter = column?.key === "deviceStatus";
  const isVehicleTypeFilter = column?.key === "vehicleType";
  const popoverClassNames = ["filter-popover"];
  if (alignRight) popoverClassNames.push("align-right");
  if (isManagementStageFilter) popoverClassNames.push("filter-popover--management-stage");
  if (isContractStatusFilter) popoverClassNames.push("filter-popover--contract-status");
  if (isVehicleHealthFilter) popoverClassNames.push("filter-popover--vehicle-health");
  if (isDeviceStatusFilter) popoverClassNames.push("filter-popover--device-status");
  if (isVehicleTypeFilter) popoverClassNames.push("filter-popover--vehicle-type");
  const popoverClassName = popoverClassNames.join(" ");

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target)) return;
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      onRequestClose && onRequestClose();
    };
    const esc = (e) => {
      if (e.key === "Escape") onRequestClose && onRequestClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [onRequestClose, anchorRef]);

  // Text filter
  const [text, setText] = useState(() => (value?.value ?? ""));
  const debouncedText = useDebouncedValue(text, 250);
  useEffect(() => {
    if (type !== "text") return;
    onChange && onChange({ type: "text", value: debouncedText });
  }, [debouncedText]);

  // Number range
  const [min, setMin] = useState(value?.min ?? "");
  const [max, setMax] = useState(value?.max ?? "");
  useEffect(() => {
    if (type !== "number-range") return;
    onChange && onChange({ type: "number-range", min, max });
  }, [min, max]);

  // Date range
  const [from, setFrom] = useState(value?.from ?? "");
  const [to, setTo] = useState(value?.to ?? "");
  useEffect(() => {
    if (type !== "date-range") return;
    onChange && onChange({ type: "date-range", from, to });
  }, [from, to]);

  // Boolean
  const [boolVal, setBoolVal] = useState(value?.value ?? null);
  useEffect(() => {
    if (type !== "boolean") return;
    // Avoid emitting an 'unknown' value when tri-state is disabled
    if (column?.filterTriState === false && (boolVal === null || typeof boolVal === 'undefined')) return;
    onChange && onChange({ type: "boolean", value: boolVal });
  }, [boolVal, column?.filterTriState]);

  // Multi/select
  const [selected, setSelected] = useState(() => (Array.isArray(value?.values) ? value.values : []));
  const [op, setOp] = useState(() => (column?.filterAllowAnd === false ? "OR" : (value?.op || column?.filterOp || "OR")));

  useEffect(() => {
    // Vehicle type 필터는 custom payload를 사용하므로
    // 공통 select/multi-select 동기화 로직에서 제외한다.
    if (isVehicleTypeFilter) return;
    if (type !== "select" && type !== "multi-select") return;
    onChange && onChange({ type: type, values: selected, op });
  }, [selected, op, isVehicleTypeFilter]);

  useEffect(() => {
    // keep internal state in sync when column or external value changes
    if (type === "text") setText(value?.value ?? "");
    if (type === "number-range") { setMin(value?.min ?? ""); setMax(value?.max ?? ""); }
    if (type === "date-range") { setFrom(value?.from ?? ""); setTo(value?.to ?? ""); }
    if (type === "boolean") setBoolVal(value?.value ?? null);
    if ((type === "select" || type === "multi-select") && !isVehicleTypeFilter) {
      setSelected(Array.isArray(value?.values) ? value.values : []);
      setOp(column?.filterAllowAnd === false ? "OR" : (value?.op || column?.filterOp || "OR"));
    }
  }, [column?.key, isVehicleTypeFilter]);

  const optionStyle = column?.filterOptionStyle || 'default';
  const sortedOptions = useMemo(() => {
    if (isManagementStageFilter || isContractStatusFilter) {
      // 관리상태/계약상태 필터는 정의 순서를 유지
      return Array.isArray(options) ? options : [];
    }
    if (!Array.isArray(options)) return [];
    return [...options].sort((a, b) => String(a?.label ?? a?.value ?? "").localeCompare(String(b?.label ?? b?.value ?? "")));
  }, [options, isManagementStageFilter, isContractStatusFilter]);

  const thStyle = column?.label || "필터";

  // Vehicle health filter uses completely custom rendering without wrapper
  if (isVehicleHealthFilter && typeof column?.renderCustomFilter === 'function') {
    return (
      <div
        ref={containerRef}
        className={popoverClassName}
        style={{
          width: '130px',
          minWidth: '130px',
          padding: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
        role="dialog"
        aria-label={`${thStyle} 필터`}
      >
        {column.renderCustomFilter({ value, onChange, options, close: onRequestClose })}
      </div>
    );
  }

  // Device status filter uses completely custom rendering without wrapper
  if (isDeviceStatusFilter && typeof column?.renderCustomFilter === 'function') {
    return (
      <div
        ref={containerRef}
        className={popoverClassName}
        style={{
          width: '130px',
          minWidth: '130px',
          padding: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
        role="dialog"
        aria-label={`${thStyle} 필터`}
      >
        {column.renderCustomFilter({ value, onChange, options, close: onRequestClose })}
      </div>
    );
  }

  // Vehicle type filter uses standard popover wrapper with custom body (see content section)
  if (false && isVehicleTypeFilter && typeof column?.renderCustomFilter === 'function') {
    return (
      <div
        ref={containerRef}
        className={popoverClassName}
        role="dialog"
        aria-label={`${thStyle} 필터`}
      >
        {column.renderCustomFilter({ value, onChange, options, close: onRequestClose })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={popoverClassName} role="dialog" aria-label={`${thStyle} 필터`}>
      <div className="filter-popover__content">
                {(isManagementStageFilter || isContractStatusFilter || isCompanyFilter) && (type === "select" || type === "multi-select") && (
                  <>
                    <button
                      type="button"
                      className="filter-management-clear"
                      onClick={() => {
                        setSelected([]);
                        onClear && onClear();
                      }}
                      aria-label={
                        isManagementStageFilter ? "관리상태 선택 해제" :
                        isContractStatusFilter ? "계약상태 선택 해제" :
                        isCompanyFilter ? "회사 선택 해제" :
                        "선택 해제"
                      }
                    >
                      <span aria-hidden="true" className="filter-management-clear__checkbox" />
                      <span className="filter-management-clear__label">선택해제</span>
                    </button>
                    <div className="filter-management-divider" />
                  </>
                )}
        
                {type === "text" && (
          <div className="text-filter">
            <input
              type="text"
              className="filter-input"
              placeholder="포함 검색"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="button"
              className="text-filter__reset"
              onClick={() => {
                setText("");
                onClear && onClear();
              }}
              aria-label="텍스트 필터 초기화"
            >
              <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.96452 1.5C11.0257 1.5 13.5 3.96643 13.5 7C13.5 10.0336 11.0257 12.5 7.96452 12.5C6.12055 12.5 4.48831 11.6051 3.48161 10.2273L3.03915 9.6217L1.828 10.5066L2.27046 11.1122C3.54872 12.8617 5.62368 14 7.96452 14C11.8461 14 15 10.87 15 7C15 3.13001 11.8461 0 7.96452 0C5.06835 0 2.57851 1.74164 1.5 4.23347V2.75V2H0V2.75V6.25C0 6.66421 0.335786 7 0.75 7H3.75H4.5V5.5H3.75H2.63724C3.29365 3.19393 5.42843 1.5 7.96452 1.5Z" fill="#006CEC"/>
              </svg>
            </button>
          </div>
        )}

        {(type === "select" || type === "multi-select") && !isVehicleTypeFilter && (
          <>
            {isMulti && column?.filterAllowAnd !== false && (
              <div className="filter-row">
                <label className="filter-label">조건</label>
                <div className="filter-ops">
                  <label><input type="radio" name={`op-${column.key}`} checked={op === "OR"} onChange={() => setOp("OR")} /> OR</label>
                  <label><input type="radio" name={`op-${column.key}`} checked={op === "AND"} onChange={() => setOp("AND")} /> AND</label>
                </div>
              </div>
            )}
            {optionStyle === 'toggle' ? (
              <div className="filter-toggle-group" role="group" aria-label={`${column?.label || ''} 선택`}>
                {sortedOptions.map((opt) => {
                  const v = opt?.value ?? opt;
                  const label = opt?.label ?? String(v ?? "");
                  const active = selected.includes(v);
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      className={`filter-toggle${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => {
                        if (isMulti) {
                          setSelected((prev) => active ? prev.filter((x) => x !== v) : [...prev, v]);
                        } else {
                          setSelected([v]);
                        }
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : isEngineStatusFilter ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="filter-ops">
                  {sortedOptions.map((opt) => {
                    const v = opt?.value ?? opt;
                    const label = opt?.label ?? String(v ?? "");
                    const checked = selected.includes(v);
                    return (
                      <label key={String(v)}>
                        <input
                          type="radio"
                          name={`select-${column.key}`}
                          checked={checked}
                          onChange={() => setSelected([v])}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected([]);
                    onClear && onClear();
                  }}
                  aria-label="엔진상태 필터 초기화"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: "8px"
                  }}
                >
                  <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M7.96452 1.5C11.0257 1.5 13.5 3.96643 13.5 7C13.5 10.0336 11.0257 12.5 7.96452 12.5C6.12055 12.5 4.48831 11.6051 3.48161 10.2273L3.03915 9.6217L1.828 10.5066L2.27046 11.1122C3.54872 12.8617 5.62368 14 7.96452 14C11.8461 14 15 10.87 15 7C15 3.13001 11.8461 0 7.96452 0C5.06835 0 2.57851 1.74164 1.5 4.23347V2.75V2H0V2.75V6.25C0 6.66421 0.335786 7 0.75 7H3.75H4.5V5.5H3.75H2.63724C3.29365 3.19393 5.42843 1.5 7.96452 1.5Z" fill="#006CEC"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="filter-options">
                {sortedOptions.map((opt) => {
                  const v = opt?.value ?? opt;
                  const label = opt?.label ?? String(v ?? "");
                  const checked = selected.includes(v);
                  return (
                    <label key={String(v)} className="filter-option">
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={!isMulti ? `select-${column.key}` : undefined}
                        checked={checked}
                        onChange={(e) => {
                          if (isMulti) {
                            if (e.target.checked) setSelected((prev) => [...prev, v]);
                            else setSelected((prev) => prev.filter((x) => x !== v));
                          } else {
                            setSelected([v]);
                          }
                        }}
                        className="filter-option__control"
                      />
                      <span className="filter-option__label">{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}

        {type === "boolean" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="filter-ops">
              <label><input type="radio" name={`bool-${column.key}`} checked={boolVal === true} onChange={() => setBoolVal(true)} /> 예</label>
              <label><input type="radio" name={`bool-${column.key}`} checked={boolVal === false} onChange={() => setBoolVal(false)} /> 아니오</label>
              {column?.filterTriState !== false && (
                <label><input type="radio" name={`bool-${column.key}`} checked={boolVal === null} onChange={() => setBoolVal(null)} /> 알수없음</label>
              )}
            </div>
            {(isRestartBlockedFilter || isAccidentFilter) && (
              <button
                type="button"
                onClick={() => {
                  setBoolVal(null);
                  onClear && onClear();
                }}
                aria-label={isRestartBlockedFilter ? "재시동금지 필터 초기화" : "사고등록 필터 초기화"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: "8px"
                }}
              >
                <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.96452 1.5C11.0257 1.5 13.5 3.96643 13.5 7C13.5 10.0336 11.0257 12.5 7.96452 12.5C6.12055 12.5 4.48831 11.6051 3.48161 10.2273L3.03915 9.6217L1.828 10.5066L2.27046 11.1122C3.54872 12.8617 5.62368 14 7.96452 14C11.8461 14 15 10.87 15 7C15 3.13001 11.8461 0 7.96452 0C5.06835 0 2.57851 1.74164 1.5 4.23347V2.75V2H0V2.75V6.25C0 6.66421 0.335786 7 0.75 7H3.75H4.5V5.5H3.75H2.63724C3.29365 3.19393 5.42843 1.5 7.96452 1.5Z" fill="#006CEC"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {type === "number-range" && (
          <div className="number-range-filter">
            <div className="number-range-filter__inputs">
              <input
                type="number"
                className="filter-input"
                placeholder="00"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
              <span className="filter-sep">~</span>
              <input
                type="number"
                className="filter-input"
                placeholder="00"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="number-range-filter__reset"
              onClick={() => {
                setMin("");
                setMax("");
                onClear && onClear();
              }}
              aria-label="숫자 범위 초기화"
            >
              <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.96452 1.5C11.0257 1.5 13.5 3.96643 13.5 7C13.5 10.0336 11.0257 12.5 7.96452 12.5C6.12055 12.5 4.48831 11.6051 3.48161 10.2273L3.03915 9.6217L1.828 10.5066L2.27046 11.1122C3.54872 12.8617 5.62368 14 7.96452 14C11.8461 14 15 10.87 15 7C15 3.13001 11.8461 0 7.96452 0C5.06835 0 2.57851 1.74164 1.5 4.23347V2.75V2H0V2.75V6.25C0 6.66421 0.335786 7 0.75 7H3.75H4.5V5.5H3.75H2.63724C3.29365 3.19393 5.42843 1.5 7.96452 1.5Z" fill="#006CEC"/>
              </svg>
            </button>
          </div>
        )}

        {type === "date-range" && (
          <div className="date-range-filter">
            <div className="date-range-filter__inputs">
              <div className="date-input-wrapper">
                <input
                  type="date"
                  className="date-input"
                  value={from || ""}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <svg className="date-input__icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 14.25C9.14834 14.25 9.29334 14.206 9.41668 14.1236C9.54002 14.0412 9.63614 13.9241 9.69291 13.787C9.74968 13.65 9.76453 13.4992 9.73559 13.3537C9.70665 13.2082 9.63522 13.0746 9.53033 12.9697C9.42544 12.8648 9.2918 12.7934 9.14632 12.7644C9.00083 12.7355 8.85003 12.7503 8.71299 12.8071C8.57594 12.8639 8.45881 12.96 8.3764 13.0833C8.29399 13.2067 8.25 13.3517 8.25 13.5C8.25 13.6989 8.32902 13.8897 8.46967 14.0303C8.61032 14.171 8.80109 14.25 9 14.25ZM12.75 14.25C12.8983 14.25 13.0433 14.206 13.1667 14.1236C13.29 14.0412 13.3861 13.9241 13.4429 13.787C13.4997 13.65 13.5145 13.4992 13.4856 13.3537C13.4566 13.2082 13.3852 13.0746 13.2803 12.9697C13.1754 12.8648 13.0418 12.7934 12.8963 12.7644C12.7508 12.7355 12.6 12.7503 12.463 12.8071C12.3259 12.8639 12.2088 12.96 12.1264 13.0833C12.044 13.2067 12 13.3517 12 13.5C12 13.6989 12.079 13.8897 12.2197 14.0303C12.3603 14.171 12.5511 14.25 12.75 14.25ZM12.75 11.25C12.8983 11.25 13.0433 11.206 13.1667 11.1236C13.29 11.0412 13.3861 10.9241 13.4429 10.787C13.4997 10.65 13.5145 10.4992 13.4856 10.3537C13.4566 10.2082 13.3852 10.0746 13.2803 9.96967C13.1754 9.86478 13.0418 9.79335 12.8963 9.76441C12.7508 9.73547 12.6 9.75032 12.463 9.80709C12.3259 9.86386 12.2088 9.95998 12.1264 10.0833C12.044 10.2067 12 10.3517 12 10.5C12 10.6989 12.079 10.8897 12.2197 11.0303C12.3603 11.171 12.5511 11.25 12.75 11.25ZM9 11.25C9.14834 11.25 9.29334 11.206 9.41668 11.1236C9.54002 11.0412 9.63614 10.9241 9.69291 10.787C9.74968 10.65 9.76453 10.4992 9.73559 10.3537C9.70665 10.2082 9.63522 10.0746 9.53033 9.96967C9.42544 9.86478 9.2918 9.79335 9.14632 9.76441C9.00083 9.73547 8.85003 9.75032 8.71299 9.80709C8.57594 9.86386 8.45881 9.95998 8.3764 10.0833C8.29399 10.2067 8.25 10.3517 8.25 10.5C8.25 10.6989 8.32902 10.8897 8.46967 11.0303C8.61032 11.171 8.80109 11.25 9 11.25ZM14.25 2.25H13.5V1.5C13.5 1.30109 13.421 1.11032 13.2803 0.96967C13.1397 0.829018 12.9489 0.75 12.75 0.75C12.5511 0.75 12.3603 0.829018 12.2197 0.96967C12.079 1.11032 12 1.30109 12 1.5V2.25H6V1.5C6 1.30109 5.92098 1.11032 5.78033 0.96967C5.63968 0.829018 5.44891 0.75 5.25 0.75C5.05109 0.75 4.86032 0.829018 4.71967 0.96967C4.57902 1.11032 4.5 1.30109 4.5 1.5V2.25H3.75C3.15326 2.25 2.58097 2.48705 2.15901 2.90901C1.73705 3.33097 1.5 3.90326 1.5 4.5V15C1.5 15.5967 1.73705 16.169 2.15901 16.591C2.58097 17.0129 3.15326 17.25 3.75 17.25H14.25C14.8467 17.25 15.419 17.0129 15.841 16.591C16.2629 16.169 16.5 15.5967 16.5 15V4.5C16.5 3.90326 16.2629 3.33097 15.841 2.90901C15.419 2.48705 14.8467 2.25 14.25 2.25ZM15 15C15 15.1989 14.921 15.3897 14.7803 15.5303C14.6397 15.671 14.4489 15.75 14.25 15.75H3.75C3.55109 15.75 3.36032 15.671 3.21967 15.5303C3.07902 15.3897 3 15.1989 3 15V8.25H15V15ZM15 6.75H3V4.5C3 4.30109 3.07902 4.11032 3.21967 3.96967C3.36032 3.82902 3.55109 3.75 3.75 3.75H4.5V4.5C4.5 4.69891 4.57902 4.88968 4.71967 5.03033C4.86032 5.17098 5.05109 5.25 5.25 5.25C5.44891 5.25 5.63968 5.17098 5.78033 5.03033C5.92098 4.88968 6 4.69891 6 4.5V3.75H12V4.5C12 4.69891 12.079 4.88968 12.2197 5.03033C12.3603 5.17098 12.5511 5.25 12.75 5.25C12.9489 5.25 13.1397 5.17098 13.2803 5.03033C13.421 4.88968 13.5 4.69891 13.5 4.5V3.75H14.25C14.4489 3.75 14.6397 3.82902 14.7803 3.96967C14.921 4.11032 15 4.30109 15 4.5V6.75ZM5.25 11.25C5.39834 11.25 5.54334 11.206 5.66668 11.1236C5.79001 11.0412 5.88614 10.9241 5.94291 10.787C5.99968 10.65 6.01453 10.4992 5.98559 10.3537C5.95665 10.2082 5.88522 10.0746 5.78033 9.96967C5.67544 9.86478 5.5418 9.79335 5.39632 9.76441C5.25083 9.73547 5.10003 9.75032 4.96299 9.80709C4.82594 9.86386 4.70881 9.95998 4.6264 10.0833C4.54399 10.2067 4.5 10.3517 4.5 10.5C4.5 10.6989 4.57902 10.8897 4.71967 11.0303C4.86032 11.171 5.05109 11.25 5.25 11.25ZM5.25 14.25C5.39834 14.25 5.54334 14.206 5.66668 14.1236C5.79001 14.0412 5.88614 13.9241 5.94291 13.787C5.99968 13.65 6.01453 13.4992 5.98559 13.3537C5.95665 13.2082 5.88522 13.0746 5.78033 12.9697C5.67544 12.8648 5.5418 12.7934 5.39632 12.7644C5.25083 12.7355 5.10003 12.7503 4.96299 12.8071C4.82594 12.8639 4.70881 12.96 4.6264 13.0833C4.54399 13.2067 4.5 13.3517 4.5 13.5C4.5 13.6989 4.57902 13.8897 4.71967 14.0303C4.86032 14.171 5.05109 14.25 5.25 14.25Z" fill="#006CEC"/>
                </svg>
              </div>
              <span className="date-range-separator">~</span>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  className="date-input"
                  value={to || ""}
                  onChange={(e) => setTo(e.target.value)}
                />
                <svg className="date-input__icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 14.25C9.14834 14.25 9.29334 14.206 9.41668 14.1236C9.54002 14.0412 9.63614 13.9241 9.69291 13.787C9.74968 13.65 9.76453 13.4992 9.73559 13.3537C9.70665 13.2082 9.63522 13.0746 9.53033 12.9697C9.42544 12.8648 9.2918 12.7934 9.14632 12.7644C9.00083 12.7355 8.85003 12.7503 8.71299 12.8071C8.57594 12.8639 8.45881 12.96 8.3764 13.0833C8.29399 13.2067 8.25 13.3517 8.25 13.5C8.25 13.6989 8.32902 13.8897 8.46967 14.0303C8.61032 14.171 8.80109 14.25 9 14.25ZM12.75 14.25C12.8983 14.25 13.0433 14.206 13.1667 14.1236C13.29 14.0412 13.3861 13.9241 13.4429 13.787C13.4997 13.65 13.5145 13.4992 13.4856 13.3537C13.4566 13.2082 13.3852 13.0746 13.2803 12.9697C13.1754 12.8648 13.0418 12.7934 12.8963 12.7644C12.7508 12.7355 12.6 12.7503 12.463 12.8071C12.3259 12.8639 12.2088 12.96 12.1264 13.0833C12.044 13.2067 12 13.3517 12 13.5C12 13.6989 12.079 13.8897 12.2197 14.0303C12.3603 14.171 12.5511 14.25 12.75 14.25ZM12.75 11.25C12.8983 11.25 13.0433 11.206 13.1667 11.1236C13.29 11.0412 13.3861 10.9241 13.4429 10.787C13.4997 10.65 13.5145 10.4992 13.4856 10.3537C13.4566 10.2082 13.3852 10.0746 13.2803 9.96967C13.1754 9.86478 13.0418 9.79335 12.8963 9.76441C12.7508 9.73547 12.6 9.75032 12.463 9.80709C12.3259 9.86386 12.2088 9.95998 12.1264 10.0833C12.044 10.2067 12 10.3517 12 10.5C12 10.6989 12.079 10.8897 12.2197 11.0303C12.3603 11.171 12.5511 11.25 12.75 11.25ZM9 11.25C9.14834 11.25 9.29334 11.206 9.41668 11.1236C9.54002 11.0412 9.63614 10.9241 9.69291 10.787C9.74968 10.65 9.76453 10.4992 9.73559 10.3537C9.70665 10.2082 9.63522 10.0746 9.53033 9.96967C9.42544 9.86478 9.2918 9.79335 9.14632 9.76441C9.00083 9.73547 8.85003 9.75032 8.71299 9.80709C8.57594 9.86386 8.45881 9.95998 8.3764 10.0833C8.29399 10.2067 8.25 10.3517 8.25 10.5C8.25 10.6989 8.32902 10.8897 8.46967 11.0303C8.61032 11.171 8.80109 11.25 9 11.25ZM14.25 2.25H13.5V1.5C13.5 1.30109 13.421 1.11032 13.2803 0.96967C13.1397 0.829018 12.9489 0.75 12.75 0.75C12.5511 0.75 12.3603 0.829018 12.2197 0.96967C12.079 1.11032 12 1.30109 12 1.5V2.25H6V1.5C6 1.30109 5.92098 1.11032 5.78033 0.96967C5.63968 0.829018 5.44891 0.75 5.25 0.75C5.05109 0.75 4.86032 0.829018 4.71967 0.96967C4.57902 1.11032 4.5 1.30109 4.5 1.5V2.25H3.75C3.15326 2.25 2.58097 2.48705 2.15901 2.90901C1.73705 3.33097 1.5 3.90326 1.5 4.5V15C1.5 15.5967 1.73705 16.169 2.15901 16.591C2.58097 17.0129 3.15326 17.25 3.75 17.25H14.25C14.8467 17.25 15.419 17.0129 15.841 16.591C16.2629 16.169 16.5 15.5967 16.5 15V4.5C16.5 3.90326 16.2629 3.33097 15.841 2.90901C15.419 2.48705 14.8467 2.25 14.25 2.25ZM15 15C15 15.1989 14.921 15.3897 14.7803 15.5303C14.6397 15.671 14.4489 15.75 14.25 15.75H3.75C3.55109 15.75 3.36032 15.671 3.21967 15.5303C3.07902 15.3897 3 15.1989 3 15V8.25H15V15ZM15 6.75H3V4.5C3 4.30109 3.07902 4.11032 3.21967 3.96967C3.36032 3.82902 3.55109 3.75 3.75 3.75H4.5V4.5C4.5 4.69891 4.57902 4.88968 4.71967 5.03033C4.86032 5.17098 5.05109 5.25 5.25 5.25C5.44891 5.25 5.63968 5.17098 5.78033 5.03033C5.92098 4.88968 6 4.69891 6 4.5V3.75H12V4.5C12 4.69891 12.079 4.88968 12.2197 5.03033C12.3603 5.17098 12.5511 5.25 12.75 5.25C12.9489 5.25 13.1397 5.17098 13.2803 5.03033C13.421 4.88968 13.5 4.69891 13.5 4.5V3.75H14.25C14.4489 3.75 14.6397 3.82902 14.7803 3.96967C14.921 4.11032 15 4.30109 15 4.5V6.75ZM5.25 11.25C5.39834 11.25 5.54334 11.206 5.66668 11.1236C5.79001 11.0412 5.88614 10.9241 5.94291 10.787C5.99968 10.65 6.01453 10.4992 5.98559 10.3537C5.95665 10.2082 5.88522 10.0746 5.78033 9.96967C5.67544 9.86478 5.5418 9.79335 5.39632 9.76441C5.25083 9.73547 5.10003 9.75032 4.96299 9.80709C4.82594 9.86386 4.70881 9.95998 4.6264 10.0833C4.54399 10.2067 4.5 10.3517 4.5 10.5C4.5 10.6989 4.57902 10.8897 4.71967 11.0303C4.86032 11.171 5.05109 11.25 5.25 11.25ZM5.25 14.25C5.39834 14.25 5.54334 14.206 5.66668 14.1236C5.79001 14.0412 5.88614 13.9241 5.94291 13.787C5.99968 13.65 6.01453 13.4992 5.98559 13.3537C5.95665 13.2082 5.88522 13.0746 5.78033 12.9697C5.67544 12.8648 5.5418 12.7934 5.39632 12.7644C5.25083 12.7355 5.10003 12.7503 4.96299 12.8071C4.82594 12.8639 4.70881 12.96 4.6264 13.0833C4.54399 13.2067 4.5 13.3517 4.5 13.5C4.5 13.6989 4.57902 13.8897 4.71967 14.0303C4.86032 14.171 5.05109 14.25 5.25 14.25Z" fill="#006CEC"/>
                </svg>
              </div>
            </div>
            <button
              type="button"
              className="date-range-filter__reset"
              onClick={() => {
                setFrom("");
                setTo("");
                onClear && onClear();
              }}
              aria-label="날짜 범위 초기화"
            >
              <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.96452 1.5C11.0257 1.5 13.5 3.96643 13.5 7C13.5 10.0336 11.0257 12.5 7.96452 12.5C6.12055 12.5 4.48831 11.6051 3.48161 10.2273L3.03915 9.6217L1.828 10.5066L2.27046 11.1122C3.54872 12.8617 5.62368 14 7.96452 14C11.8461 14 15 10.87 15 7C15 3.13001 11.8461 0 7.96452 0C5.06835 0 2.57851 1.74164 1.5 4.23347V2.75V2H0V2.75V6.25C0 6.66421 0.335786 7 0.75 7H3.75H4.5V5.5H3.75H2.63724C3.29365 3.19393 5.42843 1.5 7.96452 1.5Z" fill="#006CEC"/>
              </svg>
            </button>
          </div>
        )}

        {isVehicleTypeFilter && typeof column?.renderCustomFilter === 'function' && (
          <div className="filter-custom">
            {column.renderCustomFilter({ value, onChange, options, close: onRequestClose })}
          </div>
        )}

        {type === "custom" && typeof column?.renderCustomFilter === 'function' && (
          <div className="filter-custom">
            {column.renderCustomFilter({ value, onChange, options, close: onRequestClose })}
          </div>
        )}
      </div>
    </div>
  );
}
