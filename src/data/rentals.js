import { seedVehicles } from "./seed";

// Export all rentals flattened from all vehicles
export const rentals = Object.values(seedVehicles)
  .map((v) => v && v.rental)
  .filter(Boolean)
  .flat();
