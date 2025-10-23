import React, { useEffect, useMemo, useState } from "react";
import { useConfirm } from "../contexts/ConfirmContext";
import { fetchRentals, fetchRentalsSummary, fetchRentalById, updateRental, createRental, deleteRental } from "../api";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import Table from "../components/Table";
import AccidentInfoModal from "../components/modals/AccidentInfoModal";
import useTableSelection from "../hooks/useTableSelection";
import StatusBadge from "../components/badges/StatusBadge";
import KakaoMap from "../components/KakaoMap";
import { FaExclamationTriangle, FaMapMarkerAlt, FaCog, FaCheck } from "react-icons/fa";
import VideoIcon from "../components/VideoIcon";
import UploadProgress from "../components/UploadProgress";
import { FiAlertTriangle } from "react-icons/fi";
import MemoHistoryModal from "../components/modals/MemoHistoryModal";
import { MemoCell, CompanyCell, PlateCell, RentalPeriodCell, RentalAmountCell } from "../components/cells";
import useMemoEditor from "../hooks/useMemoEditor";
import { computeContractStatus, toDate } from "../utils/contracts";
// (unused constants/uploads imports removed)
import { uploadMany } from "../utils/uploadHelpers";
import { parseCurrency } from "../utils/formatters";
import FilePreview from "../components/FilePreview";
import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../constants/auth";
import useColumnSettings from "../hooks/useColumnSettings";
import { VehicleTypeText } from "../components/cells";
import ColumnSettingsMenu from "../components/ColumnSettingsMenu";
import useAccidentReport from "../hooks/useAccidentReport";
import { emitToast } from "../utils/toast";


const DEFAULT_COLUMN_CONFIG = [
    { key: "select", label: "선택", visible: true, required: true, width: 36 },
    { key: "plate", label: "차량번호", visible: true, required: true },
    { key: "vehicleType", label: "차종", visible: true, required: false },
    { key: "renterName", label: "예약자명", visible: true, required: false },
    { key: "rentalPeriod", label: "예약기간", visible: true, required: false },
    { key: "rentalAmount", label: "대여금액", visible: true, required: false },
    { key: "contractStatus", label: "계약 상태", visible: true, required: false },
    { key: "engineStatus", label: "엔진 상태", visible: true, required: false },
    { key: "restartBlocked", label: "재시동 금지", visible: true, required: false },
    { key: "accident", label: "사고 등록", visible: true, required: false, width: 100 },
    { key: "memo", label: "메모", visible: true, required: false },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_SECOND_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

// Column merging is handled by useColumnSettings hook

export default function RentalContracts() {
    const confirm = useConfirm();
    const auth = useAuth();
    const isSuperAdmin = auth?.user?.role === ROLES.SUPER_ADMIN;
    const [items, setItems] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showLocationMap, setShowLocationMap] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);
    const { editingId: editingMemo, memoText, onEdit: onMemoEdit, onChange: onMemoChange, onCancel: onMemoCancel } = useMemoEditor();
    const [showMemoHistoryModal, setShowMemoHistoryModal] = useState(false);
    const [memoHistoryTarget, setMemoHistoryTarget] = useState(null); // { id, plate or renterName }
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
    const { columns, visibleColumns, toggleColumnVisibility, moveColumn } = useColumnSettings({
        storageKey: "rental-columns-settings",
        defaultColumns: DEFAULT_COLUMN_CONFIG,
    });
    const [toast, setToast] = useState(null);
    const {
        showAccidentModal,
        showAccidentInfoModal,
        accidentTarget,
        accidentForm,
        fileInputKey,
        uploadState,
        handleAccidentInputChange,
        handleAccidentFileChange,
        handleOpenAccidentModal,
        handleCloseAccidentModal,
        handleCloseAccidentInfoModal,
        handleAccidentSubmit,
    } = useAccidentReport({ setItems, setSelectedContract });

    // Initial load via API (prefer summary)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                let base = await fetchRentalsSummary().catch(() => null);
                if (!Array.isArray(base)) {
                    base = await fetchRentals();
                }
                const list = Array.isArray(base) ? base.map((r) => ({ ...r })) : [];
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

    const rows = useMemo(() => {
        const now = new Date();
        return items
            .filter((r) => {
                // 완료 제외
                const status = computeContractStatus(r, now);
                if (status === "완료") return false;

                // 문제 상태는 항상 표시
                if (status === "반납지연" || status === "도난의심" || status === "사고접수") return true;

                // 진행/예약 상태만 표시
                const isFuture = !!(toDate(r?.rentalPeriod?.start) && now < toDate(r.rentalPeriod.start));
                const isActive = !!(toDate(r?.rentalPeriod?.start) && toDate(r?.rentalPeriod?.end) && now >= toDate(r.rentalPeriod.start) && now <= toDate(r.rentalPeriod.end));
                return isActive || isFuture;
            })
            .map((r) => {
                const now = new Date();
                const end = toDate(r?.rentalPeriod?.end);
                const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
                const status = computeContractStatus(r, now);

                // 대여금액 관련 정보
                const isLongTerm = (r.rentalDurationDays || 0) > 30;
                const hasUnpaid = (r.unpaidAmount || 0) > 0;

                return {
                    ...r,
                    isActive: status === "대여중",
                    isOverdue: status === "반납지연",
                    isStolen: status === "도난의심",
                    overdueDays,
                    contractStatus: status,
                    isLongTerm,
                    hasUnpaid,
                    engineOn: r.engineStatus === "on",
                    restartBlocked: Boolean(r.restartBlocked),
                    memo: r.memo || "",
                };
            });
    }, [items]);

    const { selected, toggleSelect, toggleSelectAllVisible, selectedCount, allVisibleSelected, clearSelection } = useTableSelection(rows, "rentalId");

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        const ok = await confirm({ title: "선택 삭제", message: "선택한 항목을 삭제하시겠습니까?", confirmText: "삭제", cancelText: "취소" });
        if (!ok) return;
        const ids = Array.from(selected);
        try {
            await Promise.all(ids.map((id) => deleteRental(id).catch(() => false)));
        } catch (e) {
            console.error("Failed deleting some rentals", e);
        }
        setItems((prev) => prev.filter((r) => !selected.has(r.rentalId)));
        clearSelection();
    };

    const handleCreateSubmit = async (data) => {
        const { contractFile, driverLicenseFile, ...rest } = data || {};
        const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
        const contractFiles = toArray(contractFile);
        const licenseFiles = toArray(driverLicenseFile);

        const payload = {
            ...rest,
            rentalAmount: parseCurrency(rest.rentalAmount),
            deposit: parseCurrency(rest.deposit),
            rentalPeriod: { start: rest.start || "", end: rest.end || "" },
        };
        let created = null;
        try {
            created = await createRental(payload);
        } catch (e) {
            console.error("Failed to create rental via API", e);
            emitToast("계약 생성에 실패했습니다.", "error");
            return;
        }

        // Upload docs after rental creation (needs rentalId)
        if (created && (contractFiles.length > 0 || licenseFiles.length > 0)) {
            console.groupCollapsed("[upload-ui] rental create docs start");
            try {
                const rentalId = created.rentalId || rest.rentalId;
                const base = `rentals/${rentalId}`;
                const [contractRes, licenseRes] = await Promise.all([
                    uploadMany(contractFiles, { folder: `${base}/contracts`, label: "contracts" }),
                    uploadMany(licenseFiles, { folder: `${base}/licenses`, label: "licenses" }),
                ]);
                if ((contractRes.names.length > 0) || (licenseRes.names.length > 0)) {
                    const patch = {};
                    if (contractRes.names.length > 0) {
                        patch.contractDocNames = contractRes.names;
                        if (contractRes.urls.length > 0) patch.contractDocUrls = contractRes.urls;
                        if (contractRes.objects.length > 0) patch.contractDocGcsObjectNames = contractRes.objects;
                        patch.contractDocName = contractRes.names[0];
                        if (contractRes.urls[0]) patch.contractDocUrl = contractRes.urls[0];
                        if (contractRes.objects[0]) patch.contractDocGcsObjectName = contractRes.objects[0];
                    }
                    if (licenseRes.names.length > 0) {
                        patch.licenseDocNames = licenseRes.names;
                        if (licenseRes.urls.length > 0) patch.licenseDocUrls = licenseRes.urls;
                        if (licenseRes.objects.length > 0) patch.licenseDocGcsObjectNames = licenseRes.objects;
                        patch.licenseDocName = licenseRes.names[0];
                        if (licenseRes.urls[0]) patch.licenseDocUrl = licenseRes.urls[0];
                        if (licenseRes.objects[0]) patch.licenseDocGcsObjectName = licenseRes.objects[0];
                    }
                    await updateRental(created.rentalId, patch).catch((e) => console.warn("Failed to patch rental with doc URLs", e));
                    created = { ...created, ...patch };
                }
            } finally {
                console.groupEnd();
            }
        }

        setItems((prev) => [created || payload, ...prev]);
        setShowCreate(false);
    };

    const handlePlateClick = (contract) => {
        if (!contract) return;
        // Open with summary data, then hydrate with full details
        setSelectedContract(contract);
        setShowDetail(true);
        (async () => {
            try {
                const full = await fetchRentalById(contract.rentalId);
                setSelectedContract((prev) => {
                    if (!prev || prev.rentalId !== contract.rentalId) return prev;
                    return { ...prev, ...full };
                });
            } catch (e) {
                console.error("Failed to load rental details", e);
            }
        })();
    };

    const handleToggleRestart = async (rentalId) => {
        const target = rows.find((r) => r.rentalId === rentalId);
        const next = !target?.restartBlocked;
        try {
            await updateRental(rentalId, { restartBlocked: next });
            setItems((prev) => prev.map((item) => (item.rentalId === rentalId ? { ...item, restartBlocked: next } : item)));
        } catch (e) {
            console.error("Failed to update restart flag", e);
            emitToast("재시동 금지 상태 변경 실패", "error");
        }
    };

    const handleMemoEdit = (rentalId, currentMemo) => onMemoEdit(rentalId, currentMemo);
    const handleMemoSave = async (rentalId, newText) => {
        try {
            const resp = await updateRental(rentalId, { memo: newText });
            setItems((prev) => prev.map((item) => (item.rentalId === rentalId ? { ...item, memo: newText } : item)));
            if (resp == null) {
                setToast({ message: "메모가 저장되었습니다.", type: "success" });
            }
            onMemoCancel();
        } catch (e) {
            console.error("Failed to save memo", e);
            emitToast("메모 저장 실패", "error");
        }
    };
    const handleMemoCancel = () => onMemoCancel();

    

    const handleShowLocation = () => {
        setShowDetail(false);
        setShowLocationMap(true);
    };

    const handleBackToDetail = () => {
        setShowLocationMap(false);
        setShowDetail(true);
    };

    // Column settings handled by useColumnSettings hook

    // Derive columns for rendering; inject company column for super-admin just after 'select'
    const columnsForRender = useMemo(() => {
        const base = [...visibleColumns];
        if (isSuperAdmin) {
            const hasCompany = base.some((c) => c.key === "company");
            if (!hasCompany) {
                const insertIndex = Math.max(0, base.findIndex((c) => c.key === "plate"));
                // Insert before 'plate'; if not found, insert at start or after select when present
                const colDef = { key: "company", label: "회사", visible: true, required: false, width: 200, sortable: true };
                if (insertIndex >= 0) base.splice(insertIndex, 0, colDef);
                else base.unshift(colDef);
            }
        }
        return base;
    }, [visibleColumns, isSuperAdmin]);

    // Sorting is now handled by Table component - sortAccessor provides custom value extraction

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

    // 각 컬럼의 셀 내용을 렌더링하는 함수 (select는 Table 컴포넌트에서 자동 처리)
    const renderCellContent = (column, row) => {
        switch (column.key) {
            case "company":
                return <CompanyCell row={row} />;
            case "plate":
                return <PlateCell plate={row.plate} onClick={() => handlePlateClick(row)} title="계약 상세 정보 보기" />;
            case "vehicleType":
                return <VehicleTypeText vehicleType={row.vehicleType} />;
            case "renterName":
                return row.renterName || "-";
            case "rentalPeriod":
                return <RentalPeriodCell rentalPeriod={row.rentalPeriod} />;
            case "rentalAmount":
                return <RentalAmountCell row={row} />;
            case "contractStatus":
                return getContractStatusBadge(row.contractStatus);
            case "engineStatus":
                return <StatusBadge type={row.engineOn ? "on" : "off"}>{row.engineOn ? "ON" : "OFF"}</StatusBadge>;
            case "restartBlocked": {
                const isBlocked = Boolean(row.restartBlocked);
                const identifier = row.plate || row.renterName || row.rentalId || "계약";
                return (
                    <button
                        type="button"
                        onClick={() => handleToggleRestart(row.rentalId)}
                        className={`badge badge--clickable badge--compact ${isBlocked ? "badge--restart-blocked" : "badge--restart-allowed"}`}
                        aria-pressed={isBlocked}
                        aria-label={`${identifier} ${isBlocked ? "재시동 금지 해제" : "재시동 금지 설정"}`}
                        title={isBlocked ? "재시동 금지 해제" : "재시동 금지 설정"}
                    >
                        {isBlocked ? "차단 중" : "허용 중"}
                    </button>
                );
            }
            case "accident": {
                const identifier = row.plate || row.rentalId || "계약";
                const hasAccident = Boolean(row.accidentReported);
                const videoTitle = row.accidentReport?.blackboxFileName?.trim();
                const hasVideo = Boolean(videoTitle);
                const variantClass = hasAccident ? (hasVideo ? "badge--video" : "badge--accident") : "badge--default";
                const title = hasVideo ? videoTitle : hasAccident ? "등록된 사고 정보 보기" : "사고 등록";
                const ariaLabel = hasVideo ? `${identifier} 사고 영상 ${videoTitle} 보기` : hasAccident ? `${identifier} 사고 정보 보기` : `${identifier} 사고 등록`;

                return (
                    <button type="button" onClick={() => handleOpenAccidentModal(row)} className={`badge badge--clickable ${variantClass}`} title={title} aria-label={ariaLabel}>
                        {hasVideo ? <VideoIcon size={13} aria-hidden="true" /> : <FiAlertTriangle size={14} aria-hidden="true" />}
                    </button>
                );
            }
            case "memo":
                return (
                    <MemoCell
                        id={row.rentalId}
                        value={row.memo}
                        isEditing={editingMemo === row.rentalId}
                        memoText={memoText}
                        onEdit={handleMemoEdit}
                        onChange={onMemoChange}
                        onSave={handleMemoSave}
                        onCancel={handleMemoCancel}
                        onOpenHistory={(id) => {
                            const label = row.plate || row.renterName || id;
                            setMemoHistoryTarget({ id, label });
                            setShowMemoHistoryModal(true);
                        }}
                        maxWidth={150}
                    />
                );
            default:
                return "-";
        }
    };

    // formatDateTime is now in RentalPeriodCell component, but still needed for detail modal
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
        if (!status) {
            return <StatusBadge type="default">-</StatusBadge>;
        }

        const statusMap = {
            "예약 중": "pending",
            대여중: "rented",
            사고접수: "accident",
            반납지연: "overdue",
            도난의심: "suspicious",
        };
        const badgeType = statusMap[status] || "default";
        return <StatusBadge type={badgeType}>{status}</StatusBadge>;
    };

    // getRentalAmountBadges moved to RentalAmountCell component

    return (
        <div className="page space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">계약 등록/관리</h1>
            <div className="page-scroll space-y-4">
                <div className="asset-toolbar">
                    <div className="flex-1" />
                    <div className="flex gap-3">
                        <button type="button" className="form-button" onClick={() => setShowCreate(true)}>
                            계약 등록
                        </button>
                        <button
                            type="button"
                            className="form-button form-button--danger"
                            onClick={handleDeleteSelected}
                            disabled={selectedCount === 0}
                            title={selectedCount === 0 ? "Select rows to delete" : "Delete selected"}
                        >
                            선택 삭제
                        </button>
                        <div className="relative" data-column-dropdown>
                            <button type="button" className="form-button form-button--neutral" onClick={() => setShowColumnDropdown(!showColumnDropdown)} title="컬럼 설정">
                                <FaCog size={14} />
                                컬럼 설정
                            </button>
                        {showColumnDropdown && (
                            <ColumnSettingsMenu
                                columns={columns}
                                draggedColumnIndex={draggedColumnIndex}
                                dragOverColumnIndex={dragOverColumnIndex}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                                onToggleVisibility={toggleColumnVisibility}
                            />
                        )}
                        </div>
                    </div>
                </div>

                <Table
                    rowIdKey="rentalId"
                    columns={columnsForRender
                        .filter((col) => col.key !== "select") // Table 컴포넌트가 자동으로 select 추가
                        .map((col) => ({
                            ...col,
                            style: {
                                ...(col.style || {}),
                                textAlign: col.key === "memo" ? "left" : (col.style?.textAlign || "center"),
                                maxWidth: col.key === "memo" ? "150px" : col.style?.maxWidth,
                            },
                            render: (row) => renderCellContent(col, row),
                            sortAccessor: (row) => {
                            // Custom sort value extraction for each column
                            switch (col.key) {
                                case "company":
                                    return row?.companyName || row?.company || row?.companyId || "";
                                case "rentalPeriod":
                                    return row?.rentalPeriod?.start || "";
                                case "rentalAmount": {
                                    const v = row?.rentalAmount;
                                    if (typeof v === "number") return v;
                                    if (typeof v === "string") {
                                        const n = Number(v.replace(/[^0-9.-]/g, ""));
                                        return Number.isNaN(n) ? 0 : n;
                                    }
                                    return 0;
                                }
                                case "engineStatus":
                                    return row?.engineStatus === "on" || !!row?.engineOn;
                                case "restartBlocked":
                                    return !!(row?.restartBlocked);
                                case "accident":
                                    return !!row?.accidentReported;
                                default:
                                    return row?.[col.key] ?? "";
                            }
                        },
                    }))}
                    data={rows}
                    selection={{ selected, toggleSelect, toggleSelectAllVisible, allVisibleSelected }}
                    emptyMessage="조건에 맞는 계약이 없습니다."
                    stickyHeader
                    className="rentals-table"
                />
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="계약 등록" showFooter={false} ariaLabel="Create Rental">
                <RentalForm onSubmit={handleCreateSubmit} formId="rental-create" onClose={() => setShowCreate(false)} />
            </Modal>

            <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="계약 상세 정보" showFooter={false} ariaLabel="Contract Details">
                {selectedContract && (
                    <div style={{ padding: "20px" }}>
                        {/* 상단 액션 버튼들 */}
                        <div className="quick-actions">
                            <div className="quick-actions__label">빠른 액션</div>
                            {/* 현재 위치 보기 버튼 */}
                            <button
                                onClick={handleShowLocation}
                                disabled={!selectedContract.currentLocation}
                                className="form-button form-button--accent"
                                title={selectedContract.currentLocation ? "현재 위치를 지도에서 확인" : "현재 위치 정보 없음"}
                            >
                                <FaMapMarkerAlt size={16} aria-hidden="true" />
                                현재 위치
                            </button>
                            {/* 사고 접수 버튼 */}
                            <button onClick={() => handleOpenAccidentModal(selectedContract)} className="form-button form-button--warning">
                                <FaExclamationTriangle size={16} aria-hidden="true" />
                                {selectedContract.accidentReported ? "사고 정보 수정" : "사고 등록"}
                            </button>
                            {/* 반납 등록 버튼 */}
                            {(() => {
                                const now = new Date();
                                const returnedAt = selectedContract?.returnedAt ? new Date(selectedContract.returnedAt) : null;
                                const isReturned = returnedAt ? now >= returnedAt : false;
                                return (
                                    <button
                                        onClick={async () => {
                                            const ok = window.confirm("반납 등록 하시겠습니까?");
                                            if (!ok) return;
                                            const rid = selectedContract.rentalId;
                                            const ts = new Date().toISOString();
                                            try {
                                                await updateRental(rid, { returnedAt: ts });
                                            } catch (e) {
                                                console.warn("updateRental failed; falling back to local state", e);
                                            }
                                            setItems((prev) => prev.map((it) => (it.rentalId === rid ? { ...it, returnedAt: ts } : it)));
                                            setShowDetail(false);
                                            setSelectedContract(null);
                                        }}
                                        className="form-button"
                                        disabled={isReturned}
                                        title={isReturned ? "이미 반납 처리됨" : "반납 처리"}
                                    >
                                        <FaCheck size={16} aria-hidden="true" />
                                        반납 등록
                                    </button>
                                );
                            })()}
                            {selectedContract.accidentReported && (
                                <StatusBadge type="accident">
                                    <FaExclamationTriangle size={14} aria-hidden="true" />
                                    사고 접수됨
                                </StatusBadge>
                            )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>기본 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <strong>차량번호:</strong> {selectedContract.plate || "-"}
                                    </div>
                                    <div>
                                        <strong>차종:</strong> {selectedContract.vehicleType || "-"}
                                    </div>
                                    <div>
                                        <strong>예약자명:</strong> {selectedContract.renterName || "-"}
                                    </div>
                                    <div>
                                        <strong>연락처:</strong> {selectedContract.contactNumber || "-"}
                                    </div>
                                    <div>
                                        <strong>면허번호:</strong> {selectedContract.license_number || "-"}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>계약 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <strong>계약 상태:</strong> {getContractStatusBadge(selectedContract.accidentReported ? "사고접수" : selectedContract.contractStatus)}
                                    </div>
                                    <div>
                                        <strong>대여 시작:</strong> {formatDateTime(selectedContract.rentalPeriod?.start)}
                                    </div>
                                    <div>
                                        <strong>대여 종료:</strong> {formatDateTime(selectedContract.rentalPeriod?.end)}
                                    </div>
                                    <div>
                                        <strong>대여 기간:</strong> {selectedContract.rentalDurationDays || "-"}일
                                    </div>
                                    <div>
                                        <strong>보험사:</strong> {selectedContract.insuranceName || "-"}
                                    </div>
                                    <div>
                                        <strong>배차위치:</strong> {selectedContract.rentalLocation?.address || selectedContract.address || "-"}
                                    </div>
                                    <div>
                                        <strong>반납위치:</strong> {selectedContract.returnLocation?.address || selectedContract.address || "-"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>차량 상태</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <strong>엔진 상태:</strong>
                                        <StatusBadge
                                            style={{
                                                backgroundColor: selectedContract.engineOn ? "#4caf50" : "#f44336",
                                                color: "white",
                                                marginLeft: "8px",
                                            }}
                                        >
                                            {selectedContract.engineOn ? "ON" : "OFF"}
                                        </StatusBadge>
                                    </div>
                                    <div>
                                        <strong>재시동 금지:</strong>
                                        <StatusBadge variant={selectedContract.restartBlocked ? "badge--restart-blocked" : "badge--restart-allowed"} style={{ marginLeft: "8px" }}>
                                            {selectedContract.restartBlocked ? "차단" : "허용"}
                                        </StatusBadge>
                                    </div>
                                    <div>
                                        <strong>위치:</strong> {selectedContract.location || "정보 없음"}
                                    </div>
                                    <div>
                                        <strong>주행 거리:</strong> {selectedContract.mileage ? `${new Intl.NumberFormat("ko-KR").format(selectedContract.mileage)} km` : "-"}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>금액 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <strong>대여 금액:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.rentalAmount || 0)}
                                    </div>
                                    <div>
                                        <strong>보증금:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.deposit || 0)}
                                    </div>
                                    <div>
                                        <strong>미납 금액:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.unpaidAmount || 0)}
                                    </div>
                                    <div>
                                        <strong>결제 방법:</strong> {selectedContract.paymentMethod || "-"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>추가 정보</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div>
                                    <strong>메모:</strong> {selectedContract.memo || "메모가 없습니다."}
                                </div>
                                <div>
                                    <strong>특이사항:</strong> {selectedContract.specialNotes || "없음"}
                                </div>
                                <div>
                                    <strong>등록일:</strong> {selectedContract.createdAt ? new Date(selectedContract.createdAt).toLocaleString("ko-KR") : "-"}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={showAccidentModal} onClose={handleCloseAccidentModal} title="사고 등록" showFooter={false} ariaLabel="Accident Registration">
                {accidentTarget && (
                    <form id="accident-registration-form" onSubmit={handleAccidentSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>블랙박스 영상 등록</label>
                                    <input
                                        key={fileInputKey}
                                        type="file"
                                        accept="video/*"
                                        onChange={handleAccidentFileChange}
                                        style={{
                                            padding: "6px",
                                            border: "1px solid #ddd",
                                            borderRadius: "6px",
                                            marginBottom: "12px",
                                        }}
                                    />
                                    {accidentForm.blackboxFile && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: 6 }}>
                                                업로드 방식: {uploadState.mode === 'resumable' ? '대용량(Resumable)' : '서명 PUT'}
                                            </div>
                                            {uploadState.status === 'uploading' && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <UploadProgress status={uploadState.status} percent={uploadState.percent} onCancel={() => { try { uploadState.cancel && uploadState.cancel(); } catch {} }} />
                                                </div>
                                            )}
                                            {uploadState.status === 'error' && (
                                                <div style={{ marginBottom: 12, color: '#c62828', fontSize: 12 }}>
                                                    업로드 실패: {uploadState.error || '알 수 없는 오류'}
                                                    <div style={{ marginTop: 6 }}>
                                                        <button type="button" className="form-button" onClick={(e) => {
                                                            e.preventDefault();
                                                            // Trigger submit again to retry upload
                                                            const formEl = document.getElementById('accident-registration-form');
                                                            if (formEl) formEl.requestSubmit();
                                                        }}>
                                                            재시도
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <FilePreview file={accidentForm.blackboxFile} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>사고 발생 시각</label>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                        <input
                                            type="date"
                                            value={accidentForm.accidentDate}
                                            onChange={(e) => handleAccidentInputChange("accidentDate", e.target.value)}
                                            style={{
                                                padding: "8px",
                                                border: "1px solid #ddd",
                                                borderRadius: "6px",
                                                fontSize: "0.9rem",
                                            }}
                                            required
                                        />
                                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                            <select
                                                value={accidentForm.accidentHour}
                                                onChange={(e) => handleAccidentInputChange("accidentHour", e.target.value)}
                                                style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem" }}
                                            >
                                                {HOUR_OPTIONS.map((hour) => (
                                                    <option key={hour} value={hour}>
                                                        {hour}
                                                    </option>
                                                ))}
                                            </select>
                                            <span>:</span>
                                            <select
                                                value={accidentForm.accidentMinute}
                                                onChange={(e) => handleAccidentInputChange("accidentMinute", e.target.value)}
                                                style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem" }}
                                            >
                                                {MINUTE_SECOND_OPTIONS.map((minute) => (
                                                    <option key={`minute-${minute}`} value={minute}>
                                                        {minute}
                                                    </option>
                                                ))}
                                            </select>
                                            <span>:</span>
                                            <select
                                                value={accidentForm.accidentSecond}
                                                onChange={(e) => handleAccidentInputChange("accidentSecond", e.target.value)}
                                                style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem" }}
                                            >
                                                {MINUTE_SECOND_OPTIONS.map((second) => (
                                                    <option key={`second-${second}`} value={second}>
                                                        {second}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>처리 담당자</label>
                                    <input
                                        type="text"
                                        value={accidentForm.handlerName}
                                        onChange={(e) => handleAccidentInputChange("handlerName", e.target.value)}
                                        placeholder="담당자 이름을 입력하세요"
                                        style={{
                                            padding: "8px",
                                            border: "1px solid #ddd",
                                            borderRadius: "6px",
                                            fontSize: "0.9rem",
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col gap-3">
                                <h3 className="m-0 text-base text-gray-800 dark:text-gray-100">대여 정보</h3>
                                <div className="flex flex-col gap-2.5">
                                    <div>
                                        <strong className="block text-[0.85rem] text-gray-600 dark:text-gray-400">대여 차량번호</strong>
                                        <div className="text-[0.95rem] font-semibold text-gray-800 dark:text-gray-100">{accidentTarget.plate || "-"}</div>
                                    </div>
                                    <div>
                                        <strong className="block text-[0.85rem] text-gray-600 dark:text-gray-400">대여 차종</strong>
                                        <div className="text-[0.95rem] font-semibold text-gray-800 dark:text-gray-100">{accidentTarget.vehicleType || "-"}</div>
                                    </div>
                                    <div>
                                        <strong className="block text-[0.85rem] text-gray-600 dark:text-gray-400">대여 기간</strong>
                                        <div className="text-[0.95rem] font-semibold text-gray-800 dark:text-gray-100">
                                            {formatDateTime(accidentTarget.rentalPeriod?.start)} ~ {formatDateTime(accidentTarget.rentalPeriod?.end)}
                                        </div>
                                    </div>
                                    <div>
                                        <strong className="block text-[0.85rem] text-gray-600 dark:text-gray-400">대여자</strong>
                                        <div className="text-[0.95rem] font-semibold text-gray-800 dark:text-gray-100">{accidentTarget.renterName || "-"}</div>
                                    </div>
                                    <div>
                                        <strong className="block text-[0.85rem] text-gray-600 dark:text-gray-400">대여자 연락처</strong>
                                        <div className="text-[0.95rem] font-semibold text-gray-800 dark:text-gray-100">{accidentTarget.contactNumber || "-"}</div>
                                    </div>
                                </div>
                                {accidentTarget.accidentReport?.accidentDisplayTime && (
                                    <div className="mt-2 p-2.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 text-[0.85rem]">
                                        최근 등록된 사고 시각: {accidentTarget.accidentReport.accidentDisplayTime}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button type="submit" className="form-button" disabled={uploadState.status === 'uploading'}>
                                저장
                            </button>
                            <button type="button" className="form-button form-button--muted" onClick={handleCloseAccidentModal}>
                                닫기
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* 현재 위치 지도 모달 */}
            <Modal isOpen={showLocationMap} onClose={() => setShowLocationMap(false)} title="현재 위치" showFooter={false} ariaLabel="Current Location Map">
                {selectedContract && (
                    <div style={{ padding: "20px" }}>
                        {/* 상단 정보 */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "20px",
                                padding: "15px",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "8px",
                            }}
                        >
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>
                                    {selectedContract.plate} ({selectedContract.vehicleType})
                                </div>
                                <div style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.6 }}>
                                    <div>
                                        <strong>대여자 정보:</strong> {selectedContract.renterName || "-"}, {selectedContract.contactNumber || "-"}, {selectedContract.address || "-"}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleBackToDetail} className="form-button form-button--muted">
                                상세정보로 돌아가기
                            </button>
                        </div>

                        {/* 지도 영역 */}
                        {selectedContract.currentLocation ? (
                            <div style={{ position: "relative", height: "400px" }}>
                                <KakaoMap
                                    latitude={selectedContract.currentLocation.lat}
                                    longitude={selectedContract.currentLocation.lng}
                                    vehicleNumber={selectedContract.plate}
                                    lastUpdateTime={selectedContract.locationUpdatedAt || "업데이트 시간 없음"}
                                    markerTitle={`${selectedContract.plate} (${selectedContract.vehicleType})`}
                                    width="100%"
                                    height="100%"
                                    renterName={selectedContract.renterName}
                                    engineOn={selectedContract.engineOn}
                                    isOnline={!!selectedContract.currentLocation}
                                    trackingData={selectedContract.logRecord || []}
                                />
                            </div>
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "400px",
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "2px dashed #dee2e6",
                                }}
                            >
                                <FaMapMarkerAlt size={48} color="#adb5bd" style={{ marginBottom: "16px" }} />
                                <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#6c757d", marginBottom: "8px" }}>위치 정보 없음</div>
                                <div style={{ fontSize: "0.9rem", color: "#adb5bd" }}>현재 차량의 위치 정보를 받을 수 없습니다.</div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* 사고 정보 조회 모달 */}
            <AccidentInfoModal
                isOpen={showAccidentInfoModal}
                onClose={handleCloseAccidentInfoModal}
                accidentData={accidentTarget?.accidentReport}
                vehicleData={accidentTarget}
                title="사고 정보 조회"
            />
            <MemoHistoryModal
                isOpen={showMemoHistoryModal && !!memoHistoryTarget}
                onClose={() => setShowMemoHistoryModal(false)}
                entityType="rental"
                entityId={memoHistoryTarget?.id}
                title={memoHistoryTarget ? `메모 히스토리 - ${memoHistoryTarget.label}` : undefined}
            />
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={3000}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
