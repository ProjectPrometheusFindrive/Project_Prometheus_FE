import {
    assetsApi,
    rentalsApi,
    vehiclesApi,
    dashboardApi,
    geofencesApi,
    companyApi,
    problemVehiclesApi,
    issuesApi,
    uploadsApi,
    authApi,
    ocrApi,
    membersApi
} from './apiClient';
import { API_STATUS, createOperationResult } from './apiTypes';

// Helper to extract data from standardized response
function extractData(response) {
    if (response.status === API_STATUS.SUCCESS) {
        const payload = response.data;
        // If backend wraps with { status, data, error }, unwrap here
        if (payload && typeof payload === 'object' && 'status' in payload) {
            const innerStatus = String(payload.status).toLowerCase();
            if (innerStatus === 'success') {
                // Some endpoints return top-level fields with a status flag (no data field)
                return (Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload);
            }
            // Treat non-success as error even if HTTP 200
            const msg = payload.error?.message || payload.message || 'API request failed';
            throw new Error(msg);
        }
        // Plain payload
        return payload;
    }
    throw new Error(response.error?.message || 'API request failed');
}

// Assets
export async function fetchAssets() {
    const response = await assetsApi.fetchAll();
    return extractData(response);
}
export async function fetchAssetsSummary() {
    const response = await assetsApi.fetchSummary();
    return extractData(response);
}
export async function fetchAssetById(id) {
    const response = await assetsApi.fetchById(id);
    return extractData(response);
}

// Asset slices (profile/insurance/device/diagnostics)
export async function fetchAssetProfile(id) {
    const response = await assetsApi.fetchProfile(id);
    return extractData(response);
}
export async function fetchAssetInsurance(id) {
    const response = await assetsApi.fetchInsurance(id);
    return extractData(response);
}
export async function fetchAssetDevice(id) {
    const response = await assetsApi.fetchDevice(id);
    return extractData(response);
}
export async function fetchAssetDiagnostics(id) {
    const response = await assetsApi.fetchDiagnostics(id);
    return extractData(response);
}

export async function createAsset(data) {
    const response = await assetsApi.create(data);
    return extractData(response);
}

export async function saveAsset(assetId, updatedFields) {
    const response = await assetsApi.update(assetId, updatedFields);
    return extractData(response);
}

export async function deleteAsset(assetId) {
    const response = await assetsApi.delete(assetId);
    if (response.status === API_STATUS.SUCCESS) {
        return true;
    }
    if (response.error?.type === 'NOT_FOUND' || response.error?.status === 404) {
        return false;
    }
    throw new Error(response.error?.message || 'Failed to delete asset');
}

// Asset memo history
export async function fetchAssetMemoHistory(assetId) {
    const response = await assetsApi.fetchMemoHistory(assetId);
    return extractData(response);
}

// Rentals
export async function fetchRentals() {
    const response = await rentalsApi.fetchAll();
    return extractData(response);
}
export async function fetchRentalsSummary() {
    const response = await rentalsApi.fetchSummary();
    return extractData(response);
}
export async function fetchRentalById(id) {
    const response = await rentalsApi.fetchById(id);
    return extractData(response);
}
export async function fetchLatestRentals() {
    const response = await rentalsApi.fetchLatest();
    return extractData(response);
}

export async function createRental(data) {
    const response = await rentalsApi.create(data);
    return extractData(response);
}

export async function updateRental(rentalId, patch) {
    const response = await rentalsApi.update(rentalId, patch || {});
    return extractData(response);
}

export async function deleteRental(rentalId) {
    const response = await rentalsApi.delete(rentalId);
    if (response.status === API_STATUS.SUCCESS) {
        return true;
    }
    if (response.error?.type === 'NOT_FOUND' || response.error?.status === 404) {
        return false;
    }
    throw new Error(response.error?.message || 'Failed to delete rental');
}

// Rental memo history
export async function fetchRentalMemoHistory(rentalId) {
    const response = await rentalsApi.fetchMemoHistory(rentalId);
    return extractData(response);
}

// Vehicles snapshot
export async function fetchVehicles() {
    const response = await vehiclesApi.fetchAll();
    return extractData(response);
}
export async function buildRentalIndexByVin() {
    // Prefer lightweight aggregated index from backend
    try {
        const idxResp = await rentalsApi.fetchIndexByVin();
        const data = extractData(idxResp);
        if (Array.isArray(data)) {
            // Normalize array -> map keyed by VIN
            const map = {};
            for (const item of data) {
                const vin = item && (item.vin || item.VIN || item.Vin);
                if (!vin) continue;
                map[String(vin)] = {
                    hasActive: !!item.hasActive,
                    hasReserved: !!item.hasReserved,
                    hasOverdue: !!item.hasOverdue,
                    hasStolen: !!item.hasStolen,
                    openCount: typeof item.openCount === 'number' ? item.openCount : (item.openCount ? Number(item.openCount) : 0),
                    recommendedStage: item.recommendedStage || undefined,
                    currentPeriod: item.currentPeriod || null,
                    asOf: item.asOf || undefined,
                };
            }
            return map;
        }
        if (data && typeof data === 'object') {
            // Assume map keyed by VIN
            const map = {};
            for (const [vin, item] of Object.entries(data)) {
                map[String(vin)] = {
                    hasActive: !!item?.hasActive,
                    hasReserved: !!item?.hasReserved,
                    hasOverdue: !!item?.hasOverdue,
                    hasStolen: !!item?.hasStolen,
                    openCount: typeof item?.openCount === 'number' ? item.openCount : (item?.openCount ? Number(item.openCount) : 0),
                    recommendedStage: item?.recommendedStage || undefined,
                    currentPeriod: item?.currentPeriod || null,
                    asOf: item?.asOf || undefined,
                };
            }
            return map;
        }
    } catch (e) {
        // Fall through to legacy full fetch if index is unavailable
    }

    // Fallback: build from full rentals list (legacy behavior)
    const response = await rentalsApi.fetchAll();
    const rentals = extractData(response);
    return rentals.reduce((acc, r) => {
        const vin = r?.vin ? String(r.vin) : '';
        if (!vin) return acc;
        const now = new Date();
        const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
        const open = !(returnedAt && now >= returnedAt) && r?.contractStatus !== '완료';
        if (!acc[vin]) acc[vin] = { hasActive: false, hasReserved: false, hasOverdue: false, hasStolen: false, openCount: 0 };
        if (open) {
            acc[vin].openCount += 1;
            const start = r?.rentalPeriod?.start ? new Date(r.rentalPeriod.start) : null;
            const end = r?.rentalPeriod?.end ? new Date(r.rentalPeriod.end) : null;
            if (r?.reportedStolen) acc[vin].hasStolen = true;
            if (start && end && now >= start && now <= end) acc[vin].hasActive = true;
            else if (end && now > end) acc[vin].hasOverdue = true;
            else if (start && now < start) acc[vin].hasReserved = true;
        }
        return acc;
    }, {});
}
export async function resolveVehicleRentals(vin) {
    const response = await rentalsApi.fetchByVin(vin);
    return extractData(response);
}

// Dashboard
export async function fetchDashboardData() {
    const response = await dashboardApi.fetchData();
    return extractData(response);
}

// Geofences/Settings
export async function fetchGeofences() {
    const response = await geofencesApi.fetchAll();
    return extractData(response);
}

// Create/Update/Delete Geofence
export async function createGeofence(data) {
    const response = await geofencesApi.create(data);
    if (response.status === API_STATUS.SUCCESS) {
        return extractData(response);
    }
    throw new Error(response.error?.message || 'Failed to create geofence');
}

export async function updateGeofence(id, data) {
    const response = await geofencesApi.update(id, data);
    if (response.status === API_STATUS.SUCCESS) {
        return true;
    }
    if (response.error?.type === 'NOT_FOUND' || response.error?.status === 404) {
        return false;
    }
    throw new Error(response.error?.message || 'Failed to update geofence');
}

export async function deleteGeofence(id) {
    const response = await geofencesApi.delete(id);
    if (response.status === API_STATUS.SUCCESS) {
        return true;
    }
    if (response.error?.type === 'NOT_FOUND' || response.error?.status === 404) {
        return false;
    }
    throw new Error(response.error?.message || 'Failed to delete geofence');
}
export async function fetchCompanyInfo() {
    const response = await companyApi.fetchInfo();
    return extractData(response);
}
export async function saveCompanyInfo(data) {
    const response = await companyApi.updateInfo(data);
    return response.status === API_STATUS.SUCCESS;
}
export const defaultCompanyInfo = { };

// Problem vehicles / issues
export async function fetchProblemVehicles() {
    const response = await problemVehiclesApi.fetchAll();
    return extractData(response);
}
export async function createIssueDraft(data) {
    const response = await issuesApi.create(data);
    if (response.status === API_STATUS.SUCCESS) {
        return createOperationResult(true, response.data);
    }
    return createOperationResult(false, null, response.error?.message || 'Failed to create issue');
}

// Upload helpers
export async function requestUploadSign({ fileName, contentType, folder }) {
    const response = await uploadsApi.sign({ fileName, contentType, folder });
    return extractData(response);
}

export async function requestResumableSession({ fileName, contentType, folder }) {
    const response = await uploadsApi.createSession({ fileName, contentType, folder });
    return extractData(response);
}

// OCR
export async function ocrExtract(requestBody) {
    const response = await ocrApi.extract(requestBody);
    return extractData(response);
}

// Auth
export async function login(credentials) {
    const response = await authApi.login(credentials);
    return extractData(response);
}

export async function signup(userData) {
    const response = await authApi.signup(userData);
    return extractData(response);
}

export async function checkUserId(userId) {
    const response = await authApi.checkUserId(userId);
    return extractData(response);
}

export async function getCurrentUser() {
    const response = await authApi.getCurrentUser();
    return extractData(response);
}

export async function forgotPassword(data) {
    // Returns true on success; throws with mapped message on error
    const response = await authApi.forgotPassword(data);
    if (response.status === API_STATUS.SUCCESS) {
        return true;
    }
    const type = response?.error?.type;
    if (type === 'NOT_FOUND') {
        throw new Error('해당 이메일의 사용자를 찾을 수 없습니다.');
    }
    throw new Error(response?.error?.message || '잠시 후 다시 시도해 주세요.');
}

export async function changePassword(data) {
    // data: { currentPassword, newPassword }
    const response = await authApi.changePassword(data);
    if (response.status === API_STATUS.SUCCESS) {
        return true;
    }
    // Surface backend-provided error message if available
    const msg = response?.error?.message || '비밀번호 변경에 실패했습니다.';
    throw new Error(msg);
}

// Members (approval & role management)
/**
 * Fetch all members (approved users)
 * @returns {Promise<Array>} Array of all user objects
 */
export async function fetchAllMembers() {
    const response = await membersApi.fetchAll();
    return extractData(response);
}

/**
 * Fetch list of pending members awaiting approval
 * @returns {Promise<Array>} Array of pending user objects
 */
export async function fetchPendingMembers() {
    const response = await membersApi.fetchPending();
    return extractData(response);
}

/**
 * Approve a pending member
 * @param {string} userId - User ID (email) to approve
 * @returns {Promise<boolean>} True if successful
 */
export async function approveMember(userId) {
    const response = await membersApi.approve(userId);
    return response.status === API_STATUS.SUCCESS;
}

/**
 * Reject a pending member
 * @param {string} userId - User ID (email) to reject
 * @param {string} [reason] - Optional rejection reason
 * @returns {Promise<boolean>} True if successful
 */
export async function rejectMember(userId, reason = null) {
    const response = await membersApi.reject(userId, reason);
    return response.status === API_STATUS.SUCCESS;
}

/**
 * Change a member's role
 * @param {string} userId - User ID (email) of the target member
 * @param {string} role - New role (admin | member | super_admin)
 * @returns {Promise<boolean>} True if successful
 */
export async function changeMemberRole(userId, role) {
    const response = await membersApi.changeRole(userId, role);
    return response.status === API_STATUS.SUCCESS;
}
