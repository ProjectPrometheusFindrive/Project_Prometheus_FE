/**
 * Application-specific constants
 */

// Asset and vehicle constants
export const ASSET = {
  ID_PREFIX: 'VH-',
  STATUSES: [
    { value: 'all', label: '전체' },
    { value: 'Available', label: '사용가능' },
    { value: 'Rented', label: '대여중' },
    { value: 'Maintenance', label: '정비중' }
  ]
};

// Vehicle marker CSS classes
export const MARKER_CLASSES = {
  DEFAULT: 'marker marker--car',
  RENTED: 'marker marker--rented',
  OVERDUE: 'marker marker--overdue',
  STOLEN: 'marker marker--suspicious',
  SUSPICIOUS: 'marker marker--suspicious'
};

// File upload settings
export const FILE_UPLOAD = {
  ACCEPTED_TYPES: 'image/*,application/pdf',
  MAX_SIZE_MB: 10,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  
  // File type categories
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT_TYPES: ['application/pdf']
};

// Form validation rules
export const VALIDATION = {
  REQUIRED_MESSAGE: '필수 입력 항목입니다',
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_MESSAGE: '올바른 이메일 형식이 아닙니다',
  PHONE_PATTERN: /^[\d\-\s\+\(\)]+$/,
  PHONE_MESSAGE: '올바른 전화번호 형식이 아닙니다',
  
  // Length limits
  MIN_PASSWORD_LENGTH: 6,
  MAX_TEXT_LENGTH: 500,
  MAX_NAME_LENGTH: 50
};

// API and data constants
export const API = {
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  PAGINATION_SIZE: 20
};

// Date and time formats
export const DATE_FORMATS = {
  DISPLAY: 'YYYY.MM.DD',
  DISPLAY_WITH_TIME: 'YYYY.MM.DD HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  FILE_NAME: 'YYYYMMDD_HHmmss'
};

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [37.5665, 126.9780], // Seoul coordinates
  DEFAULT_ZOOM: 6,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  
  // Tile layer configuration
  TILE_LAYER: {
    URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    MAX_ZOOM: 19
  },
  
  // Cluster settings
  CLUSTER_MAX_ZOOM: 15,
  CLUSTER_RADIUS: 80,
  
  // Geofence settings
  GEOFENCE_COLOR: '#0b57d0',
  GEOFENCE_WEIGHT: 2,
  GEOFENCE_FILL_OPACITY: 0.08
};

// Navigation routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ASSETS: '/assets',
  RENTALS: '/rentals',
  RENTALS_TABLE: '/rentals/table',
  RENTALS_MAP: '/rentals/map',
  ISSUES: '/issue',
  SETTINGS: '/settings',
  DETAIL: (type, id) => `/detail/${type}/${id}`,
  
  // Auth routes
  LOGIN: '/',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password'
};

// Status labels and colors mapping
export const STATUS_CONFIG = {
  VEHICLE: {
    Available: { label: '사용가능', color: 'success' },
    Rented: { label: '대여중', color: 'primary' },
    Maintenance: { label: '정비중', color: 'warning' },
    Stolen: { label: '도난의심', color: 'danger' },
    Overdue: { label: '연체', color: 'warning' }
  },
  
  RENTAL: {
    Active: { label: '활성', color: 'success' },
    Completed: { label: '완료', color: 'gray' },
    Cancelled: { label: '취소', color: 'gray' },
    Overdue: { label: '연체', color: 'warning' }
  }
};

// Toast notification settings
export const TOAST = {
  DURATION: {
    SHORT: 3000,
    NORMAL: 5000,
    LONG: 8000
  },
  
  TYPES: {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    INFO: 'info'
  }
};

// Local storage keys (extending the existing ones)
export const ADDITIONAL_STORAGE_KEYS = {
  USER_PREFERENCES: 'userPreferences',
  LAST_VISITED_PAGE: 'lastVisitedPage',
  THEME_MODE: 'themeMode',
  LANGUAGE: 'language'
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요',
  UNAUTHORIZED: '로그인이 필요합니다',
  FORBIDDEN: '접근 권한이 없습니다',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다',
  SERVER_ERROR: '서버 오류가 발생했습니다',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다'
};

export default {
  ASSET,
  MARKER_CLASSES,
  FILE_UPLOAD,
  VALIDATION,
  API,
  DATE_FORMATS,
  MAP_CONFIG,
  ROUTES,
  STATUS_CONFIG,
  TOAST,
  ADDITIONAL_STORAGE_KEYS,
  ERROR_MESSAGES
};
