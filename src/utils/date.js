// Lightweight date helpers used across pages

export function safeDate(value) {
  try {
    return value ? new Date(value) : null;
  } catch {
    return null;
  }
}

// Returns `'yy.mm.dd` style (e.g., '25.09.05)
export function formatDateShort(value) {
  // null, undefined, 빈 문자열 체크
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  try {
    const d = new Date(value);
    // Invalid Date 체크
    if (isNaN(d.getTime())) {
      return '-';
    }
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `'${yy}.${mm}.${dd}`;
  } catch {
    return '-';
  }
}

// Returns localized display date or '-'
export function formatDisplayDate(value, locale) {
  const d = safeDate(value);
  return d ? d.toLocaleDateString(locale) : "-";
}

// Returns insurance expiry status based on today
export function getInsuranceExpiryStatus(expiryDate) {
  const expiry = safeDate(expiryDate);
  if (!expiry) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "warning";
  if (diffDays <= 60) return "caution";
  return "valid";
}

export default {
  safeDate,
  formatDateShort,
  formatDisplayDate,
  getInsuranceExpiryStatus,
};
