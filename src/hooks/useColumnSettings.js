import { useMemo, useState } from "react";
import { mergeColumnsWithDefaults } from "../utils/columns";

/**
 * Manage table column visibility/order with localStorage persistence.
 *
 * @param {Object} params
 * @param {string} params.storageKey unique key for localStorage
 * @param {Array<Object>} params.defaultColumns default column definitions
 */
export default function useColumnSettings({ storageKey, defaultColumns }) {
  const [columns, setColumnsState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedColumns = Array.isArray(parsed?.columns) ? parsed.columns : [];
        return mergeColumnsWithDefaults(savedColumns, defaultColumns);
      }
    } catch (e) {
      // fall through
    }
    return defaultColumns.map((c) => ({ ...c }));
  });

  const persist = (nextColumns) => {
    setColumnsState(nextColumns);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ columns: nextColumns }));
    } catch (e) {
      // ignore storage errors
    }
  };

  const setColumns = (updater) => {
    if (typeof updater === "function") {
      persist(updater(columns));
    } else {
      persist(updater);
    }
  };

  const toggleColumnVisibility = (key) => {
    const next = columns.map((col) =>
      col.key === key && !col.required ? { ...col, visible: !col.visible } : col
    );
    persist(next);
  };

  const moveColumn = (fromIndex, toIndex) => {
    if (fromIndex == null || toIndex == null || fromIndex === toIndex) return;
    const next = [...columns];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persist(next);
  };

  const resetColumns = () => {
    const resetColumns = defaultColumns.map((c) => ({ ...c }));
    persist(resetColumns);
  };

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  return {
    columns,
    setColumns,
    visibleColumns,
    toggleColumnVisibility,
    moveColumn,
    resetColumns,
  };
}

