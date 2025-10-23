// Unified API client with consistent error handling and response formatting

import {
    API_ENDPOINTS,
    handleApiError,
    createApiResponse,
    API_STATUS,
    validateId,
    validateVin,
    transformAsset,
    transformRental,
    toCamelRentalPayload,
    API_ERRORS
} from './apiTypes';
import { typedStorage } from '../utils/storage';
import { emitToast } from '../utils/toast';

let unauthorizedGuard = false;
function handleUnauthorized(message) {
    if (unauthorizedGuard) return;
    unauthorizedGuard = true;
    try {
        typedStorage.auth.logout();
    } catch {}
    try {
        emitToast(message || '인증이 만료되었거나 무효화되었습니다. 다시 로그인해 주세요.', 'error', 4000);
    } catch {}
    try {
        // Using HashRouter; send to login route
        if (typeof window !== 'undefined') {
            const dest = '#/';
            if (window.location.hash !== dest) {
                window.location.hash = dest;
            }
        }
    } catch {}
    setTimeout(() => { unauthorizedGuard = false; }, 1500);
}

function handleForbidden(message) {
    try {
        emitToast(message || '접근 권한이 없습니다.', 'warning', 3500);
    } catch {}
}

// Base URL and configuration
const getBaseUrl = () => {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return base.replace(/\/$/, '');
};

// Generic fetch wrapper with error handling
async function apiRequest(endpoint, options = {}) {
    try {
        const baseUrl = getBaseUrl();
        const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

        // Extract custom options we don't want to pass to fetch
        const { timeoutMs, signal: userSignal, ...restOptions } = options || {};

        // Merge options with safe headers (avoid being overwritten by spreading order)
        const method = (restOptions.method || 'GET').toUpperCase();
        const baseHeaders = (restOptions && restOptions.headers) ? restOptions.headers : {};

        // Add authentication token if available
        const token = typedStorage.auth.getToken();
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

        const headers = {
            ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
            ...authHeaders,
            ...baseHeaders,
        };

        const controller = userSignal ? null : new AbortController();
        const fetchOptions = {
            ...restOptions,
            headers,
            ...(controller ? { signal: controller.signal } : { signal: userSignal })
        };

        // Timeout handling via AbortController (default 15s)
        const ms = typeof timeoutMs === 'number' && isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000;
        let timer = null;
        if (controller) {
            timer = setTimeout(() => {
                try { controller.abort(); } catch {}
            }, ms);
        }

        const response = await fetch(url, fetchOptions);
        if (timer) clearTimeout(timer);

        const status = response.status;
        const contentType = response.headers.get('content-type') || '';

        // No Content responses
        if (status === 204 || status === 205) {
            return createApiResponse(null);
        }

        // Try to parse response according to content-type
        const parseJson = async () => {
            try {
                return await response.json();
            } catch {
                return null;
            }
        };
        const parseText = async () => {
            try {
                return await response.text();
            } catch {
                return '';
            }
        };

        let payload = null;
        if (contentType.includes('application/json')) {
            payload = await parseJson();
        } else {
            // If content-type is not JSON, attempt text (may still be empty)
            payload = await parseText();
        }

        // Handle backend-wrapped logical errors (HTTP 200 with { status: 'error' })
        if (contentType.includes('application/json') && payload && typeof payload === 'object' && 'status' in payload) {
            const innerStatus = String(payload.status || '').toLowerCase();
            if (innerStatus && innerStatus !== 'success') {
                const errorType = payload?.error?.type;
                const err = new Error(payload?.error?.message || payload?.message || `HTTP ${status}: ${response.statusText}`);
                err.status = payload?.error?.type === 'AUTH_ERROR' ? 401 : (status || 400);
                err.statusText = response.statusText;
                err.url = url;
                err.data = payload;
                err.errorType = errorType;

                if (err.status === 401) {
                    const msg = payload?.error?.message || payload?.message || '인증이 만료되었거나 무효화되었습니다.';
                    handleUnauthorized(msg);
                } else if (errorType === API_ERRORS.APPROVAL_PENDING || errorType === API_ERRORS.APPROVAL_REJECTED) {
                    // Don't auto-handle these - let the caller (Login page) handle them
                    // Just toast the message for user awareness
                    const msg = payload?.error?.message || payload?.message;
                    if (msg) {
                        try {
                            emitToast(msg, errorType === API_ERRORS.APPROVAL_PENDING ? 'warning' : 'error', 4000);
                        } catch {}
                    }
                }
                throw err;
            }
        }

        if (!response.ok) {
            const errorType = payload?.error?.type;
            const err = new Error(`HTTP ${status}: ${response.statusText}`);
            // Preserve status details for upper-layer error handling
            err.status = status;
            err.statusText = response.statusText;
            err.url = url;
            err.data = payload;
            err.errorType = errorType;

            if (status === 401) {
                const msg = (payload && (payload.error?.message || payload.message)) || '인증이 만료되었거나 무효화되었습니다.';
                // Avoid global unauthorized handling for login endpoint
                if (endpoint !== API_ENDPOINTS.AUTH_LOGIN) {
                    handleUnauthorized(msg);
                }
            } else if (status === 403) {
                // Check if this is an approval-related 403
                if (errorType === API_ERRORS.APPROVAL_PENDING || errorType === API_ERRORS.APPROVAL_REJECTED) {
                    // Don't auto-handle these - let the caller (Login page) handle them
                    const msg = (payload && (payload.error?.message || payload.message));
                    if (msg) {
                        try {
                            emitToast(msg, errorType === API_ERRORS.APPROVAL_PENDING ? 'warning' : 'error', 4000);
                        } catch {}
                    }
                } else {
                    // Regular forbidden error
                    const msg = (payload && (payload.error?.message || payload.message)) || '접근 권한이 없습니다.';
                    handleForbidden(msg);
                }
            }
            throw err;
        }

        return createApiResponse(payload);
    } catch (error) {
        // Normalize AbortError shape (optional)
        if (error && (error.name === 'AbortError' || error.message?.toLowerCase().includes('aborted'))) {
            error.status = error.status || 0;
            error.statusText = error.statusText || 'Request aborted';
        }
        if (error && error.status === 401) {
            const msg = (error.data && (error.data.error?.message || error.data.message)) || '인증이 만료되었거나 무효화되었습니다.';
            // Avoid global unauthorized handling for login endpoint
            if (endpoint !== API_ENDPOINTS.AUTH_LOGIN) {
                handleUnauthorized(msg);
            }
        } else if (error && error.status === 403) {
            const msg = (error.data && (error.data.error?.message || error.data.message)) || '접근 권한이 없습니다.';
            handleForbidden(msg);
        }
        return handleApiError(error, endpoint);
    }
}

// Asset API methods
export const assetsApi = {
    async fetchAll() {
        const response = await apiRequest(API_ENDPOINTS.ASSETS);
        if (response.status === API_STATUS.SUCCESS && Array.isArray(response.data)) {
            response.data = response.data.map(transformAsset);
        }
        return response;
    },

    async fetchSummary() {
        // Lightweight list for table views
        const response = await apiRequest(API_ENDPOINTS.ASSETS_SUMMARY);
        // Keep as-is; consumer formats dates. Optionally normalize known dates.
        if (response.status === API_STATUS.SUCCESS && Array.isArray(response.data)) {
            // Ensure registrationDate stays parseable; leave insuranceExpiryDate as-is (string or Date)
            response.data = response.data.map((a) => ({
                ...a,
                registrationDate: a && a.registrationDate ? new Date(a.registrationDate) : a?.registrationDate || null,
            }));
        }
        return response;
    },
    
    async fetchById(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        
        const response = await apiRequest(API_ENDPOINTS.ASSET_BY_ID(id));
        if (response.status === API_STATUS.SUCCESS && response.data) {
            response.data = transformAsset(response.data);
        }
        return response;
    },

    async fetchProfile(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        const response = await apiRequest(API_ENDPOINTS.ASSET_PROFILE(id));
        if (response.status === API_STATUS.SUCCESS && response.data) {
            response.data = transformAsset(response.data);
        }
        return response;
    },

    async fetchInsurance(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        return await apiRequest(API_ENDPOINTS.ASSET_INSURANCE(id));
    },

    async fetchDevice(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        return await apiRequest(API_ENDPOINTS.ASSET_DEVICE(id));
    },

    async fetchDiagnostics(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        return await apiRequest(API_ENDPOINTS.ASSET_DIAGNOSTICS(id));
    },
    
    async create(assetData) {
        return await apiRequest(API_ENDPOINTS.ASSETS, {
            method: 'POST',
            body: JSON.stringify(assetData)
        });
    },
    
    async update(id, assetData) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        
        return await apiRequest(API_ENDPOINTS.ASSET_BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(assetData)
        });
    },
    
    async delete(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        
        return await apiRequest(API_ENDPOINTS.ASSET_BY_ID(id), {
            method: 'DELETE'
        });
    },

    async fetchMemoHistory(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid asset ID'
            });
        }
        return await apiRequest(API_ENDPOINTS.ASSET_MEMO_HISTORY(id));
    }
};

// Rental API methods
export const rentalsApi = {
    async fetchSummary() {
        const response = await apiRequest(API_ENDPOINTS.RENTALS_SUMMARY);
        if (response.status === API_STATUS.SUCCESS && Array.isArray(response.data)) {
            response.data = response.data.map(transformRental);
        }
        return response;
    },
    async fetchAll() {
        const response = await apiRequest(API_ENDPOINTS.RENTALS);
        if (response.status === API_STATUS.SUCCESS && Array.isArray(response.data)) {
            response.data = response.data.map(transformRental);
        }
        return response;
    },
    
    async fetchById(id) {
        if (!validateId(id)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid rental ID'
            });
        }
        
        const response = await apiRequest(API_ENDPOINTS.RENTAL_BY_ID(id));
        if (response.status === API_STATUS.SUCCESS && response.data) {
            response.data = transformRental(response.data);
        }
        return response;
    },
    
    async fetchLatest() {
        const response = await apiRequest(API_ENDPOINTS.LATEST_RENTALS);
        if (response.status === API_STATUS.SUCCESS && Array.isArray(response.data)) {
            response.data = response.data.map(transformRental);
        }
        return response;
    },
    
    async fetchByVin(vin) {
        if (!validateVin(vin)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid VIN format'
            });
        }
        
        const response = await apiRequest(API_ENDPOINTS.RENTALS_BY_VIN(vin));
        if (response.status === API_STATUS.SUCCESS && response.data) {
            if (Array.isArray(response.data)) {
                response.data = response.data.map(transformRental);
            } else if (response.data.current) {
                response.data.current = transformRental(response.data.current);
            }
        }
        return response;
    },
    
    async fetchIndexByVin() {
        // Returns aggregated consistency info per VIN.
        // Server may return an array of { vin, hasActive, hasReserved, hasOverdue, hasStolen, ... }
        // or a map keyed by VIN. We pass through raw data; upper layer normalizes.
        return await apiRequest(API_ENDPOINTS.RENTAL_INDEX_BY_VIN);
    },
    
    async create(rentalData) {
        const payload = toCamelRentalPayload(rentalData);
        return await apiRequest(API_ENDPOINTS.RENTALS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async update(id, rentalData) {
        if (!validateId(id) && typeof id !== 'number') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid rental ID'
            });
        }
        const rid = typeof id === 'number' ? id : String(id);
        const payload = toCamelRentalPayload(rentalData);
        return await apiRequest(API_ENDPOINTS.RENTAL_BY_ID(rid), {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    async delete(id) {
        if (!validateId(id) && typeof id !== 'number') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid rental ID'
            });
        }
        const rid = typeof id === 'number' ? id : String(id);
        return await apiRequest(API_ENDPOINTS.RENTAL_BY_ID(rid), {
            method: 'DELETE'
        });
    },

    async fetchMemoHistory(id) {
        if (!validateId(id) && typeof id !== 'number') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid rental ID'
            });
        }
        const rid = typeof id === 'number' ? id : String(id);
        return await apiRequest(API_ENDPOINTS.RENTAL_MEMO_HISTORY(rid));
    }
};

// Vehicle API methods
export const vehiclesApi = {
    async fetchAll() {
        return await apiRequest(API_ENDPOINTS.VEHICLES);
    }
};

// Dashboard API methods
export const dashboardApi = {
    async fetchData() {
        return await apiRequest(API_ENDPOINTS.DASHBOARD);
    }
};

// Geofences API methods
export const geofencesApi = {
    async fetchAll() {
        return await apiRequest(API_ENDPOINTS.GEOFENCES);
    },

    async create(geofenceData) {
        return await apiRequest(API_ENDPOINTS.GEOFENCES, {
            method: 'POST',
            body: JSON.stringify(geofenceData)
        });
    },

    async update(id, geofenceData) {
        if (!id && id !== 0) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid geofence ID'
            });
        }
        return await apiRequest(API_ENDPOINTS.GEOFENCE_BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(geofenceData)
        });
    },

    async delete(id) {
        if (!id && id !== 0) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: 'VALIDATION_ERROR',
                message: 'Invalid geofence ID'
            });
        }
        return await apiRequest(API_ENDPOINTS.GEOFENCE_BY_ID(id), {
            method: 'DELETE'
        });
    }
};

// Company API methods
export const companyApi = {
    async fetchInfo() {
        return await apiRequest(API_ENDPOINTS.COMPANY);
    },
    
    async updateInfo(companyData) {
        return await apiRequest(API_ENDPOINTS.COMPANY, {
            method: 'PUT',
            body: JSON.stringify(companyData)
        });
    }
};

// Problem Vehicles API methods
export const problemVehiclesApi = {
    async fetchAll() {
        const response = await apiRequest(API_ENDPOINTS.PROBLEM_VEHICLES);
        if (response.status === API_STATUS.SUCCESS && Array.isArray(response.data)) {
            response.data = response.data.map(transformRental);
        }
        return response;
    }
};

// Issues API methods
export const issuesApi = {
    async create(issueData) {
        return await apiRequest(API_ENDPOINTS.ISSUES, {
            method: 'POST',
            body: JSON.stringify(issueData)
        });
    }
};

// Uploads API methods (signing + resumable session)
export const uploadsApi = {
    async sign(body) {
        // body: { fileName: string, contentType?: string, folder?: string }
        return await apiRequest(API_ENDPOINTS.UPLOAD_SIGN, {
            method: 'POST',
            body: JSON.stringify(body || {})
        });
    },
    async createSession(body) {
        // body: { fileName: string, contentType?: string, folder?: string }
        return await apiRequest(API_ENDPOINTS.UPLOAD_RESUMABLE, {
            method: 'POST',
            body: JSON.stringify(body || {})
        });
    }
};

// OCR API methods
export const ocrApi = {
    /**
     * Extract OCR suggestions for a given document type
     * body: {
     *   docType: 'registrationDoc'|'insuranceDoc'|'contract'|'amortizationSchedule'|'driverLicense',
     *   objectName?: string,
     *   text?: string,
     *   sourceName?: string,
     *   saveOutput?: boolean
     * }
     */
    async extract(body) {
        return await apiRequest(API_ENDPOINTS.OCR_EXTRACT, {
            method: 'POST',
            body: JSON.stringify(body || {})
        });
    }
};

// Auth API methods
export const authApi = {
    async login(credentials) {
        // credentials: { userId, password }
        return await apiRequest(API_ENDPOINTS.AUTH_LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async signup(userData) {
        // userData: { userId, password, name, phone, email, position, company, bizRegNo, bizCertUrl }
        // Primary: /auth/register (preferred)
        let resp = await apiRequest(API_ENDPOINTS.AUTH_SIGNUP, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        // Fallback for legacy BE path: /auth/signup
        if (resp && resp.status === API_STATUS.ERROR && resp.error && resp.error.type === API_ERRORS.NOT_FOUND) {
            resp = await apiRequest(API_ENDPOINTS.AUTH_SIGNUP_LEGACY, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        }
        return resp;
    },

    async checkUserId(userId) {
        // Check if userId (email) is available
        const params = new URLSearchParams({ userId });
        return await apiRequest(`${API_ENDPOINTS.AUTH_CHECK_USERID}?${params.toString()}`);
    },

    async getCurrentUser() {
        // Get current authenticated user info
        return await apiRequest(API_ENDPOINTS.AUTH_ME);
    },

    async forgotPassword(data) {
        // data: { userId }
        return await apiRequest(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async changePassword(data) {
        // data: { currentPassword, newPassword }
        return await apiRequest(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// Members API methods (approval & role management)
export const membersApi = {
    /**
     * Fetch all members (approved users)
     * @returns {Promise<Object>} Response with array of all users
     */
    async fetchAll() {
        return await apiRequest(API_ENDPOINTS.MEMBERS);
    },

    /**
     * Fetch list of pending members awaiting approval
     * @returns {Promise<Object>} Response with array of pending users
     */
    async fetchPending() {
        return await apiRequest(API_ENDPOINTS.MEMBERS_PENDING);
    },

    /**
     * Approve a pending member
     * @param {string} userId - User ID (email) to approve
     * @returns {Promise<Object>} Response with success status
     */
    async approve(userId) {
        if (!userId || typeof userId !== 'string') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: API_ERRORS.VALIDATION_ERROR,
                message: 'userId is required'
            });
        }

        return await apiRequest(API_ENDPOINTS.MEMBERS_APPROVE, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    },

    /**
     * Reject a pending member
     * @param {string} userId - User ID (email) to reject
     * @param {string} [reason] - Optional rejection reason
     * @returns {Promise<Object>} Response with success status
     */
    async reject(userId, reason = null) {
        if (!userId || typeof userId !== 'string') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: API_ERRORS.VALIDATION_ERROR,
                message: 'userId is required'
            });
        }

        const payload = { userId };
        if (reason) {
            payload.reason = reason;
        }

        return await apiRequest(API_ENDPOINTS.MEMBERS_REJECT, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    /**
     * Change a member's role
     * @param {string} userId - User ID (email) of the target member
     * @param {string} role - New role (admin | member | super_admin)
     * @returns {Promise<Object>} Response with success status
     */
    async changeRole(userId, role) {
        if (!userId || typeof userId !== 'string') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: API_ERRORS.VALIDATION_ERROR,
                message: 'userId is required'
            });
        }

        if (!role || !['admin', 'member', 'super_admin'].includes(role)) {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: API_ERRORS.VALIDATION_ERROR,
                message: 'Invalid role. Must be: admin, member, or super_admin'
            });
        }

        return await apiRequest(API_ENDPOINTS.MEMBER_ROLE(userId), {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    },

    /**
     * Withdraw (deactivate) a member
     * @param {string} userId - User ID (email) to withdraw; if self, pass current user's ID
     * @returns {Promise<Object>} Response with success status
     */
    async withdraw(userId) {
        if (!userId || typeof userId !== 'string') {
            return createApiResponse(null, API_STATUS.ERROR, {
                type: API_ERRORS.VALIDATION_ERROR,
                message: 'userId is required'
            });
        }
        return await apiRequest(API_ENDPOINTS.MEMBERS_WITHDRAW, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    }
};
