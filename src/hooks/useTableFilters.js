import { useCallback, useMemo, useState } from "react";

function load(storageKey) {
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed.filters || {}) : {};
  } catch {
    return {};
  }
}

function persist(storageKey, filters) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ filters }));
  } catch {
    // ignore persistence errors
  }
}

/**
 * Manage column filters for a table, with optional localStorage persistence.
 *
 * @param {object} params
 * @param {string} [params.storageKey]
 * @returns {object}
 */
export default function useTableFilters({ storageKey } = {}) {
  const [filters, setFilters] = useState(() => load(storageKey));

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value == null || (typeof value === "object" && Object.keys(value).length === 0)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      persist(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const clearFilter = useCallback((key) => setFilter(key, null), [setFilter]);

  const clearAll = useCallback(() => {
    setFilters(() => {
      const next = {};
      persist(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const hasAny = useMemo(() => Object.keys(filters || {}).length > 0, [filters]);
  const countByKey = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(filters || {})) {
      if (v == null) continue;
      if (v.type === "text") out[k] = v?.value ? 1 : 0;
      else if (v.type === "number-range") out[k] = (v?.min ? 1 : 0) + (v?.max ? 1 : 0);
      else if (v.type === "date-range") out[k] = (v?.from ? 1 : 0) + (v?.to ? 1 : 0);
      else if (v.type === "boolean") out[k] = v?.value != null ? 1 : 0;
      else if (v.values) out[k] = Array.isArray(v.values) ? v.values.length : 0;
      else out[k] = 1;
    }
    return out;
  }, [filters]);

  return {
    filters,
    setFilters,
    setFilter,
    clearFilter,
    clearAll,
    hasAny,
    countByKey,
  };
}

