import React, { useEffect, useMemo, useState } from "react";
import { fetchRentals } from "../api";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import AccidentInfoModal from "../components/AccidentInfoModal";
import useTableSelection from "../hooks/useTableSelection";
import StatusBadge from "../components/StatusBadge";
import KakaoMap from "../components/KakaoMap";
import { DIMENSIONS } from "../constants";
import {
    FaCar,
    FaEdit,
    FaSave,
    FaTimes,
    FaExclamationTriangle,
    FaMapMarkerAlt,
    FaCog,
    FaEye,
    FaEyeSlash,
    FaGripVertical,
    FaVideo,
} from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";

const DEFAULT_COLUMN_CONFIG = [
    { key: "select", label: "선택", visible: true, required: true, width: 36 },
    { key: "plate", label: "차량번호", visible: true, required: true },
    { key: "vehicleType", label: "차종", visible: true, required: false },
    { key: "renter_name", label: "예약자명", visible: true, required: false },
    { key: "rental_period", label: "예약기간", visible: true, required: false },
    { key: "rental_amount", label: "대여금액", visible: true, required: false },
    { key: "contractStatus", label: "계약 상태", visible: true, required: false },
    { key: "engine_status", label: "엔진 상태", visible: true, required: false },
    { key: "restart_blocked", label: "재시동 금지", visible: true, required: false },
    { key: "accident", label: "사고 등록", visible: true, required: false, width: 160 },
    { key: "memo", label: "메모", visible: true, required: false },
];

const ACCIDENT_FORM_DEFAULT = {
    accidentDate: "",
    accidentHour: "00",
    accidentMinute: "00",
    accidentSecond: "00",
    handlerName: "",
    blackboxFile: null,
    blackboxFileName: "",
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_SECOND_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const mergeColumnsWithDefaults = (savedColumns = []) => {
    const merged = Array.isArray(savedColumns) ? savedColumns.map((column) => ({ ...column })) : [];
    const existingKeys = new Set(merged.map((column) => column.key));

    merged.forEach((column, index) => {
        const defaultColumn = DEFAULT_COLUMN_CONFIG.find((definition) => definition.key === column.key);
        if (defaultColumn) {
            merged[index] = { ...defaultColumn, ...column };
        }
    });

    DEFAULT_COLUMN_CONFIG.forEach((defaultColumn, defaultIndex) => {
        if (!existingKeys.has(defaultColumn.key)) {
            let insertIndex = merged.length;
            for (let i = defaultIndex - 1; i >= 0; i -= 1) {
                const previousKey = DEFAULT_COLUMN_CONFIG[i].key;
                const existingIndex = merged.findIndex((column) => column.key === previousKey);
                if (existingIndex !== -1) {
                    insertIndex = existingIndex + 1;
                    break;
                }
            }
            merged.splice(insertIndex, 0, { ...defaultColumn });
            existingKeys.add(defaultColumn.key);
        }
    });

    return merged;
};

export default function RentalContracts() {
    const [items, setItems] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showLocationMap, setShowLocationMap] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);
    const [editingMemo, setEditingMemo] = useState(null);
    const [memoText, setMemoText] = useState("");
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
    const [columnSettings, setColumnSettings] = useState(() => {
        try {
            const saved = localStorage.getItem("rental-columns-settings");
            if (saved) {
                const parsed = JSON.parse(saved);
                const savedColumns = Array.isArray(parsed?.columns) ? parsed.columns : [];
                return {
                    ...parsed,
                    columns: mergeColumnsWithDefaults(savedColumns),
                };
            }
        } catch (error) {
            console.error("Failed to parse rental column settings", error);
        }
        return {
            columns: DEFAULT_COLUMN_CONFIG.map((column) => ({ ...column })),
        };
    });
    const [showAccidentModal, setShowAccidentModal] = useState(false);
    const [showAccidentInfoModal, setShowAccidentInfoModal] = useState(false);
    const [accidentTarget, setAccidentTarget] = useState(null);
    const [accidentForm, setAccidentForm] = useState(() => ({ ...ACCIDENT_FORM_DEFAULT }));
    const [fileInputKey, setFileInputKey] = useState(0);

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
                // 종료된 계약 필터링: contract_status가 "완료"이거나 대여 종료일이 지나고 반납이 완료된 경우 제외
                if (r.contract_status === "완료") return false;

                const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
                const isOverdue = end ? now > end : false;
                const isStolen = Boolean(r.reported_stolen);

                // 반납지연, 도난의심, 사고접수 등의 문제가 있는 경우는 표시
                if (isOverdue || isStolen || r.accident_reported) return true;

                // 현재 진행중인 계약만 표시 (예약중, 대여중)
                const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
                const isActive = start && end ? now >= start && now <= end : false;
                const isFuture = start ? now < start : false;

                return isActive || isFuture;
            })
            .map((r) => {
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
                    memo: r.memo || "",
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
        setItems((prev) => prev.map((item) => (item.rental_id === rentalId ? { ...item, restart_blocked: !item.restart_blocked } : item)));
    };

    const handleMemoEdit = (rentalId, currentMemo) => {
        setEditingMemo(rentalId);
        setMemoText(currentMemo || "");
    };

    const handleMemoSave = (rentalId) => {
        setItems((prev) => prev.map((item) => (item.rental_id === rentalId ? { ...item, memo: memoText } : item)));
        setEditingMemo(null);
        setMemoText("");
    };

    const handleMemoCancel = () => {
        setEditingMemo(null);
        setMemoText("");
    };

    const handleAccidentInputChange = (name, value) => {
        setAccidentForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAccidentFileChange = (event) => {
        const file = event.target?.files && event.target.files[0] ? event.target.files[0] : null;
        setAccidentForm((prev) => ({
            ...prev,
            blackboxFile: file,
            blackboxFileName: file ? file.name : prev.blackboxFileName,
        }));
    };

    const handleOpenAccidentModal = (contract) => {
        if (!contract) return;

        // 이미 사고가 등록된 경우 정보 조회 모달을 열고, 아닌 경우 등록 모달을 연다
        if (contract.accident_reported && contract.accidentReport) {
            setAccidentTarget(contract);
            setShowAccidentInfoModal(true);
        } else {
            const report = contract.accidentReport || {};
            setAccidentTarget(contract);
            setAccidentForm({
                accidentDate: report.accidentDate || "",
                accidentHour: report.accidentHour || "00",
                accidentMinute: report.accidentMinute || "00",
                accidentSecond: report.accidentSecond || "00",
                handlerName: report.handlerName || "",
                blackboxFile: report.blackboxFile || null,
                blackboxFileName: report.blackboxFileName || "",
            });
            setFileInputKey((prev) => prev + 1);
            setShowAccidentModal(true);
        }
    };

    const handleCloseAccidentModal = () => {
        setShowAccidentModal(false);
        setAccidentTarget(null);
        setAccidentForm({ ...ACCIDENT_FORM_DEFAULT });
        setFileInputKey((prev) => prev + 1);
    };

    const handleCloseAccidentInfoModal = () => {
        setShowAccidentInfoModal(false);
        setAccidentTarget(null);
    };

    const buildAccidentMemo = (currentMemo, note) => {
        if (!currentMemo) return note;
        if (currentMemo.includes("사고 접수")) return currentMemo;
        return `${currentMemo} / ${note}`;
    };

    const handleAccidentSubmit = (event) => {
        event.preventDefault();
        if (!accidentTarget) return;

        const now = new Date();
        const memoNote = `사고 접수됨 (${now.toLocaleDateString()})`;
        const { accidentDate, accidentHour, accidentMinute, accidentSecond, handlerName, blackboxFile, blackboxFileName } = accidentForm;
        const accidentDateTime = accidentDate ? `${accidentDate}T${accidentHour}:${accidentMinute}:${accidentSecond}` : "";
        const accidentDisplayTime = accidentDate ? `${accidentDate.replace(/-/g, ".")} ${accidentHour}:${accidentMinute}:${accidentSecond}` : "";

        const updatedReport = {
            accidentDate,
            accidentHour,
            accidentMinute,
            accidentSecond,
            handlerName,
            accidentDateTime,
            accidentDisplayTime,
            blackboxFile,
            blackboxFileName,
            recordedAt: now.toISOString(),
        };

        setItems((prev) =>
            prev.map((item) => {
                if (item.rental_id !== accidentTarget.rental_id) return item;
                return {
                    ...item,
                    accident_reported: true,
                    memo: buildAccidentMemo(item.memo || "", memoNote),
                    accidentReport: updatedReport,
                };
            })
        );

        setSelectedContract((prev) => {
            if (!prev || prev.rental_id !== accidentTarget.rental_id) return prev;
            return {
                ...prev,
                accident_reported: true,
                memo: buildAccidentMemo(prev.memo || "", memoNote),
                accidentReport: updatedReport,
            };
        });

        alert("사고 등록이 저장되었습니다.");
        handleCloseAccidentModal();
    };

    const handleShowLocation = () => {
        setShowDetail(false);
        setShowLocationMap(true);
    };

    const handleBackToDetail = () => {
        setShowLocationMap(false);
        setShowDetail(true);
    };

    // 컬럼 설정 관련 함수들
    const saveColumnSettings = (newSettings) => {
        setColumnSettings(newSettings);
        localStorage.setItem("rental-columns-settings", JSON.stringify(newSettings));
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

    const visibleColumns = columnSettings.columns.filter((col) => col.visible);

    // Sorting state for contracts table
    const [sortKey, setSortKey] = useState(null); // column.key
    const [sortDir, setSortDir] = useState(null); // 'asc' | 'desc' | null

    const handleSortToggle = (key, column) => {
        if (!key || key === "select") return;
        if (column && column.sortable === false) return;
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir("asc");
            return;
        }
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    };

    const parseMaybeDate = (val) => {
        if (val == null) return null;
        if (val instanceof Date && !isNaN(val)) return val;
        if (typeof val !== "string") return null;
        const s = val.trim();
        if (!s) return null;
        const iso = Date.parse(s);
        if (!Number.isNaN(iso)) return new Date(iso);
        return null;
    };

    const normalizeValue = (val) => {
        if (val == null) return { type: "empty", v: null };
        const t = typeof val;
        if (t === "number") return { type: "number", v: val };
        if (t === "boolean") return { type: "number", v: val ? 1 : 0 };
        if (val instanceof Date && !isNaN(val)) return { type: "date", v: val.getTime() };
        if (t === "string") {
            const asDate = parseMaybeDate(val);
            if (asDate) return { type: "date", v: asDate.getTime() };
            // numeric string
            const num = Number(val);
            if (!Number.isNaN(num) && /^-?\d+(?:\.\d+)?$/.test(val.trim())) {
                return { type: "number", v: num };
            }
            return { type: "string", v: val.toLowerCase() };
        }
        try {
            return { type: "string", v: String(val).toLowerCase() };
        } catch {
            return { type: "string", v: "" };
        }
    };

    const getSortValue = (row, key) => {
        switch (key) {
            case "plate":
            case "vehicleType":
            case "renter_name":
            case "contractStatus":
            case "memo":
                return row?.[key] ?? "";
            case "rental_period": {
                const start = row?.rental_period?.start || "";
                return start;
            }
            case "rental_amount": {
                const v = row?.rental_amount;
                if (typeof v === "number") return v;
                if (typeof v === "string") {
                    const m = v.replace(/[^0-9.-]/g, "");
                    const n = Number(m);
                    return Number.isNaN(n) ? 0 : n;
                }
                return 0;
            }
            case "engine_status":
                return row?.engine_status === "on" || !!row?.engineOn;
            case "restart_blocked":
                return !!(row?.restart_blocked || row?.restartBlocked);
            case "accident":
                return !!row?.accident_reported;
            default:
                return row?.[key];
        }
    };

    const sortedRows = useMemo(() => {
        if (!Array.isArray(rows)) return [];
        if (!sortKey || !sortDir) return rows;
        // ensure key exists in visible columns (only allow sorting visible columns)
        const col = visibleColumns.find((c) => c.key === sortKey);
        if (!col || col.key === "select" || col.sortable === false) return rows;
        const list = rows.map((r, idx) => ({ r, idx }));
        list.sort((a, b) => {
            const va = getSortValue(a.r, sortKey);
            const vb = getSortValue(b.r, sortKey);
            const na = normalizeValue(va);
            const nb = normalizeValue(vb);
            if (na.type !== nb.type) {
                const order = { empty: 3, string: 2, number: 1, date: 1 };
                const pa = order[na.type] ?? 2;
                const pb = order[nb.type] ?? 2;
                if (pa !== pb) return sortDir === "asc" ? pa - pb : pb - pa;
            }
            let cmp = 0;
            if (na.v == null && nb.v != null) cmp = 1;
            else if (na.v != null && nb.v == null) cmp = -1;
            else if (na.v == null && nb.v == null) cmp = 0;
            else if (na.type === "number" || na.type === "date") cmp = na.v - nb.v;
            else if (na.type === "string") cmp = String(na.v).localeCompare(String(nb.v), undefined, { sensitivity: "base", numeric: true });
            if (cmp === 0) return a.idx - b.idx;
            return sortDir === "asc" ? cmp : -cmp;
        });
        return list.map((x) => x.r);
    }, [rows, visibleColumns, sortKey, sortDir]);

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

    // 각 컬럼의 셀 내용을 렌더링하는 함수
    const renderCellContent = (column, row) => {
        switch (column.key) {
            case "select":
                return <input type="checkbox" aria-label={`Select: ${row.plate || row.rental_id}`} checked={selected.has(row.rental_id)} onChange={() => toggleSelect(row.rental_id)} />;
            case "plate":
                return (
                    <button
                        style={{
                            background: "none",
                            border: "none",
                            color: "#1976d2",
                            cursor: "pointer",
                            textDecoration: "underline",
                            padding: 0,
                            font: "inherit",
                        }}
                        onClick={() => handlePlateClick(row)}
                    >
                        {row.plate || "-"}
                    </button>
                );
            case "vehicleType":
                return row.vehicleType || "-";
            case "renter_name":
                return row.renter_name || "-";
            case "rental_period":
                return (
                    <div style={{ fontSize: "0.9rem", lineHeight: "1.4" }}>
                        <div>{formatDateTime(row.rental_period?.start)} ~</div>
                        <div>{formatDateTime(row.rental_period?.end)}</div>
                    </div>
                );
            case "rental_amount":
                return getRentalAmountBadges(row);
            case "contractStatus":
                return getContractStatusBadge(row.contractStatus);
            case "engine_status":
                return <StatusBadge type={row.engineOn ? "on" : "off"}>{row.engineOn ? "ON" : "OFF"}</StatusBadge>;
            case "restart_blocked": {
                const isBlocked = Boolean(row.restartBlocked || row.restart_blocked);
                const identifier = row.plate || row.renter_name || row.rental_id || "계약";
                return (
                    <button
                        type="button"
                        onClick={() => handleToggleRestart(row.rental_id)}
                        className={`badge-button badge badge--clickable ${isBlocked ? "badge--restart-blocked" : "badge--restart-allowed"}`}
                        aria-pressed={isBlocked}
                        aria-label={`${identifier} ${isBlocked ? "재시동 금지 해제" : "재시동 금지 설정"}`}
                        title={isBlocked ? "재시동 금지 해제" : "재시동 금지 설정"}
                    >
                        {isBlocked ? "차단" : "허용"}
                    </button>
                );
            }
            case "accident": {
                const identifier = row.plate || row.rental_id || "계약";
                const hasAccident = Boolean(row.accident_reported);
                const videoTitle = row.accidentReport?.blackboxFileName?.trim();
                const hasVideo = Boolean(videoTitle);
                const variantClass = hasAccident ? (hasVideo ? "badge--video" : "badge--accident") : "badge--default";
                const title = hasVideo ? videoTitle : hasAccident ? "등록된 사고 정보 보기" : "사고 등록";
                const ariaLabel = hasVideo
                    ? `${identifier} 사고 영상 ${videoTitle} 보기`
                    : hasAccident
                    ? `${identifier} 사고 정보 보기`
                    : `${identifier} 사고 등록`;

                return (
                    <button
                        type="button"
                        onClick={() => handleOpenAccidentModal(row)}
                        className={`badge-button badge badge--clickable ${variantClass}`}
                        title={title}
                        aria-label={ariaLabel}
                    >
                        {hasVideo ? <FaVideo size={13} aria-hidden="true" /> : <FiAlertTriangle size={14} aria-hidden="true" />}

                    </button>
                );
            }
            case "memo":
                return (
                    <div style={{ maxWidth: "150px" }}>
                        {editingMemo === row.rental_id ? (
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
                                    onClick={() => handleMemoSave(row.rental_id)}
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
                                    onClick={() => handleMemoEdit(row.rental_id, row.memo)}
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

    const getRentalAmountBadges = (row) => {
        const amount = row.rental_amount || 0;
        const formattedAmount = new Intl.NumberFormat("ko-KR").format(amount);

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>₩{formattedAmount}</div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    <StatusBadge variant={row.isLongTerm ? "badge--contract-term" : "badge--contract-term-short"}>{row.isLongTerm ? "장기" : "단기"}</StatusBadge>
                    <StatusBadge variant="badge--contract-amount">
                        {row.isLongTerm
                            ? `월 ₩${new Intl.NumberFormat("ko-KR").format(
                                  Math.floor(amount / Math.max(1, Math.floor((row.rental_duration_days || 1) / 30)))
                              )}`
                            : `총 ₩${formattedAmount}`}
                    </StatusBadge>
                    {row.hasUnpaid && <StatusBadge variant="badge--contract-unpaid">미납</StatusBadge>}
                </div>
            </div>
        );
    };

    return (
        <div className="page">
            <h1>계약 등록/관리</h1>
            <div className="page-scroll">
                <div className="asset-toolbar" style={{ marginBottom: 12 }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", gap: 8 }}>
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
                        <div style={{ position: "relative" }} data-column-dropdown>
                            <button type="button" className="form-button form-button--neutral" onClick={() => setShowColumnDropdown(!showColumnDropdown)} title="컬럼 설정">
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

                <div className="table-wrap table-wrap--sticky">
                    <table className="asset-table rentals-table asset-table--sticky">
                        <thead>
                            <tr>
                                {visibleColumns.map((column) => {
                                    const isSortable = column.key !== "select" && column.sortable !== false;
                                    const isActive = isSortable && sortKey === column.key && !!sortDir;
                                    const ariaSort = isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none";
                                    return (
                                        <th
                                            key={column.key}
                                            style={{
                                                width: column.width,
                                                textAlign: column.key === "select" ? "center" : "left",
                                            }}
                                            aria-sort={ariaSort}
                                            className={isSortable ? "th-sortable" : undefined}
                                        >
                                            {column.key === "select" ? (
                                                <input type="checkbox" aria-label="Select all visible" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                                            ) : (
                                                <>
                                                    <span className="th-label">{column.label}</span>
                                                    {isSortable && (
                                                        <button
                                                            type="button"
                                                            className={[
                                                                "sort-toggle",
                                                                isActive ? "active" : "",
                                                                isActive ? `dir-${sortDir}` : "",
                                                            ].filter(Boolean).join(" ")}
                                                            title={`${column.label} 정렬 토글`}
                                                            aria-label={`${column.label} 정렬 토글 (오름차순/내림차순)`}
                                                            onClick={() => handleSortToggle(column.key, column)}
                                                        >
                                                            <span className="tri up">▲</span>
                                                            <span className="tri down">▼</span>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map((r, index) => (
                                <tr key={r.rental_id || `rental-${index}`}>
                                    {visibleColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            style={{
                                                textAlign: column.key === "select" ? "center" : "left",
                                                maxWidth: column.key === "memo" ? "150px" : undefined,
                                            }}
                                        >
                                            {renderCellContent(column, r)}
                                        </td>
                                    ))}
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
                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginBottom: "20px",
                                padding: "15px",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "8px",
                                alignItems: "center",
                            }}
                        >
                            <div style={{ flex: 1, fontSize: "0.9rem", color: "#666" }}>빠른 액션</div>
                            {/* 현재 위치 보기 버튼 */}
                            <button
                                onClick={handleShowLocation}
                                disabled={!selectedContract.current_location}
                                className="form-button form-button--accent"
                                title={selectedContract.current_location ? "현재 위치를 지도에서 확인" : "현재 위치 정보 없음"}
                            >
                                <FaMapMarkerAlt size={16} aria-hidden="true" />
                                현재 위치
                            </button>
                            {/* 사고 접수 버튼 */}
                            <button onClick={() => handleOpenAccidentModal(selectedContract)} className="form-button form-button--warning">
                                <FaExclamationTriangle size={16} aria-hidden="true" />
                                {selectedContract.accident_reported ? "사고 정보 수정" : "사고 등록"}
                            </button>
                            {selectedContract.accident_reported && (
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
                                        <strong>예약자명:</strong> {selectedContract.renter_name || "-"}
                                    </div>
                                    <div>
                                        <strong>연락처:</strong> {selectedContract.contact_number || "-"}
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
                                        <strong>계약 상태:</strong> {getContractStatusBadge(selectedContract.accident_reported ? "사고접수" : selectedContract.contractStatus)}
                                    </div>
                                    <div>
                                        <strong>대여 시작:</strong> {formatDateTime(selectedContract.rental_period?.start)}
                                    </div>
                                    <div>
                                        <strong>대여 종료:</strong> {formatDateTime(selectedContract.rental_period?.end)}
                                    </div>
                                    <div>
                                        <strong>대여 기간:</strong> {selectedContract.rental_duration_days || "-"}일
                                    </div>
                                    <div>
                                        <strong>보험사:</strong> {selectedContract.insurance_name || "-"}
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
                                        <StatusBadge
                                            variant={selectedContract.restartBlocked ? "badge--restart-blocked" : "badge--restart-allowed"}
                                            style={{ marginLeft: "8px" }}
                                        >
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
                                        <strong>대여 금액:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.rental_amount || 0)}
                                    </div>
                                    <div>
                                        <strong>보증금:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.deposit || 0)}
                                    </div>
                                    <div>
                                        <strong>미납 금액:</strong> ₩{new Intl.NumberFormat("ko-KR").format(selectedContract.unpaid_amount || 0)}
                                    </div>
                                    <div>
                                        <strong>결제 방법:</strong> {selectedContract.payment_method || "-"}
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
                                    <strong>특이사항:</strong> {selectedContract.special_notes || "없음"}
                                </div>
                                <div>
                                    <strong>등록일:</strong> {selectedContract.created_at ? new Date(selectedContract.created_at).toLocaleString("ko-KR") : "-"}
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
                                        }}
                                    />
                                    {accidentForm.blackboxFileName && <span style={{ fontSize: "0.8rem", color: "#555" }}>선택된 파일: {accidentForm.blackboxFileName}</span>}
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
                            <div
                                style={{
                                    background: "#f8f9fa",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                }}
                            >
                                <h3 style={{ margin: 0, fontSize: "1rem", color: "#333" }}>대여 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div>
                                        <strong style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>대여 차량번호</strong>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#333" }}>{accidentTarget.plate || "-"}</div>
                                    </div>
                                    <div>
                                        <strong style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>대여 차종</strong>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#333" }}>{accidentTarget.vehicleType || "-"}</div>
                                    </div>
                                    <div>
                                        <strong style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>대여 기간</strong>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#333" }}>
                                            {formatDateTime(accidentTarget.rental_period?.start)} ~ {formatDateTime(accidentTarget.rental_period?.end)}
                                        </div>
                                    </div>
                                    <div>
                                        <strong style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>대여자</strong>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#333" }}>{accidentTarget.renter_name || "-"}</div>
                                    </div>
                                    <div>
                                        <strong style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>대여자 연락처</strong>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#333" }}>{accidentTarget.contact_number || "-"}</div>
                                    </div>
                                </div>
                                {accidentTarget.accidentReport?.accidentDisplayTime && (
                                    <div
                                        style={{
                                            marginTop: "8px",
                                            padding: "10px",
                                            borderRadius: "6px",
                                            background: "#fff3e0",
                                            color: "#e65100",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        최근 등록된 사고 시각: {accidentTarget.accidentReport.accidentDisplayTime}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button type="submit" className="form-button">
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
                                        <strong>대여자 정보:</strong> {selectedContract.renter_name || "-"}, {selectedContract.contact_number || "-"}, {selectedContract.address || "-"}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleBackToDetail} className="form-button form-button--muted">
                                상세정보로 돌아가기
                            </button>
                        </div>

                        {/* 지도 영역 */}
                        {selectedContract.current_location ? (
                            <div style={{ position: "relative", height: "400px" }}>
                                <KakaoMap
                                    latitude={selectedContract.current_location.lat}
                                    longitude={selectedContract.current_location.lng}
                                    vehicleNumber={selectedContract.plate}
                                    lastUpdateTime={selectedContract.location_updated_at || "업데이트 시간 없음"}
                                    markerTitle={`${selectedContract.plate} (${selectedContract.vehicleType})`}
                                    width="100%"
                                    height="100%"
                                    renterName={selectedContract.renter_name}
                                    engineOn={selectedContract.engineOn}
                                    isOnline={!!selectedContract.current_location}
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
        </div>
    );
}
