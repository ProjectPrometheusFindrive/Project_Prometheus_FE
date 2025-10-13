// API interface definitions and types for consistent API layer

export const API_ENDPOINTS = {
    // Assets
    ASSETS: '/assets',
    ASSETS_SUMMARY: '/assets/summary',
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
    GEOFENCE_BY_ID: (id) => `/geofences/${encodeURIComponent(id)}`,
    
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
    if (!asset || typeof asset !== 'object') return asset;
    return {
        ...asset,
        registrationDate: asset.registrationDate ? new Date(asset.registrationDate) : null,
        createdAt: asset.createdAt ? new Date(asset.createdAt) : null,
        updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : null
    };
}

export function transformRental(rental) {
    if (!rental || typeof rental !== 'object') return rental;
    const period = rental.rentalPeriod && typeof rental.rentalPeriod === 'object' ? rental.rentalPeriod : null;
    return {
        ...rental,
        rentalId: rental.rentalId ?? rental.id ?? null,
        renterName: rental.renterName ?? '',
        contactNumber: rental.contactNumber ?? '',
        insuranceName: rental.insuranceName ?? '',
        rentalAmount: rental.rentalAmount ?? null,
        rentalType: rental.rentalType,
        paymentMethod: rental.paymentMethod,
        contractStatus: rental.contractStatus,
        engineStatus: rental.engineStatus,
        restartBlocked: Boolean(rental.restartBlocked),
        accidentReported: Boolean(rental.accidentReported),
        returnedAt: rental.returnedAt ? new Date(rental.returnedAt) : null,
        reportedStolen: Boolean(rental.reportedStolen),
        unpaidAmount: typeof rental.unpaidAmount === 'number' ? rental.unpaidAmount : (rental.unpaidAmount == null ? undefined : Number(rental.unpaidAmount)),
        rentalDurationDays: typeof rental.rentalDurationDays === 'number' ? rental.rentalDurationDays : (rental.rentalDurationDays == null ? undefined : Number(rental.rentalDurationDays)),
        currentLocation: rental.currentLocation,
        rentalLocation: rental.rentalLocation,
        returnLocation: rental.returnLocation,
        locationUpdatedAt: rental.locationUpdatedAt ? new Date(rental.locationUpdatedAt) : null,
        rentalPeriod: period ? { start: period.start ? new Date(period.start) : null, end: period.end ? new Date(period.end) : null } : null,
        createdAt: rental.createdAt ? new Date(rental.createdAt) : null,
        updatedAt: rental.updatedAt ? new Date(rental.updatedAt) : null,
    };
}

// Convert outgoing rental payload to camelCase for backend
export function toCamelRentalPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const out = { ...payload };
    if (payload.rentalPeriod) {
        out.rentalPeriod = {
            start: payload.rentalPeriod.start ?? '',
            end: payload.rentalPeriod.end ?? '',
        };
    }
    return out;
}

// Standard operation result format
export function createOperationResult(success, data = null, error = null) {
    return {
        ok: success,
        data: success ? data : null,
        error: success ? null : error
    };
}
