import seed from "./seed.json";
// seed.json is a VIN-keyed map: { [vin]: { vin, asset, rental } }
const seedVehicles = seed || {};

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
    if (!a || !a.deviceSerial || !String(a.deviceSerial).trim()) return "-";
    const list = Array.isArray(a?.diagnosticCodes) ? a.diagnosticCodes : [];
    const toNum = (x) => {
      const v = x?.severity;
      if (typeof v === 'number') return Math.max(0, Math.min(10, v));
      if (typeof v === 'string') {
        const m = v.trim();
        if (m === '낮음') return 2;
        if (m === '보통') return 5;
        if (m === '높음') return 8;
        const n = parseFloat(m);
        return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
      }
      return 0;
    };
    const max = list.reduce((acc, it) => Math.max(acc, toNum(it)), 0);
    if (max <= 3) return '정상';
    if (max <= 7) return '관심필요';
    return '심각';
  } catch {
    return '-';
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
