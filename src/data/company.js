// Default company info seed and helpers
// Load raw JSON defaults and geofences from files instead of hardcoded JS.
import defaultInfo from "./company-info.json";
import geofences from "./geofences.json";

export const defaultCompanyInfo = {
  corpName: "",
  ceoName: "",
  regNumber: "",
  incorpDate: "",
  address: "",
  logoDataUrl: "",
  certDataUrl: "",
  geofences: Array.isArray(geofences) ? geofences : [],
  geofencesUpdatedAt: null,
  ...(defaultInfo || {}),
  // If defaultInfo provides geofences, prefer that; otherwise use geofences.json
  geofences: Array.isArray(defaultInfo?.geofences)
    ? defaultInfo.geofences
    : Array.isArray(geofences)
    ? geofences
    : [],
};

export const COMPANY_STORAGE_KEY = "companyInfo";

export function loadCompanyInfo() {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (!raw) return { ...defaultCompanyInfo };
    const parsed = JSON.parse(raw);
    // Ensure required keys exist in case of older saved schema
    return {
      ...defaultCompanyInfo,
      ...(parsed || {}),
      geofences: Array.isArray(parsed?.geofences)
        ? parsed.geofences
        : Array.isArray(defaultCompanyInfo.geofences)
        ? defaultCompanyInfo.geofences
        : [],
    };
  } catch {
    return { ...defaultCompanyInfo };
  }
}

export function saveCompanyInfo(data) {
  try {
    const merged = { ...defaultCompanyInfo, ...(data || {}) };
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}
