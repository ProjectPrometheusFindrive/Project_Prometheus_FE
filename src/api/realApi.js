// Real API client using standardized API client
// Enable via .env: VITE_USE_REAL_API=true and set VITE_API_BASE_URL

import {
    assetsApi,
    rentalsApi,
    vehiclesApi,
    dashboardApi,
    geofencesApi,
    companyApi,
    problemVehiclesApi,
    issuesApi
} from './apiClient';
import { API_STATUS, createOperationResult } from './apiTypes';

// Helper to extract data from standardized response
function extractData(response) {
    if (response.status === API_STATUS.SUCCESS) {
        return response.data;
    }
    throw new Error(response.error?.message || 'API request failed');
}

// Assets
export async function fetchAssets() {
    const response = await assetsApi.fetchAll();
    return extractData(response);
}
export async function fetchAssetById(id) {
    const response = await assetsApi.fetchById(id);
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

// Rentals
export async function fetchRentals() {
    const response = await rentalsApi.fetchAll();
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

// Vehicles snapshot
export async function fetchVehicles() {
    const response = await vehiclesApi.fetchAll();
    return extractData(response);
}
export async function buildRentalIndexByVin() {
    // This would need to be implemented in the API client if needed
    const response = await rentalsApi.fetchAll();
    const rentals = extractData(response);
    return rentals.reduce((acc, rental) => {
        if (rental.vin) {
            if (!acc[rental.vin]) acc[rental.vin] = [];
            acc[rental.vin].push(rental);
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
