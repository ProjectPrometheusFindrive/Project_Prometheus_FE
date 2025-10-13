// Real API only: export API bindings (no fake variant)
import * as api from "./api";

export default api;
export const {
  // Common slices
  fetchAssets,
  fetchAssetsSummary,
  fetchAssetById,
  createAsset,
  saveAsset,
  deleteAsset,
  fetchAssetMemoHistory,
  fetchRentals,
  fetchRentalById,
  fetchLatestRentals,
  createRental,
  updateRental,
  deleteRental,
  fetchRentalMemoHistory,
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
