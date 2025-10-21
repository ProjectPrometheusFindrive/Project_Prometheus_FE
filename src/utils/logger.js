const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function getLevel() {
  try {
    const env = (import.meta && import.meta.env) || {};
    const raw = env.VITE_LOG_LEVEL || (env.DEV ? 'debug' : 'warn');
    return LEVELS[String(raw).toLowerCase()] ?? LEVELS.warn;
  } catch {
    return LEVELS.warn;
  }
}

export function isDebug() { return getLevel() <= LEVELS.debug; }

export const log = {
  debug: (...args) => { if (isDebug()) console.debug(...args); },
  info: (...args) => { if (getLevel() <= LEVELS.info) console.info?.(...args); },
  warn: (...args) => { if (getLevel() <= LEVELS.warn) console.warn(...args); },
  error: (...args) => { console.error(...args); },
};

export default log;

