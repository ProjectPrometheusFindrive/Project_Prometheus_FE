import React, { useEffect, useMemo, useState } from "react";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import { DIMENSIONS } from "../constants";
import { compareValues } from "../utils/sort";

export default function Table({
    columns,
    data,
    selection,
    onRowClick,
    className = "",
    emptyMessage = "데이터가 없습니다.",
    ...props
}) {
    const { selected, toggleSelect, toggleSelectAllVisible, allVisibleSelected } = selection || {};
    const hasSelection = !!selection;
    const [sortConfig, setSortConfig] = useState(null);

    useEffect(() => {
        if (sortConfig && !columns.some((col) => col.key === sortConfig.key && col.sortable)) {
            setSortConfig(null);
        }
    }, [columns, sortConfig]);

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;
        const column = columns.find((col) => col.key === sortConfig.key && col.sortable);
        if (!column) return data;
        const accessor = column.sortAccessor || ((row) => row[column.key]);
        const sortType = column.sortType || "string";
        const items = [...data];
        items.sort((a, b) => {
            const aValue = accessor(a);
            const bValue = accessor(b);
            return compareValues(aValue, bValue, sortType, sortConfig.direction);
        });
        return items;
    }, [data, columns, sortConfig]);

    const handleSort = (column) => {
        if (!column.sortable) return;
        setSortConfig((prev) => {
            if (prev?.key === column.key) {
                if (prev.direction === "asc") {
                    return { key: column.key, direction: "desc" };
                }
                if (prev.direction === "desc") {
                    return null;
                }
            }
            return { key: column.key, direction: "asc" };
        });
    };

    return (
        <div className="table-wrap">
            <table className={`asset-table ${className}`} {...props}>
                <thead>
                    <tr>
                        {hasSelection && (
                            <th style={{ width: DIMENSIONS.ICON_SIZE_LG, textAlign: "center" }}>
                                <input
                                    type="checkbox"
                                    aria-label="현재 목록 전체 선택" 
                                    checked={allVisibleSelected} 
                                    onChange={toggleSelectAllVisible} 
                                />
                            </th>
                        )}
                        {columns.map((col) => {
                            const isSorted = sortConfig?.key === col.key;
                            const sortDirection = isSorted ? sortConfig.direction : null;
                            const ariaSort = col.sortable ? (sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none") : undefined;

                            return (
                                <th key={col.key} style={col.style} aria-sort={ariaSort}>
                                    {col.sortable ? (
                                        <button
                                            type="button"
                                            className={`table-sort-button${isSorted ? " is-active" : ""}`}
                                            onClick={() => handleSort(col)}
                                        >
                                            <span>{col.label}</span>
                                            <span className="table-sort-icon" aria-hidden="true">
                                                {isSorted ? (sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />) : <FaSort />}
                                            </span>
                                        </button>
                                    ) : (
                                        col.label
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr key={row.id || index}>
                            {hasSelection && (
                                <td style={{ textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        aria-label={`선택: ${row.plate || row.id}`} 
                                        checked={selected.has(row.id)} 
                                        onChange={() => toggleSelect(row.id)} 
                                    />
                                </td>
                            )}
                            {columns.map((col) => (
                                <td key={col.key} style={col.style}>
                                    {col.render ? col.render(row, index) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length === 0 && (
                <div className="empty">{emptyMessage}</div>
            )}
        </div>
    );
}