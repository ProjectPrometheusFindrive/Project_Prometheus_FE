// Fake API built on top of fake backend server
// - Makes HTTP requests to local fake backend server
// - Provides page-specific slices without changing existing pages yet

import { loadCompanyInfo as _loadCompanyInfo, saveCompanyInfo as _saveCompanyInfo, defaultCompanyInfo as _defaultCompanyInfo } from "../data/company";

const API_BASE_URL = import.meta.env.VITE_FAKE_API_BASE_URL || 'http://localhost:3001/api';

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const parseDate = (s) => (s ? new Date(s) : null);
const now = () => new Date();

// HTTP helper functions
const fetchJSON = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error: ${url}`, error);
    throw error;
  }
};

const postJSON = async (url, data) => {
  return fetchJSON(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const putJSON = async (url, data) => {
  return fetchJSON(url, {
    method: 'PUT', 
    body: JSON.stringify(data),
  });
};

const deleteRequest = async (url) => {
  return fetch(url, { method: 'DELETE' });
};

// Simplified helper functions (most logic moved to backend)

// Legacy functions for backward compatibility (simplified or delegated to backend)

// Public API

// Assets
export async function fetchAssets() {
  try {
    const assets = await fetchJSON(`${API_BASE_URL}/assets`);
    return normalizeAssets(assets);
  } catch (error) {
    // Fallback to local seed data if server is not available
    console.warn('Falling back to local seed data for assets');
    const { assets } = await import('../data/assets');
    return normalizeAssets(assets);
  }
}

// Attach/derive current insurance + device info from history when present
function normalizeAssets(arr) {
  if (!Array.isArray(arr)) return [];
  const today = new Date();
  return arr.map((asset) => {
    const a = { ...asset };
    // --- Insurance normalization ---
    let hist = Array.isArray(a.insuranceHistory) ? [...a.insuranceHistory] : [];
    // If missing, synthesize a single entry from top-level fields
    if (hist.length === 0 && (a.insuranceInfo || a.insuranceCompany || a.insuranceExpiryDate)) {
      let start = a.insuranceStartDate || a.registrationDate || '';
      const expiry = a.insuranceExpiryDate || '';
      if (!start && expiry) {
        try { const d = new Date(expiry); d.setFullYear(d.getFullYear() - 1); start = d.toISOString().slice(0,10); } catch {}
      }
      const company = a.insuranceCompany || a.insuranceInfo || '';
      const product = a.insuranceProduct || '';
      hist = [{
        type: '등록',
        date: start || a.registrationDate || '',
        company,
        product,
        startDate: start || '',
        expiryDate: expiry || '',
        specialTerms: a.insuranceSpecialTerms || '',
        docName: a.insuranceDocName || '',
        docDataUrl: a.insuranceDocDataUrl || '',
      }];
    }
    // Ensure sorted by effective date (start/date) ascending
    hist.sort((x, y) => new Date(x.startDate || x.date || 0) - new Date(y.startDate || y.date || 0));

    // Pick current entry: active by date range, else the latest by start/expiry
    let current = null;
    if (hist.length > 0) {
      current =
        hist.find((h) => {
          const start = h.startDate ? new Date(h.startDate) : null;
          const end = h.expiryDate ? new Date(h.expiryDate) : null;
          if (start && today < start) return false;
          if (end && today > end) return false;
          return true;
        }) || hist[hist.length - 1];
    }

    if (current) {
      const company = current.company || a.insuranceCompany || a.insuranceInfo || "";
      const product = current.product || a.insuranceProduct || "";
      a.insuranceInfo = [company, product].filter(Boolean).join(" ").trim();
      a.insuranceCompany = company;
      a.insuranceProduct = product;
      a.insuranceStartDate = current.startDate || a.insuranceStartDate || "";
      a.insuranceExpiryDate = current.expiryDate || a.insuranceExpiryDate || "";
      a.insuranceSpecialTerms = current.specialTerms || a.insuranceSpecialTerms || "";
      a.insuranceDocName = current.docName || a.insuranceDocName || "";
      a.insuranceDocDataUrl = current.docDataUrl || a.insuranceDocDataUrl || "";
      a.insuranceHistory = hist;
    }

    // --- Device normalization ---
    let dhist = Array.isArray(a.deviceHistory) ? [...a.deviceHistory] : [];
    // If not provided, synthesize from top-level fields
    if (dhist.length === 0 && (a.deviceInstallDate || a.deviceSerial || a.installer)) {
      dhist = [
        {
          type: 'install',
          date: a.deviceInstallDate || a.registrationDate || '',
          installDate: a.deviceInstallDate || '',
          serial: a.deviceSerial || '',
          installer: a.installer || '',
        }
      ];
    }
    if (dhist.length > 0) {
      dhist.sort((x, y) => new Date(x.installDate || x.date || 0) - new Date(y.installDate || y.date || 0));
      const dcur = dhist[dhist.length - 1];
      a.deviceInstallDate = dcur.installDate || dcur.date || a.deviceInstallDate || '';
      a.deviceSerial = dcur.serial || a.deviceSerial || '';
      a.installer = dcur.installer || a.installer || '';
      a.deviceHistory = dhist;
    }
    return a;
  });
}

export async function fetchAssetById(id) {
  const a = await fetchJSON(`${API_BASE_URL}/assets/${id}`);
  const [norm] = normalizeAssets([a]);
  return norm || a;
}

export async function saveAsset(assetId, updatedFields) {
  try {
    // In a real API, this would be a PUT or PATCH request to the server
    return await putJSON(`${API_BASE_URL}/assets/${assetId}`, updatedFields);
  } catch (error) {
    console.warn(`Falling back to local seed data for saveAsset for ${assetId}`, error);
    const { db } = await import('../data/db');
    const assetIndex = db.assets.findIndex(asset => asset.id === assetId);
    if (assetIndex > -1) {
      const prev = db.assets[assetIndex];
      // Merge insurance history carefully
      let merged = { ...prev, ...updatedFields };
      if (Array.isArray(prev.insuranceHistory) || Array.isArray(updatedFields.insuranceHistory)) {
        const hist = Array.isArray(prev.insuranceHistory) ? [...prev.insuranceHistory] : [];
        const patchHist = Array.isArray(updatedFields.insuranceHistory) ? updatedFields.insuranceHistory : [];
        // If patchHist looks like an append of last entry, de-dup by date+company+product
        const key = (h) => [h.date || h.startDate || "", h.company || "", h.product || ""].join("#");
        const seen = new Set(hist.map(key));
        const appended = [...hist];
        for (const h of patchHist) {
          const k = key(h);
          if (!seen.has(k)) {
            appended.push(h);
            seen.add(k);
          }
        }
        appended.sort((x, y) => new Date(x.startDate || x.date || 0) - new Date(y.startDate || y.date || 0));
        merged.insuranceHistory = appended;
      }
      db.assets[assetIndex] = merged;
      return merged;
    }
    throw new Error(`Asset with ID ${assetId} not found for update.`);
  }
}

// Rentals
export async function fetchRentals() {
  try {
    return await fetchJSON(`${API_BASE_URL}/rentals`);
  } catch (error) {
    // Fallback to local seed data if server is not available
    console.warn('Falling back to local seed data for rentals');
    const { rentals } = await import('../data/rentals');
    return rentals;
  }
}

export async function fetchRentalById(rentalId) {
  try {
    return await fetchJSON(`${API_BASE_URL}/rentals/${rentalId}`);
  } catch (error) {
    // Fallback to localStorage drafts/edits if server fails
    try {
      const list = await fetchRentals();
      const rid = String(rentalId);
      const base = [...list];
      const draftsRaw = localStorage.getItem("rentalDrafts");
      if (draftsRaw) {
        const drafts = JSON.parse(draftsRaw);
        if (Array.isArray(drafts)) {
          drafts.forEach((d) => {
            if (!d || !d.rental_id) return;
            if (!base.find((x) => String(x.rental_id) === String(d.rental_id))) {
              base.push({ ...d, rental_period: d.rental_period || { start: d.start || "", end: d.end || "" } });
            }
          });
        }
      }
      const editsRaw = localStorage.getItem("rentalEdits");
      let found = base.find((r) => String(r.rental_id) === rid) || null;
      if (found && editsRaw) {
        const edits = JSON.parse(editsRaw) || {};
        const patch = edits[rid];
        if (patch) {
          found = { ...found, ...patch };
          if (!found.rental_period) found.rental_period = { start: found.start || "", end: found.end || "" };
        }
      }
      return found;
    } catch {
      return null;
    }
  }
}

// Geofences
export async function fetchGeofences() {
  try {
    // Try server first
    return await fetchJSON(`${API_BASE_URL}/geofences`);
  } catch (error) {
    // Fallback to localStorage
    try {
      const ciRaw = localStorage.getItem("companyInfo");
      if (ciRaw) {
        const ci = JSON.parse(ciRaw);
        const arr = Array.isArray(ci?.geofences) ? ci.geofences : [];
        const items = arr
          .map((it, i) => {
            if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
            if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
            return null;
          })
          .filter(Boolean);
        if (items.length > 0) return items;
      }
    } catch {}
    // Final fallback: legacy storage key
    try {
      const raw = localStorage.getItem("geofenceSets");
      if (raw) {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed?.geofences) ? parsed.geofences : [];
        const items = arr
          .map((it, i) => {
            if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
            if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
            return null;
          })
          .filter(Boolean);
        if (items.length > 0) return items;
      }
    } catch {}
    return [];
  }
}

// Page-focused helpers
export async function fetchProblemVehicles() {
  return await fetchJSON(`${API_BASE_URL}/problem-vehicles`);
}

// Create an issue draft entry 
export async function createIssueDraft(data) {
  try {
    return await postJSON(`${API_BASE_URL}/issue-drafts`, data);
  } catch (error) {
    // Fallback to localStorage
    try {
      const arr = JSON.parse(localStorage.getItem("issueDrafts") || "[]");
      const payload = { ...data, createdAt: new Date().toISOString() };
      arr.push(payload);
      localStorage.setItem("issueDrafts", JSON.stringify(arr));
      return { ok: true, data: payload };
    } catch (e) {
      console.error("createIssueDraft failed", e);
      return { ok: false, error: e?.message || String(e) };
    }
  }
}

// Simplified legacy functions
export async function resolveVehicleRentals(vin) {
  // Simplified - just return basic structure for compatibility
  return { current: null, stolen: [], active: [], overdue: [], reserved: [], conflicts: [], asOf: now().toISOString() };
}

export async function buildRentalIndexByVin() {
  // Simplified - return empty object for compatibility
  return {};
}

// Latest-only rentals: one rental per VIN (based on most recent start date)
export async function fetchLatestRentals() {
  return await fetchJSON(`${API_BASE_URL}/rentals/latest`);
}

// Dashboard slices: asset registration status distribution + business status counts
export async function fetchDashboardData() {
  try {
    return await fetchJSON(`${API_BASE_URL}/dashboard`);
  } catch (error) {
    // Fallback to local seed data if server is not available
    console.warn('Falling back to local seed data for dashboard');
    const { db } = await import('../data/db');

    // Calculate asset registration status distribution
    const registrationStats = {};
    db.assets.forEach(asset => {
      const status = asset.registrationStatus || '미등록';
      registrationStats[status] = (registrationStats[status] || 0) + 1;
    });

    // Calculate business status counts
    const businessStats = {};
    db.assets.forEach(asset => {
      const status = asset.vehicleStatus || '준비중';
      businessStats[status] = (businessStats[status] || 0) + 1;
    });

    // Total counts
    const totalVehicles = db.assets.length;
    const activeRentals = db.rentals.length;

    // Convert to array format
    const vehicleStatusArray = Object.keys(registrationStats).map(name => ({
      name,
      value: registrationStats[name]
    }));

    // Convert to array format
    const bizStatusArray = Object.keys(businessStats).map(name => ({
      name,
      value: businessStats[name]
    }));

    return {
      vehicleStatus: vehicleStatusArray, // Changed from registrationStats
      bizStatus: bizStatusArray,         // Changed from businessStats
      totalVehicles,
      activeRentals,
      timestamp: new Date().toISOString()
    };
  }
}

// Simplified vehicle view (most pages don't need this complex logic)
export async function fetchVehicles() {
  const assets = await fetchAssets();
  const rentals = await fetchRentals();
  
  // Simple merge by VIN
  const vehicles = assets.map(asset => {
    const rental = rentals.find(r => r.vin === asset.vin);
    return {
      vin: asset.vin,
      assetId: asset.id,
      plate: asset.plate,
      asset,
      rentals: rental ? [rental] : [],
      status: { current: rental || null, stolen: [], active: [], overdue: [], reserved: [], conflicts: [], asOf: new Date().toISOString() },
    };
  });
  
  return vehicles;
}

// Company info (settings)
export const defaultCompanyInfo = _defaultCompanyInfo;
export async function fetchCompanyInfo() {
  return _loadCompanyInfo();
}
export async function saveCompanyInfo(data) {
  return _saveCompanyInfo(data);
}
