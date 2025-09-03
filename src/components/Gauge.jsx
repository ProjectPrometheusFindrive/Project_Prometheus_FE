import React from "react";

/**
 * Simple semi-circle gauge using SVG.
 * Props:
 * - value: number (0-100)
 * - label: string
 * - color: string (stroke color for value arc)
 * - size: number (px, width of the SVG)
 */
export default function Gauge({ value = 0, label = "", color = "#2563eb", size = 220 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const width = size;
  const height = Math.round(size * 0.6);
  const cx = width / 2;
  const cy = height;
  const r = Math.min(width, height * 2) / 2 - 10; // padding
  const strokeWidth = 12;

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
    return [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  // Gauge spans -180deg to 0deg (left to right)
  const startAngle = -180;
  const endAngle = 0;
  const valueAngle = startAngle + ((endAngle - startAngle) * v) / 100;

  // Needle
  const needleAngle = valueAngle; // align to end of the value arc
  const needleLen = r - 8;
  const needle = polarToCartesian(cx, cy, needleLen, needleAngle);

  // Ticks every 20
  const ticks = Array.from({ length: 6 }, (_, i) => i * 20);

  return (
    <div className="gauge" role="img" aria-label={`${label} ${v}점`}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="xMidYMid meet">
        {/* Track */}
        <path
          d={describeArc(cx, cy, r, startAngle, endAngle)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={describeArc(cx, cy, r, startAngle, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Ticks */}
        {ticks.map((t) => {
          const a = startAngle + ((endAngle - startAngle) * t) / 100;
          const p1 = polarToCartesian(cx, cy, r + 2, a);
          const p2 = polarToCartesian(cx, cy, r - 10, a);
          const pt = polarToCartesian(cx, cy, r + 18, a);
          return (
            <g key={t}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#9ca3af" strokeWidth="2" />
              <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#6b7280">
                {t}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#111827" strokeWidth="3" />
        <circle cx={cx} cy={cy} r="4" fill="#111827" />

        {/* Value */}
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="28" fontWeight="600" fill="#111827">
          {v}
        </text>
        <text x={cx} y={cy - 36} textAnchor="middle" fontSize="12" fill="#6b7280">
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
