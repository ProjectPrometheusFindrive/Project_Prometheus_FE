import React, { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "../contexts/ConfirmContext";
import { resolveVehicleRentals, fetchAssetById, fetchAssets, fetchAssetsSummary, saveAsset, buildRentalIndexByVin, createRental, updateRental, createAsset, deleteAsset, fetchAssetProfile, fetchAssetDevice, fetchAssetDiagnostics } from "../api";
import { uploadMany } from "../utils/uploadHelpers";
import { parseCurrency } from "../utils/formatters";
import AssetForm from "../components/forms/AssetForm";
import DeviceInfoForm from "../components/forms/DeviceInfoForm";
import InfoGrid from "../components/InfoGrid";
import AssetDialog from "../components/AssetDialog";
import InsuranceDialog from "../components/InsuranceDialog";
import DeviceEventLog from "../components/DeviceEventLog";
import DiagnosticCountBadge from "../components/badges/DiagnosticCountBadge";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import Table from "../components/Table";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../constants/auth";
import useTableSelection from "../hooks/useTableSelection";
// Local storage fallbacks removed; use API persistence instead
import { ASSET } from "../constants";
import { MANAGEMENT_STAGE_OPTIONS } from "../constants/forms";
import { formatDateShort } from "../utils/date";
import { getManagementStage, withManagementStage, getDiagnosticCount } from "../utils/managementStage";
import { FaCog } from "react-icons/fa";
import MemoHistoryModal from "../components/modals/MemoHistoryModal";
import { MemoCell, AssetManagementStageCell, VehicleHealthCell, CompanyCell, PlateCell } from "../components/cells";
import useMemoEditor from "../hooks/useMemoEditor";
import useInsuranceModal from "../hooks/useInsuranceModal";
import useManagementStage from "../hooks/useManagementStage";
import useColumnSettings from "../hooks/useColumnSettings";
import useDropdownState from "../hooks/useDropdownState";
import { VehicleTypeText } from "../components/cells";
import ColumnSettingsMenu from "../components/ColumnSettingsMenu";
import { emitToast } from "../utils/toast";
import SeverityBadge from "../components/badges/SeverityBadge";

// Column defaults for AssetStatus table
const DEFAULT_ASSET_COLUMNS = [
  { key: "select", label: "선택", visible: true, required: true, width: 36 },
  { key: "plate", label: "차량번호", visible: true, required: true },
  { key: "vehicleType", label: "차종", visible: true, required: false },
  { key: "registrationDate", label: "차량등록일", visible: true, required: false },
  { key: "insuranceExpiryDate", label: "보험만료일", visible: true, required: false },
  { key: "deviceStatus", label: "단말 상태", visible: true, required: false },
  { key: "vehicleHealth", label: "차량 상태", visible: true, required: false },
  { key: "severity", label: "심각도", visible: true, required: false },
  { key: "managementStage", label: "관리상태", visible: true, required: false },
  { key: "memo", label: "메모", visible: true, required: false },
];

// 진단 코드 유틸: 배열 기반만 사용
const normalizeDiagnosticList = (asset) => {
    const raw = asset?.diagnosticCodes;
    if (Array.isArray(raw)) {
        // 이미 개별 코드 배열 형태인 경우 정규화
        return raw
            .filter(Boolean)
            .map((it, idx) => ({
                id: it.id || `${asset?.id || asset?.vin || "asset"}-diag-${idx}`,
                code: it.code || "",
                description: it.description || it.content || it.note || "",
                severity: it.severity || it.level || "낮음",
                detectedDate: it.detectedDate || it.date || it.detected_at || "",
            }));
    }
    // 배열 데이터가 없으면 빈 목록 반환
    return [];
};


const severityNumber = (s) => {
    if (typeof s === "number") return Math.max(0, Math.min(10, s));
    if (typeof s === "string") {
        const m = s.trim();
        if (m === "낮음") return 2;
        if (m === "보통") return 5;
        if (m === "높음") return 8;
        const n = parseFloat(m);
        return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
    }
    return 0;
};

const severityClass = (n) => (n <= 3 ? "low" : n <= 7 ? "medium" : "high");

const MANAGEMENT_STAGE_SET = new Set(MANAGEMENT_STAGE_OPTIONS.map((opt) => opt.value));
const MANAGEMENT_STAGE_BADGE_CLASS = {
    대여가능: "badge--available",
    대여중: "badge--rented",
    예약중: "badge--pending",
    "입고 대상": "badge--default",
    "수리/점검 중": "badge--maintenance",
    "수리/점검 완료": "badge--completed",
};

export default function AssetStatus() {
    const confirm = useConfirm();
    const auth = useAuth();
    const isSuperAdmin = auth?.user?.role === ROLES.SUPER_ADMIN;
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [rows, setRows] = useState([]);
    const [stageSaving, setStageSaving] = useState({});
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [assetFormInitial, setAssetFormInitial] = useState({});
    const [editingAssetId, setEditingAssetId] = useState(null);
    const [assetRequireDocs, setAssetRequireDocs] = useState(true);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [activeAsset, setActiveAsset] = useState(null);
    const [deviceReadOnly, setDeviceReadOnly] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoVehicle, setInfoVehicle] = useState(null);
    const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
    const [diagnosticDetail, setDiagnosticDetail] = useState(null);
    const { editingId: editingMemo, memoText, onEdit: onMemoEdit, onChange: onMemoChange, onCancel: onMemoCancel } = useMemoEditor();
    const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
    const [showRentalModal, setShowRentalModal] = useState(false);
    const [rentalFormInitial, setRentalFormInitial] = useState({});
    const [pendingStageAssetId, setPendingStageAssetId] = useState(null);
    const [pendingNextStage, setPendingNextStage] = useState(null);
    // Dropdown state management via hook
    const {
        openDropdowns,
        stageDropdownUp,
        setStageDropdownUp,
        toggleColumn: toggleColumnDropdown,
        toggleStage: toggleStageDropdown,
        toggleInconsistency,
        closeStage: closeStageDropdown,
    } = useDropdownState();
    const { columns, visibleColumns, toggleColumnVisibility, moveColumn } = useColumnSettings({
        storageKey: "asset-columns-settings",
        defaultColumns: DEFAULT_ASSET_COLUMNS,
    });
    // Insurance modal state via hook
    const {
        showInsuranceModal,
        insuranceAsset,
        insuranceReadOnly,
        openInsuranceModal,
        openInsuranceModalReadOnly,
        closeInsuranceModal,
        handleInsuranceSubmit,
    } = useInsuranceModal({
        onSaved: (id, patch, resp) => {
            setRows((prev) =>
                prev.map((a) => {
                    if (a.id !== id) return a;
                    const merged = { ...a, ...(patch || {}), ...(resp || {}) };
                    return withManagementStage(merged);
                })
            );
        }
    });
    const [rentalsByVin, setRentalsByVin] = useState({});
    const [toast, setToast] = useState(null);
    const [showMemoHistoryModal, setShowMemoHistoryModal] = useState(false);
    const [memoHistoryTarget, setMemoHistoryTarget] = useState(null);
    // insurance handlers moved to hook

    // inline panel removed

    const { handleManagementStageChange } = useManagementStage({
        setRows,
        setStageSaving,
        withManagementStage,
        getManagementStage,
        setShowRentalModal,
        setPendingStageAssetId,
        setPendingNextStage,
        setRentalFormInitial,
    });

    const handleRentalCreateSubmit = async (data) => {
        // Create rental via API, then upload any provided docs (multi-file)
        const { contractFile, driverLicenseFile, preUploaded, ocrSuggestions, ...rest } = data || {};
        const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
        const contractFiles = toArray(contractFile);
        const licenseFiles = toArray(driverLicenseFile);
        const payload = {
            ...rest,
            rentalAmount: parseCurrency(rest.rentalAmount),
            deposit: parseCurrency(rest.deposit),
            rentalPeriod: { start: rest.start || "", end: rest.end || "" },
        };
        let created;
        try {
            created = await createRental(payload);
        } catch (e) {
            console.error("Failed to create rental via API", e);
            emitToast("계약 생성에 실패했습니다.", "error");
            return;
        }

        // Attach pre-uploaded docs if present; otherwise upload after creation
        const preC = preUploaded && Array.isArray(preUploaded.contract) ? preUploaded.contract : [];
        const preL = preUploaded && Array.isArray(preUploaded.license) ? preUploaded.license : [];
        if (created && (preC.length > 0 || preL.length > 0)) {
            const patch = {};
            if (preC.length > 0) {
                patch.contractDocNames = preC.map((it) => it.name);
                patch.contractDocGcsObjectNames = preC.map((it) => it.objectName);
                patch.contractDocName = patch.contractDocNames[0];
                patch.contractDocGcsObjectName = patch.contractDocGcsObjectNames[0];
            }
            if (preL.length > 0) {
                patch.licenseDocNames = preL.map((it) => it.name);
                patch.licenseDocGcsObjectNames = preL.map((it) => it.objectName);
                patch.licenseDocName = patch.licenseDocNames[0];
                patch.licenseDocGcsObjectName = patch.licenseDocGcsObjectNames[0];
            }
            try { await updateRental(created.rentalId, patch); } catch (e) { console.warn("Failed to patch rental with preUploaded docs", e); }
            created = { ...created, ...patch };
        } else if (created && (contractFiles.length > 0 || licenseFiles.length > 0)) {
            console.groupCollapsed("[upload-ui] rental create docs (from Asset) start");
            try {
                const rentalId = created.rentalId || rest.rentalId;
                const base = `rentals/${rentalId}`;
                const [contractRes, licenseRes] = await Promise.all([
                    uploadMany(contractFiles, { folder: `${base}/contracts`, label: "contracts" }),
                    uploadMany(licenseFiles, { folder: `${base}/licenses`, label: "licenses" }),
                ]);
                if ((contractRes.objects.length > 0) || (licenseRes.objects.length > 0)) {
                    const patch = {};
                    if (contractRes.objects.length > 0) {
                        patch.contractDocNames = contractRes.names;
                        patch.contractDocGcsObjectNames = contractRes.objects;
                        patch.contractDocName = contractRes.names[0];
                        patch.contractDocGcsObjectName = contractRes.objects[0];
                    }
                    if (licenseRes.objects.length > 0) {
                        patch.licenseDocNames = licenseRes.names;
                        patch.licenseDocGcsObjectNames = licenseRes.objects;
                        patch.licenseDocName = licenseRes.names[0];
                        patch.licenseDocGcsObjectName = licenseRes.objects[0];
                    }
                    await updateRental(created.rentalId, patch).catch((e) => console.warn("Failed to patch rental with doc URLs", e));
                    created = { ...created, ...patch };
                }
            } finally {
                console.groupEnd();
            }
        }

        // Adjust stage based on start date to keep consistency
        const s = data?.start ? new Date(data.start) : null;
        const e = data?.end ? new Date(data.end) : null;
        const now = new Date();
        let stageAfter = pendingNextStage || "대여중";
        if (stageAfter === "예약중" && s && now >= s && e && now <= e) {
            stageAfter = "대여중"; // 예약이지만 시작 시각이 현재와 겹치면 대여중으로 보정
        } else if (stageAfter === "대여중" && s && now < s) {
            stageAfter = "예약중"; // 대여중으로 바꾸려 했지만 시작이 미래면 예약중으로 보정
        }

        const id = pendingStageAssetId;
        if (id) {
            setRows((prev) => prev.map((row) => (row.id === id ? withManagementStage({ ...row, managementStage: stageAfter }) : row)));
            setStageSaving((prev) => ({ ...prev, [id]: true }));
            try {
                const response = await saveAsset(id, { managementStage: stageAfter });
                setRows((prev) =>
                    prev.map((row) => {
                        if (row.id !== id) return row;
                        const updatedStage = response?.managementStage && MANAGEMENT_STAGE_SET.has(response.managementStage) ? response.managementStage : stageAfter;
                        const merged = { ...row, ...(response || {}), managementStage: updatedStage };
                        return withManagementStage(merged);
                    })
                );
            } catch (error) {
                console.error("Failed to save management stage after rental create", error);
                emitToast("관리단계를 저장하지 못했습니다. 다시 시도해주세요.", "error");
            } finally {
                setStageSaving((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        }

        setShowRentalModal(false);
        setPendingStageAssetId(null);
        setPendingNextStage(null);
    };

    // rental create submit handled by hook version; wire context when calling

    const deviceInitial = useMemo(() => {
        if (!activeAsset) return {};
        return {
            supplier: activeAsset.supplier || "",
            installDate: activeAsset.deviceInstallDate || activeAsset.installDate || "",
            installer: activeAsset.installer || "",
            serial: activeAsset.deviceSerial || "",
            photos: [],
        };
    }, [activeAsset]);

    // Unified device modal opener (replaces openDeviceRegister + openDeviceView)
    const openDeviceModal = (asset, readOnly = false) => {
        setActiveAsset(asset);
        setDeviceReadOnly(readOnly);
        setShowDeviceModal(true);
        if (asset?.id) {
            (async () => {
                try {
                    const detail = await fetchAssetDevice(asset.id);
                    if (detail) setActiveAsset((prev) => ({ ...(prev || {}), ...detail }));
                } catch (e) {
                    console.error("Failed to load device detail", e);
                }
            })();
        }
    };

    // Date formatting handled by utils/date

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Prefer lightweight summary for table; gracefully fall back
                let list = await fetchAssetsSummary().catch(() => null);
                if (!Array.isArray(list)) {
                    list = await fetchAssets();
                }
                let next = Array.isArray(list) ? list.map((a) => withManagementStage({ ...a })) : [];
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

    // Load rental consistency index per VIN (lightweight)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const index = await buildRentalIndexByVin();
                if (mounted) setRentalsByVin(index || {});
            } catch (e) {
                console.error("Failed to load rentals for consistency indicator", e);
                if (mounted) setRentalsByVin({});
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // 외부 클릭 및 ESC 감지는 useDropdownState 훅에서 처리됨

    const tableWrapRef = useRef(null);

    // Helper to build a safe dropdown id from a row key
    const stageDropdownIdForKey = (key) => `management-stage-${String(key).replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    // Recalculate stage dropdown placement on open, scroll, and resize
    useEffect(() => {
        const recalc = () => {
            if (openDropdowns.stage == null) {
                setStageDropdownUp(false);
                return;
            }
            const dropdownId = stageDropdownIdForKey(openDropdowns.stage);
            const trigger = document.querySelector(`[aria-controls="${dropdownId}"]`);
            const listEl = document.getElementById(dropdownId);
            if (!trigger || !listEl) {
                setStageDropdownUp(false);
                return;
            }
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const rect = trigger.getBoundingClientRect();
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = listEl.offsetHeight || listEl.scrollHeight || 0;
            const gap = 8; // matches CSS spacing
            const shouldFlipUp = spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow;
            setStageDropdownUp(!!shouldFlipUp);
        };

        if (openDropdowns.stage != null) {
            // Defer until after dropdown is rendered
            requestAnimationFrame(recalc);
        }

        const tableWrap = tableWrapRef.current;
        window.addEventListener('resize', recalc);
        if (tableWrap) tableWrap.addEventListener('scroll', recalc, { passive: true });
        return () => {
            window.removeEventListener('resize', recalc);
            if (tableWrap) tableWrap.removeEventListener('scroll', recalc);
        };
    }, [openDropdowns.stage, setStageDropdownUp]);

    // no-op: removed debug logs

    const debouncedQ = useDebouncedValue(q, 250);
    const filtered = useMemo(() => {
        const term = debouncedQ.trim().toLowerCase();
        return rows.filter((a) => {
            const matchesTerm = term
                ? [a.plate, a.vehicleType, a.insuranceInfo, a.registrationDate, a.registrationStatus, a.installer, a.deviceSerial, a.id, a.memo].filter(Boolean).join(" ").toLowerCase().includes(term)
                : true;
            const matchesStatus = status === "all" ? true : a.registrationStatus === status;
            return matchesTerm && matchesStatus;
        });
    }, [debouncedQ, status, rows]);

    const selection = useTableSelection(filtered, "id");
    const { selected, selectedCount, clearSelection } = selection;

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        const ok = await confirm({ title: "선택 삭제", message: "선택한 항목을 삭제하시겠습니까?", confirmText: "삭제", cancelText: "취소" });
        if (!ok) return;
        const ids = Array.from(selected);
        try {
            await Promise.all(
                ids.map((id) =>
                    deleteAsset(String(id))
                        .then((res) => res)
                        .catch(() => false)
                )
            );
        } catch (e) {
            // ignore; fall through to UI update
        }
        setRows((prev) => prev.filter((a) => !selected.has(a.id)));
        clearSelection();
    };

    const openInfoModal = async (asset) => {
        if (!asset) return;
        let assetFull = withManagementStage(asset);
        try {
            if (asset?.id) {
                const fetched = await fetchAssetById(asset.id);
                if (fetched) assetFull = withManagementStage(fetched);
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
        // Open immediately with summary data
        setAssetFormInitial(initial);
        setEditingAssetId(asset?.id || null);
        setAssetRequireDocs(false);
        setShowAssetModal(true);

        // Hydrate with profile details via GET /assets/:id/profile
        if (asset?.id) {
            (async () => {
                try {
                    const full = await fetchAssetProfile(asset.id);
                    if (full && full.id === asset.id) {
                        setAssetFormInitial((prev) => ({ ...prev, ...full }));
                    } else if (full) {
                        // Fallback: still merge if id shape differs
                        setAssetFormInitial((prev) => ({ ...prev, ...full }));
                    }
                } catch (e) {
                    console.error("Failed to load asset profile", e);
                }
            })();
        }
    };

    // Unified diagnostic modal opener (consolidates openDiagnosticModal + openDiagnosticModalFromStatus)
    const openDiagnosticModal = (vehicle) => {
        const buildAndOpen = (v, diag) => {
            const issues = Array.isArray(diag?.diagnosticCodes) ? diag.diagnosticCodes : normalizeDiagnosticList(v);
            const detail = {
                category: "ALL",
                categoryName: "전체 진단",
                count: issues.length,
                vehicleInfo: { plate: v.plate, vehicleType: v.vehicleType, id: v.id },
                issues,
            };
            setDiagnosticDetail(detail);
            setShowDiagnosticModal(true);
        };
        // Try to fetch remote diagnostics; fall back to local
        if (vehicle?.id) {
            (async () => {
                try {
                    const diag = await fetchAssetDiagnostics(vehicle.id);
                    buildAndOpen(vehicle, diag || {});
                } catch (e) {
                    console.error("Failed to load diagnostics", e);
                    buildAndOpen(vehicle, null);
                }
            })();
        } else {
            buildAndOpen(vehicle, null);
        }
    };

    const handleDeviceInfoSubmit = async (form) => {
        if (!activeAsset) return;
        const patch = {
            supplier: form.supplier || "",
            deviceInstallDate: form.installDate || "",
            installer: form.installer || "",
            deviceSerial: form.serial || "",
        };
        try {
            const resp = await saveAsset(activeAsset.id, patch);
            setRows((prev) => prev.map((a) => (a.id === activeAsset.id ? withManagementStage({ ...a, ...(resp || patch) }) : a)));
        } catch (e) {
            console.error("Failed to save device info", e);
            emitToast("단말 정보 저장 실패", "error");
        }
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

    const handleAssetSubmit = async (data) => {
        // Compose vehicleType from make/model when available
        const composedVehicleType = data.vehicleType || [data.make, data.model].filter(Boolean).join(" ");

        if (editingAssetId) {
            // Update existing asset via API (fallback: local merge)
            const patch = {
                plate: data.plate,
                vehicleType: composedVehicleType,
                make: data.make,
                model: data.model,
                year: data.year ? Number(data.year) : data.year,
                fuelType: data.fuelType,
                vin: data.vin,
                vehicleValue: data.vehicleValue,
                purchaseDate: data.purchaseDate,
                systemRegDate: data.systemRegDate,
                systemDelDate: data.systemDelDate,
                registrationStatus: data.registrationStatus,
            };
            // Optional: upload new docs if user selected (single or multiple)
            const { insuranceDoc, registrationDoc } = data || {};
            const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
            const insuranceFiles = toArray(insuranceDoc);
            const registrationFiles = toArray(registrationDoc);
            if (insuranceFiles.length > 0 || registrationFiles.length > 0) {
                console.groupCollapsed("[upload-ui] asset update docs start");
                const vin = (data.vin || "").trim();
                const folder = vin ? `assets/${vin}/docs` : `assets/docs`;
                const [insRes, regRes] = await Promise.all([
                    uploadMany(insuranceFiles, { folder, label: "insuranceDoc" }),
                    uploadMany(registrationFiles, { folder, label: "registrationDoc" }),
                ]);
                if (insRes.objects.length > 0) {
                    patch.insuranceDocNames = insRes.names;
                    patch.insuranceDocGcsObjectNames = insRes.objects;
                    patch.insuranceDocName = insRes.names[0];
                    patch.insuranceDocGcsObjectName = insRes.objects[0];
                }
                if (regRes.objects.length > 0) {
                    patch.registrationDocNames = regRes.names;
                    patch.registrationDocGcsObjectNames = regRes.objects;
                    patch.registrationDocName = regRes.names[0];
                    patch.registrationDocGcsObjectName = regRes.objects[0];
                }
                console.groupEnd();
            }
            try {
                const resp = await saveAsset(editingAssetId, patch);
                // If backend returns 204 No Content, resp will be null; merge local patch instead
                setRows((prev) =>
                    prev.map((a) => (a.id === editingAssetId ? withManagementStage({ ...a, ...(resp || patch) }) : a))
                );
            } catch (e) {
                // Fallback to local optimistic merge
                setRows((prev) =>
                    prev.map((a) => {
                        if (a.id !== editingAssetId) return a;
                        const updated = {
                            ...a,
                            plate: data.plate || a.plate,
                            vehicleType: composedVehicleType || a.vehicleType,
                            make: data.make || a.make,
                            model: data.model || a.model,
                            year: (data.year ? Number(data.year) : data.year) ?? a.year,
                            fuelType: data.fuelType ?? a.fuelType,
                            vin: data.vin || a.vin,
                            vehicleValue: data.vehicleValue || a.vehicleValue,
                            purchaseDate: data.purchaseDate || a.purchaseDate,
                            systemRegDate: data.systemRegDate || a.systemRegDate,
                            systemDelDate: data.systemDelDate || a.systemDelDate,
                            registrationStatus: data.registrationStatus || a.registrationStatus,
                        };
                        return withManagementStage(updated);
                    })
                );
            }
        } else {
            // Create new asset via API
            if (!data?.vin) {
                emitToast("VIN은 필수입니다.", "warning");
                return;
            }
            const today = new Date().toISOString().slice(0, 10);
            const { registrationDoc, insuranceDoc, preUploaded, ocrSuggestions, ...rest } = data || {};
            const payload = {
                ...rest,
                year: rest.year ? Number(rest.year) : rest.year,
                fuelType: rest.fuelType,
                vehicleType: composedVehicleType || rest.vehicleType || "",
                registrationDate: rest.registrationDate || today,
                registrationStatus: rest.registrationStatus || "자산등록 완료",
            };
            // Prefer preUploaded docs from Step 1 (objectNames) if present; otherwise upload files now
            if (preUploaded && (Array.isArray(preUploaded.insurance) || Array.isArray(preUploaded.registration))) {
                const ins = Array.isArray(preUploaded.insurance) ? preUploaded.insurance : [];
                const reg = Array.isArray(preUploaded.registration) ? preUploaded.registration : [];
                if (ins.length > 0) {
                    payload.insuranceDocNames = ins.map((it) => it.name);
                    payload.insuranceDocGcsObjectNames = ins.map((it) => it.objectName);
                    payload.insuranceDocName = payload.insuranceDocNames[0];
                    payload.insuranceDocGcsObjectName = payload.insuranceDocGcsObjectNames[0];
                }
                if (reg.length > 0) {
                    payload.registrationDocNames = reg.map((it) => it.name);
                    payload.registrationDocGcsObjectNames = reg.map((it) => it.objectName);
                    payload.registrationDocName = payload.registrationDocNames[0];
                    payload.registrationDocGcsObjectName = payload.registrationDocGcsObjectNames[0];
                }
                // Optionally include OCR suggestions into payload if BE accepts; otherwise, keep FE-only
                if (ocrSuggestions && typeof ocrSuggestions === 'object') {
                    payload.ocrSuggestions = ocrSuggestions;
                }
            } else {
                // Upload docs first (if provided) then include objectNames in payload (single or multiple)
                const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
                const insuranceFiles = toArray(insuranceDoc);
                const registrationFiles = toArray(registrationDoc);
                if (insuranceFiles.length > 0 || registrationFiles.length > 0) {
                    console.groupCollapsed("[upload-ui] asset create docs start");
                    console.debug("[upload-ui] incoming files:", {
                        insuranceDoc: Array.isArray(insuranceDoc) ? insuranceDoc.map(f => ({ name: f.name, size: f.size, type: f.type })) : (insuranceDoc ? { name: insuranceDoc.name, size: insuranceDoc.size, type: insuranceDoc.type } : null),
                        registrationDoc: Array.isArray(registrationDoc) ? registrationDoc.map(f => ({ name: f.name, size: f.size, type: f.type })) : (registrationDoc ? { name: registrationDoc.name, size: registrationDoc.size, type: registrationDoc.type } : null),
                    });
                    const vin = (data.vin || "").trim();
                    const folder = vin ? `assets/${vin}/docs` : `assets/docs`;
                    const [insRes, regRes] = await Promise.all([
                        uploadMany(insuranceFiles, { folder, label: "insuranceDoc" }),
                        uploadMany(registrationFiles, { folder, label: "registrationDoc" }),
                    ]);
                    if (insRes.objects.length > 0) {
                        payload.insuranceDocNames = insRes.names;
                        payload.insuranceDocGcsObjectNames = insRes.objects;
                        payload.insuranceDocName = insRes.names[0];
                        payload.insuranceDocGcsObjectName = insRes.objects[0];
                    }
                    if (regRes.objects.length > 0) {
                        payload.registrationDocNames = regRes.names;
                        payload.registrationDocGcsObjectNames = regRes.objects;
                        payload.registrationDocName = regRes.names[0];
                        payload.registrationDocGcsObjectName = regRes.objects[0];
                    }
                    console.groupEnd();
                }
            }
            try {
                console.debug("[upload-ui] creating asset with payload (doc objectNames present?):", {
                    hasInsuranceDocObjectName: !!payload.insuranceDocGcsObjectName,
                    hasRegistrationDocObjectName: !!payload.registrationDocGcsObjectName,
                    insuranceDocGcsObjectNames: payload.insuranceDocGcsObjectNames?.length || 0,
                    registrationDocGcsObjectNames: payload.registrationDocGcsObjectNames?.length || 0,
                });
                const created = await createAsset(payload);
                console.debug("[upload-ui] createAsset result:", created);
                const normalized = withManagementStage(created || payload);
                setRows((prev) => [normalized, ...prev]);
            } catch (e) {
                console.error("Failed to create asset via API", e);
                emitToast("자산 생성에 실패했습니다.", "error");
            }
        }

        setShowAssetModal(false);
        setAssetFormInitial({});
        setEditingAssetId(null);
        setAssetRequireDocs(true);
    };

    const handleMemoEdit = (assetId, currentMemo) => onMemoEdit(assetId, currentMemo);
    const handleMemoSave = async (assetId, newText) => {
        try {
            const resp = await saveAsset(assetId, { memo: newText });
            setRows((prev) => prev.map((asset) => (asset.id === assetId ? { ...asset, memo: newText } : asset)));
            if (resp == null) {
                setToast({ message: "메모가 저장되었습니다.", type: "success" });
            }
            onMemoCancel();
        } catch (error) {
            console.error("Failed to save memo:", error);
            emitToast("메모 저장에 실패했습니다.", "error");
        }
    };
    const handleMemoCancel = () => onMemoCancel();

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
                return null; // Table 컴포넌트에서 자동 처리
            case "company":
                return <CompanyCell row={row} />;
            case "plate":
                return <PlateCell plate={row.plate} onClick={() => openAssetEdit(row)} title="자산 등록/편집" />;
            case "vehicleType":
                return <VehicleTypeText vehicleType={row.vehicleType} />;
            case "registrationDate":
                return formatDateShort(row.registrationDate);
            case "insuranceExpiryDate":
                if (row.insuranceExpiryDate) {
                    return (
                        <button type="button" className="simple-button" onClick={() => openInsuranceModalReadOnly(row)} title="보험 정보 보기">
                            {formatDateShort(row.insuranceExpiryDate)}
                        </button>
                    );
                }
                return (
                    <button type="button" className="badge badge--default badge--clickable" onClick={() => openInsuranceModal(row)} title="보험 등록">
                        보험 등록
                    </button>
                );
            case "deviceStatus":
                const hasDevice = row.deviceSerial;
                const status = hasDevice ? "연결됨" : "미연결";
                return <span className={`badge ${hasDevice ? "badge--on" : "badge--off"}`}>{status}</span>;
            case "severity": {
                const hasDevice = !!row?.deviceSerial;
                if (!hasDevice) {
                    return <span className="badge badge--default">단말 필요</span>;
                }
                // Compute severity: if there are no diagnostics, show 정상
                const fromField = typeof row?.diagnosticMaxSeverity === "number" ? row.diagnosticMaxSeverity : null;
                let max = fromField;
                if (max == null) {
                    const arr = Array.isArray(row?.diagnosticCodes) ? row.diagnosticCodes : [];
                    if (arr.length === 0) return <span className="badge badge--normal">정상</span>;
                    max = arr.reduce((acc, it) => Math.max(acc, severityNumber(it?.severity)), 0);
                }
                if (Number(max) === 0) {
                    return <span className="badge badge--normal">정상</span>;
                }
                return <SeverityBadge value={max} />;
            }
            case "managementStage": {
                const hasStageValue = !!row.__hasManagementStage;
                const stage = hasStageValue ? (row.managementStage || "-") : "-";
                const rowKey = String(row.id ?? row.vin ?? row.plate ?? "");
                const isSaving = !!stageSaving[rowKey] || !!stageSaving[row.id];
                const isOpen = String(openDropdowns.stage) === rowKey;
                const agg = rentalsByVin[String(row.vin || "")] || null;
                const hasActive = !!agg?.hasActive;
                const hasOverdue = !!agg?.hasOverdue;
                const hasStolen = !!agg?.hasStolen;
                const hasReserved = !!agg?.hasReserved;
                const hasAnyOpen = hasActive || hasOverdue || hasStolen || hasReserved;
                let inconsistent = false;
                let reason = "";
                const isKnownStage = MANAGEMENT_STAGE_SET.has(stage);
                if (isKnownStage) {
                    if (stage === "대여중") {
                        if (!(hasActive || hasOverdue || hasStolen)) {
                            inconsistent = true;
                            reason = "진행 중 계약 없음(대여/연체/도난 미해당)";
                        }
                    } else if (stage === "예약중") {
                        if (!hasReserved) {
                            inconsistent = true;
                            reason = "예약 계약 없음";
                        }
                    } else if (stage === "대여가능") {
                        if (hasAnyOpen) {
                            inconsistent = true;
                            reason = "진행 중/예약/연체/도난 계약 존재";
                        }
                    } else {
                        if (hasAnyOpen) {
                            inconsistent = true;
                            reason = "계약(대여/예약/연체/도난) 진행 중";
                        }
                    }
                }
                return (
                    <AssetManagementStageCell
                        rowId={rowKey}
                        label={stage}
                        isSaving={isSaving}
                        isOpen={isOpen}
                        stageDropdownUp={stageDropdownUp}
                        onToggleOpen={toggleStageDropdown}
                        onSelect={(value) => {
                            closeStageDropdown();
                            handleManagementStageChange(row, value);
                        }}
                        inconsistent={inconsistent}
                        reason={reason}
                        openInconsistencyId={openDropdowns.inconsistency}
                        setOpenInconsistencyId={toggleInconsistency}
                    />
                );
            }

            case "vehicleHealth": {
                const hasDevice = !!row?.deviceSerial;
                if (!hasDevice) {
                    return <VehicleHealthCell label="단말 필요" />;
                }
                const dcount = getDiagnosticCount(row);
                if (dcount === 0) {
                    return <VehicleHealthCell label="정상" onClick={() => openDiagnosticModal(row)} />;
                }
                // Prefer backend-provided status if available; otherwise derive from max severity
                const provided = row.diagnosticStatus;
                if (provided) {
                    return <VehicleHealthCell label={provided} onClick={() => openDiagnosticModal(row)} />;
                }
                const arr = Array.isArray(row?.diagnosticCodes) ? row.diagnosticCodes : [];
                const max = arr.reduce((acc, it) => Math.max(acc, severityNumber(it?.severity)), 0);
                const label = max > 7 ? "심각" : "관심필요";
                return <VehicleHealthCell label={label} onClick={() => openDiagnosticModal(row)} />;
            }
            case "diagnosticCodes":
                const dcount = getDiagnosticCount(row);
                return (
                    <DiagnosticCountBadge count={dcount} onClick={() => openDiagnosticModal(row)} />
                );
            case "memo":
                return (
                    <MemoCell
                        id={row.id}
                        value={row.memo}
                        isEditing={editingMemo === row.id}
                        memoText={memoText}
                        onEdit={handleMemoEdit}
                        onChange={onMemoChange}
                        onSave={handleMemoSave}
                        onCancel={handleMemoCancel}
                        onOpenHistory={(id) => {
                            const plate = row.plate || id;
                            setMemoHistoryTarget({ id, plate });
                            setShowMemoHistoryModal(true);
                        }}
                        maxWidth={150}
                    />
                );
            default:
                return "-";
        }
    };

    // 동적 컬럼 생성
    // Build columns for Table; inject company before plate for super-admin
    const columnsForRender = useMemo(() => {
        if (!isSuperAdmin) return [...visibleColumns];
        const base = [...visibleColumns];
        const hasCompany = base.some((c) => c.key === "company");
        if (!hasCompany) {
            const plateIdx = base.findIndex((c) => c.key === "plate");
            const colDef = { key: "company", label: "회사" };
            if (plateIdx >= 0) base.splice(plateIdx, 0, colDef);
            else base.unshift(colDef);
        }
        return base;
    }, [visibleColumns, isSuperAdmin]);

    const dynamicColumns = useMemo(() => columnsForRender
        .filter((col) => col.key !== "select") // select는 Table 컴포넌트에서 자동 처리
        .map((column) =>
            column.key === "deviceStatus"
                ? {
                      key: column.key,
                      label: column.label,
                      style: { textAlign: "center" },
                      render: (row) => {
                          const hasDevice = !!row.deviceSerial;
                          if (hasDevice) {
                              return (
                                  <button
                                      type="button"
                                      className="badge badge--on badge--clickable"
                                      onClick={() => openDeviceModal(row, true)}
                                      title="단말 정보 보기"
                                      aria-label={`${row.plate || row.id || "자산"} 단말 정보 보기`}
                                  >
                                      연결됨
                                  </button>
                              );
                          }
                          return (
                              <button
                                  type="button"
                                  className="badge badge--default badge--clickable"
                                  onClick={() => openDeviceModal(row, false)}
                                  title="단말 등록"
                                  aria-label={`${row.plate || row.id || "자산"} 단말 등록`}
                              >
                                  단말 등록
                              </button>
                          );
                      },
                  }
                : column.key === "company"
                ? {
                      key: column.key,
                      label: column.label,
                      style: { textAlign: "center" },
                      sortAccessor: (row) => row?.companyName || row?.company || row?.companyId || "",
                      render: (row) => renderCellContent(column, row),
                  }
                : {
                      key: column.key,
                      label: column.label,
                      style: { textAlign: column.key === "memo" ? "left" : "center" },
                      render: (row) => renderCellContent(column, row),
                  }
        ), [
            columnsForRender,
            openDropdowns.stage,
            stageDropdownUp,
            stageSaving,
            rentalsByVin,
            editingMemo,
            memoText,
        ]);

    return (
        <div className="page space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">자산 등록/관리</h1>

            <div className="table-toolbar">
                <div className="flex-1" />
                <div className="flex gap-3">
                    <button type="button" className="form-button" onClick={openAssetCreate}>
                        자산 등록
                    </button>
                    <button
                        type="button"
                        className="form-button form-button--danger"
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                        title={selectedCount === 0 ? "삭제할 항목을 선택하세요" : "선택 항목 삭제"}
                    >
                        선택 삭제
                    </button>
                    <div className="relative" data-column-dropdown>
                        <button type="button" className="form-button form-button--neutral" onClick={toggleColumnDropdown} title="컬럼 설정">
                            <FaCog size={14} />
                            컬럼 설정
                        </button>
                        {openDropdowns.column && (
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

            <Modal isOpen={showAssetModal} onClose={() => setShowAssetModal(false)} title="자산 등록" showFooter={false} showHeaderClose={false}>
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
                title={`${insuranceReadOnly ? "보험 정보" : (insuranceAsset?.insuranceExpiryDate || insuranceAsset?.insuranceInfo ? "보험 수정" : "보험 등록")} - ${insuranceAsset?.plate || ""}`}
                showFooter={false}
                showHeaderClose={false}
            >
                <InsuranceDialog asset={insuranceAsset || {}} onClose={closeInsuranceModal} onSubmit={handleInsuranceSubmit} readOnly={insuranceReadOnly} allowEditToggle />
            </Modal>

            <Modal
                isOpen={showDeviceModal && activeAsset}
                onClose={() => setShowDeviceModal(false)}
                title={`단말 정보 ${deviceReadOnly ? '보기' : (activeAsset?.deviceSerial ? '수정' : '등록')} - ${activeAsset?.plate || activeAsset?.id || ""}`}
                showFooter={false}
                showHeaderClose={!deviceReadOnly}
            >
                <DeviceInfoForm
                    formId="device-info"
                    initial={deviceInitial}
                    onSubmit={handleDeviceInfoSubmit}
                    readOnly={deviceReadOnly}
                    showSubmit={!deviceReadOnly}
                />
                <DeviceEventLog assetId={activeAsset?.id} history={activeAsset?.deviceHistory || []} fallbackInstallDate={deviceInitial?.installDate || "" || activeAsset?.deviceInstallDate || activeAsset?.installDate || ""} />
                {deviceReadOnly && (
                    <div className="asset-dialog__footer">
                        <button type="button" className="form-button" onClick={() => setDeviceReadOnly(false)} style={{ marginRight: 8 }}>수정</button>
                        <button type="button" className="form-button" onClick={() => setShowDeviceModal(false)}>닫기</button>
                    </div>
                )}
            </Modal>

            <MemoHistoryModal
                isOpen={showMemoHistoryModal && !!memoHistoryTarget}
                onClose={() => setShowMemoHistoryModal(false)}
                entityType="asset"
                entityId={memoHistoryTarget?.id}
                title={memoHistoryTarget ? `메모 히스토리 - ${memoHistoryTarget.plate}` : undefined}
            />

            <Table wrapRef={tableWrapRef} columns={dynamicColumns} data={filtered} selection={selection} emptyMessage="조건에 맞는 차량 자산이 없습니다." stickyHeader />

            {/* inline panel removed */}
            <Modal
                isOpen={showInfoModal && infoVehicle}
                onClose={() => setShowInfoModal(false)}
                title={`차량 상세 정보${infoVehicle?.asset?.plate ? ` - ${infoVehicle.asset.plate}` : ""}`}
                showFooter={false}
                ariaLabel="차량 상세 정보"
                className="modal-large"
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
                                { key: "rentalId", label: "계약번호", value: infoVehicle?.rental?.rentalId },
                                { key: "renterName", label: "대여자", value: infoVehicle?.rental?.renterName },
                                { key: "contact", label: "연락처", value: infoVehicle?.rental?.contactNumber },
                                { key: "address", label: "주소", value: infoVehicle?.rental?.address },
                                { key: "period", label: "대여 기간", value: infoVehicle?.rental?.rentalPeriod, type: "dateRange" },
                                { key: "insurance", label: "보험사", value: infoVehicle?.rental?.insuranceName },
                                { key: "rentalLocation", label: "대여 위치", value: infoVehicle?.rental?.rentalLocation, type: "location" },
                                { key: "returnLocation", label: "반납 위치", value: infoVehicle?.rental?.returnLocation, type: "location" },
                                { key: "currentLocation", label: "현재 위치", value: infoVehicle?.rental?.currentLocation, type: "location" },
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
                                        <div>발생일</div>
                                    </div>
                                    {diagnosticDetail.issues.map((issue, idx) => (
                                        <div key={`${issue?.id ?? issue?.code ?? "issue"}-${idx}`} className="diagnostic-table-row">
                                            <div className="diagnostic-code">{issue.code}</div>
                                            <div className="diagnostic-description">{issue.description}</div>
                                            <div>
                                                {(() => {
                                                    const val = severityNumber(issue.severity);
                                                    const cls = severityClass(val);
                                                    return (
                                                        <span className={`badge diagnostic-severity diagnostic-severity--${cls}`}>
                                                            {val.toFixed(1)}
                                                        </span>
                                                    );
                                                })()}
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

            {/* Rental create modal for keeping consistency with stage changes */}
            <Modal
                isOpen={showRentalModal}
                onClose={() => {
                    setShowRentalModal(false);
                    setPendingStageAssetId(null);
                    setPendingNextStage(null);
                }}
                title="계약 등록"
                showFooter={false}
                ariaLabel="Create Rental"
            >
                <RentalForm initial={rentalFormInitial} onSubmit={handleRentalCreateSubmit} formId="asset-rental-create" />
            </Modal>
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
