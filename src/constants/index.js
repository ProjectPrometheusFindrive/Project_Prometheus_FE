/**
 * Centralized constants export
 * Import all constants from this single file
 */

export * from './theme';
export * from './app';

// Re-export commonly used constants for convenience
export { COLORS, DIMENSIONS } from './theme';
export { ROUTES, MAP_CONFIG, ASSET } from './app';

// Default export for importing everything at once
import theme from './theme';
import app from './app';

export default {
  ...theme,
  ...app
};