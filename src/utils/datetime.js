// Date/time formatting utilities

// Format to YY.MM.DD HH:MM:SS
export function formatYyMmDdHhMmSs(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    const yy = String(d.getFullYear()).slice(-2);
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yy}.${MM}.${dd} ${hh}:${mm}:${ss}`;
  } catch {
    return String(value);
  }
}

export default {
  formatYyMmDdHhMmSs,
};

