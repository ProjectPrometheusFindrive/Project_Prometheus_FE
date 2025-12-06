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
  const isVehicleHealthFilter = column?.key === "vehicleHealth";
  const isDeviceStatusFilter = column?.key === "deviceStatus";
  const isVehicleTypeFilter = column?.key === "vehicleType";
  const popoverClassNames = ["filter-popover"];
  if (alignRight) popoverClassNames.push("align-right");
  if (isManagementStageFilter) popoverClassNames.push("filter-popover--management-stage");
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
    if (isManagementStageFilter) {
      // 관리상태 필터는 Figma 정의 순서를 유지
      return Array.isArray(options) ? options : [];
    }
    if (!Array.isArray(options)) return [];
    return [...options].sort((a, b) => String(a?.label ?? a?.value ?? "").localeCompare(String(b?.label ?? b?.value ?? "")));
  }, [options, isManagementStageFilter]);

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
      {!column?.filterHideHeader && (
        <div className="filter-popover__header">
          <div className="filter-popover__title">{thStyle}</div>
          <button
            type="button"
            className="filter-popover__clear"
            onClick={() => {
              // Clear external filter state and reset local state
              if (type === "text") setText("");
              if (type === "number-range") { setMin(""); setMax(""); }
              if (type === "date-range") { setFrom(""); setTo(""); }
              if (type === "boolean") setBoolVal(null);
              if (type === "select" || type === "multi-select") setSelected([]);
              onClear && onClear();
            }}
            aria-label="필터 초기화"
          >
            초기화
          </button>
        </div>
      )}
      <div className="filter-popover__content">
        {isManagementStageFilter && (type === "select" || type === "multi-select") && (
          <>
            <button
              type="button"
              className="filter-management-clear"
              onClick={() => {
                setSelected([]);
                onClear && onClear();
              }}
              aria-label="관리상태 선택 해제"
            >
              <span aria-hidden="true" className="filter-management-clear__checkbox" />
              <span className="filter-management-clear__label">선택해제</span>
            </button>
            <div className="filter-management-divider" />
          </>
        )}
        {type === "text" && (
          <input
            type="text"
            className="filter-input"
            placeholder="포함 검색"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
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
          <div className="filter-ops">
            <label><input type="radio" name={`bool-${column.key}`} checked={boolVal === true} onChange={() => setBoolVal(true)} /> 예</label>
            <label><input type="radio" name={`bool-${column.key}`} checked={boolVal === false} onChange={() => setBoolVal(false)} /> 아니오</label>
            {column?.filterTriState !== false && (
              <label><input type="radio" name={`bool-${column.key}`} checked={boolVal === null} onChange={() => setBoolVal(null)} /> 알수없음</label>
            )}
          </div>
        )}

        {type === "number-range" && (
          <div className="filter-row">
            <input
              type="number"
              className="filter-input"
              placeholder="최소"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
            <span className="filter-sep">~</span>
            <input
              type="number"
              className="filter-input"
              placeholder="최대"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </div>
        )}

        {type === "date-range" && (
          <div className="filter-row">
            <input type="date" className="filter-input" value={from || ""} onChange={(e) => setFrom(e.target.value)} />
            <span className="filter-sep">~</span>
            <input type="date" className="filter-input" value={to || ""} onChange={(e) => setTo(e.target.value)} />
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
