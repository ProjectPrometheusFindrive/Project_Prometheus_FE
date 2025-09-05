import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { typedStorage } from "../utils/storage";
import { renderToStaticMarkup } from "react-dom/server";
import { FaCar } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";
import IssueForm from "../components/forms/IssueForm";
import Modal from "../components/Modal";
import useTableSelection from "../hooks/useTableSelection";
import { fetchProblemVehicles, createIssueDraft } from "../api/fakeApi";
import { RentalStatusBadge, DeviceStatusBadge, EngineStatusBadge } from "../components/StatusBadge";

export default function ProblemVehicles() {
    const [problems, setProblems] = useState([]);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [issueInitial, setIssueInitial] = useState({});
    const [saved, setSaved] = useState(false);
    const [noRestartMap, setNoRestartMap] = useState({});
    const [engineMap, setEngineMap] = useState({});
    const navigate = useNavigate();
    const [locationVin, setLocationVin] = useState(null);
    const miniMapRef = useRef(null);
    const miniMapInstanceRef = useRef(null);
    const miniLayerRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const list = await fetchProblemVehicles();
                if (mounted) setProblems(list || []);
            } catch (e) {
                console.error("Failed to fetch problem vehicles", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // Load persisted restart lock and engine status overrides
    useEffect(() => {
        try {
            setNoRestartMap(typedStorage.vehicles.getNoRestartMap() || {});
        } catch {}
        try {
            setEngineMap(typedStorage.vehicles.getEngineStatusMap() || {});
        } catch {}
    }, []);

    const openIssueModal = (prefill = {}) => {
        setIssueInitial(prefill || {});
        setShowIssueModal(true);
    };

    const handleIssueSubmit = async (data) => {
        await createIssueDraft(data);
        setShowIssueModal(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const {
        selected,
        toggleSelect,
        toggleSelectAllVisible,
        selectedCount,
        allVisibleSelected,
        clearSelection
    } = useTableSelection(problems, 'rental_id');

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        const ok = window.confirm("선택한 항목을 삭제하시겠습니까?");
        if (!ok) return;
        setProblems((prev) => prev.filter((p) => !selected.has(p.rental_id)));
        clearSelection();
    };

    const toggleRestartLock = (vin) => {
        setNoRestartMap((prev) => {
            const next = { ...prev, [vin]: !prev?.[vin] };
            try {
                typedStorage.vehicles.setNoRestartMap(next);
            } catch {}
            return next;
        });
    };

    const gotoMapFor = (vin) => {
        if (!vin) return;
        navigate(`/rentals/map?vin=${encodeURIComponent(vin)}`);
    };

    const openLocationPopup = (vin) => {
        setLocationVin(vin || null);
    };

    // Initialize/Update mini map for location popup
    useEffect(() => {
        const L = window.L;
        if (!locationVin) {
            // Cleanup map when closing
            try {
                if (miniMapInstanceRef.current) {
                    miniMapInstanceRef.current.remove();
                }
            } catch {}
            miniMapInstanceRef.current = null;
            miniLayerRef.current = null;
            return;
        }
        if (!L) return; // Leaflet not loaded
        const p = (problems || []).find((x) => String(x.vin) === String(locationVin));
        const cp = p?.current_location;
        if (!cp || typeof cp.lat !== "number" || typeof cp.lng !== "number") return;

        let map = miniMapInstanceRef.current;
        if (!map) {
            map = L.map(miniMapRef.current, { zoomControl: true, attributionControl: true });
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors",
            }).addTo(map);
            miniMapInstanceRef.current = map;
        }
        try {
            map.invalidateSize();
        } catch {}
        map.setView([cp.lat, cp.lng], 15);

        // Clear previous layer group
        try {
            if (miniLayerRef.current) {
                map.removeLayer(miniLayerRef.current);
            }
        } catch {}

        const lg = L.layerGroup();
        miniLayerRef.current = lg;

        const issue = String(p.issue || "");
        const isStolen = issue.indexOf("stolen") !== -1;
        const className = isStolen ? "marker marker--suspicious" : "marker marker--rented";
        const IconComp = isStolen ? FiAlertTriangle : FaCar;
        const svg = renderToStaticMarkup(<IconComp className="map-icon-svg" aria-hidden />);
        const icon = L.divIcon({ className, html: svg, iconSize: [28, 28] });
        const m = L.marker([cp.lat, cp.lng], { icon, zIndexOffset: isStolen ? 3000 : 1000 });
        m.bindTooltip(`${p.plate || p.vin || "Vehicle"}`, { permanent: false, direction: "top" });
        lg.addLayer(m);
        try {
            const circle = L.circle([cp.lat, cp.lng], { radius: 60, color: "#0b57d0", fillColor: "#0b57d0", fillOpacity: 0.08, weight: 1 });
            lg.addLayer(circle);
        } catch {}
        lg.addTo(map);
    }, [locationVin, problems]);

    return (
        <div className="page">
            <h1>반납지연/도난 현황</h1>

            <div className="asset-toolbar" style={{ marginTop: 8 }}>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="form-button" onClick={() => openIssueModal({})}>
                        이슈차량 등록
                    </button>
                    <button
                        type="button"
                        className="form-button"
                        style={{ background: "#c62828" }}
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                        title={selectedCount === 0 ? "삭제할 항목을 선택하세요" : "선택 항목 삭제"}
                    >
                        삭제
                    </button>
                    {saved && (
                        <span className="saved-indicator" aria-live="polite">
                            Saved
                        </span>
                    )}
                </div>
            </div>

            <div className="table-wrap">
                <table className="asset-table">
                    <thead>
                        <tr>
                            <th style={{ width: 36, textAlign: "center" }}>
                                <input
                                    type="checkbox"
                                    aria-label="현재 목록 전체 선택"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                />
                            </th>
                            <th>차량번호</th>
                            <th>차종</th>
                            <th>대여기간</th>
                            <th>대여자</th>
                            <th>연락처</th>
                            <th>이슈</th>
                            <th>단말상태</th>
                            <th>엔진상태</th>
                            <th>재시동금지</th>
                            <th>현위치</th>
                        </tr>
                    </thead>
                    <tbody>
                        {problems.map((p) => (
                            <tr
                                key={p.rental_id}
                                onClick={() => openIssueModal({ vin: p.vin, type: (p.issue || "").includes("stolen") ? "stolen" : "overdue" })}
                                style={{ cursor: "pointer" }}
                                title="행을 클릭하면 이슈 등록 창이 열립니다."
                            >
                                <td style={{ textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        aria-label={`선택: ${p.plate || p.rental_id}`}
                                        checked={selected.has(p.rental_id)}
                                        onChange={() => toggleSelect(p.rental_id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </td>
                                <td>{p.plate || (p.asset ? p.asset.plate : "-")}</td>
                                <td>{p.vehicleType || (p.asset ? p.asset.vehicleType : "-")}</td>
                                <td>
                                    {p?.rental_period?.start ? new Date(p.rental_period.start).toLocaleDateString() : "-"} ~{" "}
                                    {p?.rental_period?.end ? new Date(p.rental_period.end).toLocaleDateString() : "-"}
                                </td>
                                <td>{p.renter_name || "-"}</td>
                                <td>{p.contact_number || "-"}</td>
                                <td>
                                    {(() => {
                                        const issue = String(p.issue || "");
                                        const isStolen = issue.indexOf("stolen") !== -1;
                                        const m = issue.match(/overdue\((\d+)d\)/);
                                        let text = "-";
                                        let cls = "";
                                        if (isStolen) {
                                            text = "도난 의심";
                                            cls = "badge--suspicious";
                                        } else if (m) {
                                            text = "연체 " + m[1] + "일";
                                            cls = "badge--overdue";
                                        }
                                        return <RentalStatusBadge status={text} />;
                                    })()}
                                </td>
                                <td>
                                    {(() => {
                                        const deviceSerial = p?.asset?.deviceSerial || "";
                                        const installed = Boolean(deviceSerial && String(deviceSerial).trim());
                                        return <DeviceStatusBadge installed={installed} />;
                                    })()}
                                </td>
                                <td>
                                    {(() => {
                                        const override = typeof engineMap?.[p.vin] === "boolean" ? engineMap[p.vin] : null;
                                        const engineOn = override ?? false;
                                        return <EngineStatusBadge engineOn={engineOn} />;
                                    })()}
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className={`mini-button ${noRestartMap?.[p.vin] ? "is-on" : ""}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRestartLock(p.vin);
                                        }}
                                        aria-pressed={!!noRestartMap?.[p.vin]}
                                        title="재시동 금지 토글"
                                    >
                                        {noRestartMap?.[p.vin] ? "ON" : "OFF"}
                                    </button>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="mini-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openLocationPopup(p.vin);
                                        }}
                                        title="현 위치 보기"
                                    >
                                        현 위치
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal
                isOpen={!!locationVin}
                onClose={() => setLocationVin(null)}
                showFooter={false}
                className="has-overlay"
                customHeaderContent={
                    <div className="header-row has-overlay" style={{ marginBottom: 8, position: "relative" }}>
                        <strong>현 위치</strong>
                        <div style={{ marginLeft: "auto" }}>
                            <button type="button" className="form-button" style={{ background: "#777" }} onClick={() => setLocationVin(null)}>
                                닫기
                            </button>
                        </div>
                        <div className="modal-title-overlay">
                            {(() => {
                                const p = (problems || []).find((x) => String(x.vin) === String(locationVin));
                                const label = p?.plate || p?.vin || "";
                                return label ? `${label}의 현재 위치` : "현재 위치";
                            })()}
                        </div>
                    </div>
                }
            >
                {(() => {
                    const p = (problems || []).find((x) => String(x.vin) === String(locationVin));
                    const cp = p?.current_location;
                    if (!cp || typeof cp.lat !== "number" || typeof cp.lng !== "number") {
                        return <div className="empty">현재 위치 정보가 없습니다.</div>;
                    }
                    return <div ref={miniMapRef} className="map-container mini-map" />;
                })()}
            </Modal>
            {problems.length === 0 && <div className="empty">문제 차량이 없습니다.</div>}

            <Modal
                isOpen={showIssueModal}
                onClose={() => setShowIssueModal(false)}
                title="이슈차량 등록"
                showFooter={false}
                ariaLabel="이슈차량 등록"
            >
                <IssueForm initial={issueInitial} onSubmit={handleIssueSubmit} />
            </Modal>
        </div>
    );
}
