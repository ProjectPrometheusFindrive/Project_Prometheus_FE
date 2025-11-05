// Column filtering utilities
// Provides helpers to apply column-based filters to a dataset.

import { safeDate } from "./date";

// Normalize primitive for comparison
function normalizeString(v) {
  if (v == null) return "";
  try {
    return String(v).toLowerCase();
  } catch {
    return "";
  }
}

function parseNumber(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9+\-.]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseDateStrict(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const d = safeDate(v);
    return d && !isNaN(d) ? d : null;
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

// Access helper: prefer filterAccessor > accessor > row[key]
function getFilterValue(row, col) {
  if (!col) return undefined;
  if (typeof col.filterAccessor === "function") return col.filterAccessor(row);
  if (typeof col.accessor === "function") return col.accessor(row);
  if (typeof col.key === "string") return row?.[col.key];
  return undefined;
}

// Predicate builders per filter type
function buildTextPredicate(filter) {
  const term = normalizeString(filter?.value || "").trim();
  if (!term) return () => true;
  return (v) => normalizeString(v).includes(term);
}

function buildBooleanPredicate(filter) {
  const val = filter?.value;
  if (val === undefined) return () => true;
  if (val === "unknown" || val === null) {
    return (v) => v == null || v === "";
  }
  return (v) => Boolean(v) === Boolean(val);
}

function buildSelectPredicate(filter, { operator = "OR" } = {}) {
  const values = Array.isArray(filter?.values) ? filter.values : [];
  if (values.length === 0) return () => true;
  const set = new Set(values.map((x) => String(x)));
  if (operator === "AND") {
    return (v) => {
      const arr = Array.isArray(v) ? v.map(String) : [String(v)];
      // every selected must be contained in v
      return values.every((sel) => arr.includes(String(sel)));
    };
  }
  // OR
  return (v) => set.has(String(v));
}

function buildNumberRangePredicate(filter) {
  const min = parseNumber(filter?.min);
  const max = parseNumber(filter?.max);
  if (min == null && max == null) return () => true;
  if (min != null && max != null && min > max) {
    // invalid range: block all
    return () => false;
  }
  return (v) => {
    const n = parseNumber(v);
    if (n == null) return false; // unknown considered false unless explicitly included via boolean
    if (min != null && n < min) return false;
    if (max != null && n > max) return false;
    return true;
  };
}

function buildDateRangePredicate(filter) {
  const from = parseDateStrict(filter?.from);
  const to = parseDateStrict(filter?.to);
  if (!from && !to) return () => true;
  if (from && to && from > to) {
    // invalid range blocks all
    return () => false;
  }
  return (v) => {
    const d = parseDateStrict(v);
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false; // inclusive by default
    return true;
  };
}

export function applyColumnFilters(rows = [], filters = {}, columns = []) {
  if (!rows || rows.length === 0) return rows;
  const colByKey = new Map(columns.map((c) => [c.key, c]));

  const preds = Object.entries(filters)
    .filter(([, f]) => f != null)
    .map(([key, f]) => {
      const col = colByKey.get(key) || { key };
      const type = col.filterType || f?.type;
      const opRaw = f?.op || col?.filterOp || "OR"; // for multi-select
      const op = col?.filterAllowAnd === false ? "OR" : opRaw;
      // Skip empty filters (handles persisted stale states)
      const empty = (() => {
        if (!f) return true;
        if (type === 'text') return !(f.value && String(f.value).trim());
        if (type === 'select' || type === 'multi-select') return !Array.isArray(f.values) || f.values.length === 0;
        if (type === 'number-range') return (f.min == null || f.min === '') && (f.max == null || f.max === '');
        if (type === 'date-range') return !f.from && !f.to;
        if (type === 'boolean') {
          if (typeof f.value === 'undefined') return true;
          if (f.value === null && col?.filterTriState === false) return true;
          return false;
        }
        if (type === 'custom') {
          for (const [k, val] of Object.entries(f)) {
            if (k === 'type') continue;
            if (Array.isArray(val)) { if (val.length > 0) return false; else continue; }
            if (typeof val === 'string') { if (val.trim() !== '') return false; else continue; }
            if (val != null) return false;
          }
          return true;
        }
        return false;
      })();
      if (empty) return null;
      // Custom row-level predicate takes precedence
      if (typeof col.filterPredicate === 'function') {
        return { key, col, rowTest: (row) => col.filterPredicate(row, f) };
      }
      let pred;
      switch (type) {
        case "text":
          pred = buildTextPredicate(f);
          break;
        case "boolean":
          pred = buildBooleanPredicate(f);
          break;
        case "select":
        case "multi-select":
          pred = buildSelectPredicate(f, { operator: op });
          break;
        case "number-range":
          pred = buildNumberRangePredicate(f);
          break;
        case "date-range":
          pred = buildDateRangePredicate(f);
          break;
        default:
          pred = () => true;
      }
      return { key, col, pred };
    })
    .filter(Boolean);

  if (preds.length === 0) return rows;

  return rows.filter((row) => preds.every(({ col, pred, rowTest }) => rowTest ? rowTest(row) : pred(getFilterValue(row, col))));
}

export default {
  applyColumnFilters,
};
