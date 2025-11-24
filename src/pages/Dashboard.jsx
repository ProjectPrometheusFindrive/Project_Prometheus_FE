import React, { useEffect, useState } from "react";
import Gauge from "../components/Gauge";
import { fetchDashboardData } from "../api";
import useApprovalQueryEffects from "../hooks/useApprovalQueryEffects";
import StatusDonut from "../components/charts/StatusDonut";
import TerminalRequestModal from "../components/modals/TerminalRequestModal";

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
                // Dashboard BFF: summary 섹션만 요청(기본값)
                const payload = await fetchDashboardData();
                if (!mounted) return;
                const summary = payload && payload.summary ? payload.summary : {};

                // 1) 자산 현황: 서버 집계 사용
                const stageCounts = summary.managementStageCounts || {};
                const stageDist = Object.entries(stageCounts).map(([name, value]) => ({ name, value: Number(value) || 0, rawValue: Number(value) || 0 }));
                setVehicleStatus(stageDist.filter((d) => (d?.value ?? 0) > 0));

                // 2) 계약 현황: 서버 집계 사용 (완료 제외 가정)
                const contractCounts = summary.contractStatusCounts || {};
                const contractDist = Object.entries(contractCounts).map(([name, value]) => ({ name, value: Number(value) || 0, rawValue: Number(value) || 0 }));
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
        { key: "safe", label: "안전운전점수", value: 79, delta: +2, color: "#25cdebff" },
        { key: "fleet", label: "차량관리점수", value: 62, delta: -14, color: "#10b981" },
        { key: "sales", label: "사업운영점수", value: 85, delta: +4, color: "#f59e0b" },
    ];

    const [installModalOpen, setInstallModalOpen] = useState(false);

    const openInstallModal = () => setInstallModalOpen(true);
    const closeInstallModal = () => setInstallModalOpen(false);

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
                            </div>
                            <div className="gauge-disabled-area">
                                <div className="gauge-blur-target">
                                    <Gauge value={s.value} label="" color={s.color} size={240} />
                                    <div className="gauge-footer flex items-center justify-center gap-2 mt-0" aria-live="polite">
                                        <span className="gauge-value text-2xl font-bold">{s.value}</span>
                                        <span className={`gauge-delta ${s.delta >= 0 ? "up" : "down"} text-sm`}>
                                            {s.delta >= 0 ? "+" : "-"} {Math.abs(s.delta)}p {s.delta >= 0 ? "상승" : "하락"}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="gauge-overlay-notice"
                                    onClick={openInstallModal}
                                    aria-label="기능 사용을 위해 단말장착이 필요합니다. 클릭하여 신청"
                                    title="기능 사용을 위해 단말장착이 필요합니다."
                                >
                                    기능 사용을 위해 단말장착이 필요합니다.
                                </button>
                            </div>
                        </section>
                    ))}
                </div>
                <TerminalRequestModal
                    isOpen={installModalOpen}
                    onClose={closeInstallModal}
                />
            </div>
        </div>
    );
}
