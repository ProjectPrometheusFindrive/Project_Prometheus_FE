import React from "react";
import { formatDate, formatLocation } from "../utils/format";

export default function InfoGrid({ items, className = "" }) {
    return (
        <div className={`grid-info ${className}`}>
            {items.map((item, index) => (
                <React.Fragment key={item.key || index}>
                    <div>{item.label}</div>
                    <div>{formatValue(item.value, item.type)}</div>
                </React.Fragment>
            ))}
        </div>
    );
}

function formatValue(value, type) {
    if (!value && value !== 0) return "-";
    
    switch (type) {
        case 'date':
            return formatDate(value);
        case 'dateRange':
            return formatDateRange(value);
        case 'location':
            return formatLocation(value);
        case 'makeModel':
            return Array.isArray(value) ? value.filter(Boolean).join(" ") : value;
        case 'yearFuel':
            return Array.isArray(value) ? value.filter(Boolean).join(" / ") : value;
        default:
            return value;
    }
}

function formatDateRange(range) {
    if (!range || !range.start || !range.end) return "-";
    return `${formatDate(range.start)} ~ ${formatDate(range.end)}`;
}