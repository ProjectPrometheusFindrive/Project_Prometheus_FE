// Real API only: always export real API bindings
import * as api from "./realApi";

export default api;
export const {
  // Common slices
  fetchAssets,
  fetchAssetById,
  saveAsset,
  fetchRentals,
  fetchRentalById,
  fetchLatestRentals,
  createRental,
  updateRental,
  fetchVehicles,
  buildRentalIndexByVin,
  resolveVehicleRentals,

  // Dashboard
  fetchDashboardData,

  // Geofences/Settings
  fetchGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  fetchCompanyInfo,
  saveCompanyInfo,
  defaultCompanyInfo,

  // Problem vehicles / issues
  fetchProblemVehicles,
  createIssueDraft,
} = api;
