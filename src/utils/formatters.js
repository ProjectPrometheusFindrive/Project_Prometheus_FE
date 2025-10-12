// Utility formatting helpers for inputs
// - Phone: 000-0000-0000 style, limit to 11 digits
// - Currency: add thousands separators (integers only)

export function digitsOnly(value) {
  return String(value ?? "").replace(/\D+/g, "");
}

export function formatPhone11(value) {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function formatCurrency(value) {
  const d = digitsOnly(value);
  if (!d) return "";
  // Remove leading zeros while preserving a single zero if all zeros
  const normalized = d.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parseCurrency(value) {
  const d = digitsOnly(value);
  return d ? Number(d) : 0;
}

