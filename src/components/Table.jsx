import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { safeDate } from "../utils/date";
import { DIMENSIONS } from "../constants";
import ColumnFilterPopover from "./filters/ColumnFilterPopover";

export default function Table({
    columns,
    data,
    selection,
    onRowClick,
    className = "",
    emptyMessage = "데이터가 없습니다.",
    stickyHeader = false,
    stickyOffset = 0,
    initialSort,
    rowClassName,
    rowIdKey = "id", // 기본값은 "id", 커스텀 가능
    wrapRef,
    enableColumnFilters = false,
    filters,
    onFiltersChange,
    renderFilterContent,
    ...props
}) {
    const { selected, toggleSelect, toggleSelectAllVisible, allVisibleSelected } = selection || {};
    const hasSelection = !!selection;

    const wrapClassNames = ["table-wrap"];
    const tableClassNames = ["asset-table", className];

    if (stickyHeader) {
        wrapClassNames.push("table-wrap--sticky");
        tableClassNames.push("asset-table--sticky");
    }

    const stickyStyle = stickyHeader
        ? {
              "--table-sticky-extra-offset":
                  typeof stickyOffset === "number" ? `${stickyOffset}px` : stickyOffset || "0px",
          }
        : undefined;

    // Column filter popover state
    const [openFilterKey, setOpenFilterKey] = useState(null);
    const [openFilterAlignRight, setOpenFilterAlignRight] = useState(false);
    const headerRefs = useRef({});
    const closeFilters = useCallback(() => setOpenFilterKey(null), []);

    useEffect(() => {
        const onEsc = (e) => { if (e.key === 'Escape') closeFilters(); };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [closeFilters]);

    // Sorting state and helpers
    const [sortKey, setSortKey] = useState(() => (initialSort && initialSort.key) || null);
    const [sortDir, setSortDir] = useState(() => (initialSort && initialSort.direction) || null); // 'asc' | 'desc' | null

    const getCellValue = useCallback((row, col) => {
        if (!col) return undefined;
        if (typeof col.sortAccessor === "function") return col.sortAccessor(row);
        if (typeof col.accessor === "function") return col.accessor(row);
        if (typeof col.key === "string") return row?.[col.key];
        return undefined;
    }, []);

    const parseMaybeDate = useCallback((val) => {
        if (val == null) return null;
        if (val instanceof Date && !isNaN(val)) return val;
        if (typeof val !== "string") return null;
        const d = safeDate(val.trim());
        return d && !isNaN(d) ? d : null;
    }, []);

    const normalize = useCallback((val) => {
        if (val == null) return { type: "empty", v: null };
        const t = typeof val;
        if (t === "number") return { type: "number", v: val };
        if (t === "boolean") return { type: "number", v: val ? 1 : 0 };
        if (val instanceof Date && !isNaN(val)) return { type: "date", v: val.getTime() };
        if (t === "string") {
            const asDate = parseMaybeDate(val);
            if (asDate) return { type: "date", v: asDate.getTime() };
            const num = Number(val);
            if (!Number.isNaN(num) && /^-?\d+(?:\.\d+)?$/.test(val.trim())) {
                return { type: "number", v: num };
            }
            return { type: "string", v: val.toLowerCase() };
        }
        try {
            return { type: "string", v: String(val).toLowerCase() };
        } catch {
            return { type: "string", v: "" };
        }
    }, [parseMaybeDate]);

    const sortedData = useMemo(() => {
        if (!Array.isArray(data)) return [];
        if (!sortKey || !sortDir) return data;
        const col = columns.find((c) => c.key === sortKey);
        if (!col) return data;
        const sortable = col.sortable !== false && col.key !== "select";
        if (!sortable) return data;
        const withIndex = data.map((row, idx) => ({ row, idx }));
        withIndex.sort((a, b) => {
            const va = getCellValue(a.row, col);
            const vb = getCellValue(b.row, col);
            if (typeof col.sorter === "function") {
                const cmpCustom = col.sorter(a.row, b.row, { dir: sortDir });
                if (cmpCustom !== 0) return sortDir === "asc" ? cmpCustom : -cmpCustom;
                return a.idx - b.idx;
            }
            const na = normalize(va);
            const nb = normalize(vb);
            if (na.type !== nb.type) {
                const order = { empty: 3, string: 2, number: 1, date: 1 };
                const pa = order[na.type] ?? 2;
                const pb = order[nb.type] ?? 2;
                if (pa !== pb) return sortDir === "asc" ? pa - pb : pb - pa;
            }
            let cmp = 0;
            if (na.v == null && nb.v != null) cmp = 1;
            else if (na.v != null && nb.v == null) cmp = -1;
            else if (na.v == null && nb.v == null) cmp = 0;
            else if (na.type === "number" || na.type === "date") cmp = na.v - nb.v;
            else if (na.type === "string") cmp = String(na.v).localeCompare(String(nb.v), undefined, { sensitivity: "base", numeric: true });
            if (cmp === 0) return a.idx - b.idx;
            return sortDir === "asc" ? cmp : -cmp;
        });
        return withIndex.map((x) => x.row);
    }, [data, columns, sortKey, sortDir, getCellValue, normalize]);

    const handleSortToggle = useCallback((key, col) => {
        if (col && (col.sortable === false || key === "select")) return;
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir("asc");
            return;
        }
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    }, [sortKey]);

    const getFilterOptions = useCallback((col) => {
        // Prefer explicit options provider when present
        if (Array.isArray(col?.filterOptions)) return col.filterOptions;
        if (typeof col?.getFilterOptions === "function") {
            try { return col.getFilterOptions(sortedData); } catch { /* noop */ }
        }
        // Derive unique values from current data
        const set = new Set();
        for (const row of sortedData) {
            const v = getCellValue(row, col);
            if (v == null || v === "") continue;
            set.add(v);
        }
        return Array.from(set).map((v) => ({ value: v, label: String(v) }));
    }, [sortedData, getCellValue]);

    const handleFilterChange = useCallback((key, nextVal) => {
        if (typeof onFiltersChange !== "function") return;
        const prev = filters || {};
        const next = { ...prev };
        const isEmpty = (v) => {
            if (v == null) return true;
            const t = v.type;
            if (t === 'text') return !(v.value && String(v.value).trim());
            if (t === 'select') return !Array.isArray(v.values) || v.values.length === 0;
            if (t === 'multi-select') return !Array.isArray(v.values) || v.values.length === 0;
            if (t === 'number-range') return (v.min == null || v.min === '') && (v.max == null || v.max === '');
            if (t === 'date-range') return !(v.from) && !(v.to);
            if (t === 'boolean') return v.value === undefined; // null(true for unknown) and booleans are active
            if (t === 'custom') {
                // Consider any non-empty field (excluding 'type') as active
                for (const [k, val] of Object.entries(v)) {
                    if (k === 'type') continue;
                    if (Array.isArray(val)) { if (val.length > 0) return false; else continue; }
                    if (typeof val === 'string') { if (val.trim() !== '') return false; else continue; }
                    if (val != null) return false;
                }
                return true;
            }
            return false;
        };
        if (isEmpty(nextVal)) delete next[key];
        else next[key] = nextVal;
        onFiltersChange(next);
    }, [filters, onFiltersChange]);

    return (
        <div ref={wrapRef} className={wrapClassNames.filter(Boolean).join(" ")} style={stickyStyle}>
            <table className={tableClassNames.filter(Boolean).join(" ")} {...props}>
                <thead>
                    <tr>
                        {hasSelection && (
                            <th style={{ width: DIMENSIONS.ICON_SIZE_LG }} className="text-center">
                                <input
                                    type="checkbox"
                                    aria-label="현재 목록 전체 선택"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                />
                            </th>
                        )}
                        {columns.map((col) => {
                            const sortable = col.sortable !== false && col.key !== "select";
                            const isActive = sortKey === col.key && !!sortDir;
                            const ariaSort = isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none";
                            const filterable = enableColumnFilters && col.key !== "select" && col.filterType;
                            const isFilterOpen = openFilterKey === col.key;
                            const activeFilter = (filters && filters[col.key]) || null;
                            const countFilterChips = (f) => {
                                if (!f) return 0;
                                if (f.type === 'custom') {
                                    let cnt = 0;
                                    for (const [k, v] of Object.entries(f)) {
                                        if (k === 'type') continue;
                                        if (Array.isArray(v)) cnt += v.length;
                                        else if (typeof v === 'string') cnt += v.trim() ? 1 : 0;
                                        else if (v != null) cnt += 1;
                                    }
                                    return cnt;
                                }
                                if (Array.isArray(f.values)) return f.values.length;
                                if (typeof f.value === 'string') return f.value.trim() ? 1 : 0;
                                if (f.value === true || f.value === false) return 1;
                                if (f.min != null || f.max != null || f.from || f.to) return 1;
                                return 0;
                            };
                            const filterCount = countFilterChips(activeFilter);
                            return (
                                <th key={col.key} style={col.style} aria-sort={ariaSort} className={[sortable ? "th-sortable" : undefined, filterable && filterCount > 0 ? "th-filtered" : undefined, (col.style && col.style.textAlign === 'right') ? 'text-right' : (col.style && col.style.textAlign === 'center') ? 'text-center' : undefined].filter(Boolean).join(' ')}>
                                    <button
                                            type="button"
                                            ref={(el) => { headerRefs.current[col.key] = el; }}
                                            className="th-label"
                                            aria-haspopup={filterable ? "dialog" : undefined}
                                            aria-expanded={filterable ? (isFilterOpen ? "true" : "false") : undefined}
                                        onMouseDown={(e) => { e.stopPropagation(); }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!filterable) return;
                                            const nextKey = openFilterKey === col.key ? null : col.key;
                                            setOpenFilterKey(nextKey);
                                            if (nextKey) {
                                                try {
                                                    const el = headerRefs.current[col.key];
                                                    const rect = el ? el.getBoundingClientRect() : null;
                                                    const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
                                                    const maxW = 320; // match CSS max-width
                                                    const margin = 8;
                                                    const willOverflow = rect ? (rect.right + maxW + margin > vw) : false;
                                                    setOpenFilterAlignRight(!!willOverflow);
                                                } catch {
                                                    setOpenFilterAlignRight(false);
                                                }
                                            }
                                        }}
                                            title={filterable ? `${col.label} 필터 열기` : undefined}
                                        >
                                            {col.label}
                                            {filterable && !!filterCount && <span className="filter-badge" aria-label="적용 필터 수">{filterCount}</span>}
                                        </button>
                                    {sortable && (
                                        <button
                                            type="button"
                                            className={[
                                                "sort-toggle",
                                                sortKey === col.key && sortDir ? "active" : "",
                                                sortKey === col.key && sortDir ? `dir-${sortDir}` : "",
                                            ].filter(Boolean).join(" ")}
                                            title={`${col.label} 정렬 토글`}
                                            aria-label={`${col.label} 정렬 토글 (오름차순/내림차순)`}
                                            onClick={() => handleSortToggle(col.key, col)}
                                        >
                                            <span className="sort-icon" aria-hidden="true">
                                                <svg viewBox="0 0 18 12" width="18" height="12" focusable="false">
                                                    <path d="M1.8 2.2 9 9.8 16.2 2.2 14.6 0.5 9 6.1 3.4 0.5 1.8 2.2Z" fill="currentColor" />
                                                </svg>
                                            </span>
                                        </button>
                                    )}
                                    {filterable && isFilterOpen && (
                                        renderFilterContent ? (
                                            renderFilterContent(col, activeFilter, (next) => handleFilterChange(col.key, next))
                                        ) : (
                                            <ColumnFilterPopover
                                                column={col}
                                                value={activeFilter || { type: col.filterType }}
                                                onChange={(next) => handleFilterChange(col.key, next)}
                                                onClear={() => handleFilterChange(col.key, null)}
                                                options={getFilterOptions(col)}
                                                anchorRef={{ current: headerRefs.current[col.key] }}
                                                onRequestClose={() => setOpenFilterKey(null)}
                                                alignRight={openFilterAlignRight}
                                            />
                                        )
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => {
                        const rowId = row[rowIdKey] || index;
                        const isSelectedRow = hasSelection && selected?.has && selected.has(rowId);
                        const baseRowClass =
                            typeof rowClassName === "function"
                                ? rowClassName(row, index)
                                : rowClassName;
                        const rowClassNames = [
                            baseRowClass,
                            isSelectedRow ? "row-selected" : null,
                        ]
                            .filter(Boolean)
                            .join(" ") || undefined;
                        return (
                            <tr
                                key={rowId}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={rowClassNames}
                            >
                                {hasSelection && (
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            aria-label={`선택: ${row.plate || rowId}`}
                                            checked={selected?.has ? selected.has(rowId) : false}
                                            onChange={() => toggleSelect && toggleSelect(rowId)}
                                        />
                                    </td>
                                )}

                                {columns.map((col) => (
                                    <td key={col.key} style={col.style} className={(col.style && col.style.textAlign === 'right') ? 'text-right' : (col.style && col.style.textAlign === 'center') ? 'text-center' : undefined}>
                                        {col.render ? col.render(row, index) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {data.length === 0 && <div className="empty">{emptyMessage}</div>}
        </div>
    );
}
