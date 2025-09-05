/**
 * Theme constants for colors, dimensions, and styling
 */

// Color palette
export const COLORS = {
  // Primary brand colors
  PRIMARY: '#0b57d0',
  PRIMARY_LIGHT: '#e3f2fd',
  SECONDARY: '#0057e7',
  
  // Status colors
  SUCCESS: '#177245',
  SUCCESS_LIGHT: '#e9f8ee',
  WARNING: '#f59e0b',
  WARNING_LIGHT: '#fff4e5',
  DANGER: '#c62828',
  DANGER_LIGHT: '#fdecef',
  ERROR: '#b71c1c',
  
  // Vehicle status colors
  STOLEN: '#ff1744',
  STOLEN_TEXT: '#f1eaea',
  OVERDUE: '#f59e0b',
  ACTIVE: '#177245',
  
  // Chart colors
  CHART_CYAN: '#25cdebff',
  CHART_GREEN: '#10b981',
  CHART_ORANGE: '#f59e0b',
  
  // Neutral colors
  WHITE: '#fff',
  GRAY_50: '#fafafa',
  GRAY_100: '#f3f4f6',
  GRAY_200: '#eee',
  GRAY_300: '#ddd',
  GRAY_400: '#6b7280',
  GRAY_500: '#666',
  GRAY_600: '#555',
  GRAY_700: '#374151',
  GRAY_800: '#333',
  GRAY_900: '#777',
  
  // Semantic colors
  TEXT_PRIMARY: '#333',
  TEXT_SECONDARY: '#666',
  BORDER_LIGHT: '#eee',
  BORDER_DEFAULT: '#ddd',
  BACKGROUND_LIGHT: '#fafafa'
};

// Dimensions and spacing
export const DIMENSIONS = {
  // Spacing system (multiples of 4)
  SPACE_XS: 4,
  SPACE_SM: 8,
  SPACE_MD: 12,
  SPACE_LG: 16,
  SPACE_XL: 24,
  SPACE_XXL: 32,
  
  // Border radius
  BORDER_RADIUS_SM: 4,
  BORDER_RADIUS_MD: 8,
  BORDER_RADIUS_LG: 12,
  
  // Common widths and heights
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 24,
  ICON_SIZE_LG: 36,
  LOGO_SIZE: 64,
  
  // Layout dimensions
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 240,
  CARD_PADDING: 12,
  GRID_GAP: 16,
  
  // Table dimensions
  CHECKBOX_WIDTH: 36,
  ACTION_BUTTON_WIDTH: 80
};

// Typography
export const TYPOGRAPHY = {
  FONT_SIZE_XS: '12px',
  FONT_SIZE_SM: '14px',
  FONT_SIZE_MD: '16px',
  FONT_SIZE_LG: '18px',
  FONT_SIZE_XL: '24px',
  FONT_SIZE_XXL: '32px',
  
  FONT_WEIGHT_NORMAL: 400,
  FONT_WEIGHT_MEDIUM: 500,
  FONT_WEIGHT_SEMIBOLD: 600,
  FONT_WEIGHT_BOLD: 700,
  
  LINE_HEIGHT_TIGHT: 1.2,
  LINE_HEIGHT_NORMAL: 1.5,
  LINE_HEIGHT_RELAXED: 1.75
};

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080
};

// Animation durations
export const ANIMATION = {
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms',
  
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out'
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  XXL: '1536px'
};

export default {
  COLORS,
  DIMENSIONS,
  TYPOGRAPHY,
  Z_INDEX,
  ANIMATION,
  BREAKPOINTS
};