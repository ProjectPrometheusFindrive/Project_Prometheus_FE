// API switcher: export real API when configured, otherwise fake API
// Usage: set VITE_USE_REAL_API=true and VITE_API_BASE_URL in your .env to enable real API.

// Default to fake API unless explicitly turned on
const useReal = (import.meta?.env?.VITE_USE_REAL_API || "").toString().toLowerCase() === "true";

import * as real from "./realApi";
import * as fake from "./fakeApi";
const api = useReal ? real : fake;

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
  fetchCompanyInfo,
  saveCompanyInfo,
  defaultCompanyInfo,

  // Problem vehicles / issues
  fetchProblemVehicles,
  createIssueDraft,
} = api;
