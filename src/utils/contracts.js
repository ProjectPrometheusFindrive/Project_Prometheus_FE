// Contract status utilities
// Server contractStatus is the source of truth. Keep minimal fallbacks only.

import { normalizeContractStatus } from "../constants/contractState";

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
 * Resolve contract status.
 * Uses server-provided status first and only applies a small compatibility fallback.
 * @param {object} r rental row
 * @param {Date} [now]
 * @returns {string}
 */
export function computeContractStatus(r, now = new Date()) {
  const fromServer = normalizeContractStatus(r?.contractStatus);
  if (fromServer) return fromServer;
  if (isReturned(r, now)) return "종결";
  return "";
}

/**
 * Classify rental into coarse categories for aggregations.
 * Returns one of: 'ACTIVE' | 'OVERDUE' | 'RESERVED' | 'STOLEN' | 'COMPLETED' | 'ACCIDENT' | 'UNKNOWN'
 */
export function classifyRental(r, now = new Date()) {
  const status = computeContractStatus(r, now);
  switch (status) {
    case "종결":
      return "COMPLETED";
    case "대여중":
      return "ACTIVE";
    case "예약확정":
    case "체크아웃대기":
    case "문의":
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
