// Contract status utilities
// Provides a single source of truth for determining a rental's status

/**
 * Parse ISO-like date string to Date, returns null on invalid
 * @param {string|Date|null|undefined} v
 * @returns {Date|null}
 */
export function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Whether the rental is returned at or before now
 * @param {object} r
 * @param {Date} [now]
 */
export function isReturned(r, now = new Date()) {
  const returnedAt = toDate(r?.returnedAt);
  return !!(returnedAt && now >= returnedAt);
}

/**
 * Compute high-level contract status from rental data.
 * Priority order:
 * - 완료: if returnedAt is in the past
 * - 도난의심: if reportedStolen
 * - 반납지연: now > end and not returned
 * - 대여중: start <= now <= end
 * - 사고접수: accidentReported true
 * - 예약 중: start in future (or default when dates missing)
 * @param {object} r rental row
 * @param {Date} [now]
 * @returns {string}
 */
export function computeContractStatus(r, now = new Date()) {
  if (isReturned(r, now)) return "완료";
  const start = toDate(r?.rentalPeriod?.start);
  const end = toDate(r?.rentalPeriod?.end);
  const isStolen = Boolean(r?.reportedStolen);

  if (isStolen) return "도난의심";

  const hasEnd = !!end;
  const isOverdue = hasEnd && now > end;
  if (isOverdue) return "반납지연";

  const isActive = !!(start && end && now >= start && now <= end);
  if (isActive) return "대여중";

  if (r?.accidentReported) return "사고접수";

  const isFuture = !!(start && now < start);
  if (isFuture) return "예약 중";

  // Fallback
  return "예약 중";
}

/**
 * Classify rental into coarse categories for aggregations.
 * Returns one of: 'ACTIVE' | 'OVERDUE' | 'RESERVED' | 'STOLEN' | 'COMPLETED' | 'ACCIDENT' | 'UNKNOWN'
 */
export function classifyRental(r, now = new Date()) {
  const status = computeContractStatus(r, now);
  switch (status) {
    case "완료":
      return "COMPLETED";
    case "도난의심":
      return "STOLEN";
    case "반납지연":
      return "OVERDUE";
    case "대여중":
      return "ACTIVE";
    case "사고접수":
      return "ACCIDENT";
    case "예약 중":
      return "RESERVED";
    default:
      return "UNKNOWN";
  }
}

/**
 * Extract normalized interval fields from rental.
 */
export function rentalInterval(r) {
  return {
    start: toDate(r?.rentalPeriod?.start),
    end: toDate(r?.rentalPeriod?.end),
    returnedAt: toDate(r?.returnedAt),
  };
}

/**
 * Check if two closed intervals [a.start, a.end] and [b.start, b.end] overlap.
 */
export function intervalsOverlap(a, b) {
  if (!a || !b) return false;
  if (!a.start || !a.end || !b.start || !b.end) return false;
  return a.start <= b.end && b.start <= a.end;
}
