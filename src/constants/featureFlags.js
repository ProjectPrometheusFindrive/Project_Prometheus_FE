/**
 * Feature flags (read from Vite env vars)
 * - Stage 0: prepare MTY_ENABLED flag to gate multitenancy-related UI if needed.
 */

/**
 * Coerce various env representations to boolean.
 * @param {any} v
 * @returns {boolean}
 */
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export const MTY_ENABLED = toBool(import.meta.env.VITE_MTY_ENABLED);

export default {
  MTY_ENABLED,
};

