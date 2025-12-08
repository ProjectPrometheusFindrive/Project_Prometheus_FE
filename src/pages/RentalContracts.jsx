import React, { useEffect, useMemo, useState } from "react";
import { useConfirm } from "../contexts/ConfirmContext";
import { fetchRentals, fetchRentalsSummary, fetchRentalById, updateRental, createRental, deleteRental, fetchAssets, fetchRentalLocation } from "../api";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import Table from "../components/Table";
import useTableFilters from "../hooks/useTableFilters";
import { applyColumnFilters } from "../utils/filtering";
import { TABLE_COLUMN_FILTERS_ENABLED } from "../constants/featureFlags";
import AccidentInfoModal from "../components/modals/AccidentInfoModal";
import FaxSendPanel from "../components/FaxSendPanel";
import useTableSelection from "../hooks/useTableSelection";
import StatusBadge from "../components/badges/StatusBadge";
import KakaoMap from "../components/KakaoMap";
import { FaExclamationTriangle, FaMapMarkerAlt, FaCheck } from "react-icons/fa";
import VideoIcon from "../components/VideoIcon";
import UploadProgress from "../components/UploadProgress";
import { FiAlertTriangle } from "react-icons/fi";
import MemoHistoryModal from "../components/modals/MemoHistoryModal";
import TerminalRequestModal from "../components/modals/TerminalRequestModal";
import { MemoCell, CompanyCell, PlateCell, RentalPeriodCell, RentalAmountCell } from "../components/cells";
import useMemoEditor from "../hooks/useMemoEditor";
import { computeContractStatus, toDate } from "../utils/contracts";
// (unused constants/uploads imports removed)
import { uploadMany } from "../utils/uploadHelpers";
import { parseCurrency, formatCurrencyDisplay, formatNumberDisplay } from "../utils/formatters";
import { formatDisplayDate } from "../utils/date";
import { formatYyMmDdHhMmSs } from "../utils/datetime";
import FilePreview from "../components/FilePreview";
import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../constants/auth";
import useColumnSettings from "../hooks/useColumnSettings";
import { VehicleTypeText } from "../components/cells";
import ColumnSettingsMenu from "../components/ColumnSettingsMenu";
import useAccidentReport from "../hooks/useAccidentReport";
import { emitToast } from "../utils/toast";
import VehicleTypeYearFilter from "../components/filters/VehicleTypeYearFilter";


const DEFAULT_COLUMN_CONFIG = [
    { key: "select", label: "선택", visible: true, required: true, width: 60 },
    { key: "plate", label: "차량번호", visible: true, required: true, width: 120 },
    { key: "vehicleType", label: "차종", visible: true, required: false, width: 100 },
    { key: "renterName", label: "예약자명", visible: true, required: false, width: 100 },
    { key: "rentalPeriod", label: "예약기간", visible: true, required: false, width: 180 },
    { key: "rentalAmount", label: "대여금액", visible: true, required: false, width: 130 },
    { key: "contractStatus", label: "계약 상태", visible: true, required: false, width: 110 },
    { key: "engineStatus", label: "엔진 상태", visible: true, required: false, width: 100 },
    { key: "restartBlocked", label: "재시동 금지", visible: true, required: false, width: 110 },
    { key: "accident", label: "사고 등록", visible: true, required: false, width: 100 },
    { key: "memo", label: "메모", visible: true, required: false, width: 250 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_SECOND_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const TRAIL_INITIAL_LIMIT = 100;
const TRAIL_INCREMENT = 100;
const TRAIL_MAX_LIMIT = 1000;

// Column merging is handled by useColumnSettings hook

// vehicleType 문자열과 year 필드를 기반으로 차종/연식 파싱
const parseVehicleTypeAndYear = (row) => {
    const rawType = row?.vehicleType;
    const fullLabel = rawType ? String(rawType) : "";

    // 기본값
    let baseType = fullLabel;
    let yearKey = "";

    if (fullLabel) {
        // 끝부분의 숫자(연식) 추출: "그랜저 23년형", "그랜저 2023", "그랜저 23" 등 대응
        const match = fullLabel.match(/(\d{2,4})\D*$/);
        if (match) {
            const digits = match[1]; // "23" 또는 "2023"
            baseType = fullLabel.slice(0, match.index).trim();
            yearKey = digits.length === 4 ? digits.slice(2) : digits;
        }
    }

    const yearValue = row?.year;
    if (!yearKey && yearValue != null && yearValue !== "") {
        const s = String(yearValue);
        yearKey = s.length === 4 ? s.slice(2) : s;
    }

    return { baseType, yearKey, fullLabel };
};

function findLatestLogLocation(logRecord = []) {
    if (!Array.isArray(logRecord) || logRecord.length === 0) return null;
    let latest = null;
    let latestTs = -Infinity;
    let latestIdx = -1;

    for (let i = 0; i < logRecord.length; i++) {
        const entry = logRecord[i];
        const latRaw = entry?.lat ?? entry?.latitude;
        const lngRaw = entry?.lng ?? entry?.longitude;
        const lat = typeof latRaw === "string" ? Number(latRaw) : latRaw;
        const lng = typeof lngRaw === "string" ? Number(lngRaw) : lngRaw;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const rawTime = entry?.dateTime || entry?.datetime || entry?.timestamp || entry?.time;
        const parsed = rawTime ? Date.parse(rawTime) : NaN;
        if (Number.isFinite(parsed)) {
            if (parsed > latestTs) {
                latest = { lat, lng, raw: entry, rawTime };
                latestTs = parsed;
                latestIdx = i;
            }
        } else if (!Number.isFinite(latestTs) && i > latestIdx) {
            // Fallback: if no valid timestamp has been found, pick the last valid lat/lng entry by order
            latest = { lat, lng, raw: entry, rawTime };
            latestIdx = i;
        }
    }

    return latest;
}

function extractLogDateKey(entry) {
    const rawTime = entry?.dateTime || entry?.datetime || entry?.timestamp || entry?.time;
    if (!rawTime) return null;
    const s = String(rawTime);
    // 1단계: Date.parse로 UTC 기준 시각을 파싱한 뒤, 서울 기준(KST, UTC+9)으로 날짜를 구분
    // ISO 8601 형식으로 변환 (공백을 T로 치환)
    const isoString = s.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T');
    const ms = Date.parse(isoString);
    if (Number.isFinite(ms)) {
        const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
        const kst = new Date(ms + KST_OFFSET_MS);
        const year = kst.getUTCFullYear();
        const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
        const day = String(kst.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    // 2단계: 파싱이 안 되면 문자열에서 날짜 패턴(YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD) 추출
    const match = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (match) {
        const year = match[1];
        const month = String(match[2]).padStart(2, "0");
        const day = String(match[3]).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    return null;
}

function formatTrackingDateLabel(key) {
    if (!key || typeof key !== "string") return key;
    const parts = key.split("-");
    if (parts.length !== 3) return key;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}월 ${day}일`;
}

export default function RentalContracts() {
    const confirm = useConfirm();
    const auth = useAuth();
    const isSuperAdmin = auth?.user?.role === ROLES.SUPER_ADMIN;
    const [items, setItems] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showLocationMap, setShowLocationMap] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [trailLimit, setTrailLimit] = useState(TRAIL_INITIAL_LIMIT);
    const [trackingDateFilters, setTrackingDateFilters] = useState([]);
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
    const [installModalOpen, setInstallModalOpen] = useState(false);
    const openInstallModal = () => setInstallModalOpen(true);
    const closeInstallModal = () => setInstallModalOpen(false);
    const [hasDeviceByPlate, setHasDeviceByPlate] = useState({});
    const selectedContractTrackingData = selectedContract?.logRecord || [];
    const trackingDateKeys = useMemo(() => {
        if (!Array.isArray(selectedContractTrackingData) || selectedContractTrackingData.length === 0) return [];
        const map = new Map();
        for (const entry of selectedContractTrackingData) {
            const key = extractLogDateKey(entry);
            if (!key) continue;
            if (!map.has(key)) map.set(key, true);
        }
        return Array.from(map.keys()).sort();
    }, [selectedContractTrackingData]);
    const filteredTrackingData = useMemo(() => {
        if (!Array.isArray(selectedContractTrackingData) || selectedContractTrackingData.length === 0) {
            console.log('[filteredTrackingData] No tracking data');
            return [];
        }
        if (!Array.isArray(trackingDateFilters) || trackingDateFilters.length === 0) {
            console.log('[filteredTrackingData] No filters selected, showing nothing');
            return [];
        }
        const allowed = new Set(trackingDateFilters);
        const filtered = selectedContractTrackingData.filter((entry) => {
            const key = extractLogDateKey(entry);
            return key && allowed.has(key);
        });
        console.log('[filteredTrackingData]', {
            totalEntries: selectedContractTrackingData.length,
            activeFilters: Array.from(trackingDateFilters),
            filteredCount: filtered.length,
            timeRange: (() => {
                if (filtered.length === 0) return null;
                // 시간 기준으로 정렬
                const sorted = [...filtered].sort((a, b) => {
                    const timeA = a?.dateTime || a?.datetime || a?.timestamp || a?.time || '';
                    const timeB = b?.dateTime || b?.datetime || b?.timestamp || b?.time || '';
                    return timeA.localeCompare(timeB);
                });
                const first = sorted[0];
                const last = sorted[sorted.length - 1];

                const formatWithTimezones = (entry, label) => {
                    const rawTime = entry?.dateTime || entry?.datetime || entry?.timestamp || entry?.time;
                    if (!rawTime) return null;
                    const isoString = String(rawTime).replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T');
                    const utcDate = new Date(isoString);
                    const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
                    return {
                        label,
                        raw: rawTime,
                        utc: utcDate.toISOString(),
                        kst: kstDate.toISOString().replace('Z', '+09:00'),
                        dateKey: extractLogDateKey(entry)
                    };
                };

                return {
                    earliest: formatWithTimezones(first, 'EARLIEST'),
                    latest: formatWithTimezones(last, 'LATEST')
                };
            })()
        });
        return filtered;
    }, [selectedContractTrackingData, trackingDateFilters]);
    const hasSelectedTrackingData = Array.isArray(filteredTrackingData) && filteredTrackingData.length > 0;
    const latestSelectedTracking = findLatestLogLocation(selectedContractTrackingData);
    const mapLastUpdateTime = selectedContract?.locationUpdatedAt || latestSelectedTracking?.rawTime || "업데이트 시간 없음";
    const speedLegendItems = [
        { key: "slow", label: "저속 <30", color: "#43A047", bg: "rgba(67, 160, 71, 0.16)" },
        { key: "mid", label: "중속 30-80", color: "#1E88E5", bg: "rgba(30, 136, 229, 0.16)" },
        { key: "fast", label: "고속 >80", color: "#E53935", bg: "rgba(229, 57, 53, 0.14)" },
    ];

    const normalizePlate = (p) => (p ? String(p).replace(/\s|-/g, "").toUpperCase() : "");
    const computeHasDevice = (r, plateMap) => {
        const norm = normalizePlate(r?.plate);
        const mapHit = norm ? !!plateMap[norm] : false;
        const engineKnown = r?.engineStatus != null && String(r.engineStatus).length > 0;
        const loc = r?.currentLocation;
        const locKnown = loc && typeof loc.lat === "number" && typeof loc.lng === "number";
        const anyTelematics = engineKnown || locKnown || !!r?.engineOn;
        return mapHit || anyTelematics;
    };
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

    // Load assets to determine device installation by plate
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const assets = await fetchAssets();
                if (!mounted) return;
                const map = {};
                if (Array.isArray(assets)) {
                    for (const a of assets) {
                        const plateRaw = a?.plate || a?.vehicleNumber || a?.number;
                        const plate = normalizePlate(plateRaw);
                        if (!plate) continue;
                        map[plate] = !!(a?.deviceSerial);
                    }
                }
                setHasDeviceByPlate(map);
            } catch (e) {
                console.warn("Failed to load assets for device mapping", e);
                setHasDeviceByPlate({});
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

        const isOpenContract = (r) => {
            const status = computeContractStatus(r, now);
            if (status === "완료") return false; // 열린 계약에서 제외
            // 문제 상태는 항상 표시
            if (status === "반납지연" || status === "도난의심" || status === "사고접수") return true;
            // 진행/예약 상태만 표시
            const isFuture = !!(toDate(r?.rentalPeriod?.start) && now < toDate(r.rentalPeriod.start));
            const isActive = !!(toDate(r?.rentalPeriod?.start) && toDate(r?.rentalPeriod?.end) && now >= toDate(r.rentalPeriod.start) && now <= toDate(r.rentalPeriod.end));
            return isActive || isFuture;
        };

        const enrich = (r) => {
            const end = toDate(r?.rentalPeriod?.end);
            const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
            const status = computeContractStatus(r, now);
            const isLongTerm = (r.rentalDurationDays || 0) > 30;
            const hasUnpaid = (r.unpaidAmount || 0) > 0;
            const hasDevice = computeHasDevice(r, hasDeviceByPlate);
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
                hasDevice,
            };
        };

        const openRows = items.filter(isOpenContract).map(enrich);
        const completedRows = items
            .filter((r) => computeContractStatus(r, now) === "완료")
            .map(enrich);

        // 열린 계약 위, 완료 계약 아래로 정렬
        return [...openRows, ...completedRows];
    }, [items, hasDeviceByPlate]);

    const tableFilterState = useTableFilters({ storageKey: "rental-table-filters" });
    const { filters: columnFilters } = tableFilterState;

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
        const target = rows.find((r) => String(r.rentalId) === String(rentalId));
        const next = !target?.restartBlocked;
        try {
            await updateRental(rentalId, { restartBlocked: next });
            // Update list
            setItems((prev) => prev.map((item) => (String(item.rentalId) === String(rentalId) ? { ...item, restartBlocked: next } : item)));
            // Update detail panel if same contract is open
            setSelectedContract((prev) => (prev && String(prev.rentalId) === String(rentalId) ? { ...prev, restartBlocked: next } : prev));
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

    const applyLocationData = (locationData) => {
        setSelectedContract((prev) => {
            if (!prev) return prev;
            const logRecord = locationData.logRecord || locationData.track || locationData.trail || [];
            const latestTrail = findLatestLogLocation(logRecord);
            const normalizedCurrent = (() => {
                const loc = locationData.currentLocation || locationData.location || prev.currentLocation || null;
                if (loc) {
                    const latRaw = loc.lat ?? loc.latitude;
                    const lngRaw = loc.lng ?? loc.longitude;
                    const lat = typeof latRaw === "string" ? Number(latRaw) : latRaw;
                    const lng = typeof lngRaw === "string" ? Number(lngRaw) : lngRaw;
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        return { ...loc, lat, lng };
                    }
                }
                // Fallback: if API didn't give a current location, use latest trail point
                if (latestTrail) {
                    return { lat: latestTrail.lat, lng: latestTrail.lng, source: "logRecord" };
                }
                return null;
            })();
            const updatedAt =
                locationData.locationUpdatedAt ||
                locationData.updatedAt ||
                prev.locationUpdatedAt ||
                latestTrail?.rawTime ||
                null;
            const resolvedAddress = locationData.currentLocation?.address || locationData.location?.address || prev?.currentLocation?.address;

            return {
                ...prev,
                currentLocation: (() => {
                    const base = normalizedCurrent ?? prev?.currentLocation ?? null;
                    if (!base) return base;
                    const address = resolvedAddress || base.address;
                    return address ? { ...base, address } : base;
                })(),
                logRecord,
                locationUpdatedAt: updatedAt,
                engineOn: locationData.engineOn ?? prev.engineOn,
            };
        });
    };


    const handleShowLocation = async () => {
        if (!selectedContract) return;

        const initialLimit = TRAIL_INITIAL_LIMIT;
        setIsLoadingLocation(true);
        try {
            // Fetch current location with tracking data from API
            const locationData = await fetchRentalLocation(selectedContract.rentalId, {
                trail: true,  // 궤적 데이터 포함
                limit: initialLimit,   // 최대 100개의 포인트
            });

            if (!locationData) {
                emitToast("현재 위치 정보를 가져올 수 없습니다.", "warning");
                return;
            }

            applyLocationData(locationData);
            setTrailLimit(initialLimit);
            setShowDetail(false);
            setShowLocationMap(true);
        } catch (error) {
            console.error("Failed to fetch rental location", error);
            emitToast("현재 위치 정보를 불러오는 중 오류가 발생했습니다.", "error");
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleLoadMoreTrail = async () => {
        if (!selectedContract) return;
        const currentLimit = trailLimit || TRAIL_INITIAL_LIMIT;
        if (currentLimit >= TRAIL_MAX_LIMIT) {
            emitToast("이동 경로를 최대로 불러왔습니다.", "info");
            return;
        }
        const nextLimit = Math.min(currentLimit + TRAIL_INCREMENT, TRAIL_MAX_LIMIT);
        setIsLoadingLocation(true);
        try {
            const locationData = await fetchRentalLocation(selectedContract.rentalId, {
                trail: true,
                limit: nextLimit,
            });
            if (!locationData) {
                emitToast("추가 이동 경로를 가져올 수 없습니다.", "warning");
                return;
            }
            applyLocationData(locationData);
            setTrailLimit(nextLimit);
            if (nextLimit === TRAIL_MAX_LIMIT) {
                emitToast("이동 경로를 최대로 불러왔습니다.", "info");
            }
        } catch (error) {
            console.error("Failed to fetch extended trail", error);
            emitToast("추가 이동 경로 요청 중 오류가 발생했습니다.", "error");
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleBackToDetail = () => {
        setShowLocationMap(false);
        setShowDetail(true);
    };

    // Auto-select all dates when location map opens
    useEffect(() => {
        if (showLocationMap && trackingDateKeys.length > 0) {
            console.log('[Auto-select dates]', { trackingDateKeys, currentFilters: trackingDateFilters });
            // Only auto-select if no filters are currently set
            if (trackingDateFilters.length === 0) {
                setTrackingDateFilters(trackingDateKeys);
            }
        }
    }, [showLocationMap, trackingDateKeys]);

    // Background reverse-geocoding to populate currentLocation.address on detail open
    useEffect(() => {
        if (!showDetail) return;
        const cl = selectedContract?.currentLocation;
        const lat = Number(cl?.lat);
        const lng = Number(cl?.lng);
        if (!cl || !Number.isFinite(lat) || !Number.isFinite(lng) || cl.address) return;

        let cancelled = false;
        let loaded = false;

        const loadKakao = () => {
            if (window.kakao && window.kakao.maps) {
                return Promise.resolve();
            }
            const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
            // Load with drawing lib as well to avoid conflicts when other components expect it
            const src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,drawing&autoload=false`;
            return new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${src}"]`) || document.querySelector("script[src*='dapi.kakao.com']");
                if (existing) {
                    const t = setInterval(() => {
                        if (window.kakao && window.kakao.maps) {
                            clearInterval(t);
                            resolve();
                        }
                    }, 100);
                    setTimeout(() => {
                        clearInterval(t);
                        // Resolve anyway; maps.load below will no-op if not available
                        resolve();
                    }, 5000);
                    return;
                }
                const script = document.createElement("script");
                script.src = src;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Kakao Maps SDK load failed"));
                document.head.appendChild(script);
            }).then(() => new Promise((resolve) => {
                try {
                    if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === "function") {
                        window.kakao.maps.load(() => resolve());
                    } else {
                        resolve();
                    }
                } catch {
                    resolve();
                }
            }));
        };

        (async () => {
            try {
                await loadKakao();
                loaded = true;
                if (cancelled || !window.kakao?.maps?.services?.Geocoder) return;
                const geocoder = new window.kakao.maps.services.Geocoder();
                const applyAddress = (addr) => {
                    if (!addr) {
                        setSelectedContract((prev) => {
                            if (!prev?.currentLocation) return prev;
                            if (prev.currentLocation.address) return prev;
                            return { ...prev, currentLocation: { ...prev.currentLocation, address: "주소 확인 실패" } };
                        });
                        return;
                    }
                    setSelectedContract((prev) => {
                        if (!prev) return prev;
                        const prevAddr = prev.currentLocation?.address;
                        if (prevAddr === addr) return prev;
                        return { ...prev, currentLocation: { ...(prev.currentLocation || {}), address: addr } };
                    });
                };

                // Only try with x=lng, y=lat; fall back to region code if address fails
                geocoder.coord2Address(lng, lat, (result, status) => {
                    if (cancelled) return;
                    if (status === window.kakao.maps.services.Status.OK && result && result[0]) {
                        const addr = result[0].address?.address_name || "";
                        if (addr) {
                            applyAddress(addr);
                            return;
                        }
                    }
                    // Region-level fallback
                    geocoder.coord2RegionCode(lng, lat, (regionResult, regionStatus) => {
                        if (cancelled) return;
                        if (regionStatus === window.kakao.maps.services.Status.OK && regionResult && regionResult[0]) {
                            const addr = regionResult[0].address_name || "";
                            if (addr) {
                                applyAddress(addr);
                                return;
                            }
                        }
                        applyAddress(null);
                    });
                });
            } catch {
                // ignore background geocoding errors
            }
        })();

        return () => { cancelled = true; };
    }, [showDetail, selectedContract?.currentLocation?.lat, selectedContract?.currentLocation?.lng]);

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

    // 동적 컬럼 생성
    const dynamicColumns = useMemo(() => columnsForRender
        .filter((col) => col.key !== "select") // Table 컴포넌트가 자동으로 select 추가
        .map((col) => ({
            ...col,
            style: {
                textAlign: "center",
                ...(col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {}),
                ...(col.key === "memo" ? { maxWidth: "150px" } : {}),
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
            // Filter meta and accessors per column
            ...(col.key === "company" ? {
              filterType: "select",
              filterAccessor: (row) => row?.companyName || row?.company || row?.companyId || "",
            } : null),
            ...(col.key === "plate" ? { filterType: "text" } : null),
            ...(col.key === "vehicleType" ? {
              filterType: "select",
              filterHideHeader: true,
              filterAllowAnd: false,
              filterOptions: [], // Prevent auto-generation of options
              filterPredicate: (row, filterValue) => {
                if (!filterValue || !filterValue.vehicleTypes) return true;
                const vehicleTypes = filterValue.vehicleTypes;
                if (Object.keys(vehicleTypes).length === 0) return true;

                const { baseType, yearKey } = parseVehicleTypeAndYear(row);
                const yearsForType = baseType ? vehicleTypes[baseType] : null;
                const match = !!(yearsForType && yearsForType.includes(yearKey));
                return match;
              },
              renderCustomFilter: ({ value, onChange, close }) => (
                <VehicleTypeYearFilter
                  value={value}
                  onChange={onChange}
                  onClear={() => onChange(null)}
                  rows={rows}
                />
              ),
            } : null),
            ...(col.key === "renterName" ? { filterType: "text" } : null),
            ...(col.key === "rentalPeriod" ? {
              filterType: "date-range",
              // 기준: end
              filterAccessor: (row) => row?.rentalPeriod?.end || "",
            } : null),
            ...(col.key === "rentalAmount" ? {
              filterType: "custom",
              // Apply number range AND (optional) duration classification
              filterPredicate: (row, f) => {
                if (!f || f.type !== 'custom') return true;
                const getAmount = (r) => {
                  const v = r?.rentalAmount;
                  if (typeof v === 'number') return v;
                  if (typeof v === 'string') {
                    const n = Number(v.replace(/[^0-9.-]/g, ''));
                    return Number.isNaN(n) ? null : n;
                  }
                  return null;
                };
                const amt = getAmount(row);
                if (f.min != null && f.min !== '' && (amt == null || amt < Number(f.min))) return false;
                if (f.max != null && f.max !== '' && (amt == null || amt > Number(f.max))) return false;
                const sel = Array.isArray(f.durations) ? f.durations : [];
                if (sel.length === 0) return true;
                const isLong = Boolean(row?.isLongTerm);
                const matchShort = sel.includes('short') && !isLong;
                const matchLong = sel.includes('long') && isLong;
                return matchShort || matchLong;
              },
              renderCustomFilter: ({ value, onChange }) => {
                const val = value && value.type === 'custom' ? value : { type: 'custom', min: '', max: '', durations: [] };
                const has = (k) => Array.isArray(val.durations) && val.durations.includes(k);
                const toggle = (k) => {
                  const curr = Array.isArray(val.durations) ? val.durations : [];
                  const next = has(k) ? curr.filter((x) => x !== k) : [...curr, k];
                  onChange({ ...val, durations: next });
                };
                return (
                  <div className="space-y-2">
                    <div className="filter-row">
                      <input type="number" className="filter-input" placeholder="최소 금액" value={val.min ?? ''} onChange={(e) => onChange({ ...val, min: e.target.value })} />
                      <span className="filter-sep">~</span>
                      <input type="number" className="filter-input" placeholder="최대 금액" value={val.max ?? ''} onChange={(e) => onChange({ ...val, max: e.target.value })} />
                    </div>
                    <div>
                      <div className="filter-label" style={{ marginBottom: 4 }}>기간</div>
                      <div className="filter-toggle-group" role="group" aria-label="기간 선택">
                        <button type="button" className={`filter-toggle${has('short') ? ' is-active' : ''}`} aria-pressed={has('short')} onClick={() => toggle('short')}>단기</button>
                        <button type="button" className={`filter-toggle${has('long') ? ' is-active' : ''}`} aria-pressed={has('long')} onClick={() => toggle('long')}>장기</button>
                      </div>
                    </div>
                  </div>
                );
              },
            } : null),
            ...(col.key === "contractStatus" ? {
              filterType: "multi-select",
              filterAccessor: (row) => computeContractStatus(row),
              filterOptions: [
                { value: "대여중", label: "대여중" },
                { value: "예약 중", label: "예약 중" },
                { value: "반납지연", label: "반납지연" },
                { value: "도난의심", label: "도난의심" },
                { value: "사고접수", label: "사고접수" },
                { value: "완료", label: "완료" },
              ],
              filterAllowAnd: false,
              filterHideHeader: true,
            } : null),
            ...(col.key === "engineStatus" ? {
              filterType: "select",
              filterAccessor: (row) => {
                if (!row?.hasDevice) return "단말 필요";
                return row?.engineOn ? "ON" : "OFF";
              },
              filterOptions: [
                { value: "ON", label: "ON" },
                { value: "OFF", label: "OFF" },
                { value: "단말 필요", label: "단말 필요" },
              ],
            } : null),
            ...(col.key === "restartBlocked" ? {
              filterType: "boolean",
              filterAccessor: (row) => Boolean(row?.restartBlocked),
              filterTriState: false,
            } : null),
            ...(col.key === "accident" ? {
              filterType: "boolean",
              filterAccessor: (row) => Boolean(row?.accidentReported),
              filterTriState: false,
            } : null),
            ...(col.key === "memo" ? { filterType: "text" } : null),
        })), [
            columnsForRender,
            rows, // needed for VehicleTypeYearFilter
            // Ensure closures used by renderers are always fresh
            editingMemo,
            memoText,
            handleToggleRestart,
            handlePlateClick,
            handleOpenAccidentModal,
        ]);

    // Apply column filters after dynamicColumns are available
    const filteredRows = useMemo(
        () => applyColumnFilters(rows, columnFilters, dynamicColumns),
        [rows, columnFilters, dynamicColumns]
    );

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
            case "engineStatus": {
                if (!row?.hasDevice) {
                    return (
                        <button
                            type="button"
                            onClick={openInstallModal}
                            title="단말 장착 신청"
                            aria-label="단말 장착 신청"
                            style={{
                                paddingTop: '2px',
                                paddingBottom: '2px',
                                paddingLeft: '11px',
                                paddingRight: '12px',
                                background: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '100px',
                                outline: '1px rgba(0, 0, 0, 0.02) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                wordWrap: 'break-word',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            단말필요
                        </button>
                    );
                }
                return <StatusBadge type={row.engineOn ? "on" : "off"}>{row.engineOn ? "ON" : "OFF"}</StatusBadge>;
            }
            case "restartBlocked": {
                if (!row?.hasDevice) {
                    return (
                        <button
                            type="button"
                            onClick={openInstallModal}
                            title="단말 장착 신청"
                            aria-label="단말 장착 신청"
                            style={{
                                paddingTop: '2px',
                                paddingBottom: '2px',
                                paddingLeft: '11px',
                                paddingRight: '12px',
                                background: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '100px',
                                outline: '1px rgba(0, 0, 0, 0.02) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                wordWrap: 'break-word',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            단말필요
                        </button>
                    );
                }
                const isBlocked = Boolean(row.restartBlocked);
                const identifier = row.plate || row.renterName || row.rentalId || "계약";
                const baseStyle = {
                    paddingLeft: '14px',
                    paddingRight: '14px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    borderRadius: '100px',
                    outline: '1px rgba(0, 0, 0, 0.02) solid',
                    outlineOffset: '-1px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    display: 'inline-flex',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontFamily: 'Pretendard',
                    fontWeight: 500,
                    lineHeight: '24px',
                    wordWrap: 'break-word',
                    border: 'none',
                    cursor: 'pointer',
                };
                const variantStyle = isBlocked
                    ? { background: 'rgba(235, 74, 69, 0.15)', color: '#EB4A45' }
                    : { background: 'rgba(0, 163.81, 26.33, 0.15)', color: '#2D6536' };
                return (
                    <button
                        type="button"
                        onClick={() => handleToggleRestart(row.rentalId)}
                        style={{ ...baseStyle, ...variantStyle }}
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
                            setMemoHistoryTarget({ id, label, memo: row.memo });
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
            완료: "completed",
        };
        const badgeType = statusMap[status] || "default";
        return <StatusBadge type={badgeType}>{status}</StatusBadge>;
    };

    // getRentalAmountBadges moved to RentalAmountCell component

    return (
        <div className="page page--data space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">계약등록관리</h1>
            <div className="table-toolbar">
                <div className="flex-1" />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="toolbar-button"
                        style={{
                            paddingLeft: '14px',
                            paddingRight: '14px',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            borderRadius: '6px',
                            outline: '1px rgba(0, 0, 0, 0.10) solid',
                            outlineOffset: '-1px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px',
                            display: 'inline-flex',
                            textAlign: 'center',
                            color: '#1C1C1C',
                            fontSize: '14px',
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            lineHeight: '24px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#006CEC';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.outline = 'none';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#1C1C1C';
                            e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                        }}
                    >
                        계약등록
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                        title={selectedCount === 0 ? "삭제할 항목을 선택하세요" : "선택 항목 삭제"}
                        className="toolbar-button"
                        style={{
                            paddingLeft: '14px',
                            paddingRight: '14px',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            borderRadius: '6px',
                            outline: '1px rgba(0, 0, 0, 0.10) solid',
                            outlineOffset: '-1px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px',
                            display: 'inline-flex',
                            textAlign: 'center',
                            color: '#1C1C1C',
                            fontSize: '14px',
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            lineHeight: '24px',
                            background: 'transparent',
                            border: 'none',
                            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                            opacity: selectedCount === 0 ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedCount > 0) {
                                e.currentTarget.style.background = '#006CEC';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.outline = 'none';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedCount > 0) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#1C1C1C';
                                e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                            }
                        }}
                    >
                        선택삭제
                    </button>
                    <div className="relative" data-column-dropdown>
                        <button
                            type="button"
                            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                            title="컬럼 설정"
                            className="toolbar-button"
                            style={{
                                paddingLeft: '14px',
                                paddingRight: '14px',
                                paddingTop: '4px',
                                paddingBottom: '4px',
                                borderRadius: '6px',
                                outline: '1px rgba(0, 0, 0, 0.10) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '5px',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#006CEC';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.outline = 'none';
                                const svg = e.currentTarget.querySelector('svg path');
                                if (svg) svg.setAttribute('fill', 'white');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#1C1C1C';
                                e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                                const svg = e.currentTarget.querySelector('svg path');
                                if (svg) svg.setAttribute('fill', '#1C1C1C');
                            }}
                        >
                            컬럼설정
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.6667 4.77166V1.75C11.6667 1.59529 11.6052 1.44691 11.4958 1.33752C11.3864 1.22812 11.2381 1.16666 11.0834 1.16666C10.9287 1.16666 10.7803 1.22812 10.6709 1.33752C10.5615 1.44691 10.5 1.59529 10.5 1.75V4.77166C10.1622 4.89428 9.8703 5.11795 9.66402 5.41226C9.45774 5.70657 9.34709 6.05726 9.34709 6.41666C9.34709 6.77607 9.45774 7.12676 9.66402 7.42107C9.8703 7.71538 10.1622 7.93905 10.5 8.06166V12.25C10.5 12.4047 10.5615 12.5531 10.6709 12.6625C10.7803 12.7719 10.9287 12.8333 11.0834 12.8333C11.2381 12.8333 11.3864 12.7719 11.4958 12.6625C11.6052 12.5531 11.6667 12.4047 11.6667 12.25V8.06166C12.0045 7.93905 12.2964 7.71538 12.5027 7.42107C12.709 7.12676 12.8196 6.77607 12.8196 6.41666C12.8196 6.05726 12.709 5.70657 12.5027 5.41226C12.2964 5.11795 12.0045 4.89428 11.6667 4.77166ZM11.0834 7C10.968 7 10.8552 6.96579 10.7593 6.90169C10.6634 6.83759 10.5886 6.74649 10.5444 6.6399C10.5003 6.53331 10.4887 6.41602 10.5112 6.30286C10.5337 6.18971 10.5893 6.08577 10.6709 6.00419C10.7525 5.92261 10.8564 5.86705 10.9696 5.84454C11.0827 5.82203 11.2 5.83358 11.3066 5.87773C11.4132 5.92189 11.5043 5.99665 11.5684 6.09258C11.6325 6.18851 11.6667 6.30129 11.6667 6.41666C11.6667 6.57137 11.6052 6.71975 11.4958 6.82914C11.3864 6.93854 11.2381 7 11.0834 7ZM7.58336 8.27166V1.75C7.58336 1.59529 7.52191 1.44691 7.41251 1.33752C7.30311 1.22812 7.15474 1.16666 7.00003 1.16666C6.84532 1.16666 6.69695 1.22812 6.58755 1.33752C6.47816 1.44691 6.4167 1.59529 6.4167 1.75V8.27166C6.07886 8.39428 5.78697 8.61795 5.58069 8.91226C5.37441 9.20657 5.26375 9.55726 5.26375 9.91667C5.26375 10.2761 5.37441 10.6268 5.58069 10.9211C5.78697 11.2154 6.07886 11.439 6.4167 11.5617V12.25C6.4167 12.4047 6.47816 12.5531 6.58755 12.6625C6.69695 12.7719 6.84532 12.8333 7.00003 12.8333C7.15474 12.8333 7.30311 12.7719 7.41251 12.6625C7.52191 12.5531 7.58336 12.4047 7.58336 12.25V11.5617C7.9212 11.439 8.2131 11.2154 8.41937 10.9211C8.62565 10.6268 8.73631 10.2761 8.73631 9.91667C8.73631 9.55726 8.62565 9.20657 8.41937 8.91226C8.2131 8.61795 7.9212 8.39428 7.58336 8.27166ZM7.00003 10.5C6.88466 10.5 6.77188 10.4658 6.67595 10.4017C6.58002 10.3376 6.50525 10.2465 6.4611 10.1399C6.41695 10.0333 6.4054 9.91602 6.42791 9.80286C6.45042 9.68971 6.50597 9.58577 6.58755 9.50419C6.66913 9.4226 6.77307 9.36705 6.88623 9.34454C6.99938 9.32203 7.11667 9.33358 7.22326 9.37774C7.32985 9.42189 7.42096 9.49665 7.48506 9.59258C7.54915 9.68851 7.58336 9.80129 7.58336 9.91667C7.58336 10.0714 7.52191 10.2197 7.41251 10.3291C7.30311 10.4385 7.15474 10.5 7.00003 10.5ZM3.50003 3.605V1.75C3.50003 1.59529 3.43857 1.44691 3.32918 1.33752C3.21978 1.22812 3.07141 1.16666 2.9167 1.16666C2.76199 1.16666 2.61362 1.22812 2.50422 1.33752C2.39482 1.44691 2.33336 1.59529 2.33336 1.75V3.605C1.99553 3.72762 1.70363 3.95128 1.49736 4.24559C1.29108 4.53991 1.18042 4.89059 1.18042 5.25C1.18042 5.6094 1.29108 5.96009 1.49736 6.2544C1.70363 6.54871 1.99553 6.77238 2.33336 6.895V12.25C2.33336 12.4047 2.39482 12.5531 2.50422 12.6625C2.61362 12.7719 2.76199 12.8333 2.9167 12.8333C3.07141 12.8333 3.21978 12.7719 3.32918 12.6625C3.43857 12.5531 3.50003 12.4047 3.50003 12.25V6.895C3.83787 6.77238 4.12976 6.54871 4.33604 6.2544C4.54232 5.96009 4.65298 5.6094 4.65298 5.25C4.65298 4.89059 4.54232 4.53991 4.33604 4.24559C4.12976 3.95128 3.83787 3.72762 3.50003 3.605ZM2.9167 5.83333C2.80133 5.83333 2.68854 5.79912 2.59262 5.73502C2.49669 5.67092 2.42192 5.57982 2.37777 5.47323C2.33362 5.36664 2.32207 5.24935 2.34457 5.13619C2.36708 5.02304 2.42264 4.9191 2.50422 4.83752C2.5858 4.75594 2.68974 4.70038 2.8029 4.67787C2.91605 4.65536 3.03334 4.66692 3.13993 4.71107C3.24652 4.75522 3.33762 4.82999 3.40172 4.92591C3.46582 5.02184 3.50003 5.13463 3.50003 5.25C3.50003 5.40471 3.43857 5.55308 3.32918 5.66248C3.21978 5.77187 3.07141 5.83333 2.9167 5.83333Z" fill="#1C1C1C"/>
                            </svg>
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
                    <button
                        type="button"
                        onClick={tableFilterState.clearAll}
                        title="모든 컬럼 필터 초기화"
                        className="toolbar-button"
                        style={{
                            width: '104px',
                            paddingLeft: '14px',
                            paddingRight: '14px',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            borderRadius: '6px',
                            outline: '1px rgba(0, 0, 0, 0.10) solid',
                            outlineOffset: '-1px',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            display: 'inline-flex',
                            textAlign: 'center',
                            color: '#1C1C1C',
                            fontSize: '14px',
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            lineHeight: '24px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#006CEC';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.outline = 'none';
                            const svg = e.currentTarget.querySelector('svg path');
                            if (svg) svg.setAttribute('fill', 'white');
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#1C1C1C';
                            e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                            const svg = e.currentTarget.querySelector('svg path');
                            if (svg) svg.setAttribute('fill', '#1C1C1C');
                        }}
                    >
                        필터초기화
                        <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.9998 6.97426C12.011 8.31822 11.5834 9.62682 10.7861 10.6886C9.98877 11.7504 8.86834 12.5033 7.60586 12.8256C6.34338 13.148 5.0126 13.0209 3.8286 12.4651C2.6446 11.9092 1.67654 10.957 1.08087 9.76225C1.03928 9.68491 1.01307 9.59975 1.00379 9.51179C0.994503 9.42383 1.00233 9.33484 1.0268 9.25005C1.05127 9.16526 1.0919 9.08638 1.14629 9.01805C1.20069 8.94972 1.26775 8.89332 1.34354 8.85217C1.41933 8.81101 1.50232 8.78593 1.58762 8.7784C1.67293 8.77087 1.75883 8.78104 1.84027 8.80831C1.92172 8.83559 1.99706 8.87942 2.06188 8.93722C2.1267 8.99502 2.17969 9.06564 2.21772 9.14491C2.48916 9.67189 2.85539 10.1405 3.29677 10.5256C3.96005 11.1093 4.77313 11.4813 5.63716 11.5963C6.50118 11.7114 7.37893 11.5645 8.16369 11.1736C8.94845 10.7826 9.60643 10.1645 10.0576 9.39432C10.5088 8.62413 10.7338 7.73506 10.7052 6.8352C10.6766 5.93534 10.3956 5.06344 9.8965 4.32552C9.39738 3.5876 8.70157 3.01543 7.89368 2.67858C7.08578 2.34173 6.2006 2.2547 5.34574 2.42809C4.49089 2.60147 3.70318 3.0278 3.07839 3.65523H4.29232C4.46266 3.65523 4.62603 3.72516 4.74648 3.84965C4.86694 3.97414 4.9346 4.14298 4.9346 4.31903C4.9346 4.49509 4.86694 4.66393 4.74648 4.78842C4.62603 4.9129 4.46266 4.98284 4.29232 4.98284H1.72316C1.55281 4.98284 1.38944 4.9129 1.26899 4.78842C1.14854 4.66393 1.08087 4.49509 1.08087 4.31903V1.66381C1.08087 1.48775 1.14854 1.31891 1.26899 1.19442C1.38944 1.06994 1.55281 1 1.72316 1C1.8935 1 2.05687 1.06994 2.17733 1.19442C2.29778 1.31891 2.36545 1.48775 2.36545 1.66381V2.52676C3.19686 1.75821 4.22566 1.25468 5.32778 1.0769C6.42989 0.899131 7.55823 1.05471 8.5767 1.52486C9.59517 1.99502 10.4603 2.75968 11.0677 3.72661C11.675 4.69354 11.9988 5.82144 11.9998 6.97426Z" fill="#1C1C1C"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="page-scroll space-y-4">

                <Table
                    rowIdKey="rentalId"
                    columns={dynamicColumns}
                    data={filteredRows}
                    rowClassName={(row) => (row.contractStatus === "완료" ? "is-completed" : undefined)}
                    selection={{ selected, toggleSelect, toggleSelectAllVisible, allVisibleSelected }}
                    emptyMessage="조건에 맞는 계약이 없습니다."
                    stickyHeader
                    className="rentals-table"
                    enableColumnFilters={TABLE_COLUMN_FILTERS_ENABLED}
                    filters={columnFilters}
                    onFiltersChange={(next) => tableFilterState.setFilters(next)}
                />
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="계약 등록" showFooter={false} ariaLabel="Create Rental">
                <RentalForm onSubmit={handleCreateSubmit} formId="rental-create" onClose={() => setShowCreate(false)} />
            </Modal>

            <TerminalRequestModal isOpen={installModalOpen} onClose={closeInstallModal} />

            <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="계약 상세 정보" showFooter={false} ariaLabel="Contract Details">
                {selectedContract && (
                    <div style={{ padding: "20px" }}>
                        {/* 상단 액션 버튼들 */}
                        <div className="quick-actions">
                            <div className="quick-actions__label">빠른 액션</div>
                            {/* 현재 위치 보기 버튼 */}
                            <button
                                onClick={handleShowLocation}
                                disabled={isLoadingLocation}
                                className="form-button form-button--accent"
                                title="현재 위치를 지도에서 확인"
                            >
                                <FaMapMarkerAlt size={16} aria-hidden="true" />
                                {isLoadingLocation ? "불러오는 중..." : "현재 위치"}
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
                                        <strong>계약 상태:</strong> {getContractStatusBadge(computeContractStatus(selectedContract))}
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
                                        {(() => {
                                            const hasDevice = computeHasDevice(selectedContract, hasDeviceByPlate);
                                            if (!hasDevice) {
                                                return (
                                                    <button
                                                        type="button"
                                                        className="badge badge--default badge--clickable badge--compact"
                                                        onClick={openInstallModal}
                                                        style={{ marginLeft: "8px" }}
                                                        title="단말 장착 신청"
                                                        aria-label="단말 장착 신청"
                                                    >
                                                        단말 필요
                                                    </button>
                                                );
                                            }
                                            return (
                                                <StatusBadge
                                                    style={{
                                                        backgroundColor: selectedContract.engineOn ? "#4caf50" : "#f44336",
                                                        color: "white",
                                                        marginLeft: "8px",
                                                    }}
                                                >
                                                    {selectedContract.engineOn ? "ON" : "OFF"}
                                                </StatusBadge>
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <strong>재시동 금지:</strong>
                                        {(() => {
                                            const hasDevice = computeHasDevice(selectedContract, hasDeviceByPlate);
                                            if (!hasDevice) {
                                                return (
                                                    <button
                                                        type="button"
                                                        className="badge badge--default badge--clickable badge--compact"
                                                        onClick={openInstallModal}
                                                        style={{ marginLeft: "8px" }}
                                                        title="단말 장착 신청"
                                                        aria-label="단말 장착 신청"
                                                    >
                                                        단말 필요
                                                    </button>
                                                );
                                            }
                                            return (
                                                <StatusBadge
                                                    type={selectedContract.restartBlocked ? "restart-blocked" : "restart-allowed"}
                                                    style={{ marginLeft: "8px" }}
                                                >
                                                    {selectedContract.restartBlocked ? "차단" : "허용"}
                                                </StatusBadge>
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <strong>위치:</strong> {
                                            selectedContract.currentLocation
                                                ? (selectedContract.currentLocation.address || "주소 확인 중...")
                                                : (
                                                    selectedContract.rentalLocation?.address ||
                                                    selectedContract.returnLocation?.address ||
                                                    selectedContract.address ||
                                                    selectedContract.location ||
                                                    "정보 없음"
                                                )
                                        }
                                    </div>
                                    <div>
                                        <strong>주행 거리:</strong> {selectedContract.mileage ? `${formatNumberDisplay(selectedContract.mileage)} km` : "-"}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#333" }}>금액 정보</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <strong>대여 금액:</strong> {formatCurrencyDisplay(selectedContract.rentalAmount || 0)}
                                    </div>
                                    <div>
                                        <strong>보증금:</strong> {formatCurrencyDisplay(selectedContract.deposit || 0)}
                                    </div>
                                    <div>
                                        <strong>미납 금액:</strong> {formatCurrencyDisplay(selectedContract.unpaidAmount || 0)}
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
                                    <strong>등록일:</strong> {selectedContract.createdAt ? formatYyMmDdHhMmSs(selectedContract.createdAt) : "-"}
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

                                {/* FAX 보내기 (placed below rental info, right column) */}
                                <div className="mt-4">
                                    <h3 className="m-0 text-base text-gray-800 dark:text-gray-100 mb-2">FAX 보내기</h3>
                                    <FaxSendPanel rentalId={accidentTarget.rentalId} defaultTitle={"사고 접수 서류"} compact />
                                </div>
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
                                backgroundColor: "var(--location-header-bg, #f8f9fa)",
                                borderRadius: "8px",
                            }}
                        >
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>
                                    {selectedContract.plate} ({selectedContract.vehicleType})
                                </div>
                                <div style={{ fontSize: "0.9rem", color: "var(--location-header-text, #555)", lineHeight: 1.6 }}>
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {trackingDateKeys.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-full shadow-sm bg-white/95 dark:bg-slate-800/95 text-slate-900 dark:text-slate-100">
                                    {hasSelectedTrackingData && (
                                        <>
                                            <span className="font-semibold text-[12px] whitespace-nowrap">속도 범례:&nbsp;&nbsp;&nbsp; </span>
                                            {speedLegendItems.map((item) => (
                                                <div
                                                    key={item.key}
                                                    className="flex items-center gap-2 text-[12px] leading-tight px-2.5 py-1 rounded-full"
                                                    style={{ backgroundColor: item.bg, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)" }}
                                                >
                                                    <div className="w-4 h-[3px] rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span> &nbsp;&nbsp;&nbsp; </span>
                                                    <span className="whitespace-nowrap" style={{ color: item.color }}>{item.label}</span>
                                                    <span> &nbsp;&nbsp;&nbsp; </span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    <div className="ml-auto flex items-center gap-2">
                                        {trackingDateKeys.length > 1 && (
                                            <div className="flex items-center gap-1 text-[12px]">
                                                <span className="font-semibold whitespace-nowrap mr-1">일자:</span>
                                                {trackingDateKeys.map((key) => {
                                                    const isActive = Array.isArray(trackingDateFilters) && trackingDateFilters.includes(key);
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => {
                                                                console.log('[DateButton Click]', { clickedDate: key, label: formatTrackingDateLabel(key) });
                                                                setTrackingDateFilters((prev) => {
                                                                    const base = Array.isArray(prev) ? prev : [];
                                                                    const wasActive = base.includes(key);
                                                                    const nextFilters = wasActive
                                                                        ? base.filter((k) => k !== key)
                                                                        : [...base, key];
                                                                    console.log('[DateButton Update]', {
                                                                        clickedDate: key,
                                                                        action: wasActive ? 'REMOVED' : 'ADDED',
                                                                        prevFilters: base,
                                                                        nextFilters
                                                                    });
                                                                    return nextFilters;
                                                                });
                                                            }}
                                                            className={`text-[12px] px-3 py-1 rounded-full border-0 ${
                                                                isActive ? "bg-slate-900 text-white shadow-sm" : "bg-white/80 text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            {formatTrackingDateLabel(key)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleLoadMoreTrail}
                                            disabled={isLoadingLocation}
                                            className="border-0 text-[12px] px-3 py-1 rounded-full bg-white hover:bg-slate-50"
                                        >
                                            이동경로 더보기
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div
                                style={{
                                    position: "relative",
                                    height: "420px",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                    border: "1px solid #e5e7eb",
                                    backgroundColor: "var(--location-map-bg, #f8f9fa)",
                                }}
                            >
                                {selectedContract.currentLocation ? (
                                    <KakaoMap
                                        latitude={selectedContract.currentLocation.lat}
                                        longitude={selectedContract.currentLocation.lng}
                                        vehicleNumber={selectedContract.plate}
                                        lastUpdateTime={mapLastUpdateTime}
                                        markerTitle={`${selectedContract.plate} (${selectedContract.vehicleType})`}
                                        width="100%"
                                        height="100%"
                                        renterName={selectedContract.renterName}
                                        engineOn={selectedContract.engineOn}
                                        isOnline={!!selectedContract.currentLocation}
                                        trackingData={filteredTrackingData}
                                        showSpeedLegend={false}
                                        showStatusOverlay={false}
                                        onAddressResolved={(addr) => {
                                            setSelectedContract((prev) => {
                                                if (!prev) return prev;
                                                const cl = prev.currentLocation || {};
                                                if (cl.address === addr) return prev;
                                                return { ...prev, currentLocation: { ...cl, address: addr } };
                                            });
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            backgroundColor: "var(--location-placeholder-bg, #f8f9fa)",
                                            borderRadius: "10px",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            border: "2px dashed var(--location-placeholder-border, #dee2e6)",
                                        }}
                                    >
                                        <FaMapMarkerAlt size={48} style={{ marginBottom: "16px", color: "var(--location-placeholder-icon, #adb5bd)" }} />
                                        <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--location-placeholder-title, #6c757d)", marginBottom: "8px" }}>위치 정보 없음</div>
                                        <div style={{ fontSize: "0.9rem", color: "var(--location-placeholder-subtext, #adb5bd)" }}>현재 차량의 위치 정보를 받을 수 없습니다.</div>
                                    </div>
                                )}
                            </div>
                        </div>
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
                currentMemo={memoHistoryTarget?.memo}
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
