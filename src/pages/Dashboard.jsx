import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Gauge from "../components/Gauge";
import { fetchAssets, fetchRentals } from "../api";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#6366f1"]; // blue, amber, red, green, indigo

// 도넛 차트 중심에 표시할 총계 컴포넌트
const CenterTotal = ({ data, x, y, unit = "대" }) => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    return (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="recharts-text recharts-label">
            <tspan x={x} dy="-0.5em" fontSize="32" fontWeight="700" fill="#333">
                {total}
            </tspan>
        </text>
    );
};

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

    const [vehicleStatus, setVehicleStatus] = useState([]); // 자산 관리상태 분포
    const [bizStatusLabeled, setBizStatusLabeled] = useState([]); // 계약 상태 분포

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // 자산 및 대여 데이터를 직접 불러와 프론트에서 분포 계산
                const [assets, rentals] = await Promise.all([fetchAssets(), fetchRentals()]);
                if (!mounted) return;

                // 1) 자산 현황: 관리상태(managementStage) 기준 분포
                const stageCounts = new Map();
                (Array.isArray(assets) ? assets : []).forEach((a) => {
                    const stage = (a?.managementStage || "").trim() || "기타";
                    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
                });
                const stageDist = [...stageCounts.entries()].map(([name, value]) => ({ name, value, rawValue: value }));
                setVehicleStatus(stageDist.filter((d) => (d?.value ?? 0) > 0));

                // 2) 계약 현황: 계약상태(contractStatus) 기준 분포 (RentalContracts와 동일 로직)
                const now = new Date();
                const contractCounts = new Map();
                (Array.isArray(rentals) ? rentals : []).forEach((r) => {
                    const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
                    const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
                    const returnedAt = r?.returned_at ? new Date(r.returned_at) : null;
                    const isReturned = returnedAt ? now >= returnedAt : false;
                    if (isReturned) return; // 완료된 계약은 분포에서 제외
                    const isActive = start && end ? now >= start && now <= end : false;
                    const isOverdue = end ? now > end : false;
                    const isStolen = Boolean(r?.reported_stolen);
                    let status = "예약 중";
                    if (isStolen) status = "도난의심";
                    else if (isOverdue) status = "반납지연";
                    else if (isActive) status = "대여중";
                    else if (r?.accident_reported) status = "사고접수";
                    contractCounts.set(status, (contractCounts.get(status) || 0) + 1);
                });
                const contractDist = [...contractCounts.entries()].map(([name, value]) => ({ name, value, rawValue: value }));
                setBizStatusLabeled(contractDist.filter((d) => (d?.value ?? 0) > 0));
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
            <h1>홈</h1>

            <div className="page-scroll">
                <div className="dashboard-grid">
                    <section className="card chart-card">
                        <h2 className="section-title">자산 현황</h2>
                        <div className="chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 10, right: 8, bottom: 28, left: 8 }}>
                                    <Pie
                                        data={vehicleStatus}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="40%"
                                        outerRadius="78%"
                                        paddingAngle={2}
                                        label={renderDonutLabel}
                                        labelLine={false}
                                    >
                                        {vehicleStatus.map((_, i) => (
                                            <Cell key={`cell-v-${i}`} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <CenterTotal data={vehicleStatus} x="50%" y="50%" unit="대" />
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={24} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="card chart-card">
                        <h2 className="section-title">계약 현황</h2>
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
                                    <CenterTotal data={bizStatusLabeled} x="50%" y="50%" unit="건" />
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
