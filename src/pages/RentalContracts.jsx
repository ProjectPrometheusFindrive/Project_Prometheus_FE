import React, { useEffect, useMemo, useState } from "react";
import { fetchRentals } from "../api";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import useTableSelection from "../hooks/useTableSelection";
import StatusBadge from "../components/StatusBadge";
import KakaoMap from "../components/KakaoMap";
import { FaCar, FaEdit, FaSave, FaTimes, FaExclamationTriangle, FaMapMarkerAlt } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";

export default function RentalContracts() {
    const [items, setItems] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showLocationMap, setShowLocationMap] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);
    const [editingMemo, setEditingMemo] = useState(null);
    const [memoText, setMemoText] = useState("");

    // Initial load via fake API, then merge any local drafts once
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const base = await fetchRentals();
                let list = Array.isArray(base) ? base.map((r) => ({ ...r })) : [];
                try {
                    const raw = localStorage.getItem("rentalDrafts");
                    if (raw) {
                        const drafts = JSON.parse(raw);
                        if (Array.isArray(drafts)) {
                            const existingIds = new Set(list.map((x) => String(x.rental_id)));
                            const toAdd = drafts
                                .filter((d) => d && d.rental_id && !existingIds.has(String(d.rental_id)))
                                .map((d) => ({
                                    ...d,
                                    rental_period: d.rental_period || { start: d.start || "", end: d.end || "" },
                                }));
                            if (toAdd.length > 0) list = [...list, ...toAdd];
                        }
                    }
                } catch {}
                if (mounted) setItems(list);
            } catch (e) {
                console.error("Failed to load rentals", e);
                if (mounted) setItems([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const rows = useMemo(() => {
        const now = new Date();
        return items.map((r) => {
            const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
            const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
            const isActive = start && end ? now >= start && now <= end : false;
            const isOverdue = end ? now > end : false;
            const isStolen = Boolean(r.reported_stolen);
            const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
            // 계약 상태 결정
            let contractStatus = "예약 중";
            if (isStolen) {
                contractStatus = "도난의심";
            } else if (isOverdue) {
                contractStatus = "반납지연";
            } else if (isActive) {
                contractStatus = "대여중";
            } else if (r.accident_reported) {
                contractStatus = "사고접수";
            }

            // 대여금액 관련 정보
            const isLongTerm = (r.rental_duration_days || 0) > 30;
            const hasUnpaid = (r.unpaid_amount || 0) > 0;

            return {
                ...r,
                isActive,
                isOverdue,
                isStolen,
                overdueDays,
                contractStatus,
                isLongTerm,
                hasUnpaid,
                engineOn: r.engine_status === "on",
                restartBlocked: Boolean(r.restart_blocked),
                memo: r.memo || ""
            };
        });
    }, [items]);

    const { selected, toggleSelect, toggleSelectAllVisible, selectedCount, allVisibleSelected, clearSelection } = useTableSelection(rows, "rental_id");

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        const ok = window.confirm("Delete selected items?");
        if (!ok) return;
        setItems((prev) => prev.filter((r) => !selected.has(r.rental_id)));
        clearSelection();
    };

    const nextRentalId = () => {
        let max = 0;
        items.forEach((r) => {
            const n = parseInt(String(r.rental_id || 0), 10);
            if (!Number.isNaN(n)) max = Math.max(max, n);
        });
        return max + 1;
    };

    const handleCreateSubmit = (data) => {
        const { contract_file, driver_license_file, ...rest } = data || {};
        const rental_id = rest.rental_id && String(rest.rental_id).trim() ? rest.rental_id : nextRentalId();
        const normalized = {
            ...rest,
            rental_id,
            rental_period: { start: rest.start || "", end: rest.end || "" },
        };
        setItems((prev) => [normalized, ...prev]);
        try {
            const arr = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
            arr.push({ ...rest, rental_id, createdAt: new Date().toISOString() });
            localStorage.setItem("rentalDrafts", JSON.stringify(arr));
        } catch {}
        setShowCreate(false);
    };

    const handlePlateClick = (contract) => {
        setSelectedContract(contract);
        setShowDetail(true);
    };

    const handleToggleRestart = (rentalId) => {
        setItems((prev) =>
            prev.map((item) =>
                item.rental_id === rentalId
                    ? { ...item, restart_blocked: !item.restart_blocked }
                    : item
            )
        );
    };

    const handleMemoEdit = (rentalId, currentMemo) => {
        setEditingMemo(rentalId);
        setMemoText(currentMemo || "");
    };

    const handleMemoSave = (rentalId) => {
        setItems((prev) =>
            prev.map((item) =>
                item.rental_id === rentalId ? { ...item, memo: memoText } : item
            )
        );
        setEditingMemo(null);
        setMemoText("");
    };

    const handleMemoCancel = () => {
        setEditingMemo(null);
        setMemoText("");
    };

    const handleAccidentReport = (rentalId) => {
        const confirmReport = window.confirm("사고 접수를 진행하시겠습니까?\n사고 접수 후 계약 상태가 '사고접수'로 변경됩니다.");
        if (!confirmReport) return;

        setItems((prev) =>
            prev.map((item) =>
                item.rental_id === rentalId
                    ? {
                        ...item,
                        accident_reported: true,
                        memo: item.memo ? `${item.memo} / 사고 접수됨 (${new Date().toLocaleDateString()})` : `사고 접수됨 (${new Date().toLocaleDateString()})`
                    }
                    : item
            )
        );

        // 팝업 새로고침을 위해 selectedContract도 업데이트
        setSelectedContract(prev =>
            prev && prev.rental_id === rentalId
                ? {
                    ...prev,
                    accident_reported: true,
                    memo: prev.memo ? `${prev.memo} / 사고 접수됨 (${new Date().toLocaleDateString()})` : `사고 접수됨 (${new Date().toLocaleDateString()})`
                }
                : prev
        );

        alert("사고 접수가 완료되었습니다.");
    };

    const handleShowLocation = () => {
        setShowDetail(false);
        setShowLocationMap(true);
    };

    const handleBackToDetail = () => {
        setShowLocationMap(false);
        setShowDetail(true);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    };

    const getContractStatusBadge = (status) => {
        const statusMap = {
            "예약 중": { type: "pending", color: "#2196f3" },
            "대여중": { type: "rented", color: "#4caf50" },
            "사고접수": { type: "accident", color: "#ff9800" },
            "반납지연": { type: "overdue", color: "#f44336" },
            "도난의심": { type: "suspicious", color: "#9c27b0" }
        };
        const config = statusMap[status] || { type: "default", color: "#757575" };
        return (
            <StatusBadge style={{ backgroundColor: config.color, color: "white", fontSize: "0.8rem" }}>
                {status}
            </StatusBadge>
        );
    };

    const getRentalAmountBadges = (row) => {
        const amount = row.rental_amount || 0;
        const formattedAmount = new Intl.NumberFormat("ko-KR").format(amount);

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                    ₩{formattedAmount}
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    <StatusBadge style={{
                        backgroundColor: row.isLongTerm ? "#e3f2fd" : "#fff3e0",
                        color: row.isLongTerm ? "#1976d2" : "#f57c00",
                        fontSize: "0.7rem"
                    }}>
                        {row.isLongTerm ? "장기" : "단기"}
                    </StatusBadge>
                    <StatusBadge style={{ backgroundColor: "#f5f5f5", color: "#424242", fontSize: "0.7rem" }}>
                        {row.isLongTerm ? "월" + new Intl.NumberFormat("ko-KR").format(Math.floor(amount / Math.max(1, Math.floor((row.rental_duration_days || 1) / 30)))) : "총" + formattedAmount}
                    </StatusBadge>
                    {row.hasUnpaid && (
                        <StatusBadge style={{ backgroundColor: "#ffebee", color: "#c62828", fontSize: "0.7rem" }}>
                            미납
                        </StatusBadge>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="page">
            <h1>계약등록관리</h1>
            <div className="page-scroll">
                <div className="asset-toolbar" style={{ marginBottom: 12 }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="form-button" onClick={() => setShowCreate(true)}>
                            계약 등록
                        </button>
                        <button
                            type="button"
                            className="form-button"
                            style={{ background: "#c62828" }}
                            onClick={handleDeleteSelected}
                            disabled={selectedCount === 0}
                            title={selectedCount === 0 ? "Select rows to delete" : "Delete selected"}
                        >
                            선택 삭제
                        </button>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="asset-table rentals-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: "center" }}>
                                    <input type="checkbox" aria-label="Select all visible" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                                </th>
                                <th>차량번호</th>
                                <th>차종</th>
                                <th>예약자명</th>
                                <th>예약기간</th>
                                <th>대여금액</th>
                                <th>계약 상태</th>
                                <th>엔진 상태</th>
                                <th>재시동 금지</th>
                                <th>메모</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.rental_id}>
                                    <td style={{ textAlign: "center" }}>
                                        <input type="checkbox" aria-label={`Select: ${r.plate || r.rental_id}`} checked={selected.has(r.rental_id)} onChange={() => toggleSelect(r.rental_id)} />
                                    </td>
                                    <td>
                                        <button
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#1976d2",
                                                cursor: "pointer",
                                                textDecoration: "underline",
                                                padding: 0,
                                                font: "inherit"
                                            }}
                                            onClick={() => handlePlateClick(r)}
                                        >
                                            {r.plate || "-"}
                                        </button>
                                    </td>
                                    <td>{r.vehicleType || "-"}</td>
                                    <td>{r.renter_name || "-"}</td>
                                    <td>
                                        <div style={{ fontSize: "0.9rem", lineHeight: "1.4" }}>
                                            <div>{formatDateTime(r.rental_period?.start)} ~</div>
                                            <div>{formatDateTime(r.rental_period?.end)}</div>
                                        </div>
                                    </td>
                                    <td>{getRentalAmountBadges(r)}</td>
                                    <td>{getContractStatusBadge(r.contractStatus)}</td>
                                    <td>
                                        <StatusBadge style={{
                                            backgroundColor: r.engineOn ? "#4caf50" : "#f44336",
                                            color: "white"
                                        }}>
                                            {r.engineOn ? "ON" : "OFF"}
                                        </StatusBadge>
                                    </td>
                                    <td>
                                        <label className="status-toggle" style={{ margin: 0, display: "inline-flex" }}>
                                            <input
                                                type="checkbox"
                                                checked={r.restartBlocked}
                                                onChange={() => handleToggleRestart(r.rental_id)}
                                                style={{ display: "none" }}
                                            />
                                            <span
                                                className="toggle-btn"
                                                style={{
                                                    backgroundColor: r.restartBlocked ? "#f44336" : "#4caf50",
                                                    color: "white",
                                                    cursor: "pointer",
                                                    minWidth: "60px",
                                                    textAlign: "center",
                                                    fontSize: "0.8rem"
                                                }}
                                            >
                                                {r.restartBlocked ? "차단" : "허용"}
                                            </span>
                                        </label>
                                    </td>
                                    <td style={{ maxWidth: "150px" }}>
                                        {editingMemo === r.rental_id ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                <input
                                                    type="text"
                                                    value={memoText}
                                                    onChange={(e) => setMemoText(e.target.value)}
                                                    style={{
                                                        width: "100px",
                                                        padding: "4px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: "4px",
                                                        fontSize: "0.85rem"
                                                    }}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleMemoSave(r.rental_id)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#4caf50",
                                                        cursor: "pointer",
                                                        padding: "2px"
                                                    }}
                                                >
                                                    <FaSave size={12} />
                                                </button>
                                                <button
                                                    onClick={handleMemoCancel}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#f44336",
                                                        cursor: "pointer",
                                                        padding: "2px"
                                                    }}
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                <span
                                                    style={{
                                                        fontSize: "0.85rem",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        maxWidth: "100px"
                                                    }}
                                                    title={r.memo}
                                                >
                                                    {r.memo || "메모 없음"}
                                                </span>
                                                <button
                                                    onClick={() => handleMemoEdit(r.rental_id, r.memo)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#1976d2",
                                                        cursor: "pointer",
                                                        padding: "2px"
                                                    }}
                                                >
                                                    <FaEdit size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Rental" showFooter={false} ariaLabel="Create Rental">
                <RentalForm onSubmit={handleCreateSubmit} formId="rental-create" />
            </Modal>

            <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="계약 상세 정보" showFooter={false} ariaLabel="Contract Details">
                {selectedContract && (
                    <div style={{ padding: "20px" }}>
                        {/* 상단 액션 버튼들 */}
                        <div style={{
                            display: "flex",
                            gap: "10px",
                            marginBottom: "20px",
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px",
                            alignItems: "center"
                        }}>
                            <div style={{ flex: 1, fontSize: "0.9rem", color: "#666" }}>
                                빠른 액션
                            </div>
                            {/* 현재 위치 보기 버튼 */}
                            <button
                                onClick={handleShowLocation}
                                disabled={!selectedContract.current_location}
                                style={{
                                    background: selectedContract.current_location ? "#2196f3" : "#ccc",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    cursor: selectedContract.current_location ? "pointer" : "not-allowed",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "0.85rem",
                                    fontWeight: "500",
                                    opacity: selectedContract.current_location ? 1 : 0.6
                                }}
                                onMouseOver={(e) => {
                                    if (selectedContract.current_location) {
                                        e.target.style.background = "#1976d2";
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (selectedContract.current_location) {
                                        e.target.style.background = "#2196f3";
                                    }
                                }}
                                title={selectedContract.current_location ? "현재 위치를 지도에서 확인" : "현재 위치 정보 없음"}
                            >
                                <FaMapMarkerAlt size={14} />
                                현재 위치
                            </button>
                            {/* 사고 접수 버튼 */}
                            {!selectedContract.accident_reported ? (
                                <button
                                    onClick={() => handleAccidentReport(selectedContract.rental_id)}
                                    style={{
                                        background: "#ff5722",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 16px",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "0.85rem",
                                        fontWeight: "500"
                                    }}
                                    onMouseOver={(e) => e.target.style.background = "#e64919"}
                                    onMouseOut={(e) => e.target.style.background = "#ff5722"}
                                >
                                    <FaExclamationTriangle size={14} />
                                    사고 접수
                                </button>
                            ) : (
                                <StatusBadge style={{
                                    backgroundColor: "#ff9800",
                                    color: "white",
                                    fontSize: "0.8rem",
                                    padding: "6px 12px"
                                }}>
                                    <FaExclamationTriangle size={12} style={{ marginRight: "4px" }} />
                                    사고 접수됨
                                </StatusBadge>
                            )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>기본 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div><strong>차량번호:</strong> {selectedContract.plate || "-"}</div>
                                    <div><strong>차종:</strong> {selectedContract.vehicleType || "-"}</div>
                                    <div><strong>예약자명:</strong> {selectedContract.renter_name || "-"}</div>
                                    <div><strong>연락처:</strong> {selectedContract.contact_number || "-"}</div>
                                    <div><strong>면허번호:</strong> {selectedContract.license_number || "-"}</div>
                                </div>
                            </div>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>계약 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div><strong>계약 상태:</strong> {getContractStatusBadge(selectedContract.accident_reported ? "사고접수" : selectedContract.contractStatus)}</div>
                                    <div><strong>대여 시작:</strong> {formatDateTime(selectedContract.rental_period?.start)}</div>
                                    <div><strong>대여 종료:</strong> {formatDateTime(selectedContract.rental_period?.end)}</div>
                                    <div><strong>대여 기간:</strong> {selectedContract.rental_duration_days || "-"}일</div>
                                    <div><strong>보험사:</strong> {selectedContract.insurance_name || "-"}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>차량 상태</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <strong>엔진 상태:</strong>
                                        <StatusBadge style={{
                                            backgroundColor: selectedContract.engineOn ? "#4caf50" : "#f44336",
                                            color: "white",
                                            marginLeft: "8px"
                                        }}>
                                            {selectedContract.engineOn ? "ON" : "OFF"}
                                        </StatusBadge>
                                    </div>
                                    <div>
                                        <strong>재시동 금지:</strong>
                                        <StatusBadge style={{
                                            backgroundColor: selectedContract.restartBlocked ? "#f44336" : "#4caf50",
                                            color: "white",
                                            marginLeft: "8px"
                                        }}>
                                            {selectedContract.restartBlocked ? "차단" : "허용"}
                                        </StatusBadge>
                                    </div>
                                    <div><strong>위치:</strong> {selectedContract.location || "정보 없음"}</div>
                                    <div><strong>주행 거리:</strong> {selectedContract.mileage ? `${new Intl.NumberFormat("ko-KR").format(selectedContract.mileage)} km` : "-"}</div>
                                </div>
                            </div>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>금액 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div><strong>대여 금액:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.rental_amount || 0)}</div>
                                    <div><strong>보증금:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.deposit || 0)}</div>
                                    <div><strong>미납 금액:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.unpaid_amount || 0)}</div>
                                    <div><strong>결제 방법:</strong> {selectedContract.payment_method || "-"}</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>추가 정보</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div><strong>메모:</strong> {selectedContract.memo || "메모가 없습니다."}</div>
                                <div><strong>특이사항:</strong> {selectedContract.special_notes || "없음"}</div>
                                <div><strong>등록일:</strong> {selectedContract.created_at ? new Date(selectedContract.created_at).toLocaleString("ko-KR") : "-"}</div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* 현재 위치 지도 모달 */}
            <Modal isOpen={showLocationMap} onClose={() => setShowLocationMap(false)} title="현재 위치" showFooter={false} ariaLabel="Current Location Map">
                {selectedContract && (
                    <div style={{ padding: "20px" }}>
                        {/* 상단 정보 */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px",
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px"
                        }}>
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "4px" }}>
                                    {selectedContract.plate} ({selectedContract.vehicleType})
                                </div>
                                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                                    대여자: {selectedContract.renter_name}
                                </div>
                            </div>
                            <button
                                onClick={handleBackToDetail}
                                style={{
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "0.85rem"
                                }}
                                onMouseOver={(e) => e.target.style.background = "#5a6268"}
                                onMouseOut={(e) => e.target.style.background = "#6c757d"}
                            >
                                상세정보로 돌아가기
                            </button>
                        </div>

                        {/* 지도 영역 */}
                        {selectedContract.current_location ? (
                            <div>
                                <KakaoMap
                                    latitude={selectedContract.current_location.lat}
                                    longitude={selectedContract.current_location.lng}
                                    markerTitle={`${selectedContract.plate} (${selectedContract.vehicleType})`}
                                    width="100%"
                                    height="400px"
                                />
                                <div style={{
                                    marginTop: "10px",
                                    padding: "10px",
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    color: "#666",
                                    textAlign: "center"
                                }}>
                                    <div><strong>좌표:</strong> 위도 {selectedContract.current_location.lat}, 경도 {selectedContract.current_location.lng}</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                width: "100%",
                                height: "400px",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px dashed #dee2e6"
                            }}>
                                <FaMapMarkerAlt size={48} color="#adb5bd" style={{ marginBottom: "16px" }} />
                                <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#6c757d", marginBottom: "8px" }}>
                                    위치 정보 없음
                                </div>
                                <div style={{ fontSize: "0.9rem", color: "#adb5bd" }}>
                                    현재 차량의 위치 정보를 받을 수 없습니다.
                                </div>
                            </div>
                        )}

                        {/* 계약자 정보 */}
                        <div style={{
                            marginTop: "20px",
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px"
                        }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "10px" }}>
                                계약자 정보
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
                                <div><strong>계약자 이름:</strong> {selectedContract.renter_name || "-"}</div>
                                <div><strong>연락처:</strong> {selectedContract.contact_number || "-"}</div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <strong>계약자 주소:</strong> {selectedContract.address || "-"}
                                </div>
                            </div>
                        </div>

                        {/* 차량 및 단말 상태 정보 */}
                        <div style={{
                            marginTop: "15px",
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px"
                        }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "10px" }}>
                                차량 및 단말 상태
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
                                <div><strong>엔진 상태:</strong>
                                    <StatusBadge style={{
                                        backgroundColor: selectedContract.engineOn ? "#4caf50" : "#f44336",
                                        color: "white",
                                        marginLeft: "6px",
                                        fontSize: "0.7rem",
                                        padding: "2px 6px"
                                    }}>
                                        {selectedContract.engineOn ? "ON" : "OFF"}
                                    </StatusBadge>
                                </div>
                                <div><strong>단말 상태:</strong>
                                    <StatusBadge style={{
                                        backgroundColor: selectedContract.current_location ? "#4caf50" : "#f44336",
                                        color: "white",
                                        marginLeft: "6px",
                                        fontSize: "0.7rem",
                                        padding: "2px 6px"
                                    }}>
                                        {selectedContract.current_location ? "온라인" : "오프라인"}
                                    </StatusBadge>
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <strong>마지막 위치 업데이트:</strong> {
                                        selectedContract.current_location
                                            ? selectedContract.location_updated_at
                                                ? new Date(selectedContract.location_updated_at).toLocaleString("ko-KR")
                                                : new Date(Date.now() - Math.random() * 30 * 60 * 1000).toLocaleString("ko-KR")
                                            : "정보 없음"
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
