import React, { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  fetchRentals,
  fetchRentalsSummary,
  fetchRentalById,
  fetchRentalTransitions,
  fetchRentalAccidentDetail,
  transitionRentalState,
  updateRental,
  createRental,
  deleteRental,
  fetchAssets,
  fetchRentalLocation,
  sendFax,
} from '../api';
import RentalForm from '../components/forms/RentalForm';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import Table from '../components/Table';
import useTableFilters from '../hooks/useTableFilters';
import { applyColumnFilters } from '../utils/filtering';
import { TABLE_COLUMN_FILTERS_ENABLED } from '../constants/featureFlags';
import AccidentInfoModal from '../components/modals/AccidentInfoModal';
import CurrentLocationModal from '../components/modals/CurrentLocationModal';
import RentalCreateModal from '../components/modals/RentalCreateModal';
import FaxSendPanel from '../components/FaxSendPanel';
import useTableSelection from '../hooks/useTableSelection';
import StatusBadge from '../components/badges/StatusBadge';
import { FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import VideoIcon from '../components/VideoIcon';
import UploadProgress from '../components/UploadProgress';
import { FiAlertTriangle } from 'react-icons/fi';
import MemoHistoryModal from '../components/modals/MemoHistoryModal';
import TerminalRequestModal from '../components/modals/TerminalRequestModal';
import {
  MemoCell,
  CompanyCell,
  PlateCell,
  RentalPeriodCell,
  RentalAmountCell,
} from '../components/cells';
import useMemoEditor from '../hooks/useMemoEditor';
import { computeContractStatus } from '../utils/contracts';
// (unused constants/uploads imports removed)
import { uploadMany } from '../utils/uploadHelpers';
import { parseCurrency, formatCurrencyDisplay, formatNumberDisplay } from '../utils/formatters';
import { formatDisplayDate } from '../utils/date';
import { formatYyMmDdHhMmSs } from '../utils/datetime';
import FilePreview from '../components/FilePreview';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/auth';
import useColumnSettings from '../hooks/useColumnSettings';
import { VehicleTypeText } from '../components/cells';
import ColumnSettingsMenu from '../components/ColumnSettingsMenu';
import useAccidentReport from '../hooks/useAccidentReport';
import { emitToast } from '../utils/toast';
import VehicleTypeYearFilter from '../components/filters/VehicleTypeYearFilter';
import {
  CONTRACT_STATUSES,
  CONTRACT_TERMINAL_STATUSES,
  CONTRACT_STATUS_BADGE_TYPE,
  getContractActionLabel,
  normalizeContractStatus,
} from '../constants/contractState';

const DEFAULT_COLUMN_CONFIG = [
  { key: 'select', label: '선택', visible: true, required: true, width: 60 },
  { key: 'rentalAmount', label: '대여금액', visible: true, required: false, width: 160 },
  { key: 'plate', label: '차량번호', visible: true, required: true, width: 100 },
  { key: 'vehicleType', label: '차종', visible: true, required: false, width: 140 },
  { key: 'renterName', label: '예약자명', visible: true, required: false, width: 80 },
  { key: 'rentalPeriod', label: '예약기간', visible: true, required: false, width: 200 },
  { key: 'contractStatus', label: '계약상태', visible: true, required: false, width: 90 },
  { key: 'stateActions', label: '상태전환', visible: true, required: false, width: 220 },
  { key: 'engineStatus', label: '엔진상태', visible: true, required: false, width: 80 },
  { key: 'restartBlocked', label: '재시동금지', visible: true, required: false, width: 90 },
  { key: 'accident', label: '사고등록', visible: true, required: false, width: 90 },
  { key: 'memo', label: '메모', visible: true, required: false, width: 220 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTE_SECOND_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0')
);
const TRAIL_INITIAL_LIMIT = 100;
const TRAIL_INCREMENT = 100;
const TRAIL_MAX_LIMIT = 1000;

// Column merging is handled by useColumnSettings hook

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

function findLatestLogLocation(logRecord = []) {
  if (!Array.isArray(logRecord) || logRecord.length === 0) return null;
  let latest = null;
  let latestTs = -Infinity;
  let latestIdx = -1;

  for (let i = 0; i < logRecord.length; i++) {
    const entry = logRecord[i];
    const latRaw = entry?.lat ?? entry?.latitude;
    const lngRaw = entry?.lng ?? entry?.longitude;
    const lat = typeof latRaw === 'string' ? Number(latRaw) : latRaw;
    const lng = typeof lngRaw === 'string' ? Number(lngRaw) : lngRaw;
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
    const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kst.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // 2단계: 파싱이 안 되면 문자열에서 날짜 패턴(YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD) 추출
  const match = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (match) {
    const year = match[1];
    const month = String(match[2]).padStart(2, '0');
    const day = String(match[3]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

function formatTrackingDateLabel(key) {
  if (!key || typeof key !== 'string') return key;
  const parts = key.split('-');
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
  const {
    editingId: editingMemo,
    memoText,
    onEdit: onMemoEdit,
    onChange: onMemoChange,
    onCancel: onMemoCancel,
  } = useMemoEditor();
  const [showMemoHistoryModal, setShowMemoHistoryModal] = useState(false);
  const [memoHistoryTarget, setMemoHistoryTarget] = useState(null); // { id, plate or renterName }
  const [workflowAction, setWorkflowAction] = useState('');
  const [workflowPayload, setWorkflowPayload] = useState({
    requestedEndDate: '',
    reason: '',
    documentsVerified: false,
    paymentReceived: false,
    depositCollected: false,
    mileageAtHandover: '',
    handoverNotes: '',
    exteriorCheck: false,
    interiorCheck: false,
    mileageRecorded: false,
    fuelLevelRecorded: false,
    settlementCompleted: false,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
  const { columns, visibleColumns, toggleColumnVisibility, moveColumn, resetColumns, deselectAllOptionalColumns } =
    useColumnSettings({
      storageKey: 'rental-columns-settings',
      defaultColumns: DEFAULT_COLUMN_CONFIG,
    });
  const [toast, setToast] = useState(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const openInstallModal = () => setInstallModalOpen(true);
  const closeInstallModal = () => setInstallModalOpen(false);
  const [hasDeviceByPlate, setHasDeviceByPlate] = useState({});
  const [accidentRegTab, setAccidentRegTab] = useState('blackbox'); // "blackbox" | "fax"
  const [faxNumber, setFaxNumber] = useState('');
  const [faxReceiverName, setFaxReceiverName] = useState('');
  const [faxTitle, setFaxTitle] = useState('');
  const [faxFiles, setFaxFiles] = useState([]);
  const [faxSending, setFaxSending] = useState(false);

  // FAX 번호 검증 (BE와 동일한 규칙: 9-11자리 숫자)
  const validateFaxNumber = (faxNum) => {
    if (!faxNum) return { valid: false, message: "수신자 번호를 입력하세요." };
    const digitsOnly = faxNum.replace(/[^0-9]/g, "");
    if (digitsOnly.length < 9) {
      return { valid: false, message: "FAX 번호가 너무 짧습니다. (최소 9자리 필요)" };
    }
    if (digitsOnly.length > 11) {
      return { valid: false, message: "FAX 번호가 너무 깁니다. (최대 11자리)" };
    }
    return { valid: true, normalized: digitsOnly };
  };

  // FAX 발송 핸들러
  const handleSendFax = async () => {
    const validation = validateFaxNumber(faxNumber.trim());
    if (!validation.valid) {
      setToast({ type: 'warning', message: validation.message });
      return;
    }
    if (!faxFiles.length) {
      setToast({ type: 'warning', message: '첨부할 파일을 추가하세요.' });
      return;
    }
    setFaxSending(true);
    try {
      const files = faxFiles.map((f) => ({ fileName: f.name }));
      const resp = await sendFax({
        receiverNum: faxNumber.trim(),
        receiverName: faxReceiverName.trim() || undefined,
        title: faxTitle.trim() || undefined,
        files,
      });
      const receipt = resp?.receiptNum || resp?.data?.receiptNum;
      const testMode = Boolean(resp?.testMode || resp?.data?.testMode);
      const suffix = testMode ? " (테스트 모드)" : "";
      setToast({ type: 'success', message: `팩스 전송 요청 완료: ${receipt || "접수됨"}${suffix}` });
      setFaxNumber('');
      setFaxReceiverName('');
      setFaxTitle('');
      setFaxFiles([]);
    } catch (e) {
      const msg = e?.message || "팩스 전송 실패";
      setToast({ type: 'error', message: msg });
    } finally {
      setFaxSending(false);
    }
  };

  const payloadActions = new Set([
    'request_extension',
    'handover',
    'complete_inspection',
  ]);

  const extractTransitionPayload = (action) => {
    if (action === 'request_extension') {
      return {
        requestedEndDate: workflowPayload.requestedEndDate || undefined,
        reason: workflowPayload.reason || undefined,
      };
    }
    if (action === 'handover') {
      return {
        documentsVerified: Boolean(workflowPayload.documentsVerified),
        paymentReceived: Boolean(workflowPayload.paymentReceived),
        depositCollected: Boolean(workflowPayload.depositCollected),
        mileageAtHandover:
          workflowPayload.mileageAtHandover === ''
            ? undefined
            : Number(workflowPayload.mileageAtHandover),
        handoverNotes: workflowPayload.handoverNotes || undefined,
      };
    }
    if (action === 'complete_inspection') {
      return {
        exteriorCheck: Boolean(workflowPayload.exteriorCheck),
        interiorCheck: Boolean(workflowPayload.interiorCheck),
        mileageRecorded: Boolean(workflowPayload.mileageRecorded),
        fuelLevelRecorded: Boolean(workflowPayload.fuelLevelRecorded),
        settlementCompleted: Boolean(workflowPayload.settlementCompleted),
      };
    }
    return {};
  };

  const resetWorkflowState = () => {
    setWorkflowAction('');
    setWorkflowPayload({
      requestedEndDate: '',
      reason: '',
      documentsVerified: false,
      paymentReceived: false,
      depositCollected: false,
      mileageAtHandover: '',
      handoverNotes: '',
      exteriorCheck: false,
      interiorCheck: false,
      mileageRecorded: false,
      fuelLevelRecorded: false,
      settlementCompleted: false,
    });
  };

  const selectedContractTrackingData = selectedContract?.logRecord || [];
  const trackingDateKeys = useMemo(() => {
    if (!Array.isArray(selectedContractTrackingData) || selectedContractTrackingData.length === 0)
      return [];
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
      return [];
    }
    if (!Array.isArray(trackingDateFilters) || trackingDateFilters.length === 0) {
      return [];
    }
    const allowed = new Set(trackingDateFilters);
    const filtered = selectedContractTrackingData.filter((entry) => {
      const key = extractLogDateKey(entry);
      return key && allowed.has(key);
    });
    return filtered;
  }, [selectedContractTrackingData, trackingDateFilters]);
  const hasSelectedTrackingData =
    Array.isArray(filteredTrackingData) && filteredTrackingData.length > 0;
  const latestSelectedTracking = findLatestLogLocation(selectedContractTrackingData);
  const mapLastUpdateTime =
    selectedContract?.locationUpdatedAt || latestSelectedTracking?.rawTime || '업데이트 시간 없음';
  const speedLegendItems = [
    { key: 'slow', label: '저속 <30', color: '#43A047', bg: 'rgba(67, 160, 71, 0.16)' },
    { key: 'mid', label: '중속 30-80', color: '#1E88E5', bg: 'rgba(30, 136, 229, 0.16)' },
    { key: 'fast', label: '고속 >80', color: '#E53935', bg: 'rgba(229, 57, 53, 0.14)' },
  ];

  const normalizePlate = (p) => (p ? String(p).replace(/\s|-/g, '').toUpperCase() : '');
  const computeHasDevice = (r, plateMap) => {
    const norm = normalizePlate(r?.plate);
    const mapHit = norm ? !!plateMap[norm] : false;
    const engineKnown = r?.engineStatus != null && String(r.engineStatus).length > 0;
    const loc = r?.currentLocation;
    const locKnown = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
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
        console.error('Failed to load rentals', e);
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
            map[plate] = !!a?.deviceSerial;
          }
        }
        setHasDeviceByPlate(map);
      } catch (e) {
        console.warn('Failed to load assets for device mapping', e);
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
      if (showColumnDropdown && !event.target.closest('[data-column-dropdown]')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnDropdown]);

  useEffect(() => {
    if (!showDetail) {
      resetWorkflowState();
    }
  }, [showDetail]);

  const rows = useMemo(() => {
    const enriched = items.map((r) => {
      const status = computeContractStatus(r);
      const isLongTerm = (r.rentalDurationDays || 0) > 30;
      const hasUnpaid = (r.unpaidAmount || 0) > 0;
      const hasDevice = computeHasDevice(r, hasDeviceByPlate);
      return {
        ...r,
        contractStatus: status,
        allowedActions: Array.isArray(r?.allowedActions) ? r.allowedActions : [],
        stateHistory: Array.isArray(r?.stateHistory) ? r.stateHistory : [],
        isLongTerm,
        hasUnpaid,
        engineOn: r.engineStatus === 'on',
        restartBlocked: Boolean(r.restartBlocked),
        memo: r.memo || '',
        hasDevice,
      };
    });
    return enriched.sort((a, b) => {
      const aTerminal = CONTRACT_TERMINAL_STATUSES.has(normalizeContractStatus(a.contractStatus));
      const bTerminal = CONTRACT_TERMINAL_STATUSES.has(normalizeContractStatus(b.contractStatus));
      if (aTerminal !== bTerminal) return aTerminal ? 1 : -1;
      const aStart = a?.rentalPeriod?.start ? new Date(a.rentalPeriod.start).getTime() : 0;
      const bStart = b?.rentalPeriod?.start ? new Date(b.rentalPeriod.start).getTime() : 0;
      return bStart - aStart;
    });
  }, [items, hasDeviceByPlate]);

  const tableFilterState = useTableFilters({ storageKey: 'rental-table-filters' });
  const { filters: columnFilters } = tableFilterState;

  const {
    selected,
    toggleSelect,
    toggleSelectAllVisible,
    selectedCount,
    allVisibleSelected,
    clearSelection,
  } = useTableSelection(rows, 'rentalId');

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    const ok = await confirm({
      title: '선택 삭제',
      message: '선택한 항목을 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '취소',
    });
    if (!ok) return;
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => deleteRental(id).catch(() => false)));
    } catch (e) {
      console.error('Failed deleting some rentals', e);
    }
    setItems((prev) => prev.filter((r) => !selected.has(r.rentalId)));
    clearSelection();
  };

  const handleCreateSubmit = async (data) => {
    const { contractFile, driverLicenseFile, ...rest } = data || {};
    const toArray = (val) => (Array.isArray(val) ? val : val instanceof File ? [val] : []);
    const contractFiles = toArray(contractFile);
    const licenseFiles = toArray(driverLicenseFile);

    const payload = {
      ...rest,
      rentalAmount: parseCurrency(rest.rentalAmount),
      deposit: parseCurrency(rest.deposit),
      rentalPeriod: { start: rest.start || '', end: rest.end || '' },
    };
    let created = null;
    try {
      created = await createRental(payload);
    } catch (e) {
      console.error('Failed to create rental via API', e);
      emitToast('계약 생성에 실패했습니다.', 'error');
      return;
    }

    // Upload docs after rental creation (needs rentalId)
    if (created && (contractFiles.length > 0 || licenseFiles.length > 0)) {
      console.groupCollapsed('[upload-ui] rental create docs start');
      try {
        const rentalId = created.rentalId || rest.rentalId;
        const base = `rentals/${rentalId}`;
        const [contractRes, licenseRes] = await Promise.all([
          uploadMany(contractFiles, { folder: `${base}/contracts`, label: 'contracts' }),
          uploadMany(licenseFiles, { folder: `${base}/licenses`, label: 'licenses' }),
        ]);
        if (contractRes.names.length > 0 || licenseRes.names.length > 0) {
          const patch = {};
          if (contractRes.names.length > 0) {
            patch.contractDocNames = contractRes.names;
            if (contractRes.urls.length > 0) patch.contractDocUrls = contractRes.urls;
            if (contractRes.objects.length > 0)
              patch.contractDocGcsObjectNames = contractRes.objects;
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
          await updateRental(created.rentalId, patch).catch((e) =>
            console.warn('Failed to patch rental with doc URLs', e)
          );
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
    setSelectedContract({ ...contract, contractStatus: computeContractStatus(contract) });
    resetWorkflowState();
    setShowDetail(true);
    (async () => {
      try {
        const full = await fetchRentalById(contract.rentalId);
        const transitions = await fetchRentalTransitions(contract.rentalId).catch(() => null);
        let merged = {
          ...contract,
          ...full,
          ...(transitions || {}),
          contractStatus: computeContractStatus({ ...contract, ...full, ...(transitions || {}) }),
          allowedActions: Array.isArray(transitions?.allowedActions)
            ? transitions.allowedActions
            : Array.isArray(full?.allowedActions)
              ? full.allowedActions
              : Array.isArray(contract?.allowedActions)
                ? contract.allowedActions
                : [],
          stateHistory: Array.isArray(transitions?.stateHistory)
            ? transitions.stateHistory
            : Array.isArray(full?.stateHistory)
              ? full.stateHistory
              : Array.isArray(contract?.stateHistory)
                ? contract.stateHistory
                : [],
        };

        // 사고 정보가 있으면 상세 사고 정보도 가져옴
        if (merged.accidentReported) {
          try {
            const accidentDetail = await fetchRentalAccidentDetail(contract.rentalId);
            if (accidentDetail && accidentDetail.accidentReport) {
              merged = { ...merged, accidentReport: accidentDetail.accidentReport };
            }
          } catch (accidentErr) {
            console.warn('Failed to load accident details', accidentErr);
          }
        }

        setSelectedContract((prev) => {
          if (!prev || prev.rentalId !== contract.rentalId) return prev;
          return merged;
        });
        setItems((prev) =>
          prev.map((it) => (String(it.rentalId) === String(contract.rentalId) ? { ...it, ...merged } : it))
        );
      } catch (e) {
        console.error('Failed to load rental details', e);
      }
    })();
  };

  const refreshRental = async (rentalId) => {
    const [full, transitions] = await Promise.all([
      fetchRentalById(rentalId),
      fetchRentalTransitions(rentalId).catch(() => null),
    ]);
    const merged = {
      ...full,
      ...(transitions || {}),
      contractStatus: computeContractStatus({ ...full, ...(transitions || {}) }),
      allowedActions: Array.isArray(transitions?.allowedActions)
        ? transitions.allowedActions
        : Array.isArray(full?.allowedActions)
          ? full.allowedActions
          : [],
      stateHistory: Array.isArray(transitions?.stateHistory)
        ? transitions.stateHistory
        : Array.isArray(full?.stateHistory)
          ? full.stateHistory
          : [],
    };
    setItems((prev) =>
      prev.map((it) => (String(it.rentalId) === String(rentalId) ? { ...it, ...merged } : it))
    );
    setSelectedContract((prev) =>
      prev && String(prev.rentalId) === String(rentalId) ? { ...prev, ...merged } : prev
    );
    return merged;
  };

  const handleToggleRestart = async (rentalId) => {
    const target = rows.find((r) => String(r.rentalId) === String(rentalId));
    const next = !target?.restartBlocked;
    try {
      await updateRental(rentalId, { restartBlocked: next });
      // Update list
      setItems((prev) =>
        prev.map((item) =>
          String(item.rentalId) === String(rentalId) ? { ...item, restartBlocked: next } : item
        )
      );
      // Update detail panel if same contract is open
      setSelectedContract((prev) =>
        prev && String(prev.rentalId) === String(rentalId)
          ? { ...prev, restartBlocked: next }
          : prev
      );
    } catch (e) {
      console.error('Failed to update restart flag', e);
      emitToast('재시동 금지 상태 변경 실패', 'error');
    }
  };

  const executeTransition = async (rentalId, action, payload = {}) => {
    try {
      await transitionRentalState(rentalId, action, payload);
      await refreshRental(rentalId);
      emitToast(`${getContractActionLabel(action)} 완료`, 'success');
      resetWorkflowState();
      return true;
    } catch (e) {
      const errorType = e?.errorType || e?.type || e?.data?.error?.type;
      if (errorType === 'CONFLICT') {
        await refreshRental(rentalId).catch(() => null);
        emitToast('상태가 이미 변경되었습니다. 최신 상태를 확인 후 다시 시도해주세요.', 'warning');
        return false;
      }
      if (errorType === 'INVALID_TRANSITION') {
        await refreshRental(rentalId).catch(() => null);
        emitToast('현재 상태에서 허용되지 않는 전환입니다.', 'warning');
        return false;
      }
      emitToast(e?.message || '상태 전환에 실패했습니다.', 'error');
      return false;
    }
  };

  const handleStateAction = async (row, action) => {
    if (!row?.rentalId || !action) return;
    if (payloadActions.has(action)) {
      handlePlateClick(row);
      setWorkflowAction(action);
      return;
    }
    if (action === 'cancel' || action === 'no_show') {
      const ok = await confirm({
        title: '상태 전환',
        message: `${getContractActionLabel(action)} 처리하시겠습니까?`,
        confirmText: '실행',
        cancelText: '취소',
      });
      if (!ok) return;
    }
    await executeTransition(row.rentalId, action);
  };

  const handleMemoEdit = (rentalId, currentMemo) => onMemoEdit(rentalId, currentMemo);
  const handleMemoSave = async (rentalId, newText) => {
    try {
      const resp = await updateRental(rentalId, { memo: newText });
      setItems((prev) =>
        prev.map((item) => (item.rentalId === rentalId ? { ...item, memo: newText } : item))
      );
      if (resp == null) {
        setToast({ message: '메모가 저장되었습니다.', type: 'success' });
      }
      onMemoCancel();
    } catch (e) {
      console.error('Failed to save memo', e);
      emitToast('메모 저장 실패', 'error');
    }
  };
  const handleMemoCancel = () => onMemoCancel();

  const applyLocationData = (locationData) => {
    setSelectedContract((prev) => {
      if (!prev) return prev;
      const logRecord = locationData.logRecord || locationData.track || locationData.trail || [];
      const latestTrail = findLatestLogLocation(logRecord);
      const normalizedCurrent = (() => {
        const loc =
          locationData.currentLocation || locationData.location || prev.currentLocation || null;
        if (loc) {
          const latRaw = loc.lat ?? loc.latitude;
          const lngRaw = loc.lng ?? loc.longitude;
          const lat = typeof latRaw === 'string' ? Number(latRaw) : latRaw;
          const lng = typeof lngRaw === 'string' ? Number(lngRaw) : lngRaw;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { ...loc, lat, lng };
          }
        }
        // Fallback: if API didn't give a current location, use latest trail point
        if (latestTrail) {
          return { lat: latestTrail.lat, lng: latestTrail.lng, source: 'logRecord' };
        }
        return null;
      })();
      const updatedAt =
        locationData.locationUpdatedAt ||
        locationData.updatedAt ||
        prev.locationUpdatedAt ||
        latestTrail?.rawTime ||
        null;
      const resolvedAddress =
        locationData.currentLocation?.address ||
        locationData.location?.address ||
        prev?.currentLocation?.address;

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
        trail: true, // 궤적 데이터 포함
        limit: initialLimit, // 최대 100개의 포인트
      });

      if (!locationData) {
        emitToast('현재 위치 정보를 가져올 수 없습니다.', 'warning');
        return;
      }

      applyLocationData(locationData);
      setTrailLimit(initialLimit);
      setShowDetail(false);
      setShowLocationMap(true);
    } catch (error) {
      console.error('Failed to fetch rental location', error);
      emitToast('현재 위치 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLoadMoreTrail = async () => {
    if (!selectedContract) return;
    const currentLimit = trailLimit || TRAIL_INITIAL_LIMIT;
    if (currentLimit >= TRAIL_MAX_LIMIT) {
      emitToast('이동 경로를 최대로 불러왔습니다.', 'info');
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
        emitToast('추가 이동 경로를 가져올 수 없습니다.', 'warning');
        return;
      }
      applyLocationData(locationData);
      setTrailLimit(nextLimit);
      if (nextLimit === TRAIL_MAX_LIMIT) {
        emitToast('이동 경로를 최대로 불러왔습니다.', 'info');
      }
    } catch (error) {
      console.error('Failed to fetch extended trail', error);
      emitToast('추가 이동 경로 요청 중 오류가 발생했습니다.', 'error');
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
        const existing =
          document.querySelector(`script[src="${src}"]`) ||
          document.querySelector("script[src*='dapi.kakao.com']");
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
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Kakao Maps SDK load failed'));
        document.head.appendChild(script);
      }).then(
        () =>
          new Promise((resolve) => {
            try {
              if (
                window.kakao &&
                window.kakao.maps &&
                typeof window.kakao.maps.load === 'function'
              ) {
                window.kakao.maps.load(() => resolve());
              } else {
                resolve();
              }
            } catch {
              resolve();
            }
          })
      );
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
              return {
                ...prev,
                currentLocation: { ...prev.currentLocation, address: '주소 확인 실패' },
              };
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
            const addr = result[0].address?.address_name || '';
            if (addr) {
              applyAddress(addr);
              return;
            }
          }
          // Region-level fallback
          geocoder.coord2RegionCode(lng, lat, (regionResult, regionStatus) => {
            if (cancelled) return;
            if (
              regionStatus === window.kakao.maps.services.Status.OK &&
              regionResult &&
              regionResult[0]
            ) {
              const addr = regionResult[0].address_name || '';
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

    return () => {
      cancelled = true;
    };
  }, [showDetail, selectedContract?.currentLocation?.lat, selectedContract?.currentLocation?.lng]);

  // Column settings handled by useColumnSettings hook

  // Derive columns for rendering; inject company column for super-admin after 'rentalAmount'
  const columnsForRender = useMemo(() => {
    const base = [...visibleColumns];
    if (isSuperAdmin) {
      const hasCompany = base.some((c) => c.key === 'company');
      if (!hasCompany) {
        // Insert after 'rentalAmount', before 'plate'
        const rentalAmountIdx = base.findIndex((c) => c.key === 'rentalAmount');
        const insertIndex =
          rentalAmountIdx >= 0
            ? rentalAmountIdx + 1
            : Math.max(
                0,
                base.findIndex((c) => c.key === 'plate')
              );
        const colDef = {
          key: 'company',
          label: '회사',
          visible: true,
          required: false,
          width: 120,
          sortable: true,
        };
        if (insertIndex >= 0) base.splice(insertIndex, 0, colDef);
        else base.unshift(colDef);
      }
    }
    return base;
  }, [visibleColumns, isSuperAdmin]);

  // Sorting is now handled by Table component - sortAccessor provides custom value extraction

  // 동적 컬럼 생성
  const dynamicColumns = useMemo(
    () =>
      columnsForRender
        .filter((col) => col.key !== 'select') // Table 컴포넌트가 자동으로 select 추가
        .map((col) => ({
          ...col,
          style: {
            textAlign: 'center',
            ...(col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {}),
            ...(col.key === 'memo' ? { maxWidth: '150px' } : {}),
          },
          render: (row) => renderCellContent(col, row),
          sortAccessor: (row) => {
            // Custom sort value extraction for each column
            switch (col.key) {
              case 'company':
                return row?.companyName || row?.company || row?.companyId || '';
              case 'rentalPeriod':
                return row?.rentalPeriod?.start || '';
              case 'rentalAmount': {
                const v = row?.rentalAmount;
                if (typeof v === 'number') return v;
                if (typeof v === 'string') {
                  const n = Number(v.replace(/[^0-9.-]/g, ''));
                  return Number.isNaN(n) ? 0 : n;
                }
                return 0;
              }
              case 'engineStatus':
                return row?.engineStatus === 'on' || !!row?.engineOn;
              case 'restartBlocked':
                return !!row?.restartBlocked;
              case 'accident':
                return !!row?.accidentReported;
              default:
                return row?.[col.key] ?? '';
            }
          },
          // Filter meta and accessors per column
          ...(col.key === 'company'
            ? {
                filterType: 'select',
                filterAccessor: (row) => row?.companyName || row?.company || row?.companyId || '',
              }
            : null),
          ...(col.key === 'plate' ? { filterType: 'text' } : null),
          ...(col.key === 'vehicleType'
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
          ...(col.key === 'renterName' ? { filterType: 'text' } : null),
          ...(col.key === 'rentalPeriod'
            ? {
                filterType: 'date-range',
                // 기준: end
                filterAccessor: (row) => row?.rentalPeriod?.end || '',
              }
            : null),
          ...(col.key === 'rentalAmount'
            ? {
                filterType: 'custom',
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
                  if (f.min != null && f.min !== '' && (amt == null || amt < Number(f.min)))
                    return false;
                  if (f.max != null && f.max !== '' && (amt == null || amt > Number(f.max)))
                    return false;
                  const sel = Array.isArray(f.durations) ? f.durations : [];
                  if (sel.length === 0) return true;
                  const isLong = Boolean(row?.isLongTerm);
                  const matchShort = sel.includes('short') && !isLong;
                  const matchLong = sel.includes('long') && isLong;
                  return matchShort || matchLong;
                },
                renderCustomFilter: ({ value, onChange }) => {
                  const val =
                    value && value.type === 'custom'
                      ? value
                      : { type: 'custom', min: '', max: '', durations: [] };
                  const has = (k) => Array.isArray(val.durations) && val.durations.includes(k);
                  const toggle = (k) => {
                    const curr = Array.isArray(val.durations) ? val.durations : [];
                    const next = has(k) ? curr.filter((x) => x !== k) : [...curr, k];
                    onChange({ ...val, durations: next });
                  };
                  return (
                    <div className="space-y-2">
                      <div className="filter-row">
                        <input
                          type="number"
                          className="filter-input"
                          placeholder="최소 금액"
                          value={val.min ?? ''}
                          onChange={(e) => onChange({ ...val, min: e.target.value })}
                        />
                        <span className="filter-sep">~</span>
                        <input
                          type="number"
                          className="filter-input"
                          placeholder="최대 금액"
                          value={val.max ?? ''}
                          onChange={(e) => onChange({ ...val, max: e.target.value })}
                        />
                      </div>
                      <div>
                        <div className="filter-label" style={{ marginBottom: 4 }}>
                          기간
                        </div>
                        <div className="filter-toggle-group" role="group" aria-label="기간 선택">
                          <button
                            type="button"
                            className={`filter-toggle${has('short') ? ' is-active' : ''}`}
                            aria-pressed={has('short')}
                            onClick={() => toggle('short')}
                          >
                            단기
                          </button>
                          <button
                            type="button"
                            className={`filter-toggle${has('long') ? ' is-active' : ''}`}
                            aria-pressed={has('long')}
                            onClick={() => toggle('long')}
                          >
                            장기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                },
              }
            : null),
          ...(col.key === 'contractStatus'
            ? {
                filterType: 'multi-select',
                filterAccessor: (row) => normalizeContractStatus(row?.contractStatus),
                filterOptions: CONTRACT_STATUSES.map((status) => ({ value: status, label: status })),
                filterAllowAnd: false,
                filterHideHeader: true,
              }
            : null),
          ...(col.key === 'engineStatus'
            ? {
                filterType: 'select',
                filterAccessor: (row) => {
                  if (!row?.hasDevice) return '단말 필요';
                  return row?.engineOn ? 'ON' : 'OFF';
                },
                filterOptions: [
                  { value: 'ON', label: 'ON' },
                  { value: 'OFF', label: 'OFF' },
                  { value: '단말 필요', label: '단말 필요' },
                ],
              }
            : null),
          ...(col.key === 'restartBlocked'
            ? {
                filterType: 'boolean',
                filterAccessor: (row) => Boolean(row?.restartBlocked),
                filterTriState: false,
              }
            : null),
          ...(col.key === 'accident'
            ? {
                filterType: 'boolean',
                filterAccessor: (row) => Boolean(row?.accidentReported),
                filterTriState: false,
              }
            : null),
          ...(col.key === 'memo' ? { filterType: 'text' } : null),
        })),
    [
      columnsForRender,
      rows, // needed for VehicleTypeYearFilter
      // Ensure closures used by renderers are always fresh
      editingMemo,
      memoText,
      handleToggleRestart,
      handlePlateClick,
      handleStateAction,
      handleOpenAccidentModal,
    ]
  );

  // Apply column filters after dynamicColumns are available
  const filteredRows = useMemo(
    () => applyColumnFilters(rows, columnFilters, dynamicColumns),
    [rows, columnFilters, dynamicColumns]
  );

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

  // 각 컬럼의 셀 내용을 렌더링하는 함수 (select는 Table 컴포넌트에서 자동 처리)
  const renderCellContent = (column, row) => {
    switch (column.key) {
      case 'company':
        return <CompanyCell row={row} />;
      case 'plate':
        return (
          <PlateCell
            plate={row.plate}
            onClick={() => handlePlateClick(row)}
            title="계약 상세 정보 보기"
          />
        );
      case 'vehicleType':
        return <VehicleTypeText vehicleType={row.vehicleType} />;
      case 'renterName':
        return row.renterName || '-';
      case 'rentalPeriod':
        return <RentalPeriodCell rentalPeriod={row.rentalPeriod} />;
      case 'rentalAmount':
        return <RentalAmountCell row={row} />;
      case 'contractStatus':
        return getContractStatusBadge(row.contractStatus);
      case 'stateActions': {
        const actions = Array.isArray(row?.allowedActions) ? row.allowedActions : [];
        if (actions.length === 0) {
          return <span style={{ color: '#9CA3AF', fontSize: 12 }}>없음</span>;
        }
        return (
          <div className="contract-action-cell">
            {actions.slice(0, 3).map((action) => (
              <button
                key={`${row.rentalId}-${action}`}
                type="button"
                className="contract-action-chip"
                onClick={() => handleStateAction(row, action)}
                title={getContractActionLabel(action)}
              >
                {getContractActionLabel(action)}
              </button>
            ))}
          </div>
        );
      }
      case 'engineStatus': {
        if (!row?.hasDevice) {
          return (
            <button
              type="button"
              onClick={openInstallModal}
              title="단말 장착 신청"
              aria-label="단말 장착 신청"
              className="engine-status-btn engine-status-btn--need"
            >
              단말필요
            </button>
          );
        }
        // 디자인: 텍스트와 같은 색상의 보더라인
        const isOn = row.engineOn;
        return (
          <div
            className={`engine-status-btn engine-status-btn--toggle ${isOn ? 'engine-status-btn--on' : 'engine-status-btn--off'}`}
            aria-pressed={isOn}
          >
            {isOn ? 'ON' : 'OFF'}
          </div>
        );
      }
      case 'restartBlocked': {
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
                cursor: 'pointer',
              }}
            >
              단말필요
            </button>
          );
        }
        const isBlocked = Boolean(row.restartBlocked);
        const identifier = row.plate || row.renterName || row.rentalId || '계약';
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
            aria-label={`${identifier} ${isBlocked ? '재시동 금지 해제' : '재시동 금지 설정'}`}
            title={isBlocked ? '재시동 금지 해제' : '재시동 금지 설정'}
          >
            {isBlocked ? '차단 중' : '허용 중'}
          </button>
        );
      }
      case 'accident': {
        const identifier = row.plate || row.rentalId || '계약';
        const hasAccident = Boolean(row.accidentReported);
        const title = hasAccident ? '등록된 사고 정보 보기' : '사고 등록';
        const ariaLabel = hasAccident ? `${identifier} 사고 정보 보기` : `${identifier} 사고 등록`;

        // 디자인: 사고확인은 파랑 + 비디오 아이콘, 사고등록은 검정
        return (
          <button
            type="button"
            onClick={() => handleOpenAccidentModal(row)}
            title={title}
            aria-label={ariaLabel}
            className={`accident-button ${hasAccident ? 'accident-button--has' : 'accident-button--register'}`}
          >
            {hasAccident && (
              <svg
                width="14"
                height="10"
                viewBox="0 0 14 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.96875 0C0.88144 0 0 0.839467 0 1.875V8.125C0 9.1605 0.88144 10 1.96875 10H9.40625H10.0625V9.375V7.8125L12.6875 9.27083L14 10V8.55283V1.44713V0L12.6875 0.729167L10.0625 2.1875V0.625V0H9.40625H1.96875Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {hasAccident ? '사고정보조회' : '사고등록'}
          </button>
        );
      }
      case 'memo':
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
        return '-';
    }
  };

  // formatDateTime is now in RentalPeriodCell component, but still needed for detail modal
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const getContractStatusBadge = (status) => {
    const normalized = normalizeContractStatus(status);
    const badgeType = CONTRACT_STATUS_BADGE_TYPE[normalized];
    if (!badgeType) {
      return (
        <span style={{ color: '#1C1C1C', fontSize: 14, fontFamily: 'Pretendard', fontWeight: 500 }}>
          {normalized || '-'}
        </span>
      );
    }
    return <StatusBadge type={badgeType}>{normalized}</StatusBadge>;
  };

  const renderWorkflowFields = () => {
    if (!workflowAction) return null;
    if (workflowAction === 'request_extension') {
      return (
        <div className="workflow-fields">
          <label className="workflow-field">
            <span>연장 종료일</span>
            <input
              type="date"
              value={workflowPayload.requestedEndDate}
              onChange={(e) =>
                setWorkflowPayload((prev) => ({ ...prev, requestedEndDate: e.target.value }))
              }
            />
          </label>
          <label className="workflow-field">
            <span>요청 사유</span>
            <input
              type="text"
              value={workflowPayload.reason}
              placeholder="연장 요청 사유 입력"
              onChange={(e) => setWorkflowPayload((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </label>
        </div>
      );
    }
    if (workflowAction === 'handover') {
      return (
        <div className="workflow-fields">
          <label className="workflow-check">
            <input
              type="checkbox"
              checked={workflowPayload.documentsVerified}
              onChange={(e) =>
                setWorkflowPayload((prev) => ({ ...prev, documentsVerified: e.target.checked }))
              }
            />
            서류 확인 완료
          </label>
          <label className="workflow-check">
            <input
              type="checkbox"
              checked={workflowPayload.paymentReceived}
              onChange={(e) =>
                setWorkflowPayload((prev) => ({ ...prev, paymentReceived: e.target.checked }))
              }
            />
            결제 확인 완료
          </label>
          <label className="workflow-check">
            <input
              type="checkbox"
              checked={workflowPayload.depositCollected}
              onChange={(e) =>
                setWorkflowPayload((prev) => ({ ...prev, depositCollected: e.target.checked }))
              }
            />
            보증금 수령 완료
          </label>
          <label className="workflow-field">
            <span>인수 시 주행거리(km)</span>
            <input
              type="number"
              value={workflowPayload.mileageAtHandover}
              onChange={(e) =>
                setWorkflowPayload((prev) => ({ ...prev, mileageAtHandover: e.target.value }))
              }
            />
          </label>
          <label className="workflow-field">
            <span>인수 메모</span>
            <input
              type="text"
              value={workflowPayload.handoverNotes}
              onChange={(e) =>
                setWorkflowPayload((prev) => ({ ...prev, handoverNotes: e.target.value }))
              }
            />
          </label>
        </div>
      );
    }
    if (workflowAction === 'complete_inspection') {
      return (
        <div className="workflow-fields">
          {[
            ['exteriorCheck', '외관 점검 완료'],
            ['interiorCheck', '내부 점검 완료'],
            ['mileageRecorded', '주행거리 기록 완료'],
            ['fuelLevelRecorded', '연료량 기록 완료'],
            ['settlementCompleted', '정산 완료'],
          ].map(([key, label]) => (
            <label key={key} className="workflow-check">
              <input
                type="checkbox"
                checked={Boolean(workflowPayload[key])}
                onChange={(e) =>
                  setWorkflowPayload((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
        </div>
      );
    }
    return null;
  };

  const submitWorkflowAction = async () => {
    if (!selectedContract?.rentalId || !workflowAction) return;
    const payload = extractTransitionPayload(workflowAction);
    const ok = await executeTransition(selectedContract.rentalId, workflowAction, payload);
    if (ok) {
      await refreshRental(selectedContract.rentalId).catch(() => null);
    }
  };

  const getStateHistoryRows = (contract) => {
    const history = Array.isArray(contract?.stateHistory) ? contract.stateHistory : [];
    return [...history].sort((a, b) => {
      const atA = a?.at ? Date.parse(a.at) : 0;
      const atB = b?.at ? Date.parse(b.at) : 0;
      return atB - atA;
    });
  };

  // getRentalAmountBadges moved to RentalAmountCell component

  return (
    <div className="page page--data page--sticky-header">
      <div className="page-header-sticky">
        <h1 className="page-title">계약등록관리</h1>
        <div className="table-toolbar">
          <div className="flex-1" />
          <div className="flex gap-3" style={{ marginRight: '12px' }}>
            <button type="button" onClick={() => setShowCreate(true)} className="toolbar-button">
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
              <span className="toolbar-btn-text">계약등록</span>
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
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
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
                  onReset={resetColumns}
                  onDeselectAll={deselectAllOptionalColumns}
                />
              )}
            </div>
            <button
              type="button"
              onClick={tableFilterState.clearAll}
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

      <div className="page-scroll page-scroll--with-sticky-table space-y-4">
        <Table
          rowIdKey="rentalId"
          columns={dynamicColumns}
          data={filteredRows}
          rowClassName={(row) =>
            normalizeContractStatus(row.contractStatus) === '종결' ? 'is-completed' : undefined
          }
          selection={{ selected, toggleSelect, toggleSelectAllVisible, allVisibleSelected }}
          emptyMessage="조건에 맞는 계약이 없습니다."
          stickyHeader
          className="rentals-table"
          enableColumnFilters={TABLE_COLUMN_FILTERS_ENABLED}
          filters={columnFilters}
          onFiltersChange={(next) => tableFilterState.setFilters(next)}
        />
      </div>

      <RentalCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateSubmit}
      />

      <TerminalRequestModal isOpen={installModalOpen} onClose={closeInstallModal} />

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        showFooter={false}
        ariaLabel="Contract Details"
        className="rental-detail-modal"
      >
        {selectedContract && (
          <div className="rental-detail">
            {/* Header */}
            <div className="rental-detail__header">
              <div className="rental-detail__header-left">
                <h2 className="rental-detail__title">계약 상세 정보</h2>
                <span className="rental-detail__plate-badge">{selectedContract.plate || '-'}</span>
              </div>
              <button
                className="rental-detail__close-btn"
                onClick={() => setShowDetail(false)}
                aria-label="닫기"
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
            <div className="rental-detail__header-line"></div>

            {/* Accident Alert */}
            {selectedContract.accidentReported && (
              <div className="rental-detail__accident-alert">
                <svg
                  className="rental-detail__car-icon"
                  width="85"
                  height="51"
                  viewBox="0 0 85 51"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.04956 38.7129C5.04956 38.2481 5.42635 37.8713 5.89114 37.8713H14.307C14.7718 37.8713 15.1486 38.2481 15.1486 38.7129V46.2871C15.1486 46.7519 14.7718 47.1287 14.307 47.1287H5.89114C5.42635 47.1287 5.04956 46.7519 5.04956 46.2871V38.7129Z"
                    fill="url(#paint0_accident)"
                  />
                  <path
                    d="M50.4951 38.7129C50.4951 38.2481 50.8719 37.8713 51.3367 37.8713H59.7525C60.2173 37.8713 60.5941 38.2481 60.5941 38.7129V46.2871C60.5941 46.7519 60.2173 47.1287 59.7525 47.1287H51.3367C50.8719 47.1287 50.4951 46.7519 50.4951 46.2871V38.7129Z"
                    fill="url(#paint1_accident)"
                  />
                  <path
                    d="M17.0868 0.0145657H34.2905V42.0792H7.85562C4.8345 42.0792 4.49881 39.976 4.49881 38.2934V23.5708C4.49881 21.2151 6.73669 18.6632 7.85562 17.6817H3.24C-0.452495 17.3452 -0.956067 12.2133 1.56159 12.2133H6.59681C8.27521 12.2133 8.69482 15.0176 8.69482 16.4198C9.25428 14.4568 10.625 9.43705 11.632 5.06232C12.6391 0.6876 15.6882 -0.12565 17.0868 0.0145657Z"
                    fill="url(#paint2_accident)"
                  />
                  <path
                    d="M48.5567 0.014559H31.3531V42.0792H57.7879C60.8091 42.0792 61.1448 39.976 61.1448 38.2934V23.5708C61.1448 21.2151 58.9069 18.6632 57.7879 17.6817H62.4036C66.0961 17.3452 66.5996 12.2133 64.082 12.2133H59.0468C57.3683 12.2133 56.9487 15.0176 56.9487 16.4198C56.3893 14.4568 55.0186 9.43704 54.0115 5.06232C53.0045 0.687593 49.9554 -0.125657 48.5567 0.014559Z"
                    fill="url(#paint3_accident)"
                  />
                  <path
                    d="M21.0396 29.4554H45.4456L42.6071 35.842C42.2861 36.5642 41.5699 37.0297 40.7795 37.0297H25.3533C24.5285 37.0297 23.7882 36.5233 23.4893 35.7546L21.0396 29.4554Z"
                    fill="#0978D1"
                  />
                  <g opacity="0.5">
                    <path
                      d="M16.8316 26.5099C16.8316 28.6015 15.136 30.297 13.0445 30.297C10.9529 30.297 9.25732 28.6015 9.25732 26.5099C9.25732 24.4183 10.9529 22.7228 13.0445 22.7228C15.136 22.7228 16.8316 24.4183 16.8316 26.5099Z"
                      fill="url(#paint4_accident)"
                    />
                    <path
                      d="M56.386 26.5099C56.386 28.6015 54.6905 30.297 52.5989 30.297C50.5073 30.297 48.8118 28.6015 48.8118 26.5099C48.8118 24.4183 50.5073 22.7228 52.5989 22.7228C54.6905 22.7228 56.386 24.4183 56.386 26.5099Z"
                      fill="url(#paint5_accident)"
                    />
                  </g>
                  <path
                    d="M17.2526 2.94554H33.6634V17.6733H10.9407C11.5017 15.429 12.8763 10.099 13.8862 6.73267C14.5174 4.62871 15.1486 2.94554 17.2526 2.94554Z"
                    fill="#2072BE"
                  />
                  <path
                    d="M48.3912 2.94554H31.9803V17.6733H54.703C54.142 15.429 52.7674 10.099 51.7575 6.73267C51.1263 4.62871 50.4951 2.94554 48.3912 2.94554Z"
                    fill="#2072BE"
                  />
                  <path
                    d="M68.1651 25.6194C69.1016 24.0015 71.4427 24.0015 72.3792 25.6194L84.6703 46.8547C85.6068 48.4726 84.4362 50.4951 82.5632 50.4951H57.9811C56.1081 50.4951 54.9376 48.4726 55.874 46.8547L68.1651 25.6194Z"
                    fill="url(#paint6_accident)"
                  />
                  <g filter="url(#filter0_accident)">
                    <path
                      d="M70.9717 42.5999H70.2802H69.5887C69.5887 42.1652 69.578 41.7081 69.5565 41.2288C69.5351 40.7384 69.5083 40.2591 69.4761 39.7909C69.4547 39.3227 69.4279 38.9047 69.3957 38.5369C69.3743 38.1579 69.3528 37.8681 69.3314 37.6674C69.2992 37.255 69.2563 36.8481 69.2027 36.4469C69.1491 36.0456 69.1223 35.6164 69.1223 35.1594C69.1223 34.7693 69.2188 34.4516 69.4118 34.2063C69.6155 33.95 69.9157 33.8218 70.3123 33.8218C70.7305 33.8218 71.0199 33.9555 71.1807 34.2231C71.3523 34.4794 71.438 34.786 71.438 35.1427C71.438 35.6108 71.4166 36.0456 71.3737 36.4469C71.3308 36.8481 71.2826 37.255 71.229 37.6674C71.229 37.8681 71.2129 38.1579 71.1807 38.5369C71.1593 38.9047 71.1325 39.3227 71.1003 39.7909C71.0682 40.2591 71.036 40.7384 71.0038 41.2288C70.9824 41.7081 70.9717 42.1652 70.9717 42.5999ZM71.5345 45.1414C71.5345 45.5426 71.4219 45.8603 71.1968 46.0944C70.9717 46.3285 70.6554 46.4455 70.248 46.4455C69.8621 46.4455 69.5565 46.3341 69.3314 46.1111C69.117 45.8882 69.0098 45.5705 69.0098 45.1581C69.0098 44.7345 69.1223 44.4057 69.3475 44.1716C69.5726 43.9264 69.8782 43.8037 70.2641 43.8037C70.6501 43.8037 70.9556 43.9264 71.1807 44.1716C71.4166 44.4168 71.5345 44.7401 71.5345 45.1414Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <filter
                      id="filter0_accident"
                      x="67.0098"
                      y="31.8218"
                      width="6.52466"
                      height="16.6238"
                      filterUnits="userSpaceOnUse"
                      colorInterpolationFilters="sRGB"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                      />
                      <feOffset />
                      <feGaussianBlur stdDeviation="1" />
                      <feComposite in2="hardAlpha" operator="out" />
                      <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 1 0 0 0 0 0.181772 0 0 0 0 0.181772 0 0 0 0.25 0"
                      />
                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                      <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow"
                        result="shape"
                      />
                    </filter>
                    <linearGradient
                      id="paint0_accident"
                      x1="34.0842"
                      y1="47.9703"
                      x2="34.0842"
                      y2="42.0792"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#434343" />
                      <stop offset="1" />
                    </linearGradient>
                    <linearGradient
                      id="paint1_accident"
                      x1="34.0842"
                      y1="47.9703"
                      x2="34.0842"
                      y2="42.0792"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#434343" />
                      <stop offset="1" />
                    </linearGradient>
                    <linearGradient
                      id="paint2_accident"
                      x1="32.8218"
                      y1="29.4598"
                      x2="32.8218"
                      y2="42.0792"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#168DEB" />
                      <stop offset="1" stopColor="#006BC0" />
                    </linearGradient>
                    <linearGradient
                      id="paint3_accident"
                      x1="32.8218"
                      y1="29.4598"
                      x2="32.8218"
                      y2="42.0792"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#168DEB" />
                      <stop offset="1" stopColor="#006BC0" />
                    </linearGradient>
                    <linearGradient
                      id="paint4_accident"
                      x1="31.1385"
                      y1="29.8762"
                      x2="31.1385"
                      y2="23.5644"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#ABDAFF" />
                      <stop offset="1" stopColor="white" />
                    </linearGradient>
                    <linearGradient
                      id="paint5_accident"
                      x1="31.1385"
                      y1="29.8762"
                      x2="31.1385"
                      y2="23.5644"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#ABDAFF" />
                      <stop offset="1" stopColor="white" />
                    </linearGradient>
                    <linearGradient
                      id="paint6_accident"
                      x1="78.6103"
                      y1="34.2568"
                      x2="54.4342"
                      y2="52.5338"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FFBB00" />
                      <stop offset="0.870994" stopColor="#FF9500" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="rental-detail__accident-alert-content">
                  <span className="rental-detail__accident-alert-title">사고 접수됨</span>
                  <span className="rental-detail__accident-alert-date">
                    {(() => {
                      const report = selectedContract.accidentReport;
                      if (report?.accidentDisplayTime) {
                        return `${report.accidentDisplayTime} 발생`;
                      }
                      if (report?.accidentDateTime) {
                        return `${formatDateTime(report.accidentDateTime)} 발생`;
                      }
                      if (report?.accidentDate) {
                        const time = `${report.accidentHour || '00'}:${report.accidentMinute || '00'}:${report.accidentSecond || '00'}`;
                        return `${report.accidentDate.replace(/-/g, '.')} ${time} 발생`;
                      }
                      return '발생 일시 정보 없음';
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="rental-detail__actions">
              <button
                className="rental-detail__action-btn rental-detail__action-btn--primary"
                onClick={handleShowLocation}
                disabled={isLoadingLocation}
                title="현재 위치를 지도에서 확인"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.83301 0C9.55689 0 11.2107 0.689516 12.4297 1.91699C13.6487 3.1445 14.333 4.80994 14.333 6.5459C14.3326 11.6366 7.83301 16 7.83301 16C7.78008 15.9644 1.3334 11.6157 1.33301 6.5459C1.33301 4.80994 2.01832 3.1445 3.2373 1.91699C4.45617 0.689632 6.1093 0.000130171 7.83301 0ZM7.83398 4C6.45327 4 5.33398 5.11929 5.33398 6.5C5.33399 7.8807 6.45328 9 7.83398 9C9.21447 8.99974 10.334 7.88054 10.334 6.5C10.334 5.11945 9.21447 4.00026 7.83398 4Z"
                    fill="url(#paint_location)"
                  />
                  <defs>
                    <linearGradient
                      id="paint_location"
                      x1="7.83301"
                      y1="0"
                      x2="7.83301"
                      y2="16"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#239EFF" />
                      <stop offset="1" stopColor="#005BE4" />
                    </linearGradient>
                  </defs>
                </svg>
                {isLoadingLocation ? '불러오는 중...' : '현재위치'}
              </button>
              <button
                className="rental-detail__action-btn rental-detail__action-btn--outline"
                onClick={() => handleOpenAccidentModal(selectedContract)}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 17 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.6416 1.5C13.8855 1.50001 14.1271 1.54473 14.3525 1.63184C14.578 1.71901 14.7835 1.84674 14.9561 2.00781C15.1285 2.16875 15.265 2.36008 15.3584 2.57031C15.4518 2.7807 15.5 3.00666 15.5 3.23438C15.5 3.46216 15.4518 3.68799 15.3584 3.89844C15.2651 4.10873 15.1285 4.29995 14.9561 4.46094L4.00488 14.6826L0.5 15.5L1.37598 12.2295L12.3271 2.00781C12.6757 1.68252 13.1487 1.5 13.6416 1.5ZM14.5 13.5C15.0523 13.5 15.5 13.9477 15.5 14.5C15.5 15.0523 15.0523 15.5 14.5 15.5H7.5C6.94772 15.5 6.5 15.0523 6.5 14.5C6.5 13.9477 6.94772 13.5 7.5 13.5H14.5Z"
                    fill="url(#paint_edit)"
                  />
                  <defs>
                    <linearGradient
                      id="paint_edit"
                      x1="8"
                      y1="1.5"
                      x2="8"
                      y2="15.5"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#239EFF" />
                      <stop offset="1" stopColor="#005BE4" />
                    </linearGradient>
                  </defs>
                </svg>
                {selectedContract.accidentReported ? '사고정보조회' : '사고등록'}
              </button>
              {(selectedContract.allowedActions || []).map((action) => (
                <button
                  key={`detail-action-${action}`}
                  className="rental-detail__action-btn rental-detail__action-btn--outline"
                  type="button"
                  onClick={() => {
                    if (payloadActions.has(action)) {
                      setWorkflowAction(action);
                    } else {
                      handleStateAction(selectedContract, action);
                    }
                  }}
                >
                  {getContractActionLabel(action)}
                </button>
              ))}
            </div>

            {(selectedContract.allowedActions || []).length > 0 && (
              <div className="rental-detail__section">
                <h3 className="rental-detail__section-title">상태 전환 워크플로우</h3>
                <div className="workflow-action-list">
                  {(selectedContract.allowedActions || []).map((action) => (
                    <button
                      key={`workflow-${action}`}
                      type="button"
                      className={`workflow-action-btn${workflowAction === action ? ' is-active' : ''}`}
                      onClick={() => setWorkflowAction(action)}
                    >
                      {getContractActionLabel(action)}
                    </button>
                  ))}
                </div>
                {workflowAction && (
                  <div className="workflow-panel">
                    <div className="workflow-panel__title">{getContractActionLabel(workflowAction)}</div>
                    {renderWorkflowFields()}
                    <div className="workflow-panel__actions">
                      <button type="button" className="workflow-submit-btn" onClick={submitWorkflowAction}>
                        전환 실행
                      </button>
                      <button type="button" className="workflow-cancel-btn" onClick={resetWorkflowState}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rental-detail__section-divider"></div>

            {/* 기본정보 섹션 */}
            <div className="rental-detail__section">
              <h3 className="rental-detail__section-title">기본정보</h3>
              <div className="rental-detail__info-grid">
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">차량번호</span>
                  <span className="rental-detail__info-value">{selectedContract.plate || '-'}</span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">차종</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.vehicleType || '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">예약자명</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.renterName || '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">연락처</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.contactNumber || '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">면허정보</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.license_number || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rental-detail__section-divider"></div>

            <div className="rental-detail__section">
              <h3 className="rental-detail__section-title">상태 이력 타임라인</h3>
              <div className="contract-timeline">
                {getStateHistoryRows(selectedContract).length === 0 ? (
                  <div className="contract-timeline__empty">상태 이력이 없습니다.</div>
                ) : (
                  getStateHistoryRows(selectedContract).map((entry, index) => (
                    <div className="contract-timeline__item" key={`history-${index}-${entry?.at || 'none'}`}>
                      <div className="contract-timeline__dot" />
                      <div className="contract-timeline__content">
                        <div className="contract-timeline__main">
                          <span>{normalizeContractStatus(entry?.from) || '시작'}</span>
                          <span className="contract-timeline__arrow">→</span>
                          <span>{normalizeContractStatus(entry?.to) || '-'}</span>
                        </div>
                        <div className="contract-timeline__meta">
                          {getContractActionLabel(entry?.action)} · {formatDateTime(entry?.at)} ·{' '}
                          {entry?.by || 'system'}
                        </div>
                        {entry?.payload && Object.keys(entry.payload).length > 0 && (
                          <pre className="contract-timeline__payload">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rental-detail__section-divider"></div>

            {/* 계약정보 섹션 */}
            <div className="rental-detail__section">
              <h3 className="rental-detail__section-title">계약정보</h3>
              <div className="rental-detail__info-grid">
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">계약상태</span>
                  <span className="rental-detail__info-value">
                    {normalizeContractStatus(selectedContract.contractStatus) || '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">대여일</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.rentalDurationDays || '-'} 일
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">대여 시작</span>
                  <span className="rental-detail__info-value">
                    {formatDateTime(selectedContract.rentalPeriod?.start)}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">대여 종료</span>
                  <span className="rental-detail__info-value">
                    {formatDateTime(selectedContract.rentalPeriod?.end)}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">배차위치</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.rentalLocation?.address || selectedContract.address || '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">반납위치</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.returnLocation?.address || selectedContract.address || '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">보험회사</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.insuranceName || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rental-detail__section-divider"></div>

            {/* 금액정보 섹션 */}
            <div className="rental-detail__section">
              <h3 className="rental-detail__section-title">금액정보</h3>
              <div className="rental-detail__info-grid">
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">대여 금액</span>
                  <span className="rental-detail__info-value">
                    {formatCurrencyDisplay(selectedContract.rentalAmount || 0)}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">보증금</span>
                  <span className="rental-detail__info-value">
                    {formatCurrencyDisplay(selectedContract.deposit || 0)}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">미납 금액</span>
                  <span className="rental-detail__info-value">
                    {formatCurrencyDisplay(selectedContract.unpaidAmount || 0)}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">결제 방법</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.paymentMethod || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rental-detail__section-divider"></div>

            {/* 차량상태 섹션 */}
            <div className="rental-detail__section">
              <h3 className="rental-detail__section-title">차량상태</h3>
              <div
                style={{
                  marginBottom: '14px',
                  color: '#1C1C1C',
                  fontSize: '14px',
                  fontWeight: '700',
                }}
              >
                {(() => {
                  const hasDevice = computeHasDevice(selectedContract, hasDeviceByPlate);
                  if (!hasDevice) return '단말 미장착';
                  return selectedContract.engineOn ? 'ON' : 'OFF';
                })()}
              </div>
              <div className="rental-detail__info-grid">
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">엔진상태</span>
                  <span
                    className={`rental-detail__info-value ${selectedContract.engineOn ? 'rental-detail__info-value--on' : 'rental-detail__info-value--off'}`}
                  >
                    {(() => {
                      const hasDevice = computeHasDevice(selectedContract, hasDeviceByPlate);
                      if (!hasDevice) return '단말 필요';
                      return selectedContract.engineOn ? 'ON' : 'OFF';
                    })()}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">재시동 금지</span>
                  <span className="rental-detail__info-value">
                    {(() => {
                      const hasDevice = computeHasDevice(selectedContract, hasDeviceByPlate);
                      if (!hasDevice) return '단말 필요';
                      return selectedContract.restartBlocked ? '차단' : '허용';
                    })()}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">위치</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.currentLocation
                      ? selectedContract.currentLocation.address || '주소 확인 중...'
                      : selectedContract.rentalLocation?.address ||
                        selectedContract.returnLocation?.address ||
                        selectedContract.address ||
                        selectedContract.location ||
                        '정보 없음'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">주행거리</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.mileage
                      ? `${formatNumberDisplay(selectedContract.mileage)} Km`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rental-detail__section-divider"></div>

            {/* 추가사항 섹션 */}
            <div className="rental-detail__section">
              <h3 className="rental-detail__section-title">추가사항</h3>
              <div className="rental-detail__info-grid">
                <div className="rental-detail__info-row rental-detail__info-row--full">
                  <span className="rental-detail__info-label">메모사항</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.memo || '메모가 없습니다.'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">등록일</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.createdAt
                      ? formatYyMmDdHhMmSs(selectedContract.createdAt)
                      : '-'}
                  </span>
                </div>
                <div className="rental-detail__info-row">
                  <span className="rental-detail__info-label">특이사항</span>
                  <span className="rental-detail__info-value">
                    {selectedContract.specialNotes || '없음'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="rental-detail__footer">
              <div className="rental-detail__footer-line"></div>
              <button className="rental-detail__footer-btn" onClick={() => setShowDetail(false)}>
                닫기
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showAccidentModal}
        onClose={() => {
          handleCloseAccidentModal();
          setAccidentRegTab('blackbox');
          setFaxNumber('');
          setFaxReceiverName('');
          setFaxTitle('');
          setFaxFiles([]);
        }}
        showFooter={false}
        ariaLabel="Accident Registration"
        className="accident-reg-modal"
      >
        {accidentTarget && (
          <div className="accident-reg">
            {/* Header */}
            <div className="accident-reg__header">
              <h2 className="accident-reg__title">사고등록</h2>
              <button
                className="accident-reg__close-btn"
                onClick={() => {
                  handleCloseAccidentModal();
                  setAccidentRegTab('blackbox');
                }}
                aria-label="닫기"
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
            <div className="accident-reg__header-line"></div>

            {/* Tabs */}
            <div className="accident-reg__tabs">
              <button
                type="button"
                className={`accident-reg__tab ${accidentRegTab === 'blackbox' ? 'accident-reg__tab--active' : ''}`}
                onClick={() => setAccidentRegTab('blackbox')}
              >
                사고 영상 등록
              </button>
              <button
                type="button"
                className={`accident-reg__tab ${accidentRegTab === 'fax' ? 'accident-reg__tab--active' : ''}`}
                onClick={() => setAccidentRegTab('fax')}
              >
                대여정보 및 팩스발송
              </button>
            </div>

            <form id="accident-registration-form" onSubmit={handleAccidentSubmit}>
              {/* 사고 영상 등록 탭 */}
              {accidentRegTab === 'blackbox' && (
                <div>
                  <div className="accident-reg__section-title">사고 영상 등록</div>

                  {/* Preview Box */}
                  <div className="accident-reg__preview-box">
                    {accidentForm.blackboxFile ? (
                      <FilePreview file={accidentForm.blackboxFile} />
                    ) : (
                      <span className="accident-reg__preview-placeholder">
                        파일을 선택하면 미리보기가 표시됩니다.
                      </span>
                    )}
                  </div>

                  {/* File Input Bar */}
                  <label className="accident-reg__file-bar">
                    <div className="accident-reg__file-bar-left">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M17 10.0944L10.8539 15.8909C10.101 16.6011 9.07974 17 8.01492 17C6.9501 17 5.92889 16.6011 5.17594 15.8909C4.423 15.1808 4 14.2177 4 13.2134C4 12.2092 4.423 11.246 5.17594 10.5359L11.322 4.73937C11.824 4.26596 12.5048 4 13.2147 4C13.9246 4 14.6054 4.26596 15.1073 4.73937C15.6093 5.21279 15.8913 5.85487 15.8913 6.52438C15.8913 7.19389 15.6093 7.83598 15.1073 8.30939L8.95456 14.1059C8.70358 14.3426 8.36317 14.4756 8.00823 14.4756C7.65329 14.4756 7.31289 14.3426 7.06191 14.1059C6.81093 13.8692 6.66993 13.5482 6.66993 13.2134C6.66993 12.8787 6.81093 12.5576 7.06191 12.3209L12.7399 6.97221"
                          stroke="#1C1C1C"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="accident-reg__file-bar-text">파일 및 사진 추가</span>
                    </div>
                    <span className="accident-reg__file-bar-count">
                      {accidentForm.blackboxFile ? '1' : '0'} / 1
                    </span>
                    <input
                      key={fileInputKey}
                      type="file"
                        accept="video/*"
                      onChange={handleAccidentFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {/* Upload Progress */}
                  {accidentForm.blackboxFile && uploadState.status === 'uploading' && (
                    <div style={{ marginBottom: 12 }}>
                      <UploadProgress
                        status={uploadState.status}
                        percent={uploadState.percent}
                        onCancel={() => {
                          try {
                            uploadState.cancel && uploadState.cancel();
                          } catch {}
                        }}
                      />
                    </div>
                  )}
                  {uploadState.status === 'error' && (
                    <div style={{ marginBottom: 12, color: '#c62828', fontSize: 12 }}>
                      업로드 실패: {uploadState.error || '알 수 없는 오류'}
                    </div>
                  )}

                  {/* 사고 발생 시각 */}
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">사고 발생 시각</span>
                    <input
                      type="date"
                      className="accident-reg__date-input"
                      value={accidentForm.accidentDate}
                      onChange={(e) => handleAccidentInputChange('accidentDate', e.target.value)}
                      required
                    />
                  </div>
                  <div
                    className="accident-reg__time-row"
                    style={{ marginLeft: 100, marginBottom: 14 }}
                  >
                    <select
                      className="accident-reg__time-select"
                      value={accidentForm.accidentHour}
                      onChange={(e) => handleAccidentInputChange('accidentHour', e.target.value)}
                    >
                      {HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <select
                      className="accident-reg__time-select"
                      value={accidentForm.accidentMinute}
                      onChange={(e) => handleAccidentInputChange('accidentMinute', e.target.value)}
                    >
                      {MINUTE_SECOND_OPTIONS.map((minute) => (
                        <option key={`minute-${minute}`} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                    <select
                      className="accident-reg__time-select"
                      value={accidentForm.accidentSecond}
                      onChange={(e) => handleAccidentInputChange('accidentSecond', e.target.value)}
                    >
                      {MINUTE_SECOND_OPTIONS.map((second) => (
                        <option key={`second-${second}`} value={second}>
                          {second}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 처리 담당자 */}
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">처리 담당자</span>
                    <input
                      type="text"
                      className="accident-reg__input"
                      value={accidentForm.handlerName}
                      onChange={(e) => handleAccidentInputChange('handlerName', e.target.value)}
                      placeholder="담당자명"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 대여정보 및 팩스발송 탭 */}
              {accidentRegTab === 'fax' && (
                <div>
                  {/* 대여 정보 (읽기 전용) */}
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">대여차량번호</span>
                    <span className="accident-reg__info-value">{accidentTarget.plate || '-'}</span>
                  </div>
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">대여차종</span>
                    <span className="accident-reg__info-value">
                      {accidentTarget.vehicleType || '-'}
                    </span>
                  </div>
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">대여기간</span>
                    <span className="accident-reg__info-value">
                      {formatDateTime(accidentTarget.rentalPeriod?.start)} ~{' '}
                      {formatDateTime(accidentTarget.rentalPeriod?.end)}
                    </span>
                  </div>
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">대여자</span>
                    <span className="accident-reg__info-value">
                      {accidentTarget.renterName || '-'}
                    </span>
                  </div>
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">대여자 연락처</span>
                    <span className="accident-reg__info-value">
                      {accidentTarget.contactNumber || '-'}
                    </span>
                  </div>

                  <div className="accident-reg__divider"></div>

                  {/* 팩스 입력 */}
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">팩스 수신 번호</span>
                    <input
                      type="text"
                      className="accident-reg__input"
                      value={faxNumber}
                      onChange={(e) => setFaxNumber(e.target.value)}
                      placeholder="번호 입력"
                    />
                  </div>
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">수신자 (선택)</span>
                    <input
                      type="text"
                      className="accident-reg__input"
                      value={faxReceiverName}
                      onChange={(e) => setFaxReceiverName(e.target.value)}
                      placeholder="수신자 이름"
                    />
                  </div>
                  <div className="accident-reg__info-row">
                    <span className="accident-reg__info-label">제목 (선택)</span>
                    <input
                      type="text"
                      className="accident-reg__input"
                      value={faxTitle}
                      onChange={(e) => setFaxTitle(e.target.value)}
                      placeholder="제목"
                    />
                  </div>

                  {/* 파일 추가 & FAX 보내기 버튼 */}
                  <div className="accident-reg__fax-actions">
                    <label className="accident-reg__fax-file-bar">
                      <div className="accident-reg__file-bar-left">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M17 10.0944L10.8539 15.8909C10.101 16.6011 9.07974 17 8.01492 17C6.9501 17 5.92889 16.6011 5.17594 15.8909C4.423 15.1808 4 14.2177 4 13.2134C4 12.2092 4.423 11.246 5.17594 10.5359L11.322 4.73937C11.824 4.26596 12.5048 4 13.2147 4C13.9246 4 14.6054 4.26596 15.1073 4.73937C15.6093 5.21279 15.8913 5.85487 15.8913 6.52438C15.8913 7.19389 15.6093 7.83598 15.1073 8.30939L8.95456 14.1059C8.70358 14.3426 8.36317 14.4756 8.00823 14.4756C7.65329 14.4756 7.31289 14.3426 7.06191 14.1059C6.81093 13.8692 6.66993 13.5482 6.66993 13.2134C6.66993 12.8787 6.81093 12.5576 7.06191 12.3209L12.7399 6.97221"
                            stroke="#1C1C1C"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="accident-reg__file-bar-text">파일 및 사진 추가</span>
                      </div>
                      <span className="accident-reg__file-bar-count">{faxFiles.length} / 20</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={(e) => setFaxFiles(Array.from(e.target.files || []))}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <button
                      type="button"
                      className="accident-reg__fax-btn"
                      onClick={handleSendFax}
                      disabled={faxSending}
                    >
                      {faxSending ? '전송 중...' : 'FAX보내기'}
                    </button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="accident-reg__footer">
                <div className="accident-reg__footer-line"></div>
                <div className="accident-reg__footer-btns">
                  <button
                    type="button"
                    className="accident-reg__btn accident-reg__btn--secondary"
                    onClick={() => {
                      handleCloseAccidentModal();
                      setAccidentRegTab('blackbox');
                    }}
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    className="accident-reg__btn accident-reg__btn--primary"
                    disabled={uploadState.status === 'uploading'}
                  >
                    저장
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* 현재 위치 지도 모달 */}
      <CurrentLocationModal
        isOpen={showLocationMap}
        onClose={() => setShowLocationMap(false)}
        onBackToDetail={handleBackToDetail}
        contract={selectedContract}
        trackingDateKeys={trackingDateKeys}
        trackingDateFilters={trackingDateFilters}
        onTrackingDateFilterChange={setTrackingDateFilters}
        filteredTrackingData={filteredTrackingData}
        mapLastUpdateTime={mapLastUpdateTime}
        speedLegendItems={speedLegendItems}
        hasSelectedTrackingData={hasSelectedTrackingData}
        isLoadingLocation={isLoadingLocation}
        onLoadMoreTrail={handleLoadMoreTrail}
        onAddressResolved={(addr) => {
          setSelectedContract((prev) => {
            if (!prev) return prev;
            const cl = prev.currentLocation || {};
            if (cl.address === addr) return prev;
            return { ...prev, currentLocation: { ...cl, address: addr } };
          });
        }}
        formatTrackingDateLabel={formatTrackingDateLabel}
      />

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
