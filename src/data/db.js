// Unified dummy database: centralizes vehicles, assets, rentals, and geofences
// Now vehicles is the single source of truth; assets/rentals are derived.

import seed from "./seed.json";
// seed.json is a VIN-keyed map: { [vin]: { vin, asset, rental } }
const seedVehicles = seed || {};
import { dummyGeofences as seedGeofences } from "./geofences";

// Derive assets and rentals from vehicles
const assetsFromVehicles = Object.values(seedVehicles)
  .map((v) => v && v.asset)
  .filter(Boolean);
const rentalsFromVehicles = Object.values(seedVehicles)
  .map((v) => v && v.rental)
  .filter(Boolean)
  .flat();

// Expose a single in-memory DB object
export const db = {
  vehicles: seedVehicles,
  assets: assetsFromVehicles,
  rentals: rentalsFromVehicles,
  geofences: seedGeofences,
};

// Helpers for consumers who want quick lookups
export const buildIndexes = () => {
  const byAssetId = new Map();
  const byPlate = new Map();
  const byVin = new Map();
  for (const a of db.assets) {
    if (a?.id) byAssetId.set(String(a.id), a);
    if (a?.plate) byPlate.set(String(a.plate), a);
    if (a?.vin) byVin.set(String(a.vin), a);
  }
  const rentalsByVin = new Map();
  for (const r of db.rentals) {
    const v = r?.vin ? String(r.vin) : "";
    if (!v) continue;
    if (!rentalsByVin.has(v)) rentalsByVin.set(v, []);
    rentalsByVin.get(v).push(r);
  }
  return { byAssetId, byPlate, byVin, rentalsByVin };
};
