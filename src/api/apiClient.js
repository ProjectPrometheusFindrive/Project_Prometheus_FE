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
    toCamelRentalPayload
} from './apiTypes';

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
        const headers = {
            ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
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

        if (!response.ok) {
            const err = new Error(`HTTP ${status}: ${response.statusText}`);
            // Preserve status details for upper-layer error handling
            err.status = status;
            err.statusText = response.statusText;
            err.url = url;
            err.data = payload;
            throw err;
        }

        return createApiResponse(payload);
    } catch (error) {
        // Normalize AbortError shape (optional)
        if (error && (error.name === 'AbortError' || error.message?.toLowerCase().includes('aborted'))) {
            error.status = error.status || 0;
            error.statusText = error.statusText || 'Request aborted';
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
    }
};

// Rental API methods
export const rentalsApi = {
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
