// Lightweight pub/sub for auth-related global events
// Currently used to react to unauthorized (401) responses outside React components.

/**
 * @typedef {(message?: string) => void} UnauthorizedListener
 */

/** @type {UnauthorizedListener[]} */
let unauthorizedListeners = [];

/**
 * Subscribe to global unauthorized events.
 * Returns an unsubscribe function.
 * @param {UnauthorizedListener} listener
 * @returns {() => void}
 */
export function onUnauthorized(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  unauthorizedListeners.push(listener);
  return () => {
    unauthorizedListeners = unauthorizedListeners.filter((fn) => fn !== listener);
  };
}

/**
 * Emit a global unauthorized event to all subscribers.
 * @param {string} [message]
 */
export function emitUnauthorized(message) {
  const listeners = unauthorizedListeners.slice();
  for (const listener of listeners) {
    try {
      listener(message);
    } catch {
      // Ignore listener errors to avoid breaking the chain
    }
  }
}

