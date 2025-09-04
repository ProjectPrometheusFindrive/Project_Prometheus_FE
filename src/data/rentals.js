import { seedVehicles } from "./seed";

// Export only the latest rental per VIN (as stored in the unified seed)
export const rentals = Object.values(seedVehicles)
  .map((v) => v && v.rental)
  .filter(Boolean);
