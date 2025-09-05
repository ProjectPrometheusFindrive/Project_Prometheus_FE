// Fake API built on top of the unified dummy DB
// - Provides page-specific slices without changing existing pages yet
// - Encapsulates logic for vehicles with multiple rentals

import { db, buildIndexes } from "../data/db";
import { loadCompanyInfo as _loadCompanyInfo, saveCompanyInfo as _saveCompanyInfo, defaultCompanyInfo as _defaultCompanyInfo } from "../data/company";

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const parseDate = (s) => (s ? new Date(s) : null);

const now = () => new Date();

// Derive VIN for assets when missing by correlating plate from rentals
const enrichAssets = () => {
  const { byPlate, rentalsByVin } = buildIndexes();
  // Build plate->vin (most recent rental per plate wins)
  const plateToVin = new Map();
  for (const [vin, list] of rentalsByVin.entries()) {
    for (const r of list) {
      if (r?.plate) {
        const p = String(r.plate);
        const prev = plateToVin.get(p);
        const ts = parseDate(r?.rental_period?.start)?.getTime?.() || 0;
        const prevTs = prev?.ts || 0;
        if (!prev || ts >= prevTs) plateToVin.set(p, { vin, ts });
      }
    }
  }

  return deepClone(db.assets).map((a) => {
    if (!a?.vin && a?.plate && plateToVin.has(String(a.plate))) {
      return { ...a, vin: plateToVin.get(String(a.plate)).vin };
    }
    return a;
  });
};

// Resolve rentals grouped by VIN with status partitions and conflict detection
const groupRentalsByVin = () => {
  const map = new Map();
  const t = now();
  for (const r of db.rentals) {
    const vin = r?.vin ? String(r.vin) : "";
    if (!vin) continue;
    if (!map.has(vin)) map.set(vin, []);
    const start = parseDate(r?.rental_period?.start);
    const end = parseDate(r?.rental_period?.end);
    const isActive = start && end ? t >= start && t <= end : false;
    const isOverdue = end ? t > end : false;
    const isReserved = start ? t < start : false;
    const isStolen = Boolean(r?.reported_stolen);
    map.get(vin).push({ ...r, _flags: { isActive, isOverdue, isReserved, isStolen } });
  }
  return map;
};

const resolveCurrentPerVin = (list) => {
  const t = now();
  const stolen = list.filter((x) => x._flags.isStolen);
  const active = list.filter((x) => x._flags.isActive);
  const overdue = list.filter((x) => x._flags.isOverdue);
  const reserved = list.filter((x) => x._flags.isReserved);

  const pickLatestBy = (arr, getter) => {
    if (arr.length === 0) return null;
    return arr.reduce((acc, x) => {
      const v = getter(x);
      const vv = v ? v.getTime() : 0;
      const aa = acc ? (getter(acc)?.getTime?.() || 0) : 0;
      return vv >= aa ? x : acc;
    }, null);
  };

  // Priority: stolen > active > overdue > reserved
  let current = null;
  if (stolen.length > 0) current = pickLatestBy(stolen, (x) => parseDate(x?.rental_period?.start));
  else if (active.length === 1) current = active[0];
  else if (active.length > 1) current = pickLatestBy(active, (x) => parseDate(x?.rental_period?.start));
  else if (overdue.length > 0) current = pickLatestBy(overdue, (x) => parseDate(x?.rental_period?.end));
  else if (reserved.length > 0) current = pickLatestBy(reserved, (x) => parseDate(x?.rental_period?.start));

  const conflicts = active.length > 1 ? active.filter((x) => x !== current) : [];

  return {
    current,
    stolen,
    active,
    overdue,
    reserved,
    conflicts,
    asOf: t.toISOString(),
  };
};

// Public API

// Assets
export async function fetchAssets() {
  return enrichAssets();
}

export async function fetchAssetById(id) {
  const assets = await fetchAssets();
  return assets.find((a) => String(a.id) === String(id)) || null;
}

// Rentals
export async function fetchRentals() {
  return deepClone(db.rentals);
}

export async function fetchRentalById(rentalId) {
  const list = await fetchRentals();
  const rid = String(rentalId);
  // Apply localStorage edits/drafts overlay similar to Detail.jsx behavior
  try {
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
    return list.find((r) => String(r.rental_id) === rid) || null;
  }
}

// Geofences
export async function fetchGeofences() {
  // Prefer companyInfo.geofences
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
  // Fallback: legacy storage key
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
  return deepClone(db.geofences) || [];
}

// Page-focused helpers
export async function fetchProblemVehicles() {
  const rentals = await fetchRentals();
  const assets = await fetchAssets();
  const assetByVin = new Map(assets.filter((a) => a?.vin).map((a) => [String(a.vin), a]));
  const t = now();
  return rentals
    .map((r) => {
      const end = parseDate(r?.rental_period?.end);
      const overdueDays = end ? Math.floor((t - end) / (1000 * 60 * 60 * 24)) : 0;
      const isOverdue = overdueDays > 0;
      const isStolen = Boolean(r?.reported_stolen);
      if (!(isOverdue || isStolen)) return null;
      const a = r?.vin ? assetByVin.get(String(r.vin)) : null;
      return {
        rental_id: r.rental_id,
        vin: r.vin,
        plate: r.plate || a?.plate || "",
        vehicleType: r.vehicleType || a?.vehicleType || "",
        renter_name: r.renter_name,
        contact_number: r.contact_number,
        rental_period: r.rental_period,
        insurance_name: r.insurance_name,
        current_location: r.current_location,
        issue: isStolen ? "stolen" : `overdue(${overdueDays}d)`,
        asset: a || null,
      };
    })
    .filter(Boolean);
}

// Create an issue draft entry in localStorage (simple fake persistence)
export async function createIssueDraft(data) {
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

// Vehicle-centric view: resolve current/active/overdue/reserved/conflicts per VIN
export async function resolveVehicleRentals(vin) {
  const byVin = groupRentalsByVin();
  const key = String(vin || "");
  if (!byVin.has(key)) return { current: null, stolen: [], active: [], overdue: [], reserved: [], conflicts: [], asOf: now().toISOString() };
  return resolveCurrentPerVin(byVin.get(key));
}

// Inventory-level snapshot: map of vin -> status partitions
export async function buildRentalIndexByVin() {
  const byVin = groupRentalsByVin();
  const out = {};
  for (const [vin, list] of byVin.entries()) {
    out[vin] = resolveCurrentPerVin(list);
  }
  return out;
}

// Latest-only rentals: one rental per VIN (based on most recent start date)
export async function fetchLatestRentals() {
  // If static seed vehicles exist, use them
  if (db?.vehicles) {
    return Object.values(db.vehicles)
      .map((v) => v?.rental)
      .filter(Boolean)
      .map((r) => ({ ...r }));
  }
  // Fallback: compute from rentals
  const list = await fetchRentals();
  const byVin = new Map();
  const safeDate = (s) => (s ? new Date(s) : null);
  for (const r of list) {
    const vin = r?.vin ? String(r.vin) : null;
    if (!vin) continue;
    const prev = byVin.get(vin);
    const ts = safeDate(r?.rental_period?.start)?.getTime() || 0;
    const prevTs = prev ? safeDate(prev?.rental_period?.start)?.getTime() || 0 : 0;
    if (!prev || ts >= prevTs) byVin.set(vin, r);
  }
  return Array.from(byVin.values());
}

// Dashboard slices: asset registration status distribution + business status counts
export async function fetchDashboardData() {
  const assets = await fetchAssets();
  const rentals = await fetchRentals();

  // Registration status distribution
  const counts = new Map();
  for (const a of assets) {
    const k = a?.registrationStatus || "unknown";
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const vehicleStatus = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));

  // Business status counts
  const t = now();
  let reserved = 0;
  let active = 0;
  let overdue = 0;
  let incidents = 0; // stolen
  for (const r of rentals) {
    const start = parseDate(r?.rental_period?.start);
    const end = parseDate(r?.rental_period?.end);
    if (r?.reported_stolen) incidents += 1;
    if (start && t < start) reserved += 1;
    else if (start && end && t >= start && t <= end) active += 1;
    else if (end && t > end) overdue += 1;
  }
  const bizStatus = [
    { name: "reserved", value: reserved || 1 },
    { name: "active", value: active || 1 },
    { name: "incidents", value: incidents || 1 },
    { name: "overdue", value: overdue || 1 },
  ];

  return { vehicleStatus, bizStatus };
}

// Unified vehicle view: merge asset + rentals per VIN (or by plate heuristic)
export async function fetchVehicles() {
  const assets = await fetchAssets();
  const byVinGroups = groupRentalsByVin();
  const vehicles = [];

  // Include all assets
  for (const a of assets) {
    const vin = a?.vin ? String(a.vin) : "";
    const list = vin && byVinGroups.has(vin) ? byVinGroups.get(vin) : [];
    const status = vin ? resolveCurrentPerVin(list) : { current: null, stolen: [], active: [], overdue: [], reserved: [], conflicts: [], asOf: new Date().toISOString() };
    vehicles.push({
      vin: vin || null,
      assetId: a?.id || null,
      plate: a?.plate || null,
      asset: a,
      rentals: list,
      status,
    });
  }

  // Also include rentals without a matching asset
  for (const [vin, list] of byVinGroups.entries()) {
    const hasAsset = vehicles.some((v) => v.vin && vin && String(v.vin) === String(vin));
    if (!hasAsset) {
      vehicles.push({
        vin,
        assetId: null,
        plate: list?.[0]?.plate || null,
        asset: null,
        rentals: list,
        status: resolveCurrentPerVin(list),
      });
    }
  }

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
