import seed from "./seed.json";
// seed.json is a VIN-keyed map: { [vin]: { vin, asset, rental } }
const seedVehicles = seed || {};

// Export all rentals flattened from all vehicles
export const rentals = Object.values(seedVehicles)
  .map((v) => v && v.rental)
  .filter(Boolean)
  .flat();
