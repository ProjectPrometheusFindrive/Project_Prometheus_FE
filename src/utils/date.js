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
  try {
    const d = new Date(value);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `'${yy}.${mm}.${dd}`;
  } catch {
    return value || "";
  }
}

// Returns localized display date or '-'
export function formatDisplayDate(value, locale) {
  const d = safeDate(value);
  return d ? d.toLocaleDateString(locale) : "-";
}

export default {
  safeDate,
  formatDateShort,
  formatDisplayDate,
};

