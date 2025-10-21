import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";


function useThemeDark() {
  const get = () => (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark');
  const [isDark, setIsDark] = useState(get);
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(get()));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
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
}) {
  const isDark = useThemeDark();
  const CenterTotal = ({ data, x, y }) => {
    const total = useMemo(() => (Array.isArray(data) ? data.reduce((s, it) => s + (it?.value || 0), 0) : 0), [data]);
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="recharts-text recharts-label">
        <tspan x={x} dy="-0.5em" fontSize="32" fontWeight="700" fill={isDark ? "#e5e7eb" : "#333"}>{total}</tspan>
      </text>
    );
  };

  const RAD = Math.PI / 180;
  const label = ({ cx, cy, midAngle, innerRadius: ir, outerRadius: or, value, payload }) => {
    const radius = ir + (or - ir) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RAD);
    const y = cy + radius * Math.sin(-midAngle * RAD);
    const display = payload && payload.rawValue != null ? payload.rawValue : value;
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={600} className="pointer-events-none">
        {display}
      </text>
    );
  };

  return (
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
          paddingAngle={2}
          label={label}
          labelLine={false}
        >
          {(data || []).map((_, i) => (
            <Cell key={`cell-${i}`} fill={colors[(i + colorOffset) % (colors.length || 1)]} stroke={isDark ? '#0b1220' : '#fff'} strokeWidth={isDark ? 0 : 1} />
          ))}
        </Pie>
        <CenterTotal data={data} x="50%" y="50%" />
        <Tooltip />
        <Legend verticalAlign="bottom" height={24} />
      </PieChart>
    </ResponsiveContainer>
  );
}
