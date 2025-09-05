import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Gauge from "../components/Gauge";
import { fetchDashboardData } from "../api";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#6366f1"]; // blue, amber, red, green, indigo

export default function Dashboard() {
    const RAD = Math.PI / 180;
    const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, payload }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RAD);
        const y = cy + radius * Math.sin(-midAngle * RAD);
        const display = payload && payload.rawValue != null ? payload.rawValue : value;
        return (
            <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={600} style={{ pointerEvents: "none" }}>
                {display}
            </text>
        );
    };

    const [vehicleStatus, setVehicleStatus] = useState([]);
    const [bizStatusLabeled, setBizStatusLabeled] = useState([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await fetchDashboardData();
                if (!mounted) return;
                const vs = Array.isArray(data?.vehicleStatus) ? data.vehicleStatus : [];
                const bs = Array.isArray(data?.bizStatus) ? data.bizStatus : [];
                setVehicleStatus(vs.map((d) => ({ ...d, rawValue: d.value })).filter((d) => (d?.value ?? 0) > 0));
                setBizStatusLabeled(
                    bs
                        .map((d) => ({ name: d.name, value: d.value, rawValue: d.value }))
                        .filter((d) => (d?.value ?? 0) > 0)
                );
            } catch (e) {
                console.error("Failed to fetch dashboard data", e);
                if (mounted) {
                    setVehicleStatus([]);
                    setBizStatusLabeled([]);
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const scores = [
        { key: "safe", label: "고객 안전/보안 지표", value: 79, delta: +2, color: "#25cdebff" },
        { key: "fleet", label: "차량 운영 지표", value: 62, delta: -14, color: "#10b981" },
        { key: "sales", label: "매출 지표", value: 85, delta: +4, color: "#f59e0b" },
    ];

    return (
        <div className="page">
            <h1>대시보드</h1>

            <div className="page-scroll">
                <div className="dashboard-grid">
                    <section className="card chart-card">
                        <h2 className="section-title">차량 등록상태 분포</h2>
                        <div className="chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 10, right: 8, bottom: 28, left: 8 }}>
                                    <Pie
                                        data={vehicleStatus}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="48%"
                                        outerRadius="78%"
                                        paddingAngle={2}
                                        label={renderDonutLabel}
                                        labelLine={false}
                                    >
                                        {vehicleStatus.map((_, i) => (
                                            <Cell key={`cell-v-${i}`} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={24} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="card chart-card">
                        <h2 className="section-title">업무현황</h2>
                        <div className="chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 10, right: 8, bottom: 28, left: 8 }}>
                                    <Pie
                                        data={bizStatusLabeled}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="48%"
                                        outerRadius="78%"
                                        paddingAngle={2}
                                        label={renderDonutLabel}
                                        labelLine={false}
                                    >
                                        {bizStatusLabeled.map((_, i) => (
                                            <Cell key={`cell-b-${i}`} fill={COLORS[(i + 1) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={24} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                </div>

                <div className="dashboard-grid dashboard-grid--gauges">
                    {scores.map((s) => (
                        <section className="card gauge-card" key={s.key}>
                            <div className="gauge-title">
                                {s.label}
                                <span className="gauge-sub">(샘플 지표)</span>
                            </div>
                            <Gauge value={s.value} label="" color={s.color} size={240} />
                            <div className="gauge-footer" aria-live="polite">
                                <span className="gauge-value">{s.value}</span>
                                <span className={`gauge-delta ${s.delta >= 0 ? "up" : "down"}`}>
                                    {s.delta >= 0 ? "+" : "-"} {Math.abs(s.delta)}p {s.delta >= 0 ? "상승" : "하락"}
                                </span>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
