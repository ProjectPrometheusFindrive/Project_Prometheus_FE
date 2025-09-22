import React, { useEffect, useMemo, useState } from "react";
import { resolveVehicleRentals, fetchAssetById, fetchAssets, saveAsset } from "../api";
import AssetForm from "../components/forms/AssetForm";
import DeviceInfoForm from "../components/forms/DeviceInfoForm";
import Modal from "../components/Modal";
import Table from "../components/Table";
import useTableSelection from "../hooks/useTableSelection";
import { typedStorage } from "../utils/storage";
import { COLORS, DIMENSIONS, ASSET } from "../constants";
import { formatDateShort } from "../utils/date";
import InfoGrid from "../components/InfoGrid";
import AssetDialog from "../components/AssetDialog";
import InsuranceDialog from "../components/InsuranceDialog";
import { FaEdit, FaSave, FaTimes, FaCog, FaEye, FaEyeSlash, FaGripVertical } from "react-icons/fa";

// 진단 코드 분류별 개수를 계산하는 함수
const calculateDiagnosticCodes = (vehicle) => {
    // 각 차량의 진단 코드 데이터를 기반으로 분류별 개수 계산
    const codes = vehicle.diagnosticCodes || {};
    return {
        분류1: codes.category1 || 0,
        분류2: codes.category2 || 0,
        분류3: codes.category3 || 0,
        분류4: codes.category4 || 0,
    };
};

// 진단 코드 세부 정보를 생성하는 함수
const generateDiagnosticDetails = (category, count, vehicleInfo) => {
    const categoryNames = {
        분류1: "엔진/동력계",
        분류2: "브레이크/안전",
        분류3: "전기/전자",
        분류4: "편의/기타",
    };

    const sampleIssues = {
        분류1: ["엔진 온도 이상", "연료 시스템 경고", "배기가스 수치 높음", "터보차저 압력 부족", "점화 플러그 교체 필요"],
        분류2: ["브레이크 패드 마모", "ABS 센서 오류", "타이어 공기압 부족", "안전벨트 센서 이상", "에어백 경고등"],
        분류3: ["배터리 전압 부족", "충전 시스템 이상", "ECU 통신 오류", "센서 데이터 불일치", "전조등 오작동"],
        분류4: ["에어컨 냉매 부족", "파워 스티어링 오일", "와이퍼 교체 필요", "오디오 시스템 오류", "도어락 작동 불량"],
    };

    const issues = sampleIssues[category] || [];
    const selectedIssues = issues.slice(0, Math.min(count, issues.length));

    return {
        category,
        categoryName: categoryNames[category] || category,
        count,
        vehicleInfo,
        issues: selectedIssues.map((issue, index) => ({
            id: `${category}-${index}`,
            code: `${category.slice(-1)}${String(index + 1).padStart(3, "0")}`,
            description: issue,
            severity: Math.random() > 0.7 ? "높음" : Math.random() > 0.4 ? "보통" : "낮음",
            detectedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        })),
    };
};

// 관리단계를 결정하는 함수
const getManagementStage = (vehicle) => {
    // 차량의 상태에 따라 관리단계 결정
    const { registrationStatus, deviceSerial, vehicleStatus, diagnosticCodes } = vehicle;

    // 우선순위에 따른 단계 결정
    if (vehicleStatus === "수리중" || vehicleStatus === "점검중") {
        return "수리/점검 중";
    }

    if (vehicleStatus === "대여중") {
        return "대여 중";
    }

    if (!deviceSerial) {
        if (registrationStatus === "자산등록 완료") {
            return "입고대상";
        }
        return "전산등록완료";
    }

    if (deviceSerial && registrationStatus === "장비장착 완료") {
        const codes = diagnosticCodes || {};
        const totalIssues = (codes.category1 || 0) + (codes.category2 || 0) + (codes.category3 || 0) + (codes.category4 || 0);

        if (totalIssues > 5) {
            return "수리/점검 중";
        } else if (totalIssues > 0) {
            return "수리/점검 완료";
        } else {
            return vehicleStatus === "대기중" ? "대여 가능" : "단말 장착 완료";
        }
    }

    return "전산등록완료";
};

export default function AssetStatus() {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [rows, setRows] = useState([]);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [assetFormInitial, setAssetFormInitial] = useState({});
    const [editingAssetId, setEditingAssetId] = useState(null);
    const [assetRequireDocs, setAssetRequireDocs] = useState(true);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [activeAsset, setActiveAsset] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoVehicle, setInfoVehicle] = useState(null);
    const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
    const [diagnosticDetail, setDiagnosticDetail] = useState(null);
    const [editingMemo, setEditingMemo] = useState(null);
    const [memoText, setMemoText] = useState("");
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
    const [columnSettings, setColumnSettings] = useState(() => {
        const saved = localStorage.getItem("asset-columns-settings");
        return saved
            ? JSON.parse(saved)
            : {
                  columns: [
                      { key: "select", label: "선택", visible: true, required: true, width: 36 },
                      { key: "plate", label: "차량번호", visible: true, required: true },
                      { key: "vehicleType", label: "차종", visible: true, required: false },
                      { key: "registrationDate", label: "차량등록일", visible: true, required: false },
                      { key: "insuranceExpiryDate", label: "보험만료일", visible: true, required: false },
                      { key: "diagnosticCodes", label: "차량 상태", visible: true, required: false },
                      { key: "deviceStatus", label: "단말 상태", visible: true, required: false },
                      { key: "managementStage", label: "관리단계", visible: true, required: false },
                      { key: "memo", label: "메모", visible: true, required: false },
                  ],
              };
    });
    // Insurance modal state
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);
    const [insuranceAsset, setInsuranceAsset] = useState(null);
    const [insuranceReadOnly, setInsuranceReadOnly] = useState(false);
    const openInsuranceModal = (asset) => { setInsuranceReadOnly(false); setInsuranceAsset(asset); setShowInsuranceModal(true); };
    const openInsuranceModalReadOnly = (asset) => { setInsuranceReadOnly(true); setInsuranceAsset(asset); setShowInsuranceModal(true); };
    const closeInsuranceModal = () => { setInsuranceAsset(null); setShowInsuranceModal(false); setInsuranceReadOnly(false); };
    const handleInsuranceSubmit = async ({ insuranceInfo, insuranceExpiryDate }) => {
        const id = insuranceAsset?.id;
        if (!id) return;
        try {
            await saveAsset(id, { insuranceInfo: insuranceInfo || "", insuranceExpiryDate: insuranceExpiryDate || "" });
            setRows((prev) => prev.map((a) => (a.id === id ? { ...a, insuranceInfo: insuranceInfo || a.insuranceInfo, insuranceExpiryDate: insuranceExpiryDate || a.insuranceExpiryDate } : a)));
            closeInsuranceModal();
        } catch (e) {
            console.error("Failed to save insurance", e);
            alert("보험 정보 저장에 실패했습니다.");
        }
    };

    // inline panel removed

    const deviceInitial = useMemo(() => {
        if (!activeAsset) return {};
        return typedStorage.devices.getInfo(activeAsset.id);
    }, [activeAsset]);

    // Date formatting handled by utils/date

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const list = await fetchAssets();
                let next = Array.isArray(list) ? list.map((a) => ({ ...a })) : [];
                try {
                    const map = typedStorage.devices.getAll() || {};
                    next = next.map((a) => {
                        const info = map[a.id];
                        return info ? { ...a, deviceSerial: info.serial || a.deviceSerial, installer: info.installer || a.installer } : a;
                    });
                } catch {}
                // For demo: ensure one vehicle shows no insurance data
                try {
                    next = next.map((a) => (a.plate === "05가0962" ? { ...a, insuranceInfo: "", insuranceExpiryDate: "" } : a));
                } catch {}
                if (mounted) setRows(next);
            } catch (e) {
                console.error("Failed to load assets", e);
                if (mounted) setRows([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // 컬럼 드롭다운 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showColumnDropdown && !event.target.closest("[data-column-dropdown]")) {
                setShowColumnDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showColumnDropdown]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows.filter((a) => {
            const matchesTerm = term
                ? [a.plate, a.vehicleType, a.insuranceInfo, a.registrationDate, a.registrationStatus, a.installer, a.deviceSerial, a.id, a.memo].filter(Boolean).join(" ").toLowerCase().includes(term)
                : true;
            const matchesStatus = status === "all" ? true : a.registrationStatus === status;
            return matchesTerm && matchesStatus;
        });
    }, [q, status, rows]);

    const selection = useTableSelection(filtered, "id");
    const { selected, selectedCount, clearSelection } = selection;

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        const ok = window.confirm("선택한 항목을 삭제하시겠습니까?");
        if (!ok) return;
        setRows((prev) => prev.filter((a) => !selected.has(a.id)));
        clearSelection();
    };

    const openInfoModal = async (asset) => {
        if (!asset) return;
        let assetFull = asset;
        try {
            if (asset?.id) {
                const fetched = await fetchAssetById(asset.id);
                if (fetched) assetFull = fetched;
            }
        } catch {}
        let rental = null;
        try {
            if (assetFull?.vin) {
                const status = await resolveVehicleRentals(assetFull.vin);
                rental = status?.current || null;
            }
        } catch {}
        setInfoVehicle({ asset: assetFull, rental, vin: assetFull?.vin || asset?.vin || null });
        setShowInfoModal(true);
    };

    const openDeviceModal = (asset) => {
        setActiveAsset(asset);
        setShowDeviceModal(true);
    };

    const openAssetCreate = () => {
        setAssetFormInitial({});
        setEditingAssetId(null);
        setAssetRequireDocs(true);
        setShowAssetModal(true);
    };

    const openAssetEdit = (asset) => {
        const initial = {
            plate: asset?.plate || "",
            make: asset?.make || "",
            model: asset?.model || "",
            vin: asset?.vin || "",
            vehicleValue: asset?.vehicleValue || "",
            purchaseDate: asset?.purchaseDate || "",
            systemRegDate: asset?.systemRegDate || "",
            systemDelDate: asset?.systemDelDate || "",
            vehicleType: asset?.vehicleType || "",
            registrationStatus: asset?.registrationStatus || "자산등록 완료",
        };
        setAssetFormInitial(initial);
        setEditingAssetId(asset?.id || null);
        setAssetRequireDocs(false);
        setShowAssetModal(true);
    };

    const openDiagnosticModal = (vehicle, category, count) => {
        const detail = generateDiagnosticDetails(category, count, {
            plate: vehicle.plate,
            vehicleType: vehicle.vehicleType,
            id: vehicle.id,
        });
        setDiagnosticDetail(detail);
        setShowDiagnosticModal(true);
    };

    const handleDeviceInfoSubmit = (form) => {
        if (!activeAsset) return;

        const deviceInfo = {
            supplier: form.supplier || "",
            installDate: form.installDate || "",
            installer: form.installer || "",
            serial: form.serial || "",
            updatedAt: new Date().toISOString(),
        };

        typedStorage.devices.setInfo(activeAsset.id, deviceInfo);
        setRows((prev) => prev.map((a) => (a.id === activeAsset.id ? { ...a, deviceSerial: form.serial || a.deviceSerial, installer: form.installer || a.installer } : a)));
        setShowDeviceModal(false);
        setActiveAsset(null);
    };

    const nextAssetId = () => {
        const prefix = ASSET.ID_PREFIX;
        let max = 0;
        for (const a of rows) {
            const m = String(a.id || "").match(/(\d{1,})$/);
            if (m && m[1]) {
                const n = parseInt(m[1], 10);
                if (!Number.isNaN(n)) max = Math.max(max, n);
            }
        }
        return `${prefix}${String(max + 1).padStart(4, "0")}`;
    };

    const handleAssetSubmit = (data) => {
        // Compose vehicleType from make/model when available
        const composedVehicleType = data.vehicleType || [data.make, data.model].filter(Boolean).join(" ");

        if (editingAssetId) {
            // Update existing asset
            setRows((prev) =>
                prev.map((a) =>
                    a.id === editingAssetId
                        ? {
                              ...a,
                              plate: data.plate || a.plate,
                              vehicleType: composedVehicleType || a.vehicleType,
                              make: data.make || a.make,
                              model: data.model || a.model,
                              vin: data.vin || a.vin,
                              vehicleValue: data.vehicleValue || a.vehicleValue,
                              purchaseDate: data.purchaseDate || a.purchaseDate,
                              systemRegDate: data.systemRegDate || a.systemRegDate,
                              systemDelDate: data.systemDelDate || a.systemDelDate,
                              registrationStatus: data.registrationStatus || a.registrationStatus,
                          }
                        : a
                )
            );
        } else {
            // Create new asset
            const id = nextAssetId();
            const next = {
                id,
                plate: data.plate || "",
                vehicleType: composedVehicleType || "",
                make: data.make || "",
                model: data.model || "",
                vin: data.vin || "",
                vehicleValue: data.vehicleValue || "",
                purchaseDate: data.purchaseDate || "",
                systemRegDate: data.systemRegDate || new Date().toISOString().slice(0, 10),
                systemDelDate: data.systemDelDate || "",
                insuranceInfo: "",
                registrationDate: data.registrationDate || new Date().toISOString().slice(0, 10),
                registrationStatus: data.registrationStatus || "자산등록 완료",
                installer: "",
                deviceSerial: "",
            };
            setRows((prev) => [next, ...prev]);
            const { registrationDoc, insuranceDoc, ...rest } = data || {};
            const draft = { ...rest, createdAt: new Date().toISOString(), id };
            typedStorage.drafts.addAsset(draft);
        }

        setShowAssetModal(false);
        setAssetFormInitial({});
        setEditingAssetId(null);
        setAssetRequireDocs(true);
    };

    const handleMemoEdit = (assetId, currentMemo) => {
        setEditingMemo(assetId);
        setMemoText(currentMemo || "");
    };

    const handleMemoSave = async (assetId) => {
        try {
            await saveAsset(assetId, { memo: memoText });
            setRows((prev) => prev.map((asset) => (asset.id === assetId ? { ...asset, memo: memoText } : asset)));
            setEditingMemo(null);
            setMemoText("");
        } catch (error) {
            console.error("Failed to save memo:", error);
            alert("메모 저장에 실패했습니다.");
        }
    };

    const handleMemoCancel = () => {
        setEditingMemo(null);
        setMemoText("");
    };

    // 컬럼 설정 관련 함수들
    const saveColumnSettings = (newSettings) => {
        setColumnSettings(newSettings);
        localStorage.setItem("asset-columns-settings", JSON.stringify(newSettings));
    };

    const toggleColumnVisibility = (columnKey) => {
        const newSettings = {
            ...columnSettings,
            columns: columnSettings.columns.map((col) => (col.key === columnKey && !col.required ? { ...col, visible: !col.visible } : col)),
        };
        saveColumnSettings(newSettings);
    };

    const moveColumn = (fromIndex, toIndex) => {
        const newColumns = [...columnSettings.columns];
        const [movedColumn] = newColumns.splice(fromIndex, 1);
        newColumns.splice(toIndex, 0, movedColumn);
        saveColumnSettings({
            ...columnSettings,
            columns: newColumns,
        });
    };

    // 드래그&드롭 이벤트 핸들러들
    const handleDragStart = (e, index) => {
        setDraggedColumnIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverColumnIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverColumnIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedColumnIndex !== null && draggedColumnIndex !== dropIndex) {
            moveColumn(draggedColumnIndex, dropIndex);
        }
        setDraggedColumnIndex(null);
        setDragOverColumnIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedColumnIndex(null);
        setDragOverColumnIndex(null);
    };

    const visibleColumns = columnSettings.columns.filter((col) => col.visible);

    // 각 컬럼의 셀 내용을 렌더링하는 함수
    const renderCellContent = (column, row) => {
        switch (column.key) {
            case "select":
                return null; // Table 컴포넌트에서 자동 처리
            case "plate":
                return (
                    <button type="button" onClick={() => openAssetEdit(row)} className="link-button" title="자산 등록/편집">
                        {row.plate}
                    </button>
                );
            case "vehicleType":
                return row.vehicleType;
            case "registrationDate":
                return formatDateShort(row.registrationDate);
            case "insuranceExpiryDate":
                if (row.insuranceExpiryDate) {
                    return (
                        <button type="button" className="link-button" onClick={() => openInsuranceModalReadOnly(row)} title="보험 정보 보기">
                            {formatDateShort(row.insuranceExpiryDate)}
                        </button>
                    );
                }
                return (
                    <button type="button" className="form-button" onClick={() => openInsuranceModal(row)}>
                        보험 등록
                    </button>
                );
            case "deviceStatus":
                const hasDevice = row.deviceSerial;
                const status = hasDevice ? "연결됨" : "미연결";
                return <span className={`badge ${hasDevice ? "badge--on" : "badge--off"}`}>{status}</span>;
            case "managementStage":
                const stage = getManagementStage(row);
                const stageClass = {
                    "수리/점검 중": "badge--maintenance",
                    입고대상: "badge--pending",
                    "대여 가능": "badge--available",
                    "대여 중": "badge--rented",
                    "수리/점검 완료": "badge--completed",
                    "단말 장착 완료": "badge--installed",
                    전산등록완료: "badge--registered",
                };
                return <span className={`badge ${stageClass[stage] || "badge--default"}`}>{stage}</span>;
            case "diagnosticCodes":
                const codes = calculateDiagnosticCodes(row);
                return (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {Object.entries(codes).map(
                            ([category, count]) =>
                                count > 0 && (
                                    <button
                                        key={category}
                                        type="button"
                                        className="badge badge--diagnostic badge--clickable"
                                        style={{ fontSize: "10px", padding: "2px 6px", cursor: "pointer", border: "none" }}
                                        onClick={() => openDiagnosticModal(row, category, count)}
                                        title={`${category} 세부 진단 보기`}
                                    >
                                        {category} {count}개
                                    </button>
                                )
                        )}
                        {Object.values(codes).every((count) => count === 0) && <span className="badge badge--normal">정상</span>}
                    </div>
                );
            case "memo":
                return (
                    <div style={{ maxWidth: "150px" }}>
                        {editingMemo === row.id ? (
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
                                        fontSize: "0.85rem",
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleMemoSave(row.id)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#4caf50",
                                        cursor: "pointer",
                                        padding: "2px",
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
                                        padding: "2px",
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
                                        maxWidth: "100px",
                                    }}
                                    title={row.memo}
                                >
                                    {row.memo || "메모 없음"}
                                </span>
                                <button
                                    onClick={() => handleMemoEdit(row.id, row.memo)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#1976d2",
                                        cursor: "pointer",
                                        padding: "2px",
                                    }}
                                >
                                    <FaEdit size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            default:
                return "-";
        }
    };

    // 동적 컬럼 생성
    const dynamicColumns = visibleColumns
        .filter((col) => col.key !== "select") // select는 Table 컴포넌트에서 자동 처리
        .map((column) => ({
            key: column.key,
            label: column.label,
            render: (row) => renderCellContent(column, row),
        }));

    return (
        <div className="page">
            <h1>자산등록관리</h1>

            <div className="asset-toolbar">
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="form-button" onClick={openAssetCreate}>
                        자산 등록
                    </button>
                    <button
                        type="button"
                        className="form-button"
                        style={{ background: COLORS.DANGER }}
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                        title={selectedCount === 0 ? "삭제할 항목을 선택하세요" : "선택 항목 삭제"}
                    >
                        선택 삭제
                    </button>
                    <div style={{ position: "relative" }} data-column-dropdown>
                        <button type="button" className="form-button" onClick={() => setShowColumnDropdown(!showColumnDropdown)} style={{ background: "#607d8b", display: "flex", alignItems: "center", gap: "4px" }} title="컬럼 설정">
                            <FaCog size={14} />
                            컬럼 설정
                        </button>
                        {showColumnDropdown && (
                            <div
                                data-column-dropdown
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    backgroundColor: "white",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    zIndex: 1000,
                                    minWidth: "200px",
                                    padding: "8px 0",
                                    marginTop: "4px",
                                }}
                            >
                                <div style={{ padding: "8px 12px", borderBottom: "1px solid #eee", fontSize: "0.9rem", fontWeight: "600" }}>컬럼 표시 설정</div>
                                {columnSettings.columns.map((column, index) => (
                                    <div
                                        key={column.key}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "6px 12px",
                                            cursor: column.required ? "not-allowed" : "pointer",
                                            opacity: draggedColumnIndex === index ? 0.5 : column.required ? 0.6 : 1,
                                            backgroundColor: dragOverColumnIndex === index ? "#e3f2fd" : "transparent",
                                            borderLeft: dragOverColumnIndex === index ? "3px solid #2196f3" : "3px solid transparent",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        <div style={{ marginRight: "8px", cursor: "grab" }}>
                                            <FaGripVertical size={10} color="#999" />
                                        </div>
                                        <div
                                            style={{ marginRight: "8px", width: "16px", textAlign: "center" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                !column.required && toggleColumnVisibility(column.key);
                                            }}
                                        >
                                            {column.visible ? <FaEye size={12} color="#4caf50" /> : <FaEyeSlash size={12} color="#f44336" />}
                                        </div>
                                        <span style={{ fontSize: "0.85rem", flex: 1 }}>{column.label}</span>
                                        {column.required && <span style={{ fontSize: "0.7rem", color: "#999" }}>필수</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal isOpen={showAssetModal} onClose={() => setShowAssetModal(false)} title="자산 등록" showFooter={false}>
                {(() => {
                    const current = editingAssetId ? rows.find((r) => r.id === editingAssetId) : {};
                    const data = { ...(current || {}), ...(assetFormInitial || {}) };
                    return (
                        <AssetDialog
                            asset={data}
                            mode={editingAssetId ? "edit" : "create"}
                            onClose={() => setShowAssetModal(false)}
                            onSubmit={(formData) => handleAssetSubmit(formData)}
                            requireDocs={assetRequireDocs}
                        />
                    );
                })()}
            </Modal>
            <Modal
                isOpen={showInsuranceModal && !!insuranceAsset}
                onClose={closeInsuranceModal}
                title={`${insuranceReadOnly ? "보험 정보" : "보험 등록"} - ${insuranceAsset?.plate || ""}`}
                showFooter={false}
            >
                <InsuranceDialog asset={insuranceAsset || {}} onClose={closeInsuranceModal} onSubmit={handleInsuranceSubmit} readOnly={insuranceReadOnly} />
            </Modal>

            <Modal
                isOpen={showDeviceModal && activeAsset}
                onClose={() => setShowDeviceModal(false)}
                title={`단말 정보 등록 - ${activeAsset?.id || ""}`}
                formId="device-info"
                onSubmit={handleDeviceInfoSubmit}
            >
                <DeviceInfoForm formId="device-info" initial={deviceInitial} onSubmit={handleDeviceInfoSubmit} showSubmit={false} />
            </Modal>

            <Table columns={dynamicColumns} data={filtered} selection={selection} emptyMessage="조건에 맞는 차량 자산이 없습니다." />

            {/* inline panel removed */}
            <Modal
                isOpen={showInfoModal && infoVehicle}
                onClose={() => setShowInfoModal(false)}
                title={`차량 상세 정보${infoVehicle?.asset?.plate ? ` - ${infoVehicle.asset.plate}` : ""}`}
                showFooter={false}
                ariaLabel="차량 상세 정보"
            >
                <div className="grid-2col">
                    <section className="card card-padding">
                        <h3 className="section-title section-margin-0">자산 정보</h3>
                        <InfoGrid
                            items={[
                                { key: "plate", label: "차량번호", value: <strong>{infoVehicle?.asset?.plate || "-"}</strong> },
                                { key: "vehicleType", label: "차종", value: infoVehicle?.asset?.vehicleType },
                                { key: "makeModel", label: "제조사/모델", value: [infoVehicle?.asset?.make, infoVehicle?.asset?.model], type: "makeModel" },
                                { key: "yearFuel", label: "연식/연료", value: [infoVehicle?.asset?.year, infoVehicle?.asset?.fuelType], type: "yearFuel" },
                                { key: "vin", label: "VIN", value: infoVehicle?.asset?.vin || infoVehicle?.vin },
                                { key: "insurance", label: "보험/공제", value: infoVehicle?.asset?.insuranceInfo },
                                { key: "registrationDate", label: "차량 등록일", value: infoVehicle?.asset?.registrationDate, type: "date" },
                                { key: "status", label: "등록 상태", value: infoVehicle?.asset?.registrationStatus },
                                { key: "installer", label: "설치자", value: infoVehicle?.asset?.installer },
                                { key: "deviceSerial", label: "기기 시리얼", value: infoVehicle?.asset?.deviceSerial },
                            ]}
                        />
                    </section>

                    <section className="card card-padding">
                        <h3 className="section-title section-margin-0">대여 정보</h3>
                        <InfoGrid
                            items={[
                                { key: "rentalId", label: "계약번호", value: infoVehicle?.rental?.rental_id },
                                { key: "renterName", label: "대여자", value: infoVehicle?.rental?.renter_name },
                                { key: "contact", label: "연락처", value: infoVehicle?.rental?.contact_number },
                                { key: "address", label: "주소", value: infoVehicle?.rental?.address },
                                { key: "period", label: "대여 기간", value: infoVehicle?.rental?.rental_period, type: "dateRange" },
                                { key: "insurance", label: "보험사", value: infoVehicle?.rental?.insurance_name },
                                { key: "rentalLocation", label: "대여 위치", value: infoVehicle?.rental?.rental_location, type: "location" },
                                { key: "returnLocation", label: "반납 위치", value: infoVehicle?.rental?.return_location, type: "location" },
                                { key: "currentLocation", label: "현재 위치", value: infoVehicle?.rental?.current_location, type: "location" },
                            ]}
                        />
                    </section>
                </div>
            </Modal>

            <Modal
                isOpen={showDiagnosticModal && diagnosticDetail}
                onClose={() => setShowDiagnosticModal(false)}
                title={`진단 코드 상세 - ${diagnosticDetail?.categoryName || ""} (${diagnosticDetail?.vehicleInfo?.plate || ""})`}
                showFooter={false}
                ariaLabel="진단 코드 상세 정보"
            >
                {diagnosticDetail && (
                    <div className="diagnostic-detail">
                        <div className="diagnostic-header">
                            <div className="diagnostic-info">
                                <h3>{diagnosticDetail.categoryName}</h3>
                                <p>
                                    차량: {diagnosticDetail.vehicleInfo.vehicleType} ({diagnosticDetail.vehicleInfo.plate})
                                </p>
                                <p>총 {diagnosticDetail.count}개의 진단 코드가 발견되었습니다.</p>
                            </div>
                        </div>

                        <div className="diagnostic-issues">
                            {diagnosticDetail.issues.length > 0 ? (
                                <div className="diagnostic-table">
                                    <div className="diagnostic-table-header">
                                        <div>코드</div>
                                        <div>내용</div>
                                        <div>심각도</div>
                                        <div>발견일</div>
                                    </div>
                                    {diagnosticDetail.issues.map((issue) => (
                                        <div key={issue.id} className="diagnostic-table-row">
                                            <div className="diagnostic-code">{issue.code}</div>
                                            <div className="diagnostic-description">{issue.description}</div>
                                            <div>
                                                <span className={`badge diagnostic-severity diagnostic-severity--${issue.severity === "높음" ? "high" : issue.severity === "보통" ? "medium" : "low"}`}>
                                                    {issue.severity}
                                                </span>
                                            </div>
                                            <div className="diagnostic-date">{issue.detectedDate}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>진단 코드 상세 정보를 불러오는 중...</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
