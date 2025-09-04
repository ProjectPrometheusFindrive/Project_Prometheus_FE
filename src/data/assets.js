import { seedVehicles } from "./seed";

export const assets = Object.values(seedVehicles)
  .map((v) => v && v.asset)
  .filter(Boolean);
