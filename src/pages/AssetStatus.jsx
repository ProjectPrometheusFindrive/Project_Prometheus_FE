import React, { useEffect, useMemo, useState } from "react";
import { resolveVehicleRentals, fetchAssetById, fetchAssets, fetchAssetsSummary, saveAsset, buildRentalIndexByVin, fetchRentals, createRental, updateRental, createAsset, deleteAsset, fetchAssetProfile, fetchAssetInsurance, fetchAssetDevice, fetchAssetDiagnostics } from "../api";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";
import { ALLOWED_MIME_TYPES, chooseUploadMode } from "../constants/uploads";
import { parseCurrency } from "../utils/formatters";
import AssetForm from "../components/forms/AssetForm";
import DeviceInfoForm from "../components/forms/DeviceInfoForm";
import InfoGrid from "../components/InfoGrid";
import AssetDialog from "../components/AssetDialog";
import InsuranceDialog from "../components/InsuranceDialog";
import DeviceEventLog from "../components/DeviceEventLog";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import Table from "../components/Table";
import useTableSelection from "../hooks/useTableSelection";
// Local storage fallbacks removed; use API persistence instead
import { ASSET } from "../constants";
import { MANAGEMENT_STAGE_OPTIONS } from "../constants/forms";
import { formatDateShort } from "../utils/date";
import { getManagementStage, withManagementStage, getDiagnosticCount } from "../utils/managementStage";
import { FaCog, FaEye, FaEyeSlash, FaGripVertical, FaChevronDown, FaExclamationTriangle } from "react-icons/fa";
import MemoHistoryModal from "../components/MemoHistoryModal";
import MemoCell from "../components/MemoCell";
import useMemoEditor from "../hooks/useMemoEditor";

// 차종에서 년도 부분을 작고 회색으로 스타일링하는 함수
const formatVehicleType = (vehicleType) => {
    if (!vehicleType) return "-";

    // "00년형" 패턴을 찾아서 분리
    const yearPattern = /(\d{2,4}년형)/;
    const match = vehicleType.match(yearPattern);

    if (match) {
        const yearPart = match[1];
        const modelPart = vehicleType.replace(yearPattern, "").trim();

        return (
            <span>
                {modelPart}
                {modelPart && yearPart && " "}
                <span className="text-xs text-muted">{yearPart}</span>
            </span>
        );
    }

    return vehicleType;
};

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
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
    const [openStageDropdown, setOpenStageDropdown] = useState(null);
    const [showRentalModal, setShowRentalModal] = useState(false);
    const [rentalFormInitial, setRentalFormInitial] = useState({});
    const [pendingStageAssetId, setPendingStageAssetId] = useState(null);
    const [pendingNextStage, setPendingNextStage] = useState(null);
    // Placement of management stage dropdown (flip up if not enough space below)
    const [stageDropdownUp, setStageDropdownUp] = useState(false);
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
                      // 보험만료일 다음 기본 순서
                      { key: "deviceStatus", label: "단말 상태", visible: true, required: false },
                      { key: "vehicleHealth", label: "차량 상태", visible: true, required: false },
                      { key: "severity", label: "심각도", visible: true, required: false },
                      { key: "managementStage", label: "관리상태", visible: true, required: false },
                      { key: "memo", label: "메모", visible: true, required: false },
                  ],
              };
    });
    // Insurance modal state
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);
    const [insuranceAsset, setInsuranceAsset] = useState(null);
    const [insuranceReadOnly, setInsuranceReadOnly] = useState(false);
    const [rentalsByVin, setRentalsByVin] = useState({});
    const [openInconsistencyId, setOpenInconsistencyId] = useState(null);
    const [toast, setToast] = useState(null);
    const [showMemoHistoryModal, setShowMemoHistoryModal] = useState(false);
    const [memoHistoryTarget, setMemoHistoryTarget] = useState(null);
    const openInsuranceModal = (asset) => {
        setInsuranceReadOnly(false);
        setInsuranceAsset(asset);
        setShowInsuranceModal(true);
        if (asset?.id) {
            (async () => {
                try {
                    const detail = await fetchAssetInsurance(asset.id);
                    if (detail) setInsuranceAsset((prev) => ({ ...(prev || {}), ...detail }));
                } catch (e) {
                    console.error("Failed to load insurance detail", e);
                }
            })();
        }
    };
    const openInsuranceModalReadOnly = (asset) => {
        setInsuranceReadOnly(true);
        setInsuranceAsset(asset);
        setShowInsuranceModal(true);
        if (asset?.id) {
            (async () => {
                try {
                    const detail = await fetchAssetInsurance(asset.id);
                    if (detail) setInsuranceAsset((prev) => ({ ...(prev || {}), ...detail }));
                } catch (e) {
                    console.error("Failed to load insurance detail", e);
                }
            })();
        }
    };
    const closeInsuranceModal = () => {
        setInsuranceAsset(null);
        setShowInsuranceModal(false);
        setInsuranceReadOnly(false);
    };
    const handleInsuranceSubmit = async (patch) => {
        const id = insuranceAsset?.id;
        if (!id) return;
        try {
            const resp = await saveAsset(id, patch || {});
            // Merge back into table row (preserve unknown fields)
            setRows((prev) =>
                prev.map((a) => {
                    if (a.id !== id) return a;
                    const merged = { ...a, ...(patch || {}), ...(resp || {}) };
                    return withManagementStage(merged);
                })
            );
            closeInsuranceModal();
        } catch (e) {
            console.error("Failed to save insurance", e);
            alert("보험 정보 저장에 실패했습니다.");
        }
    };

    // inline panel removed

    const handleManagementStageChange = async (asset, nextStage) => {
        if (!asset?.id || !nextStage || !MANAGEMENT_STAGE_SET.has(nextStage)) return;
        const assetId = asset.id;
        const previousStage = getManagementStage(asset);
        if (previousStage === nextStage) return;

        // Guardrails to keep consistency with contract state
        try {
            const now = new Date();
            const rentals = await fetchRentals();
            const list = Array.isArray(rentals) ? rentals : [];
            const openForVin = list.filter((r) => String(r.vin) === String(asset.vin)).filter((r) => {
                const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
                return !(returnedAt && now >= returnedAt) && r?.contractStatus !== "완료";
            });

            const startOf = (r) => (r?.rentalPeriod?.start ? new Date(r.rentalPeriod.start) : null);
            const endOf = (r) => (r?.rentalPeriod?.end ? new Date(r.rentalPeriod.end) : null);
            const isActive = (r) => {
                const s = startOf(r);
                const e = endOf(r);
                return s && e ? now >= s && now <= e : false;
            };
            const isOverdue = (r) => {
                const e = endOf(r);
                const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
                return !returnedAt && e ? now > e : false;
            };
            const isReserved = (r) => {
                const s = startOf(r);
                const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
                return !returnedAt && s ? now < s : false;
            };

            // Case 1: switching to 대여가능 while rentals still open -> prompt return
            if (nextStage === "대여가능") {
                if (openForVin.length > 0) {
                    const ok = window.confirm("해당 차량에 진행 중인 계약(대여/예약/연체/도난)이 있습니다. 반납 처리(returnedAt 설정) 후 대여가능으로 변경하시겠습니까?");
                    if (!ok) return; // Abort stage change
                    const ts = new Date().toISOString();
                    try {
                        await Promise.all(openForVin.map((r) => updateRental(r.rentalId, { returnedAt: ts }).catch(() => null)));
                    } catch {}
                }
            }

            // Case 2: switching to 대여중/예약중 without open rentals
            if ((nextStage === "대여중" || nextStage === "예약중")) {
                const hasOpen = openForVin.some((r) => isActive(r) || isOverdue(r) || isReserved(r) || r?.reportedStolen);
                if (!hasOpen) {
                    if (previousStage === "대여가능") {
                        // Show confirmation first; only open modal on confirm
                        const ok = window.confirm("현재 유효한 계약이 없습니다. 신규로 대여 계약을 입력하시겠습니까?");
                        if (!ok) return; // keep previous stage as-is
                    }
                    // open rental create modal, then set stage on submit
                    setPendingStageAssetId(assetId);
                    setPendingNextStage(nextStage);
                    setRentalFormInitial({ vin: asset.vin || "", plate: asset.plate || "", vehicleType: asset.vehicleType || "" });
                    setShowRentalModal(true);
                    return; // Postpone stage change until rental is created
                }
            }
        } catch (e) {
            // If rentals fetch fails, proceed with stage change as before
            console.warn("Stage-guard rentals check failed", e);
        }

        // 대여중 → 대여가능 변경 시 반납 처리 확인
        if (previousStage === "대여중" && nextStage === "대여가능") {
            const ok = window.confirm("대여가능으로 변경하면 해당 차량의 모든 활성 계약이 반납 처리됩니다. 계속하시겠습니까?");
            if (!ok) return;
        }

        setRows((prev) => prev.map((row) => (row.id === assetId ? withManagementStage({ ...row, managementStage: nextStage }) : row)));
        setStageSaving((prev) => ({ ...prev, [assetId]: true }));

        try {
            const response = await saveAsset(assetId, { managementStage: nextStage });

            setRows((prev) =>
                prev.map((row) => {
                    if (row.id !== assetId) return row;
                    const updatedStage = response?.managementStage && MANAGEMENT_STAGE_SET.has(response.managementStage) ? response.managementStage : nextStage;
                    const merged = { ...row, ...(response || {}), managementStage: updatedStage };
                    return withManagementStage(merged);
                })
            );
        } catch (error) {
            console.error("Failed to update management stage", error);
            alert("관리단계를 저장하지 못했습니다. 다시 시도해주세요.");
            setRows((prev) => prev.map((row) => (row.id === assetId ? withManagementStage({ ...row, managementStage: previousStage }) : row)));
        } finally {
            setStageSaving((prev) => {
                const next = { ...prev };
                delete next[assetId];
                return next;
            });
        }
    };

    const handleRentalCreateSubmit = async (data) => {
        // Create rental via API, then upload any provided docs (multi-file)
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
        let created;
        try {
            created = await createRental(payload);
        } catch (e) {
            console.error("Failed to create rental via API", e);
            alert("계약 생성에 실패했습니다.");
            return;
        }

        // Upload documents after creation
        if (created && (contractFiles.length > 0 || licenseFiles.length > 0)) {
            console.groupCollapsed("[upload-ui] rental create docs (from Asset) start");
            try {
                const rentalId = created.rentalId || rest.rentalId;
                const folderBase = `rentals/${encodeURIComponent(rentalId)}`;
                const uploadOne = async (file, keyLabel) => {
                    if (!file) return null;
                    const type = file.type || "";
                    if (type && !ALLOWED_MIME_TYPES.includes(type)) {
                        console.warn(`[upload-ui] ${keyLabel} skipped: disallowed type`, type);
                        return null;
                    }
                    const folder = `${folderBase}/${keyLabel}`;
                    const mode = chooseUploadMode(file.size || 0);
                    try {
                        if (mode === "signed-put") {
                            const { promise } = uploadViaSignedPut(file, { folder });
                            const res = await promise;
                            return res?.publicUrl || null;
                        } else {
                            const { promise } = uploadResumable(file, { folder });
                            const res = await promise;
                            return res?.publicUrl || null;
                        }
                    } catch (e) {
                        console.error(`[upload-ui] ${keyLabel} upload failed`, e);
                        return null;
                    }
                };
                const uploadMany = async (files, label) => {
                    const names = [];
                    const objects = [];
                    for (const f of files) {
                        const objectName = await uploadOne(f, label);
                        if (objectName) {
                            names.push(f.name);
                            objects.push(objectName);
                        }
                    }
                    return { names, objects };
                };
                const [contractRes, licenseRes] = await Promise.all([
                    uploadMany(contractFiles, "contracts"),
                    uploadMany(licenseFiles, "licenses"),
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
                alert("관리단계를 저장하지 못했습니다. 다시 시도해주세요.");
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

    const openDeviceRegister = (asset) => {
        setActiveAsset(asset);
        setDeviceReadOnly(false);
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

    const openDeviceView = (asset) => {
        setActiveAsset(asset);
        setDeviceReadOnly(true);
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

    // 컬럼 드롭다운 / 상태 드롭다운 / 불일치 팝업 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Ignore clicks that originate inside an open modal to avoid
            // disrupting focus/interaction within modal dialogs.
            if (event.target.closest('.modal') || event.target.closest('.modal-backdrop')) {
                return;
            }
            if (showColumnDropdown && !event.target.closest("[data-column-dropdown]")) {
                setShowColumnDropdown(false);
            }
            if (openStageDropdown !== null && !event.target.closest("[data-stage-dropdown]")) {
                setOpenStageDropdown(null);
                setStageDropdownUp(false);
            }
            if (openInconsistencyId !== null && !event.target.closest("[data-inconsistency-popover]")) {
                setOpenInconsistencyId(null);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                if (showColumnDropdown) {
                    setShowColumnDropdown(false);
                }
                if (openStageDropdown !== null) {
                    setOpenStageDropdown(null);
                    setStageDropdownUp(false);
                }
                if (openInconsistencyId !== null) {
                    setOpenInconsistencyId(null);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [showColumnDropdown, openStageDropdown, openInconsistencyId]);

    // Recalculate stage dropdown placement on open, scroll, and resize
    useEffect(() => {
        const recalc = () => {
            if (openStageDropdown == null) {
                setStageDropdownUp(false);
                return;
            }
            const dropdownId = `management-stage-${openStageDropdown}`;
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

        if (openStageDropdown != null) {
            // Defer until after dropdown is rendered
            requestAnimationFrame(recalc);
        }

        const tableWrap = document.querySelector('.table-wrap--sticky');
        window.addEventListener('resize', recalc);
        if (tableWrap) tableWrap.addEventListener('scroll', recalc, { passive: true });
        return () => {
            window.removeEventListener('resize', recalc);
            if (tableWrap) tableWrap.removeEventListener('scroll', recalc);
        };
    }, [openStageDropdown]);

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

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        const ok = window.confirm("선택한 항목을 삭제하시겠습니까?");
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

    // 상태 배지 클릭 시: 백엔드 제공 상태값 기반으로 종합 진단 상세 표시
    const openDiagnosticModalFromStatus = (vehicle) => {
        // 상태 배지 클릭 시에도 실제 데이터 기반 목록을 그대로 노출
        openDiagnosticModal(vehicle);
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
            alert("단말 정보 저장 실패");
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
                const uploadOne = async (file, keyLabel) => {
                    if (!file) return null;
                    const type = file.type || "";
                    if (type && !ALLOWED_MIME_TYPES.includes(type)) {
                        console.warn(`[upload-ui] ${keyLabel} skipped: disallowed type`, type);
                        return null;
                    }
                    const mode = chooseUploadMode(file.size || 0);
                    console.debug(`[upload-ui] ${keyLabel} mode:`, mode, "folder:", folder);
                    try {
                        if (mode === "signed-put") {
                            const { promise } = uploadViaSignedPut(file, { folder, onProgress: (p) => console.debug(`[upload-ui] ${keyLabel} progress:`, p) });
                            const res = await promise;
                            console.debug(`[upload-ui] ${keyLabel} result:`, res);
                            return res?.objectName || null;
                        } else {
                            const { promise } = uploadResumable(file, { folder, onProgress: (p) => console.debug(`[upload-ui] ${keyLabel} progress:`, p) });
                            const res = await promise;
                            console.debug(`[upload-ui] ${keyLabel} result:`, res);
                            return res?.objectName || null;
                        }
                    } catch (e) {
                        console.error(`[upload-ui] ${keyLabel} upload failed`, e);
                        return null;
                    }
                };
                const uploadMany = async (files, keyLabel) => {
                    const names = [];
                    const objects = [];
                    for (const f of files) {
                        const objectName = await uploadOne(f, keyLabel);
                        if (objectName) {
                            names.push(f.name);
                            objects.push(objectName);
                        }
                    }
                    return { names, objects };
                };
                const [insRes, regRes] = await Promise.all([
                    uploadMany(insuranceFiles, "insuranceDoc"),
                    uploadMany(registrationFiles, "registrationDoc"),
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
                alert("VIN은 필수입니다.");
                return;
            }
            const today = new Date().toISOString().slice(0, 10);
            const { registrationDoc, insuranceDoc, ...rest } = data || {};
            const payload = {
                ...rest,
                year: rest.year ? Number(rest.year) : rest.year,
                fuelType: rest.fuelType,
                vehicleType: composedVehicleType || rest.vehicleType || "",
                registrationDate: rest.registrationDate || today,
                registrationStatus: rest.registrationStatus || "자산등록 완료",
            };
            // Upload docs first (if provided) then include objectNames in payload (single or multiple)
            {
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
                    const uploadOne = async (file, keyLabel) => {
                        if (!file) return null;
                        const type = file.type || "";
                        if (type && !ALLOWED_MIME_TYPES.includes(type)) {
                            console.warn(`[upload-ui] ${keyLabel} skipped: disallowed type`, type);
                            return null;
                        }
                        const mode = chooseUploadMode(file.size || 0);
                        console.debug(`[upload-ui] ${keyLabel} mode:`, mode, "folder:", folder);
                        try {
                            if (mode === "signed-put") {
                                const { promise } = uploadViaSignedPut(file, { folder, onProgress: (p) => console.debug(`[upload-ui] ${keyLabel} progress:`, p) });
                                const res = await promise;
                                console.debug(`[upload-ui] ${keyLabel} result:`, res);
                                return res?.objectName || null;
                            } else {
                                const { promise } = uploadResumable(file, { folder, onProgress: (p) => console.debug(`[upload-ui] ${keyLabel} progress:`, p) });
                                const res = await promise;
                                console.debug(`[upload-ui] ${keyLabel} result:`, res);
                                return res?.objectName || null;
                            }
                        } catch (e) {
                            console.error(`[upload-ui] ${keyLabel} upload failed`, e);
                            return null;
                        }
                    };
                    const uploadMany = async (files, keyLabel) => {
                        const names = [];
                        const objects = [];
                        for (const f of files) {
                            const objectName = await uploadOne(f, keyLabel);
                            if (objectName) {
                                names.push(f.name);
                                objects.push(objectName);
                            }
                        }
                        return { names, objects };
                    };
                    const [insRes, regRes] = await Promise.all([
                        uploadMany(insuranceFiles, "insuranceDoc"),
                        uploadMany(registrationFiles, "registrationDoc"),
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
                alert("자산 생성에 실패했습니다.");
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
            alert("메모 저장에 실패했습니다.");
        }
    };
    const handleMemoCancel = () => onMemoCancel();

    // 컬럼 설정 관련 함수들
    const saveColumnSettings = (newSettings) => {
        const filtered = {
            ...newSettings,
            columns: newSettings?.columns || [],
        };
        setColumnSettings(filtered);
        localStorage.setItem("asset-columns-settings", JSON.stringify(filtered));
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
                    <button type="button" onClick={() => openAssetEdit(row)} className="simple-button" title="자산 등록/편집">
                        {row.plate}
                    </button>
                );
            case "vehicleType":
                return formatVehicleType(row.vehicleType);
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
                // Prefer server-provided max severity when available
                const fromField = typeof row?.diagnosticMaxSeverity === "number" ? row.diagnosticMaxSeverity : null;
                let max = fromField;
                if (max == null) {
                    const arr = Array.isArray(row?.diagnosticCodes) ? row.diagnosticCodes : [];
                    if (arr.length === 0) return "-";
                    max = arr.reduce((acc, it) => Math.max(acc, severityNumber(it?.severity)), 0);
                }
                return (
                    <span className="badge" title={`심각도 ${Number(max).toFixed(1)} / 10`}>{Number(max).toFixed(1)} / 10</span>
                );
            }
            case "managementStage": {
                // Display as '-' if no explicit managementStage value was provided from backend
                const hasStageValue = !!row.__hasManagementStage;
                const stage = hasStageValue ? (row.managementStage || "-") : "-";
                const isSaving = !!stageSaving[row.id];
                const badgeClass = MANAGEMENT_STAGE_BADGE_CLASS[stage] || "badge--default";
                const isOpen = openStageDropdown === row.id;
                const dropdownId = `management-stage-${row.id}`;
                // Determine inconsistency between managementStage and contract state (from aggregated index)
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
                        // 기타 상태(수리/점검 중, 입고 대상 등)에서도 계약이 열려 있으면 불일치
                        if (hasAnyOpen) {
                            inconsistent = true;
                            reason = "계약(대여/예약/연체/도난) 진행 중";
                        }
                    }
                }
                return (
                    <span data-stage-dropdown className="inline-flex items-center gap-6 relative">
                        <button
                            type="button"
                            className={`badge badge--clickable ${badgeClass}`}
                            onClick={() => setOpenStageDropdown((prev) => (prev === row.id ? null : row.id))}
                            disabled={isSaving}
                            aria-haspopup="listbox"
                            aria-expanded={isOpen}
                            aria-controls={dropdownId}
                            aria-label={row.plate || row.id ? `${row.plate || row.id} 관리 단계 변경` : "관리 단계 변경"}
                        >
                            <span>{stage}</span>
                            <FaChevronDown size={10} aria-hidden="true" />
                        </button>
                        {inconsistent && (
                            <span
                                className={`inconsistency-indicator ${openInconsistencyId === row.id ? "is-open" : ""}`}
                                data-inconsistency-popover
                                role="button"
                                tabIndex={0}
                                aria-label={`관리상태와 계약상태 불일치: ${reason}`}
                                aria-expanded={openInconsistencyId === row.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenInconsistencyId((prev) => (prev === row.id ? null : row.id));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setOpenInconsistencyId((prev) => (prev === row.id ? null : row.id));
                                    }
                                }}
                                title="관리상태와 계약상태 불일치"
                            >
                                <FaExclamationTriangle size={14} color="#f59e0b" aria-hidden="true" />
                                <div className="inconsistency-popover" role="tooltip">
                                    <div className="inconsistency-popover__title">상태 불일치</div>
                                    <div className="inconsistency-popover__body">
                                        관리상태와 계약상태가 일치하지 않습니다.
                                        <br />사유: {reason}
                                    </div>
                                </div>
                            </span>
                        )}
                        {isOpen && (
                            <ul id={dropdownId} role="listbox" aria-label="관리단계 선택" className={`management-stage-dropdown${stageDropdownUp ? " is-up" : ""}`}>
                                {MANAGEMENT_STAGE_OPTIONS.map((option) => (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOpenStageDropdown(null);
                                                setStageDropdownUp(false);
                                                handleManagementStageChange(row, option.value);
                                            }}
                                            className="management-stage-dropdown__option"
                                            disabled={isSaving}
                                        >
                                            <span className={`badge management-stage-dropdown__badge ${MANAGEMENT_STAGE_BADGE_CLASS[option.value] || "badge--default"}`}>{option.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {isSaving && (
                            <span className="badge badge--pending" aria-live="polite">
                                저장 중...
                            </span>
                        )}
                    </span>
                );
            }

            case "vehicleHealth": {
                const label = row.diagnosticStatus || "-";
                const clsMap = {
                    "-": "badge--default",
                    정상: "badge--normal",
                    관심필요: "badge--overdue",
                    심각: "badge--maintenance",
                };
                const cls = clsMap[label] || "badge--default";
                return label === "-" ? (
                    "-"
                ) : (
                    <button
                        type="button"
                        className={`badge ${cls} badge--clickable`}
                        onClick={() => openDiagnosticModalFromStatus(row)}
                        title="진단 코드 상세 보기"
                    >
                        {label}
                    </button>
                );
            }
            case "diagnosticCodes":
                const dcount = getDiagnosticCount(row);
                return dcount > 0 ? (
                    <button
                        type="button"
                        className="badge badge--diagnostic badge--clickable badge--compact"
                        onClick={() => openDiagnosticModal(row)}
                        title="진단 코드 상세 보기"
                    >
                        진단 {dcount}개
                    </button>
                ) : (
                    <span className="badge badge--normal">정상</span>
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
    const dynamicColumns = visibleColumns
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
                                  <button type="button" className="badge badge--on badge--clickable" onClick={() => openDeviceView(row)} title="단말 정보 보기">
                                      연결됨
                                  </button>
                              );
                          }
                          return (
                              <button type="button" className="badge badge--default badge--clickable" onClick={() => openDeviceRegister(row)} title="단말 등록">
                                  단말 등록
                              </button>
                          );
                      },
                  }
                : {
                      key: column.key,
                      label: column.label,
                      style: { textAlign: column.key === "memo" ? "left" : "center" },
                      render: (row) => renderCellContent(column, row),
                  }
        );

    return (
        <div className="page">
            <h1>자산 등록/관리</h1>

            <div className="asset-toolbar">
                <div className="flex-1" />
                <div className="flex gap-8">
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
                        <button type="button" className="form-button form-button--neutral" onClick={() => setShowColumnDropdown(!showColumnDropdown)} title="컬럼 설정">
                            <FaCog size={14} />
                            컬럼 설정
                        </button>
                        {showColumnDropdown && (
                            <div data-column-dropdown className="dropdown-menu">
                                <div className="dropdown-menu__header">컬럼 표시 설정</div>
                                {columnSettings.columns.map((column, index) => (
                                    <div
                                        key={column.key}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`dropdown-menu__item${column.required ? " is-required" : ""}${draggedColumnIndex === index ? " is-dragging" : ""}${dragOverColumnIndex === index ? " is-dragover" : ""}`}
                                    >
                                        <div className="drag-handle">
                                            <FaGripVertical size={10} color="#999" />
                                        </div>
                                        <div
                                            className="icon-cell"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                !column.required && toggleColumnVisibility(column.key);
                                            }}
                                        >
                                            {column.visible ? <FaEye size={12} color="#4caf50" /> : <FaEyeSlash size={12} color="#f44336" />}
                                        </div>
                                        <span className="text-85 flex-1">{column.label}</span>
                                        {column.required && <span className="text-70 text-muted-light">필수</span>}
                                    </div>
                                ))}
                            </div>
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

            <Table columns={dynamicColumns} data={filtered} selection={selection} emptyMessage="조건에 맞는 차량 자산이 없습니다." stickyHeader />

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
