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
  fetchRentalLocation,
  fetchRentalLocations,
  fetchLatestRentals,
  createRental,
  updateRental,
  deleteRental,
  fetchRentalMemoHistory,
  fetchRentalAccidentDetail,
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
  ocrExtract,
  // Upload helpers
  requestUploadSign,
  requestResumableSession,
  sendFax,

  // Auth
  login,
  signup,
  checkUserId,
  getCurrentUser,
  forgotPassword,
  changePassword,
  
  // Members (approval & role management)
  fetchAllMembers,
  fetchPendingMembers,
  approveMember,
  rejectMember,
  changeMemberRole,
  withdrawMember,
  restoreMember,
  submitTerminalRequest,

  // Support
  createSupportTicket,

  // Revenue
  fetchRevenueData,
} = api;
