import React, { useState, useEffect, useMemo } from "react";

/**
 * 차종+연식 필터 컴포넌트
 * 차종 선택 시 해당 차종의 모든 연식이 자동 선택됨
 */
export default function VehicleTypeYearFilter({ value, onChange, onClear, rows = [] }) {
  // value 구조: { vehicleTypes: { "소나타": ["20", "21", "22"], "그랜저": ["23"] } }
  const [selections, setSelections] = useState(() => value?.vehicleTypes || {});
  const [expandedTypes, setExpandedTypes] = useState(new Set());

  // 차종별 연식 목록 생성
  const vehicleTypeYearMap = useMemo(() => {
    const map = {};
    for (const row of rows) {
      if (row?.vehicleType) {
        const type = String(row.vehicleType);
        const year = row?.year ? String(row.year) : null;
        if (!map[type]) map[type] = new Set();
        if (year) map[type].add(year);
      }
    }
    // Set을 배열로 변환하고 정렬
    const result = {};
    for (const [type, yearSet] of Object.entries(map)) {
      result[type] = Array.from(yearSet).sort((a, b) => b.localeCompare(a)); // 최신 연도부터
    }
    return result;
  }, [rows]);

  // 정렬된 차종 목록
  const sortedVehicleTypes = useMemo(() => {
    return Object.keys(vehicleTypeYearMap).sort((a, b) => a.localeCompare(b));
  }, [vehicleTypeYearMap]);

  // 차종 선택/해제
  const toggleVehicleType = (type) => {
    const years = vehicleTypeYearMap[type] || [];
    const newSelections = { ...selections };

    if (newSelections[type]) {
      // 이미 선택된 차종 → 해제
      delete newSelections[type];
      setExpandedTypes((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    } else {
      // 새로 선택 → 모든 연식 자동 선택
      newSelections[type] = [...years];
      setExpandedTypes((prev) => new Set([...prev, type]));
    }

    setSelections(newSelections);
    onChange({ type: "vehicle-type-year", vehicleTypes: newSelections });
  };

  // 연식 선택/해제
  const toggleYear = (type, year) => {
    const newSelections = { ...selections };
    const currentYears = newSelections[type] || [];

    if (currentYears.includes(year)) {
      // 연식 해제
      const filtered = currentYears.filter((y) => y !== year);
      if (filtered.length === 0) {
        // 모든 연식이 해제되면 차종도 제거
        delete newSelections[type];
      } else {
        newSelections[type] = filtered;
      }
    } else {
      // 연식 추가
      newSelections[type] = [...currentYears, year];
    }

    setSelections(newSelections);
    onChange({ type: "vehicle-type-year", vehicleTypes: newSelections });
  };

  // 차종 확장/축소 토글
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

  // 전체 초기화
  const handleClear = () => {
    setSelections({});
    setExpandedTypes(new Set());
    onClear && onClear();
  };

  // 외부 value 변경 시 동기화
  useEffect(() => {
    if (value?.vehicleTypes) {
      setSelections(value.vehicleTypes);
      // 선택된 차종은 자동으로 확장
      setExpandedTypes(new Set(Object.keys(value.vehicleTypes)));
    } else {
      setSelections({});
      setExpandedTypes(new Set());
    }
  }, [value]);

  return (
    <div className="vehicle-type-year-filter">
      {/* 선택해제 버튼 */}
      <button
        type="button"
        className="filter-management-clear"
        onClick={handleClear}
        aria-label="차종 선택 해제"
      >
        <span aria-hidden="true" className="filter-management-clear__checkbox" />
        <span className="filter-management-clear__label">선택해제</span>
      </button>
      <div className="filter-management-divider" />

      {/* 차종 목록 */}
      <div className="vehicle-type-list">
        {sortedVehicleTypes.map((type) => {
          const isSelected = !!selections[type];
          const isExpanded = expandedTypes.has(type);
          const years = vehicleTypeYearMap[type] || [];
          const selectedYears = selections[type] || [];

          return (
            <div key={type} className="vehicle-type-item">
              {/* 차종 체크박스 */}
              <label className="filter-option vehicle-type-option">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleVehicleType(type)}
                  className="filter-option__control"
                />
                <span className="filter-option__label">{type}</span>
                {years.length > 0 && (
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
                    {isExpanded ? "▼" : "▶"}
                  </button>
                )}
              </label>

              {/* 연식 목록 (확장 시에만 표시) */}
              {isExpanded && years.length > 0 && (
                <div className="year-list">
                  {years.map((year) => {
                    const isYearSelected = selectedYears.includes(year);
                    return (
                      <label key={year} className="filter-option year-option">
                        <input
                          type="checkbox"
                          checked={isYearSelected}
                          onChange={() => toggleYear(type, year)}
                          className="filter-option__control"
                          disabled={!isSelected}
                        />
                        <span className="filter-option__label">{year}년</span>
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
