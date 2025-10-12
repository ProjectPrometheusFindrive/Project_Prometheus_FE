// Management stage calculation utility
// Centralized logic for deriving asset management stages

import { MANAGEMENT_STAGE_OPTIONS } from "../constants/forms";

const MANAGEMENT_STAGE_VALUES = new Set(MANAGEMENT_STAGE_OPTIONS.map((option) => option.value));
const MANAGEMENT_STAGE_DEFAULT = "대여가능";

const LEGACY_STAGE_MAP = new Map([
    ["대여 중", "대여중"],
    ["대여 가능", "대여가능"],
    ["입고대상", "입고 대상"],
    ["입고 대상", "입고 대상"],
    ["전산등록완료", "입고 대상"],
    ["전산등록 완료", "입고 대상"],
    ["단말 장착 완료", "대여가능"],
    ["수리/점검 중", "수리/점검 중"],
    ["수리/점검 완료", "수리/점검 완료"],
]);

/**
 * Calculate diagnostic issues count from diagnostic codes
 * @param {Object} asset - Asset object
 * @returns {number} Number of diagnostic issues
 */
export const getDiagnosticCount = (asset) => {
    const raw = asset?.diagnosticCodes;
    return Array.isArray(raw) ? raw.length : 0;
};

/**
 * Derive management stage from asset data
 * @param {Object} asset - Asset object
 * @returns {string} Management stage
 */
export const getManagementStage = (asset = {}) => {
    if (!asset) return MANAGEMENT_STAGE_DEFAULT;

    const current = asset.managementStage;
    if (current) {
        if (MANAGEMENT_STAGE_VALUES.has(current)) {
            return current;
        }
        const legacy = LEGACY_STAGE_MAP.get(current.trim());
        if (legacy) {
            return legacy;
        }
    }

    const vehicleStatus = (asset.vehicleStatus || "").trim();
    const registrationStatus = (asset.registrationStatus || "").trim();
    const deviceSerial = (asset.deviceSerial || "").trim();
    const totalIssues = getDiagnosticCount(asset);

    if (vehicleStatus === "대여중" || vehicleStatus === "운행중" || vehicleStatus === "반납대기") {
        return "대여중";
    }
    if (vehicleStatus === "예약중") {
        return "예약중";
    }
    if (vehicleStatus === "정비중" || vehicleStatus === "수리중" || vehicleStatus === "점검중" || vehicleStatus === "도난추적") {
        return "수리/점검 중";
    }

    if (totalIssues > 0) {
        return "수리/점검 중";
    }

    if (!deviceSerial) {
        return "입고 대상";
    }

    if (vehicleStatus === "대기중" || vehicleStatus === "유휴" || vehicleStatus === "대여가능" || vehicleStatus === "준비중") {
        return "대여가능";
    }

    if (vehicleStatus === "수리완료" || vehicleStatus === "점검완료") {
        return "수리/점검 완료";
    }

    if (registrationStatus === "장비부착 완료" || registrationStatus === "장비장착 완료" || registrationStatus === "보험등록 완료") {
        return "대여가능";
    }

    return MANAGEMENT_STAGE_DEFAULT;
};

/**
 * Apply management stage to asset object
 * @param {Object} asset - Asset object
 * @returns {Object} Asset with management stage applied
 */
export const withManagementStage = (asset) => {
    if (!asset) return asset;
    const hasStage = !!(asset.managementStage && String(asset.managementStage).trim());
    const stage = getManagementStage(asset);
    return { ...asset, managementStage: stage, __hasManagementStage: hasStage };
};

export { MANAGEMENT_STAGE_VALUES, MANAGEMENT_STAGE_DEFAULT, LEGACY_STAGE_MAP };
