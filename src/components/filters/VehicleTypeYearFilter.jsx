import React, { useEffect, useMemo, useState } from "react";

/**
 * 차종+연식 계층 필터
 *
 * value 형식:
 *   { type: "vehicle-type-year", vehicleTypes: { "소나타": ["22", "21"], ... }, values: [...] }
 *
 * rows 형식:
 *   { vehicleType: "소나타 22년형" | "소나타", year: "2022" | "22" | 2022 | undefined, ... }
 */
export default function VehicleTypeYearFilter({ value, onChange, onClear, rows = [] }) {
  const [selections, setSelections] = useState(() => value?.vehicleTypes || {});
  const [expandedTypes, setExpandedTypes] = useState(() => new Set());

  // 차종/연식 추출 유틸 (vehicleType 문자열과 year 필드를 모두 고려)
  const parseTypeAndYear = (row) => {
    const rawType = row?.vehicleType;
    if (!rawType) return null;

    const fullLabel = String(rawType);
    // 끝부분의 숫자(연식) 추출: "그랜저 22년형", "그랜저 2022", "그랜저 22" 등 대응
    const match = fullLabel.match(/(\d{2,4})\D*$/);

    let baseType = fullLabel;
    let yearFromLabel = null;
    if (match) {
      const digits = match[1]; // "22" 또는 "2022"
      baseType = fullLabel.slice(0, match.index).trim();
      yearFromLabel = digits.length === 4 ? digits.slice(2) : digits;
    }

    const yearValue = row?.year;
    let yearKey = null;
    if (yearValue != null && yearValue !== "") {
      const s = String(yearValue);
      yearKey = s.length === 4 ? s.slice(2) : s;
    } else if (yearFromLabel) {
      yearKey = yearFromLabel;
    }

    return { baseType, yearKey };
  };

  // 차종별 연식 목록 생성 (중복 제거 후 최신 연식 우선 정렬)
  const vehicleTypeYearMap = useMemo(() => {
    const map = {};

    for (const row of rows) {
      const parsed = parseTypeAndYear(row);
      if (!parsed) continue;
      const { baseType, yearKey } = parsed;
      if (!baseType) continue;

      if (!map[baseType]) {
        map[baseType] = new Set();
      }
      if (yearKey) {
        map[baseType].add(yearKey);
      }
    }

    const result = {};
    for (const [type, yearSet] of Object.entries(map)) {
      result[type] = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
    }
    return result;
  }, [rows]);

  // 차종 이름 가나다/알파벳 순 정렬
  const sortedVehicleTypes = useMemo(() => {
    return Object.keys(vehicleTypeYearMap).sort((a, b) => a.localeCompare(b));
  }, [vehicleTypeYearMap]);

  // selections 객체를 { type, vehicleTypes, values } 형태의 필터 값으로 변환
  const buildFilterPayload = (nextSelections) => {
    const flatValues = [];
    for (const [type, years] of Object.entries(nextSelections)) {
      if (!Array.isArray(years)) continue;
      for (const year of years) {
        flatValues.push(`${type}::${year}`);
      }
    }

    if (flatValues.length === 0) {
      return null;
    }

    return {
      type: "vehicle-type-year",
      vehicleTypes: nextSelections,
      values: flatValues,
    };
  };

  // 차종 토글: 전체 연식 선택/해제
  const toggleVehicleType = (type) => {
    const years = vehicleTypeYearMap[type] || [];
    const nextSelections = { ...selections };

    if (nextSelections[type]) {
      delete nextSelections[type];
      setExpandedTypes((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    } else {
      nextSelections[type] = [...years];
      setExpandedTypes((prev) => {
        const next = new Set(prev);
        next.add(type);
        return next;
      });
    }

    setSelections(nextSelections);
    const payload = buildFilterPayload(nextSelections);
    if (import.meta.env.DEV) {
      console.log("[VehicleTypeYearFilter] toggleVehicleType", {
        type,
        nextSelections,
        payload,
      });
    }
    if (!payload) {
      onChange && onChange(null);
    } else {
      onChange && onChange(payload);
    }
  };

  // 연식 토글: 개별 연식 선택/해제
  const toggleYear = (type, year) => {
    const nextSelections = { ...selections };
    const currentYears = nextSelections[type] || [];

    if (currentYears.includes(year)) {
      const filtered = currentYears.filter((y) => y !== year);
      if (filtered.length === 0) {
        delete nextSelections[type];
      } else {
        nextSelections[type] = filtered;
      }
    } else {
      nextSelections[type] = [...currentYears, year];
    }

    setSelections(nextSelections);
    const payload = buildFilterPayload(nextSelections);
    if (import.meta.env.DEV) {
      console.log("[VehicleTypeYearFilter] toggleYear", {
        type,
        year,
        nextSelections,
        payload,
      });
    }
    if (!payload) {
      onChange && onChange(null);
    } else {
      onChange && onChange(payload);
    }
  };

  // 차종 연식 목록 확장/축소
  const toggleExpand = (type) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // 전체 선택 해제
  const handleClear = () => {
    setSelections({});
    setExpandedTypes(new Set());
    onClear && onClear();
  };

  // 외부 value가 변경되면 내부 selections/expandedTypes 동기화
  useEffect(() => {
    if (value && value.vehicleTypes && typeof value.vehicleTypes === "object") {
      setSelections(value.vehicleTypes);
      setExpandedTypes(new Set(Object.keys(value.vehicleTypes)));
    } else {
      setSelections({});
      setExpandedTypes(new Set());
    }
  }, [value]);

  return (
    <div className="vehicle-type-year-filter">
      {/* 상단 선택해제 버튼 + 구분선 */}
      <button
        type="button"
        className="filter-management-clear"
        onClick={handleClear}
        aria-label="차종 선택해제"
      >
        <span aria-hidden="true" className="filter-management-clear__checkbox" />
        <span className="filter-management-clear__label">선택해제</span>
      </button>
      <div className="filter-management-divider" />

      {/* 차종 + 연식 목록 */}
      <div className="vehicle-type-list">
        {sortedVehicleTypes.map((type) => {
          const isSelected = !!selections[type];
          const isExpanded = expandedTypes.has(type);
          const years = vehicleTypeYearMap[type] || [];
          const selectedYears = selections[type] || [];

          return (
            <div key={type} className="vehicle-type-item">
              {/* 차종 체크박스 + 확장/축소 버튼 */}
              <label className="filter-option vehicle-type-option">
                <input
                  type="checkbox"
                  className="filter-option__control"
                  checked={isSelected}
                  onChange={() => toggleVehicleType(type)}
                />
                <span className="filter-option__label">{type}</span>
                {years.length > 0 && isSelected && (
                  <button
                    type="button"
                    className="year-expand-toggle"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExpand(type);
                    }}
                    aria-label={isExpanded ? "연식 목록 접기" : "연식 목록 펼치기"}
                  >
                    <span
                      className={`year-expand-toggle__icon${isExpanded ? " year-expand-toggle__icon--open" : ""}`}
                      aria-hidden="true"
                    >
                      <svg
                        width="7"
                        height="4"
                        viewBox="0 0 7 4"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M0.5 0.5L3.5 3.5L6.5 0.5"
                          stroke="#2D6536"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                )}
              </label>

              {/* 연식 리스트 (들여쓰기) */}
              {isExpanded && years.length > 0 && (
                <div className="year-list">
                  {years.map((year) => {
                    const isYearSelected = selectedYears.includes(year);
                    return (
                      <label key={year} className="filter-option year-option">
                        <input
                          type="checkbox"
                          className="filter-option__control"
                          checked={isYearSelected}
                          onChange={() => toggleYear(type, year)}
                          disabled={!isSelected}
                        />
                        <span className="filter-option__label">{year}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
