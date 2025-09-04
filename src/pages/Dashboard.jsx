import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Gauge from "../components/Gauge";
import { assets } from "../data/assets";
import { rentals } from "../data/rentals";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#6366f1"]; // blue, amber, red, green, indigo

export default function Dashboard() {
    const RAD = Math.PI / 180;
    const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, payload }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RAD);
        const y = cy + radius * Math.sin(-midAngle * RAD);
        const display = payload && payload.rawValue != null ? payload.rawValue : value;
        return (
            <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} style={{ pointerEvents: "none" }}>
                {display}
            </text>
        );
    };
    // 차량 등록상태 분포 (0 값은 필터링)
    const vehicleStatus = useMemo(() => {
        const ORDER = ["자산등록 완료", "보험등록 완료", "장비장착 완료", "장비장착 대기", "미등록", "기타"];
        const counts = Object.fromEntries(ORDER.map((k) => [k, 0]));
        (assets || []).forEach((a) => {
            const s = a.registrationStatus || "기타";
            if (Object.prototype.hasOwnProperty.call(counts, s)) counts[s] += 1;
            else counts["기타"] += 1;
        });
        return ORDER.map((name) => ({ name, value: counts[name] })).filter((d) => d.value > 0);
    }, []);

    // 업무현황 요약 (실제 값 사용, 0 값은 렌더링 전 필터링)
    const bizStatus = useMemo(() => {
        const now = new Date();
        let reserved = 0; // 예약(시작 전)
        let active = 0; // 진행 중
        let overdue = 0; // 반납 지연
        let incidents = 0; // 도난/이슈
        (rentals || []).forEach((r) => {
            const start = new Date(r.rental_period.start);
            const end = new Date(r.rental_period.end);
            if (r.reported_stolen) incidents += 1;
            if (now < start) reserved += 1;
            else if (now >= start && now <= end) active += 1;
            else if (now > end) overdue += 1;
        });
        return [
            { name: "예약", value: reserved },
            { name: "진행", value: active },
            { name: "사고/이슈", value: incidents },
            { name: "반납 지연", value: overdue },
        ].filter((d) => d.value > 0);
    }, []);

    const bizStatusLabeled = useMemo(() => {
        // 원래의 raw 값을 보존하여 툴팁/라벨에 사용 가능하게 함
        const now = new Date();
        let reserved = 0,
            active = 0,
            overdue = 0,
            incidents = 0;
        (rentals || []).forEach((r) => {
            const start = new Date(r.rental_period.start);
            const end = new Date(r.rental_period.end);
            if (r.reported_stolen) incidents += 1;
            if (now < start) reserved += 1;
            else if (now >= start && now <= end) active += 1;
            else if (now > end) overdue += 1;
        });
        const raw = [reserved, active, incidents, overdue];
        const labels = ["예약", "진행", "사고/이슈", "반납 지연"];
        return labels.map((name, i) => ({ name, value: raw[i], rawValue: raw[i] })).filter((d) => d.value > 0);
    }, [bizStatus]);

    const scores = [
        { key: "safe", label: "고객 안전/보안 지수", value: 79, delta: +2, color: "#2563eb" },
        { key: "fleet", label: "차량 운영 지수", value: 62, delta: -14, color: "#10b981" },
        { key: "sales", label: "매출 지수", value: 85, delta: +4, color: "#f59e0b" },
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
                                        innerRadius="55%"
                                        outerRadius="75%"
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
                                        innerRadius="55%"
                                        outerRadius="75%"
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
