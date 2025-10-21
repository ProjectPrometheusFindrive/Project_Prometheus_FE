import React, { useMemo, useState } from "react";
import { DIMENSIONS } from "../constants";

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

    // Sorting state and helpers
    const [sortKey, setSortKey] = useState(() => (initialSort && initialSort.key) || null);
    const [sortDir, setSortDir] = useState(() => (initialSort && initialSort.direction) || null); // 'asc' | 'desc' | null

    const getCellValue = (row, col) => {
        if (!col) return undefined;
        if (typeof col.sortAccessor === "function") return col.sortAccessor(row);
        if (typeof col.accessor === "function") return col.accessor(row);
        if (typeof col.key === "string") return row?.[col.key];
        return undefined;
    };

    const parseMaybeDate = (val) => {
        if (val == null) return null;
        if (val instanceof Date && !isNaN(val)) return val;
        if (typeof val !== "string") return null;
        const s = val.trim();
        if (!s) return null;
        const iso = Date.parse(s);
        if (!Number.isNaN(iso)) return new Date(iso);
        return null;
    };

    const normalize = (val) => {
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
    };

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
    }, [data, columns, sortKey, sortDir]);

    const handleSortToggle = (key, col) => {
        if (col && (col.sortable === false || key === "select")) return;
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir("asc");
            return;
        }
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    };

    return (
        <div className={wrapClassNames.filter(Boolean).join(" ")} style={stickyStyle}>
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
                            return (
                                <th key={col.key} style={col.style} aria-sort={ariaSort} className={[sortable ? "th-sortable" : undefined, (col.style && col.style.textAlign === 'right') ? 'text-right' : (col.style && col.style.textAlign === 'center') ? 'text-center' : undefined].filter(Boolean).join(' ')}>
                                    <span className="th-label">{col.label}</span>
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
                                            <span className="tri up">▲</span>
                                            <span className="tri down">▼</span>
                                        </button>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr
                            key={row.id || index}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={typeof rowClassName === "function" ? rowClassName(row, index) : undefined}
                        >
                            {hasSelection && (
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        aria-label={`선택: ${row.plate || row.id}`}
                                        checked={selected?.has ? selected.has(row.id) : false}
                                        onChange={() => toggleSelect && toggleSelect(row.id)}
                                    />
                                </td>
                            )}
                            {columns.map((col) => (
                                <td key={col.key} style={col.style} className={(col.style && col.style.textAlign === 'right') ? 'text-right' : (col.style && col.style.textAlign === 'center') ? 'text-center' : undefined}>
                                    {col.render ? col.render(row, index) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length === 0 && <div className="empty">{emptyMessage}</div>}
        </div>
    );
}
