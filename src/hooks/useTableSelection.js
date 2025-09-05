import { useState, useCallback, useMemo } from "react";

/**
 * Custom hook for managing table row selection
 * @param {Array} items - Array of items to manage selection for
 * @param {string|function} idField - Field name to use as ID, or function to extract ID from item
 * @returns {Object} Selection state and methods
 */
const useTableSelection = (items, idField = 'id') => {
  const [selected, setSelected] = useState(new Set());

  // Helper function to get ID from item
  const getItemId = useCallback((item) => {
    if (typeof idField === 'function') {
      return idField(item);
    }
    return item[idField];
  }, [idField]);

  // Toggle selection of individual item
  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle selection of all visible items
  const toggleSelectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((item) => next.has(getItemId(item)));
      
      if (allSelected) {
        // Deselect all visible items
        items.forEach((item) => next.delete(getItemId(item)));
      } else {
        // Select all visible items
        items.forEach((item) => next.add(getItemId(item)));
      }
      
      return next;
    });
  }, [items, getItemId]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  // Select specific items
  const selectItems = useCallback((itemIds) => {
    setSelected(new Set(itemIds));
  }, []);

  // Check if an item is selected
  const isSelected = useCallback((id) => {
    return selected.has(id);
  }, [selected]);

  // Check if all visible items are selected
  const allVisibleSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => selected.has(getItemId(item)));
  }, [items, selected, getItemId]);

  // Get count of selected items
  const selectedCount = selected.size;

  // Get array of selected IDs
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  // Get selected items (objects)
  const selectedItems = useMemo(() => {
    return items.filter((item) => selected.has(getItemId(item)));
  }, [items, selected, getItemId]);

  return {
    selected,
    setSelected,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection,
    selectItems,
    isSelected,
    allVisibleSelected,
    selectedCount,
    selectedIds,
    selectedItems
  };
};

export default useTableSelection;