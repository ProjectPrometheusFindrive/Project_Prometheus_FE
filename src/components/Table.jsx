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

    const tableClassNames = ["asset-table", className];
    if (stickyHeader) {
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
            // 새로운 컬럼 클릭: 내림차순으로 시작
            setSortKey(key);
            setSortDir("desc");
            return;
        }
        // 같은 컬럼 클릭: desc -> asc -> null (디폴트)
        if (sortDir === "desc") {
            setSortDir("asc");
        } else if (sortDir === "asc") {
            setSortKey(null);
            setSortDir(null);
        } else {
            setSortDir("desc");
        }
    }, [sortKey, sortDir]);

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

    const tableContent = (
        <>
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
                                            {sortKey === col.key && sortDir === "asc" ? (
                                                <span className="sort-icon" aria-hidden="true">
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M19.1667 5.83334C19.1667 6.05435 19.0789 6.26631 18.9226 6.42259C18.7663 6.57887 18.5543 6.66667 18.3333 6.66667H9.99999C9.77898 6.66667 9.56701 6.57887 9.41073 6.42259C9.25445 6.26631 9.16666 6.05435 9.16666 5.83334C9.16666 5.61232 9.25445 5.40036 9.41073 5.24408C9.56701 5.0878 9.77898 5.00001 9.99999 5.00001H18.3333C18.5543 5.00001 18.7663 5.0878 18.9226 5.24408C19.0789 5.40036 19.1667 5.61232 19.1667 5.83334ZM15.8333 9.16667H9.99999C9.77898 9.16667 9.56701 9.25447 9.41073 9.41075C9.25445 9.56703 9.16666 9.77899 9.16666 10C9.16666 10.221 9.25445 10.433 9.41073 10.5893C9.56701 10.7455 9.77898 10.8333 9.99999 10.8333H15.8333C16.0543 10.8333 16.2663 10.7455 16.4226 10.5893C16.5789 10.433 16.6667 10.221 16.6667 10C16.6667 9.77899 16.5789 9.56703 16.4226 9.41075C16.2663 9.25447 16.0543 9.16667 15.8333 9.16667ZM12.5 13.3333H9.99999C9.77898 13.3333 9.56701 13.4211 9.41073 13.5774C9.25445 13.7337 9.16666 13.9457 9.16666 14.1667C9.16666 14.3877 9.25445 14.5996 9.41073 14.7559C9.56701 14.9122 9.77898 15 9.99999 15H12.5C12.721 15 12.933 14.9122 13.0892 14.7559C13.2455 14.5996 13.3333 14.3877 13.3333 14.1667C13.3333 13.9457 13.2455 13.7337 13.0892 13.5774C12.933 13.4211 12.721 13.3333 12.5 13.3333ZM5.46666 4.34167C5.4408 4.32199 5.41285 4.30522 5.38332 4.29167C5.34448 4.26452 5.30251 4.24214 5.25832 4.22501L5.13332 4.16667H4.99999H4.86666H4.74166C4.69747 4.18381 4.6555 4.20619 4.61666 4.23334C4.58712 4.24689 4.55918 4.26366 4.53332 4.28334L2.03332 6.43334C1.88414 6.55932 1.79111 6.7394 1.7747 6.93397C1.76657 7.03031 1.7775 7.1273 1.80687 7.21942C1.83623 7.31154 1.88344 7.39697 1.94582 7.47084C2.0082 7.54471 2.08452 7.60557 2.17041 7.64994C2.25631 7.69432 2.35011 7.72134 2.44645 7.72946C2.64102 7.74587 2.83414 7.68432 2.98332 7.55834L4.16666 6.53334V14.8667C4.16666 15.0877 4.25445 15.2996 4.41073 15.4559C4.56701 15.6122 4.77898 15.7 4.99999 15.7C5.221 15.7 5.43296 15.6122 5.58924 15.4559C5.74552 15.2996 5.83332 15.0877 5.83332 14.8667V6.53334L7.01666 7.55834C7.08512 7.62835 7.16735 7.68341 7.25817 7.72004C7.34898 7.75667 7.4464 7.77407 7.54428 7.77114C7.64216 7.76822 7.73837 7.74503 7.82684 7.70304C7.9153 7.66105 7.9941 7.60117 8.05826 7.52719C8.12241 7.45321 8.17053 7.36673 8.19957 7.27322C8.22862 7.1797 8.23796 7.08118 8.227 6.98387C8.21604 6.88656 8.18503 6.79258 8.13591 6.70786C8.0868 6.62315 8.02066 6.54953 7.94166 6.49167L5.46666 4.34167Z" fill="currentColor"/>
                                                    </svg>
                                                </span>
                                            ) : (
                                                <span className="sort-icon" aria-hidden="true">
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M19.1667 5.83334C19.1667 6.05435 19.0789 6.26631 18.9226 6.42259C18.7663 6.57887 18.5544 6.66667 18.3333 6.66667H10C9.779 6.66667 9.56704 6.57887 9.41076 6.42259C9.25448 6.26631 9.16668 6.05435 9.16668 5.83334C9.16668 5.61232 9.25448 5.40036 9.41076 5.24408C9.56704 5.0878 9.779 5.00001 10 5.00001H18.3333C18.5544 5.00001 18.7663 5.0878 18.9226 5.24408C19.0789 5.40036 19.1667 5.61232 19.1667 5.83334ZM15.8333 9.16667H10C9.779 9.16667 9.56704 9.25447 9.41076 9.41075C9.25448 9.56703 9.16668 9.77899 9.16668 10C9.16668 10.221 9.25448 10.433 9.41076 10.5893C9.56704 10.7455 9.779 10.8333 10 10.8333H15.8333C16.0544 10.8333 16.2663 10.7455 16.4226 10.5893C16.5789 10.433 16.6667 10.221 16.6667 10C16.6667 9.77899 16.5789 9.56703 16.4226 9.41075C16.2663 9.25447 16.0544 9.16667 15.8333 9.16667ZM12.5 13.3333H10C9.779 13.3333 9.56704 13.4211 9.41076 13.5774C9.25448 13.7337 9.16668 13.9457 9.16668 14.1667C9.16668 14.3877 9.25448 14.5996 9.41076 14.7559C9.56704 14.9122 9.779 15 10 15H12.5C12.721 15 12.933 14.9122 13.0893 14.7559C13.2455 14.5996 13.3333 14.3877 13.3333 14.1667C13.3333 13.9457 13.2455 13.7337 13.0893 13.5774C12.933 13.4211 12.721 13.3333 12.5 13.3333ZM7.01668 12.325L5.83335 13.3333V5.00001C5.83335 4.77899 5.74555 4.56703 5.58927 4.41075C5.43299 4.25447 5.22103 4.16667 5.00001 4.16667C4.779 4.16667 4.56704 4.25447 4.41076 4.41075C4.25448 4.56703 4.16668 4.77899 4.16668 5.00001V13.3333L2.98335 12.325C2.91489 12.255 2.83265 12.1999 2.74184 12.1633C2.65102 12.1267 2.5536 12.1093 2.45572 12.1122C2.35784 12.1151 2.26163 12.1383 2.17316 12.1803C2.0847 12.2223 2.0059 12.2822 1.94175 12.3562C1.87759 12.4301 1.82947 12.5166 1.80043 12.6101C1.77138 12.7036 1.76205 12.8022 1.773 12.8995C1.78396 12.9968 1.81497 13.0908 1.86409 13.1755C1.9132 13.2602 1.97935 13.3338 2.05835 13.3917L4.55835 15.5417C4.5842 15.5614 4.61215 15.5781 4.64168 15.5917C4.68053 15.6188 4.72249 15.6412 4.76668 15.6583H4.89168H5.02501H5.15835H5.28335C5.32753 15.6412 5.3695 15.6188 5.40835 15.5917C5.43788 15.5781 5.46583 15.5614 5.49168 15.5417L7.99168 13.3917C8.07068 13.3338 8.13682 13.2602 8.18594 13.1755C8.23505 13.0908 8.26607 12.9968 8.27702 12.8995C8.28798 12.8022 8.27864 12.7036 8.2496 12.6101C8.22055 12.5166 8.17243 12.4301 8.10828 12.3562C8.04412 12.2822 7.96533 12.2223 7.87686 12.1803C7.7884 12.1383 7.69219 12.1151 7.59431 12.1122C7.49643 12.1093 7.399 12.1267 7.30819 12.1633C7.21737 12.1999 7.13514 12.255 7.06668 12.325H7.01668Z" fill="currentColor"/>
                                                    </svg>
                                                </span>
                                            )}
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
        </>
    );

    if (stickyHeader) {
        return (
            <div ref={wrapRef} className="table-wrap--sticky" style={stickyStyle}>
                <div className="table-wrap">
                    {tableContent}
                </div>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="table-wrap table-wrap--scroll-x">
            {tableContent}
        </div>
    );
}
