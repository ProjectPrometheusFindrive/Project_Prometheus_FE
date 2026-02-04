import React, { useEffect, useState } from "react";
import Gauge from "../components/Gauge";
import { fetchDashboardData } from "../api";
import useApprovalQueryEffects from "../hooks/useApprovalQueryEffects";
import StatusDonut from "../components/charts/StatusDonut";
import TerminalRequestModal from "../components/modals/TerminalRequestModal";
import { CONTRACT_STATUSES } from "../constants/contractState";

// Colors aligned with Figma asset status donut
const ASSET_COLORS = ["#1D4693", "#1A53EF", "#3690FF", "#78B5FF", "#A9D0FF"];
const CONTRACT_COLORS = [
    "#64748B", // 문의
    "#2563EB", // 예약확정
    "#F59E0B", // 체크아웃대기
    "#16A34A", // 대여중
    "#EA580C", // 연장요청
    "#7C3AED", // 반납대기
    "#374151", // 종결
    "#DC2626", // 취소
    "#B91C1C", // 노쇼
];

export default function Dashboard() {
    const [vehicleStatus, setVehicleStatus] = useState([]);
    const [bizStatusLabeled, setBizStatusLabeled] = useState([]);

    useApprovalQueryEffects();

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const payload = await fetchDashboardData();
                if (!mounted) return;
                const summary = payload && payload.summary ? payload.summary : {};

                // 자산 현황
                const stageCounts = summary.managementStageCounts || {};
                const stageDist = Object.entries(stageCounts).map(([name, value]) => ({
                    name,
                    value: Number(value) || 0,
                    rawValue: Number(value) || 0
                }));
                setVehicleStatus(stageDist.filter((d) => (d?.value ?? 0) > 0));

                // 계약 현황
                const contractCounts = summary.contractStatusCounts || {};
                const contractDist = CONTRACT_STATUSES.map((name) => ({
                    name,
                    value: Number(contractCounts[name]) || 0,
                    rawValue: Number(contractCounts[name]) || 0,
                }));
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
        { key: "safe", label: "안전운전점수", value: 35, delta: +10, color: "#FBBF24" },
        { key: "fleet", label: "차량관리점수", value: 35, delta: -10, color: "#EF4444" },
        { key: "sales", label: "사업운영점수", value: 35, delta: -10, color: "#A855F7" },
    ];

    const [installModalOpen, setInstallModalOpen] = useState(false);

    const openInstallModal = () => setInstallModalOpen(true);
    const closeInstallModal = () => setInstallModalOpen(false);

    return (
        <div className="page">
            <div className="page-scroll" style={{ padding: "30px 60px" }}>
                {/* 상단: 자산 현황 / 계약 현황 */}
                <div className="dashboard-row dashboard-row--top">
                    <section className="dashboard-card bg-white border border-gray-200 rounded-xl" style={{ padding: "30px" }}>
                        <h2 className="font-bold text-gray-900" style={{ marginTop: 0, marginBottom: "30px", fontSize: "18px", lineHeight: "27px", letterSpacing: "-0.2px", color: "#111827" }}>자산 현황</h2>
                        <div className="dashboard-chart-container flex items-center">
                            <div className="flex-1 flex items-center justify-center dashboard-chart-wrapper">
                                <StatusDonut
                                    data={vehicleStatus}
                                    colors={ASSET_COLORS}
                                    innerRadius="45%"
                                    outerRadius="95%"
                                    unit="대"
                                    colorOffset={0}
                                    centerLabel="TOTAL" showLegend
                                />
                            </div>
                        </div>
                    </section>

                    <section className="dashboard-card bg-white border border-gray-200 rounded-xl" style={{ padding: "30px" }}>
                        <h2 className="font-bold text-gray-900" style={{ marginTop: 0, marginBottom: "30px", fontSize: "18px", lineHeight: "27px", letterSpacing: "-0.2px", color: "#111827" }}>계약 현황</h2>
                        <div className="dashboard-chart-container flex items-center">
                            <div className="flex-1 flex items-center justify-center dashboard-chart-wrapper">
                                <StatusDonut
                                    data={bizStatusLabeled}
                                    colors={CONTRACT_COLORS}
                                    innerRadius="45%"
                                    outerRadius="95%"
                                    unit="건"
                                    colorOffset={0}
                                    centerLabel="TOTAL" showLegend
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* 하단: 점수 3개 카드 */}
                <div className="dashboard-row dashboard-row--bottom">
                    {scores.map((s) => (
                        <section className="dashboard-card bg-white border border-gray-200 rounded-xl" style={{ padding: "30px" }} key={s.key}>
                            <h2 className="font-bold text-gray-900" style={{ marginTop: 0, marginBottom: "30px", fontSize: "18px", lineHeight: "27px", letterSpacing: "-0.2px", color: "#111827" }}>{s.label}</h2>
                            <div className="gauge-disabled-area">
                                <div className="gauge-blur-target">
                                    <div className="flex flex-col items-center">
                                        <Gauge value={s.value} label="" color={s.color} size={240} />
                                        <div className="mt-4 text-center">
                                            <div className="text-xs text-gray-500 mb-2">전 주 대비</div>
                                            <div
                                                className={`inline-flex items-center gap-1 px-4 py-1 rounded-md text-sm font-medium ${
                                                    s.delta >= 0
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "bg-red-50 text-red-600"
                                                }`}
                                            >
                                                <svg
                                                    width="8"
                                                    height="11"
                                                    viewBox="0 0 8 11"
                                                    fill="none"
                                                    style={{ transform: s.delta >= 0 ? "rotate(180deg)" : "none" }}
                                                >
                                                    <path
                                                        d="M4 11L0.535898 0.5L7.4641 0.5L4 11Z"
                                                        fill="currentColor"
                                                    />
                                                </svg>
                                                <span>
                                                    {Math.abs(s.delta)}점 {s.delta >= 0 ? "상승" : "하락"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="gauge-overlay-notice"
                                    onClick={openInstallModal}
                                    aria-label="대시보드 점수 기능을 사용하려면 단말기 설치가 필요합니다. 설치 요청 창을 엽니다."
                                    title="단말기 설치 요청"
                                >
                                    단말기 설치 요청하기
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
