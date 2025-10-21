import React, { useEffect, useState } from "react";
import Gauge from "../components/Gauge";
import { fetchAssets, fetchRentals } from "../api";
import { computeContractStatus } from "../utils/contracts";
import { getManagementStage } from "../utils/managementStage";
import useApprovalQueryEffects from "../hooks/useApprovalQueryEffects";
import StatusDonut from "../components/charts/StatusDonut";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#6366f1"]; // blue, amber, red, green, indigo

// Donut chart moved to components/charts/StatusDonut

export default function Dashboard() {
    // Routing handled in approval hook
    // Label rendering handled inside StatusDonut

    const [vehicleStatus, setVehicleStatus] = useState([]); // 자산 관리상태 분포
    const [bizStatusLabeled, setBizStatusLabeled] = useState([]); // 계약 상태 분포

    // Handle approval query params and cross-page signals
    useApprovalQueryEffects();

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
                    // 백엔드가 managementStage를 주지 않는 경우가 있어, 프론트 기준 유틸로 산출
                    const stage = getManagementStage(a);
                    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
                });
                const stageDist = [...stageCounts.entries()].map(([name, value]) => ({ name, value, rawValue: value }));
                setVehicleStatus(stageDist.filter((d) => (d?.value ?? 0) > 0));

                // 2) 계약 현황: 계약상태(contractStatus) 기준 분포 (RentalContracts와 동일 로직)
                const now = new Date();
                const contractCounts = new Map();
                (Array.isArray(rentals) ? rentals : []).forEach((r) => {
                    const status = computeContractStatus(r, now);
                    if (status === "완료") return; // 완료된 계약은 분포에서 제외
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
        <div className="page space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">홈</h1>

            <div className="page-scroll space-y-4">
                <div className="dashboard-grid gap-4">
                    <section className="card chart-card bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                        <h2 className="section-title text-lg font-semibold text-gray-800">자산 현황</h2>
                        <div className="chart-wrap flex items-center justify-center">
                            <StatusDonut data={vehicleStatus} colors={COLORS} innerRadius="40%" outerRadius="78%" unit="대" colorOffset={0} />
                        </div>
                    </section>

                    <section className="card chart-card bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                        <h2 className="section-title text-lg font-semibold text-gray-800">계약 현황</h2>
                        <div className="chart-wrap flex items-center justify-center">
                            <StatusDonut data={bizStatusLabeled} colors={COLORS} innerRadius="48%" outerRadius="78%" unit="건" colorOffset={1} />
                        </div>
                    </section>
                </div>

                <div className="dashboard-grid dashboard-grid--gauges gap-4">
                    {scores.map((s) => (
                        <section className="card gauge-card text-center bg-white border border-gray-100 rounded-xl shadow-sm p-4" key={s.key}>
                            <div className="gauge-title font-semibold text-gray-800">
                                {s.label}
                                <span className="gauge-sub block text-sm text-gray-500">(샘플 지표)</span>
                            </div>
                            <Gauge value={s.value} label="" color={s.color} size={240} />
                            <div className="gauge-footer flex items-center justify-center gap-2 mt-0" aria-live="polite">
                                <span className="gauge-value text-2xl font-bold">{s.value}</span>
                                <span className={`gauge-delta ${s.delta >= 0 ? "up" : "down"} text-sm`}>
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
