import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Gauge from "../components/Gauge";
import { assets } from "../data/assets";
import { rentals } from "../data/rentals";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#6366f1"]; // blue, amber, red, green, indigo

export default function Dashboard() {
  // 차량 운영 현황: Available/대여중/정비중
  const vehicleStatus = useMemo(() => {
    const counts = { available: 0, rented: 0, maintenance: 0 };
    assets.forEach((a) => {
      const s = String(a.status || "").toLowerCase();
      if (s === "available") counts.available += 1;
      else if (s === "rented") counts.rented += 1;
      else if (s === "maintenance") counts.maintenance += 1;
    });
    return [
      { name: "가용", value: counts.available },
      { name: "대여중", value: counts.rented },
      { name: "정비중", value: counts.maintenance },
    ];
  }, []);

  // 사업 운영 현황: 예약중/대여중/사고접수/반납지연 (계산 + 더미)
  const bizStatus = useMemo(() => {
    const now = new Date();
    let reserved = 0;
    let active = 0;
    let overdue = 0;
    let incidents = 0;
    rentals.forEach((r) => {
      const start = new Date(r.rental_period.start);
      const end = new Date(r.rental_period.end);
      if (r.reported_stolen) incidents += 1;
      if (now < start) reserved += 1;
      else if (now >= start && now <= end) active += 1;
      else if (now > end) overdue += 1;
    });
    // If any category is zero, pad small dummy for visibility
    const pad = (n) => (n === 0 ? 1 : n);
    return [
      { name: "예약중", value: pad(reserved) },
      { name: "대여중", value: pad(active) },
      { name: "사고접수", value: pad(incidents) },
      { name: "반납지연", value: pad(overdue) },
    ];
  }, []);

  // 점수 (더미값): 고객안전운전, 차량관리, 매출관리
  const scores = [
    { key: "safe", label: "고객 안전운전 점수", value: 79, delta: +2, color: "#2563eb" },
    { key: "fleet", label: "차량 관리 점수", value: 62, delta: -14, color: "#10b981" },
    { key: "sales", label: "매출관리 점수", value: 85, delta: +4, color: "#f59e0b" },
  ];

  return (
    <div className="page">
      <h1>대시보드</h1>

      <div className="page-scroll">
      <div className="dashboard-grid">
        <section className="card chart-card">
          <h2 className="section-title">차량 운영 현황</h2>
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
          <h2 className="section-title">사업 운영 현황</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 8, bottom: 28, left: 8 }}>
                <Pie
                  data={bizStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="75%"
                  paddingAngle={2}
                >
                  {bizStatus.map((_, i) => (
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
              <span className="gauge-sub">(전 주 대비)</span>
            </div>
            <Gauge value={s.value} label="" color={s.color} size={240} />
            <div className="gauge-footer" aria-live="polite">
              <span className="gauge-value">{s.value}</span>
              <span className={`gauge-delta ${s.delta >= 0 ? "up" : "down"}`}>
                {s.delta >= 0 ? "△" : "▼"} {Math.abs(s.delta)}점 {s.delta >= 0 ? "상승" : "하락"}
              </span>
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
}
