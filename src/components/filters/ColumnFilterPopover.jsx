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
    if (type !== "select" && type !== "multi-select") return;
    onChange && onChange({ type: type, values: selected, op });
  }, [selected, op]);

  useEffect(() => {
    // keep internal state in sync when column or external value changes
    if (type === "text") setText(value?.value ?? "");
    if (type === "number-range") { setMin(value?.min ?? ""); setMax(value?.max ?? ""); }
    if (type === "date-range") { setFrom(value?.from ?? ""); setTo(value?.to ?? ""); }
    if (type === "boolean") setBoolVal(value?.value ?? null);
    if (type === "select" || type === "multi-select") {
      setSelected(Array.isArray(value?.values) ? value.values : []);
      setOp(column?.filterAllowAnd === false ? "OR" : (value?.op || column?.filterOp || "OR"));
    }
  }, [column?.key]);

  const isMulti = type === "multi-select";
  const optionStyle = column?.filterOptionStyle || 'default';
  const sortedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return [...options].sort((a, b) => String(a?.label ?? a?.value ?? "").localeCompare(String(b?.label ?? b?.value ?? "")));
  }, [options]);

  const thStyle = column?.label || "필터";

  return (
    <div ref={containerRef} className={`filter-popover${alignRight ? ' align-right' : ''}`} role="dialog" aria-label={`${thStyle} 필터`}>
      <div className="filter-popover__header">
        <div className="filter-popover__title">{thStyle}</div>
        <button type="button" className="filter-popover__clear" onClick={onClear} aria-label="필터 초기화">초기화</button>
      </div>
      <div className="filter-popover__content">
        {type === "text" && (
          <input
            type="text"
            className="filter-input"
            placeholder="포함 검색"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        {(type === "select" || type === "multi-select") && (
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
                      />
                      <span>{label}</span>
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

        {type === "custom" && typeof column?.renderCustomFilter === 'function' && (
          <div className="filter-custom">
            {column.renderCustomFilter({ value, onChange, options, close: onRequestClose })}
          </div>
        )}
      </div>
    </div>
  );
}
