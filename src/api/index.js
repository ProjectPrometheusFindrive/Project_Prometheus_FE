// Real API only: export API bindings (no fake variant)
import * as api from "./api";

export default api;
export const {
  // Common slices
  fetchAssets,
  fetchAssetsSummary,
  fetchAssetById,
  fetchAssetProfile,
  fetchAssetInsurance,
  fetchAssetDevice,
  fetchAssetDiagnostics,
  createAsset,
  saveAsset,
  deleteAsset,
  fetchAssetMemoHistory,
  fetchRentals,
  fetchRentalsSummary,
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
  // Upload helpers
  requestUploadSign,
  requestResumableSession,

  // Auth
  login,
  signup,
  checkUserId,
  getCurrentUser,
  forgotPassword,
  changePassword,
} = api;
