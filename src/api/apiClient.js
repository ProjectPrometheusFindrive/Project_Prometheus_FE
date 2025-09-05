// Unified API client with consistent error handling and response formatting

import { 
    API_ENDPOINTS, 
    handleApiError, 
    createApiResponse, 
    API_STATUS,
    validateId,
    validateVin,
    transformAsset,
    transformRental
} from './apiTypes';

// Base URL and configuration
const getBaseUrl = () => {
    const base = import.meta?.env?.VITE_API_BASE_URL || '';
    return base.replace(/\/$/, '');
};

// Generic fetch wrapper with error handling
async function apiRequest(endpoint, options = {}) {
    try {
        const baseUrl = getBaseUrl();
        const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return createApiResponse(data);
        
    } catch (error) {
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
        return await apiRequest(API_ENDPOINTS.RENTALS, {
            method: 'POST',
            body: JSON.stringify(rentalData)
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
        return await apiRequest(API_ENDPOINTS.PROBLEM_VEHICLES);
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