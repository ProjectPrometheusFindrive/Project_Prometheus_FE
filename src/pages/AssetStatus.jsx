import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  resolveVehicleRentals,
  fetchAssetById,
  fetchAssets,
  fetchAssetsSummary,
  saveAsset,
  buildRentalIndexByVin,
  createRental,
  updateRental,
  createAsset,
  deleteAsset,
  fetchAssetProfile,
  fetchAssetDevice,
  fetchAssetDiagnostics,
} from '../api';
import { uploadMany } from '../utils/uploadHelpers';
import { parseCurrency } from '../utils/formatters';
import AssetForm from '../components/forms/AssetForm';
import InfoGrid from '../components/InfoGrid';
import AssetDialog from '../components/AssetDialog';
import InsuranceDialog from '../components/InsuranceDialog';
import DiagnosticHero from '../components/DiagnosticHero';
import DiagnosticCountBadge from '../components/badges/DiagnosticCountBadge';
import RentalForm from '../components/forms/RentalForm';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import Table from '../components/Table';
import useTableFilters from '../hooks/useTableFilters';
import { applyColumnFilters } from '../utils/filtering';
import { TABLE_COLUMN_FILTERS_ENABLED } from '../constants/featureFlags';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/auth';
import useTableSelection from '../hooks/useTableSelection';
// Local storage fallbacks removed; use API persistence instead
import { ASSET } from '../constants';
import { MANAGEMENT_STAGE_OPTIONS } from '../constants/forms';
import { formatDateShort, getInsuranceExpiryStatus } from '../utils/date';
import {
  getManagementStage,
  withManagementStage,
  getDiagnosticCount,
} from '../utils/managementStage';
import { FaCog } from 'react-icons/fa';
import MemoHistoryModal from '../components/modals/MemoHistoryModal';
import TerminalRequestModal from '../components/modals/TerminalRequestModal';
import DeviceInfoDialog from '../components/modals/DeviceInfoModal';
import {
  MemoCell,
  AssetManagementStageCell,
  VehicleHealthCell,
  CompanyCell,
  PlateCell,
} from '../components/cells';
import useMemoEditor from '../hooks/useMemoEditor';
import useInsuranceModal from '../hooks/useInsuranceModal';
import useManagementStage from '../hooks/useManagementStage';
import useColumnSettings from '../hooks/useColumnSettings';
import useDropdownState from '../hooks/useDropdownState';
import { VehicleTypeText } from '../components/cells';
import ColumnSettingsMenu from '../components/ColumnSettingsMenu';
import { emitToast } from '../utils/toast';
import SeverityBadge from '../components/badges/SeverityBadge';
import VehicleStatusFilterDropdown from '../components/filters/VehicleStatusFilterDropdown';
import DeviceStatusFilterDropdown from '../components/filters/DeviceStatusFilterDropdown';
import VehicleTypeYearFilter from '../components/filters/VehicleTypeYearFilter';

// Column defaults for AssetStatus table
const DEFAULT_ASSET_COLUMNS = [
  { key: 'select', label: '선택', visible: true, required: true, width: 60 },
  { key: 'plate', label: '차량번호', visible: true, required: true, width: 120 },
  { key: 'vehicleType', label: '차종', visible: true, required: false, width: 100 },
  { key: 'registrationDate', label: '차량등록일', visible: true, required: false, width: 120 },
  { key: 'insuranceExpiryDate', label: '보험만료일', visible: true, required: false, width: 120 },
  { key: 'deviceStatus', label: '단말상태', visible: true, required: false, width: 110 },
  { key: 'vehicleHealth', label: '차량상태', visible: true, required: false, width: 110 },
  { key: 'severity', label: '심각도', visible: true, required: false, width: 100 },
  { key: 'managementStage', label: '관리상태', visible: true, required: false, width: 130 },
  { key: 'memo', label: '메모', visible: true, required: false, width: 250 },
];

// 진단 코드 유틸: 배열 기반만 사용
const normalizeDiagnosticList = (asset) => {
  const raw = asset?.diagnosticCodes;
  if (Array.isArray(raw)) {
    // 이미 개별 코드 배열 형태인 경우 정규화
    return raw.filter(Boolean).map((it, idx) => ({
      id: it.id || `${asset?.id || asset?.vin || 'asset'}-diag-${idx}`,
      code: it.code || '',
      description: it.description || it.content || it.note || '',
      severity: it.severity || it.level || '낮음',
      detectedDate: it.detectedDate || it.date || it.detected_at || '',
    }));
  }
  // 배열 데이터가 없으면 빈 목록 반환
  return [];
};

const sortDiagnosticsByDateDesc = (issues) => {
  if (!Array.isArray(issues)) return [];
  return [...issues].sort((a, b) => {
    const aTime = a?.detectedDate ? new Date(a.detectedDate).getTime() : 0;
    const bTime = b?.detectedDate ? new Date(b.detectedDate).getTime() : 0;
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
};

const severityNumber = (s) => {
  if (typeof s === 'number') return Math.max(0, Math.min(10, s));
  if (typeof s === 'string') {
    const m = s.trim();
    if (m === '낮음') return 2;
    if (m === '보통') return 5;
    if (m === '높음') return 8;
    const n = parseFloat(m);
    return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
  }
  return 0;
};

const normalizeDiagnosticStatus = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '-') return null;
  return trimmed;
};

const resolveVehicleHealthLabel = (row) => {
  const provided = normalizeDiagnosticStatus(row?.diagnosticStatus);
  if (provided) return provided;
  const maxFromField =
    typeof row?.diagnosticMaxSeverity === 'number' ? row.diagnosticMaxSeverity : null;
  if (maxFromField != null) {
    if (maxFromField === 0) return '정상';
    return maxFromField > 7 ? '심각' : '관심필요';
  }
  const dcount = getDiagnosticCount(row);
  if (dcount === 0) return '정상';
  const arr = Array.isArray(row?.diagnosticCodes) ? row.diagnosticCodes : [];
  const max = arr.reduce((acc, it) => Math.max(acc, severityNumber(it?.severity)), 0);
  return max > 7 ? '심각' : '관심필요';
};

// vehicleType 문자열과 year 필드를 기반으로 차종/연식 파싱
const parseVehicleTypeAndYear = (row) => {
  const rawType = row?.vehicleType;
  const fullLabel = rawType ? String(rawType) : '';

  // 기본값
  let baseType = fullLabel;
  let yearKey = '';

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
  if (!yearKey && yearValue != null && yearValue !== '') {
    const s = String(yearValue);
    yearKey = s.length === 4 ? s.slice(2) : s;
  }

  return { baseType, yearKey, fullLabel };
};

const severityClass = (n) => (n <= 3 ? 'low' : n <= 7 ? 'medium' : 'high');

const MANAGEMENT_STAGE_SET = new Set(MANAGEMENT_STAGE_OPTIONS.map((opt) => opt.value));
const MANAGEMENT_STAGE_BADGE_CLASS = {
  대여가능: 'badge--available',
  대여중: 'badge--rented',
  예약중: 'badge--pending',
  '입고 대상': 'badge--default',
  '수리/점검 중': 'badge--maintenance',
  '수리/점검 완료': 'badge--completed',
};

export default function AssetStatus() {
  const confirm = useConfirm();
  const auth = useAuth();
  const isSuperAdmin = auth?.user?.role === ROLES.SUPER_ADMIN;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
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
  // Device install application modal
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const openInstallModal = () => setInstallModalOpen(true);
  const closeInstallModal = () => setInstallModalOpen(false);
  const {
    editingId: editingMemo,
    memoText,
    onEdit: onMemoEdit,
    onChange: onMemoChange,
    onCancel: onMemoCancel,
  } = useMemoEditor();
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
  const { columns, visibleColumns, toggleColumnVisibility, moveColumn, resetColumns, deselectAllOptionalColumns } =
    useColumnSettings({
      storageKey: 'asset-columns-settings',
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
    },
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
    const toArray = (val) => (Array.isArray(val) ? val : val instanceof File ? [val] : []);
    const contractFiles = toArray(contractFile);
    const licenseFiles = toArray(driverLicenseFile);
    const payload = {
      ...rest,
      rentalAmount: parseCurrency(rest.rentalAmount),
      deposit: parseCurrency(rest.deposit),
      rentalPeriod: { start: rest.start || '', end: rest.end || '' },
    };
    let created;
    try {
      created = await createRental(payload);
    } catch (e) {
      console.error('Failed to create rental via API', e);
      emitToast('계약 생성에 실패했습니다.', 'error');
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
      try {
        await updateRental(created.rentalId, patch);
      } catch (e) {
        console.warn('Failed to patch rental with preUploaded docs', e);
      }
      created = { ...created, ...patch };
    } else if (created && (contractFiles.length > 0 || licenseFiles.length > 0)) {
      console.groupCollapsed('[upload-ui] rental create docs (from Asset) start');
      try {
        const rentalId = created.rentalId || rest.rentalId;
        const base = `rentals/${rentalId}`;
        const [contractRes, licenseRes] = await Promise.all([
          uploadMany(contractFiles, { folder: `${base}/contracts`, label: 'contracts' }),
          uploadMany(licenseFiles, { folder: `${base}/licenses`, label: 'licenses' }),
        ]);
        if (contractRes.objects.length > 0 || licenseRes.objects.length > 0) {
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
          await updateRental(created.rentalId, patch).catch((e) =>
            console.warn('Failed to patch rental with doc URLs', e)
          );
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
    let stageAfter = pendingNextStage || '대여중';
    if (stageAfter === '예약중' && s && now >= s && e && now <= e) {
      stageAfter = '대여중'; // 예약이지만 시작 시각이 현재와 겹치면 대여중으로 보정
    } else if (stageAfter === '대여중' && s && now < s) {
      stageAfter = '예약중'; // 대여중으로 바꾸려 했지만 시작이 미래면 예약중으로 보정
    }

    const id = pendingStageAssetId;
    if (id) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? withManagementStage({ ...row, managementStage: stageAfter }) : row
        )
      );
      setStageSaving((prev) => ({ ...prev, [id]: true }));
      try {
        const response = await saveAsset(id, { managementStage: stageAfter });
        setRows((prev) =>
          prev.map((row) => {
            if (row.id !== id) return row;
            const updatedStage =
              response?.managementStage && MANAGEMENT_STAGE_SET.has(response.managementStage)
                ? response.managementStage
                : stageAfter;
            const merged = { ...row, ...(response || {}), managementStage: updatedStage };
            return withManagementStage(merged);
          })
        );
      } catch (error) {
        console.error('Failed to save management stage after rental create', error);
        emitToast('관리단계를 저장하지 못했습니다. 다시 시도해주세요.', 'error');
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
          console.error('Failed to load device detail', e);
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
        console.error('Failed to load assets', e);
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
        console.error('Failed to load rentals for consistency indicator', e);
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
  const stageDropdownIdForKey = (key) =>
    `management-stage-${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

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
      const rect = trigger.getBoundingClientRect();
      const wrapRect = tableWrapRef.current?.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const spaceBelow = wrapRect ? wrapRect.bottom - rect.bottom : viewportHeight - rect.bottom;
      const spaceAbove = wrapRect ? rect.top - wrapRect.top : rect.top;
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

  const tableFilterState = useTableFilters({ storageKey: 'asset-table-filters' });
  const {
    filters: columnFilters,
    setFilter: setColumnFilter,
    clearAll: clearAllColumnFilters,
  } = tableFilterState;

  const debouncedQ = useDebouncedValue(q, 250);

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    const ok = await confirm({
      title: '선택삭제',
      message: '선택한 자산을 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '취소',
    });
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
      plate: asset?.plate || '',
      make: asset?.make || '',
      model: asset?.model || '',
      vin: asset?.vin || '',
      vehicleValue: asset?.vehicleValue || '',
      purchaseDate: asset?.purchaseDate || '',
      systemRegDate: asset?.systemRegDate || '',
      systemDelDate: asset?.systemDelDate || '',
      vehicleType: asset?.vehicleType || '',
      registrationStatus: asset?.registrationStatus || '자산등록 완료',
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
          console.error('Failed to load asset profile', e);
        }
      })();
    }
  };

  // Unified diagnostic modal opener (consolidates openDiagnosticModal + openDiagnosticModalFromStatus)
  const openDiagnosticModal = (vehicle) => {
    const buildAndOpen = (v, diag) => {
      const issues = Array.isArray(diag?.diagnosticCodes)
        ? diag.diagnosticCodes
        : normalizeDiagnosticList(v);
      const sortedIssues = sortDiagnosticsByDateDesc(issues);
      const detail = {
        category: 'ALL',
        categoryName: '전체 진단',
        count: sortedIssues.length,
        vehicleInfo: { plate: v.plate, vehicleType: v.vehicleType, id: v.id },
        issues: sortedIssues,
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
          console.error('Failed to load diagnostics', e);
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
      supplier: form.supplier || '',
      deviceInstallDate: form.installDate || '',
      installer: form.installer || '',
      deviceSerial: form.serial || '',
    };
    try {
      const resp = await saveAsset(activeAsset.id, patch);
      setRows((prev) =>
        prev.map((a) =>
          a.id === activeAsset.id ? withManagementStage({ ...a, ...(resp || patch) }) : a
        )
      );
    } catch (e) {
      console.error('Failed to save device info', e);
      emitToast('단말 정보 저장 실패', 'error');
    }
    setShowDeviceModal(false);
    setActiveAsset(null);
  };

  const nextAssetId = () => {
    const prefix = ASSET.ID_PREFIX;
    let max = 0;
    for (const a of rows) {
      const m = String(a.id || '').match(/(\d{1,})$/);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) max = Math.max(max, n);
      }
    }
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  };

  const handleAssetSubmit = async (data) => {
    // Compose vehicleType from make/model when available
    const composedVehicleType =
      data.vehicleType || [data.make, data.model].filter(Boolean).join(' ');

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
      const toArray = (val) => (Array.isArray(val) ? val : val instanceof File ? [val] : []);
      const insuranceFiles = toArray(insuranceDoc);
      const registrationFiles = toArray(registrationDoc);
      if (insuranceFiles.length > 0 || registrationFiles.length > 0) {
        console.groupCollapsed('[upload-ui] asset update docs start');
        const vin = (data.vin || '').trim();
        const folder = vin ? `assets/${vin}/docs` : `assets/docs`;
        const [insRes, regRes] = await Promise.all([
          uploadMany(insuranceFiles, { folder, label: 'insuranceDoc' }),
          uploadMany(registrationFiles, { folder, label: 'registrationDoc' }),
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
          prev.map((a) =>
            a.id === editingAssetId ? withManagementStage({ ...a, ...(resp || patch) }) : a
          )
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
        emitToast('VIN은 필수입니다.', 'warning');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const { registrationDoc, insuranceDoc, preUploaded, ocrSuggestions, ...rest } = data || {};
      const payload = {
        ...rest,
        year: rest.year ? Number(rest.year) : rest.year,
        fuelType: rest.fuelType,
        vehicleType: composedVehicleType || rest.vehicleType || '',
        registrationDate: rest.registrationDate || today,
        registrationStatus: rest.registrationStatus || '자산등록 완료',
      };
      // Prefer preUploaded docs from Step 1 (objectNames) if present; otherwise upload files now
      if (
        preUploaded &&
        (Array.isArray(preUploaded.insurance) || Array.isArray(preUploaded.registration))
      ) {
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
        const toArray = (val) => (Array.isArray(val) ? val : val instanceof File ? [val] : []);
        const insuranceFiles = toArray(insuranceDoc);
        const registrationFiles = toArray(registrationDoc);
        if (insuranceFiles.length > 0 || registrationFiles.length > 0) {
          console.groupCollapsed('[upload-ui] asset create docs start');
          console.debug('[upload-ui] incoming files:', {
            insuranceDoc: Array.isArray(insuranceDoc)
              ? insuranceDoc.map((f) => ({ name: f.name, size: f.size, type: f.type }))
              : insuranceDoc
                ? { name: insuranceDoc.name, size: insuranceDoc.size, type: insuranceDoc.type }
                : null,
            registrationDoc: Array.isArray(registrationDoc)
              ? registrationDoc.map((f) => ({ name: f.name, size: f.size, type: f.type }))
              : registrationDoc
                ? {
                    name: registrationDoc.name,
                    size: registrationDoc.size,
                    type: registrationDoc.type,
                  }
                : null,
          });
          const vin = (data.vin || '').trim();
          const folder = vin ? `assets/${vin}/docs` : `assets/docs`;
          const [insRes, regRes] = await Promise.all([
            uploadMany(insuranceFiles, { folder, label: 'insuranceDoc' }),
            uploadMany(registrationFiles, { folder, label: 'registrationDoc' }),
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
        console.debug('[upload-ui] creating asset with payload (doc objectNames present?):', {
          hasInsuranceDocObjectName: !!payload.insuranceDocGcsObjectName,
          hasRegistrationDocObjectName: !!payload.registrationDocGcsObjectName,
          insuranceDocGcsObjectNames: payload.insuranceDocGcsObjectNames?.length || 0,
          registrationDocGcsObjectNames: payload.registrationDocGcsObjectNames?.length || 0,
        });
        const created = await createAsset(payload);
        console.debug('[upload-ui] createAsset result:', created);
        const normalized = withManagementStage(created || payload);
        setRows((prev) => [normalized, ...prev]);
        emitToast('자산이 등록되었습니다.', 'success');
      } catch (e) {
        console.error('Failed to create asset via API', e);
        // Handle duplicate error (409 Conflict) - VIN or plate
        if (e?.status === 409 || e?.errorType === 'CONFLICT' || e?.data?.error?.type === 'CONFLICT') {
          const message = e?.data?.error?.message || e?.message || '이미 등록된 정보입니다.';
          emitToast(message, 'error');
        } else {
          emitToast('자산 생성에 실패했습니다.', 'error');
        }
        // Don't close modal on error so user can fix and retry
        return;
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
      setRows((prev) =>
        prev.map((asset) => (asset.id === assetId ? { ...asset, memo: newText } : asset))
      );
      if (resp == null) {
        setToast({ message: '메모가 저장되었습니다.', type: 'success' });
      }
      onMemoCancel();
    } catch (error) {
      console.error('Failed to save memo:', error);
      emitToast('메모 저장에 실패했습니다.', 'error');
    }
  };
  const handleMemoCancel = () => onMemoCancel();

  // 드래그&드롭 이벤트 핸들러들
  const handleDragStart = (e, index) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
      case 'select':
        return null; // Table 컴포넌트에서 자동 처리
      case 'company':
        return <CompanyCell row={row} />;
      case 'plate':
        return (
          <PlateCell plate={row.plate} onClick={() => openAssetEdit(row)} title="자산 등록/편집" />
        );
      case 'vehicleType':
        return <VehicleTypeText vehicleType={row.vehicleType} />;
      case 'registrationDate':
        return formatDateShort(row.registrationDate);
      case 'insuranceExpiryDate':
        if (row.insuranceExpiryDate) {
          const status = getInsuranceExpiryStatus(row.insuranceExpiryDate);
          const colorByStatus = {
            expired: '#d32f2f',
            warning: '#f9a825',
            caution: '#fbc02d',
            valid: '#006CEC',
            none: '#006CEC',
          };
          const labelByStatus = {
            expired: '만료',
            warning: '만료 임박',
            caution: '만료 예정',
          };
          const displayDate = formatDateShort(row.insuranceExpiryDate);
          const statusLabel = labelByStatus[status];
          const displayText = status === 'expired' ? `${statusLabel} ${displayDate}` : displayDate;
          return (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <button
                type="button"
                onClick={() => openInsuranceModalReadOnly(row)}
                title="보험 정보 보기"
                style={{
                  textAlign: 'center',
                  color: colorByStatus[status] || '#006CEC',
                  fontSize: '14px',
                  fontFamily: 'Pretendard',
                  fontWeight: 500,
                  lineHeight: '24px',
                  wordWrap: 'break-word',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {displayText}
              </button>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={() => openInsuranceModal(row)}
            className="asset-pill asset-pill--insurance"
            title="보험 등록"
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
              cursor: 'pointer',
            }}
          >
            보험등록
          </button>
        );
      case 'deviceStatus':
        const hasDevice = row.deviceSerial;
        if (!hasDevice) {
          return (
            <button
              type="button"
              className="asset-pill asset-pill--device asset-pill--device-bad"
              style={{
                paddingTop: '2px',
                paddingBottom: '2px',
                paddingLeft: '11px',
                paddingRight: '12px',
                background: 'rgba(235, 74, 69, 0.15)',
                borderRadius: '100px',
                outline: '1px rgba(0, 0, 0, 0.02) solid',
                outlineOffset: '-1px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                display: 'inline-flex',
                textAlign: 'center',
                color: '#EB4A45',
                fontSize: '14px',
                fontFamily: 'Pretendard',
                fontWeight: 500,
                lineHeight: '24px',
                wordWrap: 'break-word',
                border: 'none',
                cursor: 'default',
              }}
            >
              연결불량
            </button>
          );
        }
        return (
          <span
            className="asset-pill asset-pill--device asset-pill--device-ok"
            style={{
              paddingLeft: '14px',
              paddingRight: '14px',
              paddingTop: '2px',
              paddingBottom: '2px',
              background: 'rgba(26.22, 129.17, 255, 0.05)',
              borderRadius: '100px',
              outline: '1px rgba(0, 0, 0, 0.02) solid',
              outlineOffset: '-1px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              display: 'inline-flex',
              textAlign: 'center',
              color: '#006CEC',
              fontSize: '14px',
              fontFamily: 'Pretendard',
              fontWeight: 500,
              lineHeight: '24px',
              wordWrap: 'break-word',
            }}
          >
            연결됨
          </span>
        );
      case 'severity': {
        const hasDevice = !!row?.deviceSerial;
        if (!hasDevice) {
          return (
            <button
              type="button"
              onClick={openInstallModal}
              title="단말 장착 신청"
              aria-label="단말 장착 신청"
              className="asset-pill asset-pill--severity asset-pill--severity-install"
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
                cursor: 'pointer',
              }}
            >
              단말필요
            </button>
          );
        }
        // Compute severity: if there are no diagnostics, show 정상
        const fromField =
          typeof row?.diagnosticMaxSeverity === 'number' ? row.diagnosticMaxSeverity : null;
        let max = fromField;
        if (max == null) {
          const arr = Array.isArray(row?.diagnosticCodes) ? row.diagnosticCodes : [];
          if (arr.length === 0) {
            return (
              <span
                className="asset-pill asset-pill--severity asset-pill--severity-ok"
                style={{
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  paddingTop: '2px',
                  paddingBottom: '2px',
                  background: 'rgba(26.22, 129.17, 255, 0.05)',
                  borderRadius: '100px',
                  outline: '1px rgba(0, 0, 0, 0.02) solid',
                  outlineOffset: '-1px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  display: 'inline-flex',
                  textAlign: 'center',
                  color: '#006CEC',
                  fontSize: '14px',
                  fontFamily: 'Pretendard',
                  fontWeight: 500,
                  lineHeight: '24px',
                  wordWrap: 'break-word',
                }}
              >
                정상
              </span>
            );
          }
          max = arr.reduce((acc, it) => Math.max(acc, severityNumber(it?.severity)), 0);
        }
        if (Number(max) === 0) {
          return (
            <span
              className="asset-pill asset-pill--severity asset-pill--severity-ok"
              style={{
                paddingLeft: '14px',
                paddingRight: '14px',
                paddingTop: '2px',
                paddingBottom: '2px',
                background: 'rgba(26.22, 129.17, 255, 0.05)',
                borderRadius: '100px',
                outline: '1px rgba(0, 0, 0, 0.02) solid',
                outlineOffset: '-1px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                display: 'inline-flex',
                textAlign: 'center',
                color: '#006CEC',
                fontSize: '14px',
                fontFamily: 'Pretendard',
                fontWeight: 500,
                lineHeight: '24px',
                wordWrap: 'break-word',
              }}
            >
              정상
            </span>
          );
        }
        return <SeverityBadge value={max} />;
      }
      case 'managementStage': {
        const hasStageValue = !!row.__hasManagementStage;
        const stage = hasStageValue ? row.managementStage || '-' : '-';
        const rowKey = String(row.id ?? row.vin ?? row.plate ?? '');
        const isSaving = !!stageSaving[rowKey] || !!stageSaving[row.id];
        const isOpen = String(openDropdowns.stage) === rowKey;
        const agg = rentalsByVin[String(row.vin || '')] || null;
        const hasActive = !!agg?.hasActive;
        const hasOverdue = !!agg?.hasOverdue;
        const hasStolen = !!agg?.hasStolen;
        const hasReserved = !!agg?.hasReserved;
        const hasAnyOpen = hasActive || hasOverdue || hasStolen || hasReserved;

        const activeSummary = agg?.activeContractSummary;
        const reservedSummary = agg?.reservedContractSummary;
        const formatDate = (d) => {
          if (!d) return '';
          try {
            const date = new Date(d);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${mm}.${dd}`;
          } catch {
            return '';
          }
        };
        const formatPeriod = (s) => {
          if (!s || !s.startDate || !s.endDate) return '';
          return `(${formatDate(s.startDate)}~${formatDate(s.endDate)})`;
        };

        let inconsistent = false;
        let reason = '';
        const isKnownStage = MANAGEMENT_STAGE_SET.has(stage);
        if (isKnownStage) {
          if (stage === '대여중') {
            if (!(hasActive || hasOverdue || hasStolen)) {
              inconsistent = true;
              reason = '진행 중 계약 없음(대여/연체/도난 미해당)';
            }
          } else if (stage === '예약중') {
            if (!hasReserved) {
              inconsistent = true;
              reason = '예약 계약 없음';
            }
          } else if (stage === '대여가능') {
            if (hasAnyOpen) {
              inconsistent = true;
              if (hasActive && activeSummary) {
                reason = `${activeSummary.renterName || '알 수 없음'} 님의 대여 계약${formatPeriod(activeSummary)} 진행 중`;
              } else if (hasReserved && reservedSummary) {
                reason = `${reservedSummary.renterName || '알 수 없음'} 님의 예약 계약${formatPeriod(reservedSummary)} 존재`;
              } else if (hasStolen) {
                reason = activeSummary
                  ? `${activeSummary.renterName || '알 수 없음'} 님의 도난 신고된 계약${formatPeriod(activeSummary)} 존재`
                  : '도난 신고된 계약 존재';
              } else if (hasOverdue) {
                reason = activeSummary
                  ? `${activeSummary.renterName || '알 수 없음'} 님의 반납 지연된 계약${formatPeriod(activeSummary)} 존재`
                  : '반납 지연된 계약 존재';
              } else {
                reason = '진행 중/예약/연체/도난 계약 존재';
              }
            }
          } else {
            if (hasAnyOpen) {
              inconsistent = true;
              if (hasActive && activeSummary) {
                reason = `${activeSummary.renterName || '알 수 없음'} 대여 중 ${formatPeriod(activeSummary)}`;
              } else if (hasReserved && reservedSummary) {
                reason = `${reservedSummary.renterName || '알 수 없음'} 예약 중 ${formatPeriod(reservedSummary)}`;
              } else {
                reason = '타 계약(대여/예약/연체/도난) 진행 중';
              }
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

      case 'vehicleHealth': {
        const hasDevice = !!row?.deviceSerial;
        if (!hasDevice) {
          return <VehicleHealthCell label="단말필요" onClick={openInstallModal} />;
        }
        const label = resolveVehicleHealthLabel(row);
        return <VehicleHealthCell label={label} onClick={() => openDiagnosticModal(row)} />;
      }
      case 'diagnosticCodes':
        const dcount = getDiagnosticCount(row);
        return <DiagnosticCountBadge count={dcount} onClick={() => openDiagnosticModal(row)} />;
      case 'memo':
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
              setMemoHistoryTarget({ id, plate, memo: row.memo });
              setShowMemoHistoryModal(true);
            }}
            maxWidth={150}
          />
        );
      default:
        return '-';
    }
  };

  // 동적 컬럼 생성
  // Build columns for Table; inject company before plate for super-admin
  const columnsForRender = useMemo(() => {
    if (!isSuperAdmin) return [...visibleColumns];
    const base = [...visibleColumns];
    const hasCompany = base.some((c) => c.key === 'company');
    if (!hasCompany) {
      const plateIdx = base.findIndex((c) => c.key === 'plate');
      const colDef = { key: 'company', label: '회사', width: 120 };
      if (plateIdx >= 0) base.splice(plateIdx, 0, colDef);
      else base.unshift(colDef);
    }
    return base;
  }, [visibleColumns, isSuperAdmin]);

  const dynamicColumns = useMemo(
    () =>
      columnsForRender
        .filter((col) => col.key !== 'select') // select는 Table 컴포넌트에서 자동 처리
        .map((column) =>
          column.key === 'deviceStatus'
            ? {
                key: column.key,
                label: column.label,
                sortable: true,
                sortAccessor: (row) => (row.deviceSerial ? 1 : 0),
                style: {
                  textAlign: 'center',
                  ...(column.width
                    ? { width: `${column.width}px`, minWidth: `${column.width}px` }
                    : {}),
                },
                filterType: 'select',
                filterAccessor: (row) => (!!row.deviceSerial ? '연결됨' : '없음'),
                filterOptions: [
                  { value: '연결됨', label: '연결됨' },
                  { value: '없음', label: '없음' },
                ],
                filterHideHeader: true,
                renderCustomFilter: ({ value, onChange, close }) => (
                  <DeviceStatusFilterDropdown
                    value={value}
                    onChange={onChange}
                    onClear={() => onChange(null)}
                    onRequestClose={close}
                  />
                ),
                render: (row) => {
                  const hasDevice = !!row.deviceSerial;
                  if (hasDevice) {
                    return (
                      <button
                        type="button"
                        onClick={() => openDeviceModal(row, true)}
                        title="단말 정보 보기"
                        aria-label={`${row.plate || row.id || '자산'} 단말 정보 보기`}
                        style={{
                          paddingLeft: '14px',
                          paddingRight: '14px',
                          paddingTop: '2px',
                          paddingBottom: '2px',
                          background: 'rgba(26.22, 129.17, 255, 0.05)',
                          borderRadius: '100px',
                          outline: '1px rgba(0, 0, 0, 0.02) solid',
                          outlineOffset: '-1px',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '10px',
                          display: 'inline-flex',
                          textAlign: 'center',
                          color: '#006CEC',
                          fontSize: '14px',
                          fontFamily: 'Pretendard',
                          fontWeight: 500,
                          lineHeight: '24px',
                          wordWrap: 'break-word',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        연결됨
                      </button>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => openDeviceModal(row, false)}
                      title="단말 등록"
                      aria-label={`${row.plate || row.id || '자산'} 단말 등록`}
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
                        cursor: 'pointer',
                      }}
                    >
                      단말등록
                    </button>
                  );
                },
              }
            : column.key === 'company'
              ? {
                  key: column.key,
                  label: column.label,
                  style: {
                    textAlign: 'center',
                    ...(column.width
                      ? { width: `${column.width}px`, minWidth: `${column.width}px` }
                      : {}),
                  },
                  sortAccessor: (row) => row?.companyName || row?.company || row?.companyId || '',
                  filterType: 'select',
                  filterAccessor: (row) => row?.companyName || row?.company || row?.companyId || '',
                  render: (row) => renderCellContent(column, row),
                }
              : {
                  key: column.key,
                  label: column.label,
                  style: {
                    textAlign: column.key === 'managementStage' ? 'right' : 'center',
                    ...(column.width
                      ? { width: `${column.width}px`, minWidth: `${column.width}px` }
                      : {}),
                  },
                  // Filter meta per column
                  ...(column.key === 'plate' ? { filterType: 'text' } : null),
                  ...(column.key === 'vehicleType'
                    ? {
                        filterType: 'select',
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
                      }
                    : null),
                  ...(column.key === 'registrationDate' ? { filterType: 'date-range' } : null),
                  ...(column.key === 'insuranceExpiryDate' ? { filterType: 'date-range' } : null),
                  ...(column.key === 'vehicleHealth'
                    ? {
                        sortAccessor: (row) => {
                          const hasDevice = !!row?.deviceSerial;
                          if (!hasDevice) return '단말필요';
                          const dcount = getDiagnosticCount(row);
                          if (dcount === 0) return '정상';
                          const provided = row.diagnosticStatus;
                          if (provided) return provided;
                          const arr = Array.isArray(row?.diagnosticCodes)
                            ? row.diagnosticCodes
                            : [];
                          const max = arr.reduce(
                            (acc, it) => Math.max(acc, severityNumber(it?.severity)),
                            0
                          );
                          return max > 7 ? '심각' : '관심필요';
                        },
                        filterType: 'select',
                        filterAccessor: (row) => {
                          const hasDevice = !!row?.deviceSerial;
                          if (!hasDevice) return '단말필요';
                          return resolveVehicleHealthLabel(row);
                        },
                        filterAllowAnd: false,
                        renderCustomFilter: ({ value, onChange, close }) => (
                          <VehicleStatusFilterDropdown
                            value={value}
                            onChange={onChange}
                            onClear={() => onChange(null)}
                            onRequestClose={close}
                          />
                        ),
                      }
                    : null),
                  ...(column.key === 'severity'
                    ? {
                        sortAccessor: (row) => {
                          const fromField =
                            typeof row?.diagnosticMaxSeverity === 'number'
                              ? row.diagnosticMaxSeverity
                              : null;
                          let max = fromField;
                          if (max == null) {
                            const arr = Array.isArray(row?.diagnosticCodes)
                              ? row.diagnosticCodes
                              : [];
                            if (arr.length === 0) return 0;
                            max = arr.reduce(
                              (acc, it) => Math.max(acc, severityNumber(it?.severity)),
                              0
                            );
                          }
                          return Number(max) || 0;
                        },
                        filterType: 'number-range',
                        filterAccessor: (row) => {
                          const fromField =
                            typeof row?.diagnosticMaxSeverity === 'number'
                              ? row.diagnosticMaxSeverity
                              : null;
                          let max = fromField;
                          if (max == null) {
                            const arr = Array.isArray(row?.diagnosticCodes)
                              ? row.diagnosticCodes
                              : [];
                            if (arr.length === 0) return 0;
                            max = arr.reduce(
                              (acc, it) => Math.max(acc, severityNumber(it?.severity)),
                              0
                            );
                          }
                          return Number(max) || 0;
                        },
                      }
                    : null),
                  ...(column.key === 'managementStage'
                    ? {
                        filterType: 'multi-select',
                        filterOptions: MANAGEMENT_STAGE_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label || o.value,
                        })),
                        filterAllowAnd: false,
                        filterHideHeader: true,
                      }
                    : null),
                  ...(column.key === 'memo' ? { filterType: 'text' } : null),
                  render: (row) => renderCellContent(column, row),
                }
        ),
    [
      columnsForRender,
      openDropdowns.stage,
      stageDropdownUp,
      stageSaving,
      rentalsByVin,
      editingMemo,
      memoText,
      rows,
    ]
  );

  // Apply column filters + global search/status after columns are defined
  const filtered = useMemo(() => {
    const cols = dynamicColumns;
    const afterColumn = applyColumnFilters(rows, columnFilters, cols);
    const term = debouncedQ.trim().toLowerCase();
    return afterColumn.filter((a) => {
      const matchesTerm = term
        ? [
            a.plate,
            a.vehicleType,
            a.insuranceInfo,
            a.registrationDate,
            a.registrationStatus,
            a.installer,
            a.deviceSerial,
            a.id,
            a.memo,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        : true;
      const matchesStatus = status === 'all' ? true : a.registrationStatus === status;
      return matchesTerm && matchesStatus;
    });
  }, [rows, dynamicColumns, columnFilters, debouncedQ, status]);

  const selection = useTableSelection(filtered, 'id');
  const { selected, selectedCount, clearSelection } = selection;

  return (
    <div className="page page--data page--sticky-header">
      <div className="page-header-sticky">
        <h1 className="page-title">자산등록관리</h1>

        <div className="table-toolbar">
          <div className="flex-1" />
          <div className="flex gap-3" style={{ marginRight: '12px' }}>
            <button type="button" onClick={openAssetCreate} className="toolbar-button">
              <svg
                className="toolbar-btn-icon-only"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="toolbar-btn-text">자산등록</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0}
              title={selectedCount === 0 ? '삭제할 항목을 선택하세요' : '선택 항목 삭제'}
              className="toolbar-button"
            >
              <svg
                className="toolbar-btn-icon-only"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="toolbar-btn-text">선택삭제</span>
            </button>
            <div className="relative" data-column-dropdown>
              <button
                type="button"
                onClick={toggleColumnDropdown}
                title="컬럼 설정"
                className="toolbar-button toolbar-button--tight-gap"
              >
                <span className="toolbar-btn-text">컬럼설정</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.6667 4.77166V1.75C11.6667 1.59529 11.6052 1.44691 11.4958 1.33752C11.3864 1.22812 11.2381 1.16666 11.0834 1.16666C10.9287 1.16666 10.7803 1.22812 10.6709 1.33752C10.5615 1.44691 10.5 1.59529 10.5 1.75V4.77166C10.1622 4.89428 9.8703 5.11795 9.66402 5.41226C9.45774 5.70657 9.34709 6.05726 9.34709 6.41666C9.34709 6.77607 9.45774 7.12676 9.66402 7.42107C9.8703 7.71538 10.1622 7.93905 10.5 8.06166V12.25C10.5 12.4047 10.5615 12.5531 10.6709 12.6625C10.7803 12.7719 10.9287 12.8333 11.0834 12.8333C11.2381 12.8333 11.3864 12.7719 11.4958 12.6625C11.6052 12.5531 11.6667 12.4047 11.6667 12.25V8.06166C12.0045 7.93905 12.2964 7.71538 12.5027 7.42107C12.709 7.12676 12.8196 6.77607 12.8196 6.41666C12.8196 6.05726 12.709 5.70657 12.5027 5.41226C12.2964 5.11795 12.0045 4.89428 11.6667 4.77166ZM11.0834 7C10.968 7 10.8552 6.96579 10.7593 6.90169C10.6634 6.83759 10.5886 6.74649 10.5444 6.6399C10.5003 6.53331 10.4887 6.41602 10.5112 6.30286C10.5337 6.18971 10.5893 6.08577 10.6709 6.00419C10.7525 5.92261 10.8564 5.86705 10.9696 5.84454C11.0827 5.82203 11.2 5.83358 11.3066 5.87773C11.4132 5.92189 11.5043 5.99665 11.5684 6.09258C11.6325 6.18851 11.6667 6.30129 11.6667 6.41666C11.6667 6.57137 11.6052 6.71975 11.4958 6.82914C11.3864 6.93854 11.2381 7 11.0834 7ZM7.58336 8.27166V1.75C7.58336 1.59529 7.52191 1.44691 7.41251 1.33752C7.30311 1.22812 7.15474 1.16666 7.00003 1.16666C6.84532 1.16666 6.69695 1.22812 6.58755 1.33752C6.47816 1.44691 6.4167 1.59529 6.4167 1.75V8.27166C6.07886 8.39428 5.78697 8.61795 5.58069 8.91226C5.37441 9.20657 5.26375 9.55726 5.26375 9.91667C5.26375 10.2761 5.37441 10.6268 5.58069 10.9211C5.78697 11.2154 6.07886 11.439 6.4167 11.5617V12.25C6.4167 12.4047 6.47816 12.5531 6.58755 12.6625C6.69695 12.7719 6.84532 12.8333 7.00003 12.8333C7.15474 12.8333 7.30311 12.7719 7.41251 12.6625C7.52191 12.5531 7.58336 12.4047 7.58336 12.25V11.5617C7.9212 11.439 8.2131 11.2154 8.41937 10.9211C8.62565 10.6268 8.73631 10.2761 8.73631 9.91667C8.73631 9.55726 8.62565 9.20657 8.41937 8.91226C8.2131 8.61795 7.9212 8.39428 7.58336 8.27166ZM7.00003 10.5C6.88466 10.5 6.77188 10.4658 6.67595 10.4017C6.58002 10.3376 6.50525 10.2465 6.4611 10.1399C6.41695 10.0333 6.4054 9.91602 6.42791 9.80286C6.45042 9.68971 6.50597 9.58577 6.58755 9.50419C6.66913 9.4226 6.77307 9.36705 6.88623 9.34454C6.99938 9.32203 7.11667 9.33358 7.22326 9.37774C7.32985 9.42189 7.42096 9.49665 7.48506 9.59258C7.54915 9.68851 7.58336 9.80129 7.58336 9.91667C7.58336 10.0714 7.52191 10.2197 7.41251 10.3291C7.30311 10.4385 7.15474 10.5 7.00003 10.5ZM3.50003 3.605V1.75C3.50003 1.59529 3.43857 1.44691 3.32918 1.33752C3.21978 1.22812 3.07141 1.16666 2.9167 1.16666C2.76199 1.16666 2.61362 1.22812 2.50422 1.33752C2.39482 1.44691 2.33336 1.59529 2.33336 1.75V3.605C1.99553 3.72762 1.70363 3.95128 1.49736 4.24559C1.29108 4.53991 1.18042 4.89059 1.18042 5.25C1.18042 5.6094 1.29108 5.96009 1.49736 6.2544C1.70363 6.54871 1.99553 6.77238 2.33336 6.895V12.25C2.33336 12.4047 2.39482 12.5531 2.50422 12.6625C2.61362 12.7719 2.76199 12.8333 2.9167 12.8333C3.07141 12.8333 3.21978 12.7719 3.32918 12.6625C3.43857 12.5531 3.50003 12.4047 3.50003 12.25V6.895C3.83787 6.77238 4.12976 6.54871 4.33604 6.2544C4.54232 5.96009 4.65298 5.6094 4.65298 5.25C4.65298 4.89059 4.54232 4.53991 4.33604 4.24559C4.12976 3.95128 3.83787 3.72762 3.50003 3.605ZM2.9167 5.83333C2.80133 5.83333 2.68854 5.79912 2.59262 5.73502C2.49669 5.67092 2.42192 5.57982 2.37777 5.47323C2.33362 5.36664 2.32207 5.24935 2.34457 5.13619C2.36708 5.02304 2.42264 4.9191 2.50422 4.83752C2.5858 4.75594 2.68974 4.70038 2.8029 4.67787C2.91605 4.65536 3.03334 4.66692 3.13993 4.71107C3.24652 4.75522 3.33762 4.82999 3.40172 4.92591C3.46582 5.02184 3.50003 5.13463 3.50003 5.25C3.50003 5.40471 3.43857 5.55308 3.32918 5.66248C3.21978 5.77187 3.07141 5.83333 2.9167 5.83333Z"
                    fill="currentColor"
                  />
                </svg>
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
                  onReset={resetColumns}
                  onDeselectAll={deselectAllOptionalColumns}
                />
              )}
            </div>
            <button
              type="button"
              onClick={clearAllColumnFilters}
              title="모든 컬럼 필터 초기화"
              className="toolbar-button toolbar-button--tight-gap"
              style={{ width: '104px' }}
            >
              <span className="toolbar-btn-text">필터초기화</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 13 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.9998 6.97426C12.011 8.31822 11.5834 9.62682 10.7861 10.6886C9.98877 11.7504 8.86834 12.5033 7.60586 12.8256C6.34338 13.148 5.0126 13.0209 3.8286 12.4651C2.6446 11.9092 1.67654 10.957 1.08087 9.76225C1.03928 9.68491 1.01307 9.59975 1.00379 9.51179C0.994503 9.42383 1.00233 9.33484 1.0268 9.25005C1.05127 9.16526 1.0919 9.08638 1.14629 9.01805C1.20069 8.94972 1.26775 8.89332 1.34354 8.85217C1.41933 8.81101 1.50232 8.78593 1.58762 8.7784C1.67293 8.77087 1.75883 8.78104 1.84027 8.80831C1.92172 8.83559 1.99706 8.87942 2.06188 8.93722C2.1267 8.99502 2.17969 9.06564 2.21772 9.14491C2.48916 9.67189 2.85539 10.1405 3.29677 10.5256C3.96005 11.1093 4.77313 11.4813 5.63716 11.5963C6.50118 11.7114 7.37893 11.5645 8.16369 11.1736C8.94845 10.7826 9.60643 10.1645 10.0576 9.39432C10.5088 8.62413 10.7338 7.73506 10.7052 6.8352C10.6766 5.93534 10.3956 5.06344 9.8965 4.32552C9.39738 3.5876 8.70157 3.01543 7.89368 2.67858C7.08578 2.34173 6.2006 2.2547 5.34574 2.42809C4.49089 2.60147 3.70318 3.0278 3.07839 3.65523H4.29232C4.46266 3.65523 4.62603 3.72516 4.74648 3.84965C4.86694 3.97414 4.9346 4.14298 4.9346 4.31903C4.9346 4.49509 4.86694 4.66393 4.74648 4.78842C4.62603 4.9129 4.46266 4.98284 4.29232 4.98284H1.72316C1.55281 4.98284 1.38944 4.9129 1.26899 4.78842C1.14854 4.66393 1.08087 4.49509 1.08087 4.31903V1.66381C1.08087 1.48775 1.14854 1.31891 1.26899 1.19442C1.38944 1.06994 1.55281 1 1.72316 1C1.8935 1 2.05687 1.06994 2.17733 1.19442C2.29778 1.31891 2.36545 1.48775 2.36545 1.66381V2.52676C3.19686 1.75821 4.22566 1.25468 5.32778 1.0769C6.42989 0.899131 7.55823 1.05471 8.5767 1.52486C9.59517 1.99502 10.4603 2.75968 11.0677 3.72661C11.675 4.69354 11.9988 5.82144 11.9998 6.97426Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        showFooter={false}
        showHeaderClose={false}
        className="modal--asset-register"
        ariaLabel={editingAssetId ? '자산정보' : '자산등록'}
        customHeaderContent={(() => {
          const editAsset = editingAssetId ? rows.find((r) => r.id === editingAssetId) : null;
          return (
            <div className="modal-header">
              <div
                data-layer="Frame 427319202"
                className="modal-header__row Frame427319202"
                style={{
                  alignSelf: 'stretch',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  display: 'flex',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    data-layer={editingAssetId ? '자산정보' : '자산등록'}
                    style={{
                      justifyContent: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      color: '#1C1C1C',
                      fontSize: 20,
                      fontFamily: 'Pretendard',
                      fontWeight: 700,
                      lineHeight: '30px',
                      wordWrap: 'break-word',
                    }}
                  >
                    {editingAssetId ? '자산정보' : '자산등록'}
                  </div>
                  {editAsset?.plate && (
                    <div
                      style={{
                        paddingLeft: 7,
                        paddingRight: 7,
                        paddingTop: 1,
                        paddingBottom: 1,
                        background: '#FF4B14',
                        borderRadius: 5,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          color: 'white',
                          fontSize: 12,
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          lineHeight: '18px',
                        }}
                      >
                        {editAsset.plate}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  data-svg-wrapper
                  data-layer="Btn_closed"
                  className="BtnClosed"
                  aria-label="닫기"
                  onClick={() => setShowAssetModal(false)}
                  style={{
                    position: 'relative',
                    width: 36,
                    height: 36,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z"
                      fill="#1C1C1C"
                    />
                    <path
                      d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z"
                      fill="#1C1C1C"
                    />
                  </svg>
                </button>
              </div>
              <div className="modal-header__line" />
            </div>
          );
        })()}
      >
        {(() => {
          const current = editingAssetId ? rows.find((r) => r.id === editingAssetId) : {};
          const data = { ...(current || {}), ...(assetFormInitial || {}) };
          return (
            <AssetDialog
              asset={data}
              mode={editingAssetId ? 'edit' : 'create'}
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
        showFooter={false}
        showHeaderClose={false}
        className={
          insuranceReadOnly ? 'modal--asset-register modal--asset-view' : 'modal--asset-register'
        }
        ariaLabel={
          insuranceReadOnly
            ? '보험정보'
            : insuranceAsset?.insuranceExpiryDate || insuranceAsset?.insuranceInfo
              ? '보험 수정'
              : '보험 등록'
        }
        customHeaderContent={
          <div className="modal-header">
            <div
              data-layer="Frame 427319202"
              className="modal-header__row Frame427319202"
              style={{
                alignSelf: 'stretch',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                display: 'flex',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  data-layer={
                    insuranceReadOnly
                      ? '보험정보'
                      : insuranceAsset?.insuranceExpiryDate || insuranceAsset?.insuranceInfo
                        ? '보험 수정'
                        : '보험 등록'
                  }
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#1C1C1C',
                    fontSize: 20,
                    fontFamily: 'Pretendard',
                    fontWeight: 700,
                    lineHeight: '30px',
                    wordWrap: 'break-word',
                  }}
                >
                  {insuranceReadOnly
                    ? '보험정보'
                    : insuranceAsset?.insuranceExpiryDate || insuranceAsset?.insuranceInfo
                      ? '보험 수정'
                      : '보험 등록'}
                </div>
                {insuranceAsset?.plate && (
                  <div
                    style={{
                      paddingLeft: 7,
                      paddingRight: 7,
                      paddingTop: 1,
                      paddingBottom: 1,
                      background: '#FF4B14',
                      borderRadius: 5,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontFamily: 'Pretendard',
                        fontWeight: 600,
                        lineHeight: '18px',
                      }}
                    >
                      {insuranceAsset.plate}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-svg-wrapper
                data-layer="Btn_closed"
                className="BtnClosed"
                aria-label="닫기"
                onClick={closeInsuranceModal}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z"
                    fill="#1C1C1C"
                  />
                  <path
                    d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z"
                    fill="#1C1C1C"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-header__line" />
          </div>
        }
      >
        <InsuranceDialog
          asset={insuranceAsset || {}}
          onClose={closeInsuranceModal}
          onSubmit={handleInsuranceSubmit}
          readOnly={insuranceReadOnly}
          allowEditToggle
        />
      </Modal>

      <Modal
        isOpen={showDeviceModal && activeAsset}
        onClose={() => setShowDeviceModal(false)}
        showFooter={false}
        showHeaderClose={false}
        className={
          deviceReadOnly ? 'modal--asset-register modal--asset-view' : 'modal--asset-register'
        }
        ariaLabel={
          deviceReadOnly ? '단말정보' : activeAsset?.deviceSerial ? '단말 수정' : '단말 등록'
        }
        customHeaderContent={
          <div className="modal-header">
            <div
              data-layer="Frame 427319202"
              className="modal-header__row Frame427319202"
              style={{
                alignSelf: 'stretch',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                display: 'flex',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  data-layer={
                    deviceReadOnly
                      ? '단말정보'
                      : activeAsset?.deviceSerial
                        ? '단말 수정'
                        : '단말 등록'
                  }
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#1C1C1C',
                    fontSize: 20,
                    fontFamily: 'Pretendard',
                    fontWeight: 700,
                    lineHeight: '30px',
                    wordWrap: 'break-word',
                  }}
                >
                  {deviceReadOnly
                    ? '단말정보'
                    : activeAsset?.deviceSerial
                      ? '단말 수정'
                      : '단말 등록'}
                </div>
                {activeAsset?.plate && (
                  <div
                    style={{
                      paddingLeft: 7,
                      paddingRight: 7,
                      paddingTop: 1,
                      paddingBottom: 1,
                      background: '#FF4B14',
                      borderRadius: 5,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontFamily: 'Pretendard',
                        fontWeight: 600,
                        lineHeight: '18px',
                      }}
                    >
                      {activeAsset.plate}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-svg-wrapper
                data-layer="Btn_closed"
                className="BtnClosed"
                aria-label="닫기"
                onClick={() => setShowDeviceModal(false)}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z"
                    fill="#1C1C1C"
                  />
                  <path
                    d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z"
                    fill="#1C1C1C"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-header__line" />
          </div>
        }
      >
        <DeviceInfoDialog
          asset={activeAsset || {}}
          onClose={() => setShowDeviceModal(false)}
          onSubmit={handleDeviceInfoSubmit}
          readOnly={deviceReadOnly}
          allowEditToggle
        />
      </Modal>

      <MemoHistoryModal
        isOpen={showMemoHistoryModal && !!memoHistoryTarget}
        onClose={() => setShowMemoHistoryModal(false)}
        entityType="asset"
        entityId={memoHistoryTarget?.id}
        title={memoHistoryTarget ? `메모 히스토리 - ${memoHistoryTarget.plate}` : undefined}
        currentMemo={memoHistoryTarget?.memo}
      />

      <div className="page-scroll page-scroll--with-sticky-table space-y-4">
        <Table
          wrapRef={tableWrapRef}
          columns={dynamicColumns}
          data={filtered}
          selection={selection}
          emptyMessage="조건에 맞는 차량 자산이 없습니다."
          stickyHeader
          enableColumnFilters={TABLE_COLUMN_FILTERS_ENABLED}
          filters={columnFilters}
          onFiltersChange={(next) => {
            tableFilterState.setFilters(next);
          }}
        />
      </div>

      {/* inline panel removed */}
      <Modal
        isOpen={showInfoModal && infoVehicle}
        onClose={() => setShowInfoModal(false)}
        showFooter={false}
        showHeaderClose={false}
        ariaLabel="자산정보"
        className="modal--asset-register modal--asset-view"
        customHeaderContent={
          <div className="modal-header">
            <div
              data-layer="Frame 427319202"
              className="modal-header__row Frame427319202"
              style={{
                alignSelf: 'stretch',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                display: 'flex',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  data-layer="자산정보"
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#1C1C1C',
                    fontSize: 20,
                    fontFamily: 'Pretendard',
                    fontWeight: 700,
                    lineHeight: '30px',
                    wordWrap: 'break-word',
                  }}
                >
                  자산정보
                </div>
                {infoVehicle?.plate && (
                  <div
                    style={{
                      paddingLeft: 7,
                      paddingRight: 7,
                      paddingTop: 1,
                      paddingBottom: 1,
                      background: '#FF4B14',
                      borderRadius: 5,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontFamily: 'Pretendard',
                        fontWeight: 600,
                        lineHeight: '18px',
                      }}
                    >
                      {infoVehicle.plate}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-svg-wrapper
                data-layer="Btn_closed"
                className="BtnClosed"
                aria-label="닫기"
                onClick={() => setShowInfoModal(false)}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z"
                    fill="#1C1C1C"
                  />
                  <path
                    d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z"
                    fill="#1C1C1C"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-header__line" />
          </div>
        }
      >
        <div className="asset-view-layout">
          <div className="asset-view-main">
            <AssetDialog
              asset={infoVehicle?.asset || {}}
              mode="edit"
              onClose={() => setShowInfoModal(false)}
              requireDocs={false}
            />
          </div>
          {infoVehicle?.rental && (
            <section className="asset-view-side card card-padding">
              <h3 className="section-title section-margin-0">대여 정보</h3>
              <InfoGrid
                items={[
                  { key: 'rentalId', label: '계약번호', value: infoVehicle?.rental?.rentalId },
                  { key: 'renterName', label: '대여자', value: infoVehicle?.rental?.renterName },
                  { key: 'contact', label: '연락처', value: infoVehicle?.rental?.contactNumber },
                  { key: 'address', label: '주소', value: infoVehicle?.rental?.address },
                  {
                    key: 'period',
                    label: '대여 기간',
                    value: infoVehicle?.rental?.rentalPeriod,
                    type: 'dateRange',
                  },
                  { key: 'insurance', label: '보험사', value: infoVehicle?.rental?.insuranceName },
                  {
                    key: 'rentalLocation',
                    label: '대여 위치',
                    value: infoVehicle?.rental?.rentalLocation,
                    type: 'location',
                  },
                  {
                    key: 'returnLocation',
                    label: '반납 위치',
                    value: infoVehicle?.rental?.returnLocation,
                    type: 'location',
                  },
                  {
                    key: 'currentLocation',
                    label: '현재 위치',
                    value: infoVehicle?.rental?.currentLocation,
                    type: 'location',
                  },
                ]}
              />
            </section>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showDiagnosticModal && diagnosticDetail}
        onClose={() => setShowDiagnosticModal(false)}
        className="!w-[410px] !max-w-[410px] !h-[800px] !p-[40px] !overflow-hidden flex flex-col"
        customHeaderContent={
          <div className="modal-header" style={{ width: '100%' }}>
            <div
              data-layer="Frame 427319202"
              className="modal-header__row Frame427319202"
              style={{
                alignSelf: 'stretch',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                display: 'flex',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  data-layer="진단코드상세"
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#1C1C1C',
                    fontSize: 20,
                    fontFamily: 'Pretendard',
                    fontWeight: 700,
                    lineHeight: '30px',
                    wordWrap: 'break-word',
                  }}
                >
                  진단코드상세
                </div>
                {diagnosticDetail?.vehicleInfo?.plate && (
                  <div
                    style={{
                      paddingLeft: 7,
                      paddingRight: 7,
                      paddingTop: 1,
                      paddingBottom: 1,
                      background: '#FF4B14',
                      borderRadius: 5,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontFamily: 'Pretendard',
                        fontWeight: 600,
                        lineHeight: '18px',
                      }}
                    >
                      {diagnosticDetail.vehicleInfo.plate}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-svg-wrapper
                data-layer="Btn_closed"
                className="BtnClosed"
                aria-label="닫기"
                onClick={() => setShowDiagnosticModal(false)}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z"
                    fill="#1C1C1C"
                  />
                  <path
                    d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z"
                    fill="#1C1C1C"
                  />
                </svg>
              </button>
            </div>
          </div>
        }
        showFooter={false}
        ariaLabel="진단 코드 상세 정보"
      >
        {diagnosticDetail && (
          <div className="flex flex-col w-full h-full">
            {/* Divider below header */}
            <div className="w-full border-t-2 border-[#1C1C1C] my-[15px] shrink-0"></div>

            <div className="shrink-0 flex justify-center">
              <DiagnosticHero vehicleName={diagnosticDetail.vehicleInfo.vehicleType} />
            </div>

            <div className="mb-6 text-left w-full shrink-0">
              <span className="text-[#1C1C1C] text-[14px] leading-[24px]">총 </span>
              <span className="text-[#006CEC] text-[14px] font-bold leading-[24px]">
                {' '}
                {diagnosticDetail.count}개{' '}
              </span>
              <span className="text-[#1C1C1C] text-[14px] leading-[24px]">
                의 진단 코드가 발견되었습니다.
              </span>
            </div>

            {diagnosticDetail.issues.length > 0 ? (
              <div className="flex flex-col flex-1 min-h-0 w-full mb-6">
                <div className="grid grid-cols-[1fr_2fr_1fr_1.5fr] text-center text-[12px] font-semibold text-[#1C1C1C] leading-[18px] h-[40px] items-center bg-[#FAFAFA] border-y border-[rgba(0,0,0,0.1)] shrink-0">
                  <div>코드</div>
                  <div className="text-left pl-1">내용</div>
                  <div>심각도</div>
                  <div>발생일</div>
                </div>
                <div className="overflow-y-auto max-h-[360px]">
                  {diagnosticDetail.issues.map((issue, idx) => (
                    <div
                      key={`${issue?.id ?? issue?.code ?? 'issue'}-${idx}`}
                      className="grid grid-cols-[1fr_2fr_1fr_1.5fr] items-center text-center py-3 border-b border-[rgba(0,0,0,0.05)] last:border-0 min-h-[40px]"
                    >
                      <div className="text-[#1C1C1C] text-[12px] font-semibold leading-[18px]">
                        {issue.code}
                      </div>
                      <div
                        className="text-[#1C1C1C] text-[12px] font-semibold leading-[18px] truncate px-1 text-left"
                        title={issue.description}
                      >
                        {issue.description}
                      </div>
                      <div className="flex justify-center">
                        {(() => {
                          const val = severityNumber(issue.severity);
                          const cls = severityClass(val);
                          const colors = {
                            low: { bg: '#EFFBE7', text: '#0CA255' },
                            medium: { bg: '#FFF3DB', text: '#FF9909' },
                            high: { bg: '#FAE6E5', text: '#E91700' },
                          };
                          const c = colors[cls] || colors.low;
                          return (
                            <div
                              style={{ backgroundColor: c.bg, color: c.text }}
                              className="rounded-[3px] px-1.5 py-1 min-w-[30px] text-[12px] font-semibold leading-[16px] flex items-center justify-center"
                            >
                              {val.toFixed(1)}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-[#1C1C1C] text-[12px] font-medium leading-[18px]">
                        {issue.detectedDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1"></div>
            )}

            {/* Divider above close button - pushed to bottom by mt-auto */}
            <div className="mt-auto w-full border-t-2 border-[#1C1C1C] my-[15px] shrink-0"></div>

            <button
              onClick={() => setShowDiagnosticModal(false)}
              className="w-full bg-[#ECECEC] rounded-[100px] py-[14px] text-[#1C1C1C] text-[14px] font-medium leading-[24px] hover:bg-gray-200 transition-colors border-none outline-none shrink-0"
            >
              닫기
            </button>
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
        <RentalForm
          initial={rentalFormInitial}
          onSubmit={handleRentalCreateSubmit}
          formId="asset-rental-create"
        />
      </Modal>

      {/* Device installation application modal */}
      <TerminalRequestModal isOpen={installModalOpen} onClose={closeInstallModal} />
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
