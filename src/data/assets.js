import { seedVehicles } from "./seed";

const deriveHistory = (a) => {
  if (Array.isArray(a.insuranceHistory)) return a.insuranceHistory;
  const info = a.insuranceInfo || a.insuranceCompany || "";
  const product = a.insuranceProduct || "";
  const expiry = a.insuranceExpiryDate || "";
  if (!info && !expiry) return [];
  // Derive start date from registration or 1 year before expiry
  let start = a.insuranceStartDate || a.registrationDate || "";
  if (!start && expiry) {
    try {
      const d = new Date(expiry);
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString().slice(0, 10);
    } catch {}
  }
  const company = info || "";
  const entry = {
    type: "등록",
    date: start || a.registrationDate || "",
    company,
    product,
    startDate: start || "",
    expiryDate: expiry || "",
    specialTerms: a.insuranceSpecialTerms || "",
    docName: a.insuranceDocName || "",
    docDataUrl: a.insuranceDocDataUrl || "",
  };
  return [entry];
};

export const assets = Object.values(seedVehicles)
  .map((v) => v && v.asset)
  .filter(Boolean)
  .map((a) => ({ ...a, insuranceHistory: deriveHistory(a) }));
