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
  const returnedAt = toDate(r?.returned_at);
  return !!(returnedAt && now >= returnedAt);
}

/**
 * Compute high-level contract status from rental data.
 * Priority order:
 * - 완료: if returned_at is in the past
 * - 도난의심: if reported_stolen
 * - 반납지연: now > end and not returned
 * - 대여중: start <= now <= end
 * - 사고접수: accident_reported true
 * - 예약 중: start in future (or default when dates missing)
 * @param {object} r rental row
 * @param {Date} [now]
 * @returns {string}
 */
export function computeContractStatus(r, now = new Date()) {
  if (isReturned(r, now)) return "완료";
  const start = toDate(r?.rental_period?.start);
  const end = toDate(r?.rental_period?.end);
  const isStolen = Boolean(r?.reported_stolen);

  if (isStolen) return "도난의심";

  const hasEnd = !!end;
  const isOverdue = hasEnd && now > end;
  if (isOverdue) return "반납지연";

  const isActive = !!(start && end && now >= start && now <= end);
  if (isActive) return "대여중";

  if (r?.accident_reported) return "사고접수";

  const isFuture = !!(start && now < start);
  if (isFuture) return "예약 중";

  // Fallback
  return "예약 중";
}

