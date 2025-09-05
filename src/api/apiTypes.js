// API interface definitions and types for consistent API layer

export const API_ENDPOINTS = {
    // Assets
    ASSETS: '/assets',
    ASSET_BY_ID: (id) => `/assets/${encodeURIComponent(id)}`,
    
    // Rentals
    RENTALS: '/rentals',
    RENTAL_BY_ID: (id) => `/rentals/${encodeURIComponent(id)}`,
    LATEST_RENTALS: '/rentals/latest',
    RENTALS_BY_VIN: (vin) => `/rentals/byVin/${encodeURIComponent(vin)}`,
    RENTAL_INDEX_BY_VIN: '/rentals/indexByVin',
    
    // Vehicles
    VEHICLES: '/vehicles',
    
    // Dashboard
    DASHBOARD: '/dashboard',
    
    // Geofences
    GEOFENCES: '/geofences',
    
    // Company
    COMPANY: '/company',
    
    // Problem Vehicles
    PROBLEM_VEHICLES: '/problem-vehicles',
    
    // Issues
    ISSUES: '/issues'
};

// Response status enum
export const API_STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    LOADING: 'loading'
};

// Error types
export const API_ERRORS = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR'
};

// Standard API response wrapper
export function createApiResponse(data, status = API_STATUS.SUCCESS, error = null) {
    return {
        data,
        status,
        error,
        timestamp: new Date().toISOString()
    };
}

// Error handler for API calls
export function handleApiError(error, endpoint = 'unknown') {
    console.error(`API Error at ${endpoint}:`, error);
    
    if (!navigator.onLine) {
        return createApiResponse(null, API_STATUS.ERROR, {
            type: API_ERRORS.NETWORK_ERROR,
            message: 'Network connection unavailable'
        });
    }
    
    if (error.status === 404) {
        return createApiResponse(null, API_STATUS.ERROR, {
            type: API_ERRORS.NOT_FOUND,
            message: 'Resource not found'
        });
    }
    
    if (error.status === 401) {
        return createApiResponse(null, API_STATUS.ERROR, {
            type: API_ERRORS.UNAUTHORIZED,
            message: 'Authentication required'
        });
    }
    
    if (error.status >= 400 && error.status < 500) {
        return createApiResponse(null, API_STATUS.ERROR, {
            type: API_ERRORS.VALIDATION_ERROR,
            message: error.message || 'Request validation failed'
        });
    }
    
    return createApiResponse(null, API_STATUS.ERROR, {
        type: API_ERRORS.SERVER_ERROR,
        message: error.message || 'Server error occurred'
    });
}

// Validation helpers
export function validateId(id) {
    return id && typeof id === 'string' && id.trim().length > 0;
}

export function validateVin(vin) {
    return vin && typeof vin === 'string' && vin.length === 17;
}

// Common data transformers
export function transformAsset(asset) {
    return {
        ...asset,
        registrationDate: asset.registrationDate ? new Date(asset.registrationDate) : null,
        createdAt: asset.createdAt ? new Date(asset.createdAt) : null,
        updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : null
    };
}

export function transformRental(rental) {
    return {
        ...rental,
        rental_period: rental.rental_period ? {
            start: rental.rental_period.start ? new Date(rental.rental_period.start) : null,
            end: rental.rental_period.end ? new Date(rental.rental_period.end) : null
        } : null,
        createdAt: rental.createdAt ? new Date(rental.createdAt) : null,
        updatedAt: rental.updatedAt ? new Date(rental.updatedAt) : null
    };
}