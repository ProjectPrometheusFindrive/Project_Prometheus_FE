import React from "react";

// Simple semi-circle gauge using SVG.
// Props:
// - value: number (0-100)
// - label: string
// - color: string (stroke color for value arc)
// - size: number (px, width of the SVG)
// - thickness: number (px, stroke width for the gauge arc)
export default function Gauge({ value = 0, label = "", color = "#2563eb", size = 220, thickness = 18 }) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    const width = size;
    // Make viewBox height half the width so the SVG represents a true semicircle area
    const height = Math.round(size / 2);
    // Extra headroom so tick labels/top of arc don't clip
    const topPadding = 10; // e.g., size=240 => viewBox height 120+10=130
    const cx = width / 2;
    const cy = height;
    // Use provided thickness for stroke width and shrink radius to avoid clipping
    const strokeWidth = Number(thickness) || 18;
    const r = Math.min(width, height * 2) / 2 - strokeWidth / 2 - 8; // padding adjusted for stroke

    // Helper to convert polar to cartesian for arc endpoints
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    };

    // Describe arc from startAngle to endAngle
    const describeArc = (x, y, radius, startAngle, endAngle) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
    };

    // Gauge spans -180deg to 0deg (left to right)
    const startAngle = -90;
    const endAngle = 90;
    const valueAngle = startAngle + ((endAngle - startAngle) * v) / 100;

    // Needle
    const needleAngle = valueAngle; // align to end of the value arc
    const needleLen = r - 8;
    const needle = polarToCartesian(cx, cy, needleLen, needleAngle);

    // Ticks every 20
    const ticks = Array.from({ length: 6 }, (_, i) => i * 20);

    
    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
    const trackColor = isDark ? '#1f2937' : '#e5e7eb';
    const tickColor = isDark ? '#94a3b8' : '#9ca3af';
    const tickTextColor = isDark ? '#cbd5e1' : '#000c24ff';
    const needleColor = isDark ? '#e5e7eb' : '#111827';
    const valueTextColor = isDark ? '#e5e7eb' : '#111827';
    const labelTextColor = isDark ? '#94a3b8' : '#6b7280';

    return (
        <div className="gauge" role="img" aria-label={`${label} ${v}`}>
            <svg viewBox={`0 0 ${width} ${height + topPadding}`} className="w-full block" style={{ height: `${height + topPadding}px` }} preserveAspectRatio="xMidYMax meet">
                {/* Track */}
                <path d={describeArc(cx, cy, r, startAngle, endAngle)} fill="none" stroke={trackColor} strokeWidth={strokeWidth} strokeLinecap="round" />

                {/* Value arc */}
                <path d={describeArc(cx, cy, r, startAngle, valueAngle)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

                {/* Ticks */}
                {ticks.map((t) => {
                    const a = startAngle + ((endAngle - startAngle) * t) / 100;
                    const p1 = polarToCartesian(cx, cy, r + 2, a);
                    const p2 = polarToCartesian(cx, cy, r - 10, a);
                    const pt = polarToCartesian(cx, cy, r + 12, a);
                    return (
                        <g key={t}>
                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={tickColor} strokeWidth="2" />
                            <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={tickTextColor}>
                                {t}
                            </text>
                        </g>
                    );
                })}

                {/* Needle */}
                <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={needleColor} strokeWidth="3" />
                <circle cx={cx} cy={cy} r="4" fill={valueTextColor} />

                {/* Value (kept clear of label) */}
                <text x={cx} y={cy - Math.min(24, height * 0.15)} textAnchor="middle" fontSize="28" fontWeight="600" fill={needleColor}>
                    {v}
                </text>
                {/* Label moved further up to avoid overlap with value */}
                <text x={cx} y={cy - Math.min(56, height * 0.45)} textAnchor="middle" fontSize="12" fill={labelTextColor}>
                    SCORE
                </text>
            </svg>
            {label ? (
                <div className="gauge__label" aria-hidden>
                    {label}
                </div>
            ) : null}
        </div>
    );
}
