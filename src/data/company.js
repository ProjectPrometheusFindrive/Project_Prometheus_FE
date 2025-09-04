// Default company info seed and helpers
// Geofences are stored together with company info to centralize settings.

import { dummyGeofences } from "./geofences";

export const defaultCompanyInfo = {
  corpName: "",
  ceoName: "",
  regNumber: "",
  incorpDate: "",
  address: "",
  logoDataUrl: "",
  certDataUrl: "",
  geofences: Array.isArray(dummyGeofences) ? dummyGeofences : [],
  geofencesUpdatedAt: null,
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
        : Array.isArray(dummyGeofences)
        ? dummyGeofences
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

