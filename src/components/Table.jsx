import React from "react";
import { DIMENSIONS } from "../constants";

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
                        {columns.map((col) => (
                            <th key={col.key} style={col.style}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
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