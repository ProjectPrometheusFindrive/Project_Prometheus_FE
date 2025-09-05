// Real API client (placeholder). Replace endpoints with your backend.
// Enable via .env: VITE_USE_REAL_API=true and set VITE_API_BASE_URL

const BASE = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const json = (r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// Assets
export async function fetchAssets() {
  return fetch(`${BASE}/assets`).then(json);
}
export async function fetchAssetById(id) {
  return fetch(`${BASE}/assets/${encodeURIComponent(id)}`).then(json);
}

// Rentals
export async function fetchRentals() {
  return fetch(`${BASE}/rentals`).then(json);
}
export async function fetchRentalById(id) {
  return fetch(`${BASE}/rentals/${encodeURIComponent(id)}`).then(json);
}
export async function fetchLatestRentals() {
  return fetch(`${BASE}/rentals/latest`).then(json);
}

// Vehicles snapshot
export async function fetchVehicles() {
  return fetch(`${BASE}/vehicles`).then(json);
}
export async function buildRentalIndexByVin() {
  return fetch(`${BASE}/rentals/indexByVin`).then(json);
}
export async function resolveVehicleRentals(vin) {
  return fetch(`${BASE}/rentals/byVin/${encodeURIComponent(vin)}`).then(json);
}

// Dashboard
export async function fetchDashboardData() {
  return fetch(`${BASE}/dashboard`).then(json);
}

// Geofences/Settings
export async function fetchGeofences() {
  return fetch(`${BASE}/geofences`).then(json);
}
export async function fetchCompanyInfo() {
  return fetch(`${BASE}/company`).then(json);
}
export async function saveCompanyInfo(data) {
  const r = await fetch(`${BASE}/company`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  if (!r.ok) return false;
  return true;
}
export const defaultCompanyInfo = { };

// Problem vehicles / issues
export async function fetchProblemVehicles() {
  return fetch(`${BASE}/issues/vehicles`).then(json);
}
export async function createIssueDraft(data) {
  const r = await fetch(`${BASE}/issues/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  const ok = r.ok;
  if (!ok) return { ok: false, error: `HTTP ${r.status}` };
  return { ok: true, data: await r.json().catch(() => (data || {})) };
}

