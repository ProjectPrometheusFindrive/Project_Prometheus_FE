import seedVehicles from "./seed.json";

const deriveHistory = (a) => {
  // If seed already supplies full history, use it as‑is
  if (Array.isArray(a.insuranceHistory)) return a.insuranceHistory;

  const info = a.insuranceInfo || a.insuranceCompany || "";
  const product = a.insuranceProduct || "";
  const expiry = a.insuranceExpiryDate || "";
  if (!info && !expiry) return [];

  // Derive current cycle (start/expiry)
  let start = a.insuranceStartDate || a.registrationDate || "";
  if (!start && expiry) {
    try {
      const d = new Date(expiry);
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString().slice(0, 10);
    } catch {}
  }
  const company = info || "";
  const current = {
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

  // Also synthesize one previous cycle for demo richness when we have a valid start
  let prev = null;
  if (current.startDate) {
    try {
      const s = new Date(current.startDate);
      const prevStart = new Date(s);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      prev = {
        type: "갱신",
        date: prevStart.toISOString().slice(0, 10),
        company,
        product,
        startDate: prevStart.toISOString().slice(0, 10),
        expiryDate: current.startDate,
        specialTerms: a.insuranceSpecialTerms || "",
        docName: a.insuranceDocName || "",
        docDataUrl: a.insuranceDocDataUrl || "",
      };
    } catch {}
  }

  return prev ? [prev, current] : [current];
};

const computeDiagnosticStatus = (a) => {
  try {
    if (!a || !a.deviceSerial) return "-";
    const now = new Date();
    const exp = a.insuranceExpiryDate ? new Date(a.insuranceExpiryDate) : null;
    if (exp && (exp - now) / (1000 * 60 * 60 * 24) <= 30) return "관심필요";
    return "정상";
  } catch {
    return "-";
  }
};

export const assets = Object.values(seedVehicles)
  .map((v) => v && v.asset)
  .filter(Boolean)
  .map((a) => {
    const withHistory = { ...a, insuranceHistory: deriveHistory(a) };
    return withHistory.diagnosticStatus
      ? withHistory
      : { ...withHistory, diagnosticStatus: computeDiagnosticStatus(withHistory) };
  });
