// API interface definitions and types for consistent API layer

export const API_ENDPOINTS = {
    // Auth
    AUTH_LOGIN: '/auth/login',
    // Preferred path (align BE): use /auth/register; keep legacy alias for fallback
    AUTH_SIGNUP: '/auth/register',
    AUTH_SIGNUP_LEGACY: '/auth/signup',
    AUTH_CHECK_USERID: '/auth/check-userid',
    AUTH_ME: '/auth/me',

    // Assets
    ASSETS: '/assets',
    ASSETS_SUMMARY: '/assets/summary',
    ASSET_BY_ID: (id) => `/assets/${encodeURIComponent(id)}`,
    ASSET_PROFILE: (id) => `/assets/${encodeURIComponent(id)}/profile`,
    ASSET_INSURANCE: (id) => `/assets/${encodeURIComponent(id)}/insurance`,
    ASSET_DEVICE: (id) => `/assets/${encodeURIComponent(id)}/device`,
    ASSET_DIAGNOSTICS: (id) => `/assets/${encodeURIComponent(id)}/diagnostics`,
    ASSET_MEMO_HISTORY: (id) => `/assets/${encodeURIComponent(id)}/memoHistory`,

    // Rentals
    RENTALS: '/rentals',
    RENTALS_SUMMARY: '/rentals/summary',
    RENTAL_BY_ID: (id) => `/rentals/${encodeURIComponent(id)}`,
    LATEST_RENTALS: '/rentals/latest',
    RENTALS_BY_VIN: (vin) => `/rentals/byVin/${encodeURIComponent(vin)}`,
    RENTAL_INDEX_BY_VIN: '/rentals/indexByVin',
    RENTAL_MEMO_HISTORY: (id) => `/rentals/${encodeURIComponent(id)}/memoHistory`,

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
    ISSUES: '/issues',

    // Uploads (GCS direct upload helpers)
    UPLOAD_SIGN: '/uploads/sign',
    UPLOAD_RESUMABLE: '/uploads/resumable'
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
    CONFLICT: 'CONFLICT',
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
    
    if (error.status === 409) {
        return createApiResponse(null, API_STATUS.ERROR, {
            type: API_ERRORS.CONFLICT,
            message: '이미 존재하는 아이디입니다.'
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
    // Normalize possible snake_case keys from backend
    const normalized = {
        ...rental,
        rentalId: rental.rentalId ?? rental.rental_id ?? rental.id ?? null,
        renterName: rental.renterName ?? rental.renter_name ?? '',
        contactNumber: rental.contactNumber ?? rental.contact_number ?? '',
        insuranceName: rental.insuranceName ?? rental.insurance_name ?? '',
        rentalAmount: rental.rentalAmount ?? rental.rental_amount ?? null,
        contractStatus: rental.contractStatus ?? rental.contract_status,
        engineStatus: rental.engineStatus ?? rental.engine_status,
        restartBlocked: Boolean(rental.restartBlocked ?? rental.restart_blocked),
        accidentReported: Boolean(rental.accidentReported ?? rental.accident_reported),
        returnedAt: rental.returnedAt ? new Date(rental.returnedAt) : (rental.returned_at ? new Date(rental.returned_at) : null),
        reportedStolen: Boolean(rental.reportedStolen ?? rental.reported_stolen),
        rentalDurationDays: (typeof rental.rentalDurationDays === 'number')
            ? rental.rentalDurationDays
            : (rental.rental_duration_days == null ? undefined : Number(rental.rental_duration_days)),
        currentLocation: rental.currentLocation ?? rental.current_location,
        rentalLocation: rental.rentalLocation ?? rental.rental_location,
        returnLocation: rental.returnLocation ?? rental.return_location,
        locationUpdatedAt: rental.locationUpdatedAt
            ? new Date(rental.locationUpdatedAt)
            : (rental.location_updated_at ? new Date(rental.location_updated_at) : null),
        createdAt: rental.createdAt ? new Date(rental.createdAt) : (rental.created_at ? new Date(rental.created_at) : null),
        updatedAt: rental.updatedAt ? new Date(rental.updatedAt) : (rental.updated_at ? new Date(rental.updated_at) : null),
    };
    const periodRaw = rental.rentalPeriod || rental.rental_period || null;
    const rentalPeriod = periodRaw && typeof periodRaw === 'object'
        ? {
            start: periodRaw.start ? new Date(periodRaw.start) : null,
            end: periodRaw.end ? new Date(periodRaw.end) : null,
        }
        : null;
    return {
        ...normalized,
        rentalPeriod,
    };
}

// Convert outgoing rental payload to camelCase for backend
export function toCamelRentalPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const out = { ...payload };
    // Ensure dates are in ISO string for safety
    const normDate = (d) => {
        if (!d) return '';
        try {
            return typeof d === 'string' ? d : (d instanceof Date ? d.toISOString() : String(d));
        } catch { return String(d); }
    };
    // Mirror rentalPeriod into both camelCase and snake_case
    if (payload.rentalPeriod) {
        out.rentalPeriod = {
            start: normDate(payload.rentalPeriod.start ?? ''),
            end: normDate(payload.rentalPeriod.end ?? ''),
        };
        out.rental_period = {
            start: out.rentalPeriod.start,
            end: out.rentalPeriod.end,
        };
    }
    // Add snake_case mirrors for backends that expect them
    if ('rentalId' in payload) out.rental_id = payload.rentalId;
    if ('renterName' in payload) out.renter_name = payload.renterName;
    if ('contactNumber' in payload) out.contact_number = payload.contactNumber;
    if ('insuranceName' in payload) out.insurance_name = payload.insuranceName;
    if ('rentalAmount' in payload) out.rental_amount = payload.rentalAmount;
    if ('contractStatus' in payload) out.contract_status = payload.contractStatus;
    if ('engineStatus' in payload) out.engine_status = payload.engineStatus;
    if ('restartBlocked' in payload) out.restart_blocked = payload.restartBlocked;
    if ('reportedStolen' in payload) out.reported_stolen = payload.reportedStolen;
    if ('returnConfirmed' in payload) out.return_confirmed = payload.returnConfirmed;
    if ('accidentReported' in payload) out.accident_reported = payload.accidentReported;
    if ('rentalLocation' in payload) out.rental_location = payload.rentalLocation;
    if ('returnLocation' in payload) out.return_location = payload.returnLocation;
    if ('currentLocation' in payload) out.current_location = payload.currentLocation;
    // accidentReport stays camelCase as per OpenAPI
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
