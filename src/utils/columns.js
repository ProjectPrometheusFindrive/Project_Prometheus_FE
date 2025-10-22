// Utilities for managing table column configurations (visibility, order)
// Keep defaults authoritative while preserving user customizations.

/**
 * Merge a saved column list with a default definition list.
 * - Preserves saved visibility/order when keys match
 * - Adds any new default columns at the intended relative order
 * - Ensures required/default attributes are applied from defaults
 *
 * @param {Array<Object>} savedColumns
 * @param {Array<Object>} defaultColumns
 * @returns {Array<Object>} merged columns
 */
export function mergeColumnsWithDefaults(savedColumns = [], defaultColumns = []) {
  const merged = Array.isArray(savedColumns)
    ? savedColumns.map((column) => ({ ...column }))
    : [];

  const existingKeys = new Set(merged.map((column) => column.key));

  // Overlay default attributes for keys already present
  merged.forEach((column, index) => {
    const def = defaultColumns.find((d) => d.key === column.key);
    if (def) {
      merged[index] = { ...def, ...column };
    }
  });

  // Insert any new defaults not in saved, keeping relative order
  defaultColumns.forEach((def, defIndex) => {
    if (!existingKeys.has(def.key)) {
      let insertIndex = merged.length;
      for (let i = defIndex - 1; i >= 0; i -= 1) {
        const prevKey = defaultColumns[i].key;
        const existingIndex = merged.findIndex((c) => c.key === prevKey);
        if (existingIndex !== -1) {
          insertIndex = existingIndex + 1;
          break;
        }
      }
      merged.splice(insertIndex, 0, { ...def });
      existingKeys.add(def.key);
    }
  });

  return merged;
}

