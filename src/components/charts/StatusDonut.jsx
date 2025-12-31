import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function useThemeDark() {
    const get = () =>
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-theme") === "dark";
    const [isDark, setIsDark] = useState(get);
    React.useEffect(() => {
        if (typeof document === "undefined") return;
        const el = document.documentElement;
        const obs = new MutationObserver(() => setIsDark(get()));
        obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
        return () => obs.disconnect();
    }, []);
    return isDark;
}

export default function StatusDonut({
    data = [],
    colors = [],
    innerRadius = "40%",
    outerRadius = "78%",
    unit = "",
    colorOffset = 0,
    margin = { top: 10, right: 8, bottom: 28, left: 8 },
    centerLabel = "TOTAL",
    showLegend = false
}) {
    const isDark = useThemeDark();

    const CenterTotal = ({ data, x, y }) => {
        const total = useMemo(
            () =>
                Array.isArray(data)
                    ? data.reduce((s, it) => s + (it?.value || 0), 0)
                    : 0,
            [data]
        );

        const labelColor = isDark ? "#9CA3AF" : "#888888";
        const valueColor = isDark ? "#E5E7EB" : "#1C1C1C";

        return (
            <g className="status-donut__center-label">
                <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="32"
                    fontWeight="800"
                    letterSpacing="0"
                    fill={valueColor}
                    style={{ lineHeight: "40px" }}
                >
                    {total}
                </text>
                {centerLabel && (
                    <text
                        x={x}
                        y={y}
                        dy="-24"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="12"
                        fontWeight="400"
                        letterSpacing="-0.4"
                        fill={labelColor}
                        style={{ lineHeight: "18px" }}
                    >
                        {centerLabel}
                    </text>
                )}
            </g>
        );
    };

    const RAD = Math.PI / 180;
    const total = useMemo(
        () =>
            Array.isArray(data)
                ? data.reduce((s, it) => s + (it?.value || 0), 0)
                : 0,
        [data]
    );
    
    const label = ({
        cx,
        cy,
        midAngle,
        innerRadius: ir,
        outerRadius: or,
        value,
        payload
    }) => {
        // 전체 대비 현재 조각의 비율 계산 (백분율)
        const percentage = total > 0 ? (value / total) * 100 : 0;
        
        // 조각이 너무 작으면 (5% 미만) 레이블 표시하지 않음
        if (percentage < 5) {
            return null;
        }
        
        const radius = ir + (or - ir) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RAD);
        const y = cy + radius * Math.sin(-midAngle * RAD);
        const display = payload && payload.rawValue != null ? payload.rawValue : value;
        return (
            <text
                x={x}
                y={y}
                fill="#FFFFFF"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={700}
                className="pointer-events-none"
            >
                {display}
            </text>
        );
    };

    const chart = (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={margin}>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={0.1}
                    label={label}
                    labelLine={false}
                >
                    {(data || []).map((_, i) => (
                        <Cell
                            key={`cell-${i}`}
                            fill={colors[(i + colorOffset) % (colors.length || 1)]}
                            stroke={isDark ? "#0B1220" : "#FFFFFF"}
                            strokeWidth={isDark ? 0 : 1}
                        />
                    ))}
                </Pie>
                <CenterTotal data={data} x="50%" y="50%" />
                <Tooltip />
            </PieChart>
        </ResponsiveContainer>
    );

    if (!showLegend) {
        return chart;
    }

    return (
        <div
            className="status-donut"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                height: "100%",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box"
            }}
        >
            <div
                className="status-donut__chart"
                style={{
                    width: 280,
                    height: 280,
                    maxWidth: "100%",
                    flexShrink: 0
                }}
            >
                {chart}
            </div>
            {Array.isArray(data) && data.length > 0 && (
                <div className="dashboard-legend">
                    {data.map((item, index) => {
                        const color =
                            colors[(index + colorOffset) % (colors.length || 1)];
                        const value =
                            item && item.rawValue != null
                                ? item.rawValue
                                : item && item.value
                                    ? item.value
                                    : 0;
                        return (
                            <div
                                className="dashboard-legend__item"
                                key={item?.name || index}
                            >
                                <div className="dashboard-legend__label-wrap">
                                    <span
                                        className="dashboard-legend__dot"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="dashboard-legend__label">
                                        {item?.name}
                                    </span>
                                </div>
                                <span className="dashboard-legend__value">
                                    {value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
