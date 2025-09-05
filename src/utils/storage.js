/**
 * Centralized localStorage keys management
 */
export const STORAGE_KEYS = {
  // Authentication
  IS_LOGGED_IN: 'isLoggedIn',
  REGISTERED_USERS: 'registeredUsers',
  
  // Asset Management
  DEVICE_INFO_BY_ASSET: 'deviceInfoByAsset',
  ASSET_DRAFTS: 'assetDrafts',
  ASSET_EDITS: 'assetEdits',
  
  // Rental Management
  RENTAL_DRAFTS: 'rentalDrafts',
  RENTAL_EDITS: 'rentalEdits',
  
  // Issue Management
  ISSUE_DRAFTS: 'issueDrafts',
  ISSUE_EDITS: 'issueEdits',
  
  // Company & Settings
  COMPANY_INFO: 'companyInfo',
  GEOFENCE_SETS: 'geofenceSets',
  
  // Vehicle Controls
  NO_RESTART_MAP: 'noRestartMap',
  ENGINE_STATUS_MAP: 'engineStatusMap',
  
  // User Preferences
  DEFAULT_LANDING: 'defaultLanding'
};

/**
 * Safe localStorage wrapper with error handling and JSON serialization
 */
export const storageUtils = {
  /**
   * Get item from localStorage with JSON parsing
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
   * @returns {*} Parsed value or default value
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to get localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage with JSON serialization
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Check if key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Existence status
   */
  has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.warn(`Failed to check localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Clear all localStorage data
   * @returns {boolean} Success status
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  },

  /**
   * Get multiple items at once
   * @param {string[]} keys - Array of storage keys
   * @returns {Object} Object with key-value pairs
   */
  getMultiple(keys) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    return result;
  },

  /**
   * Set multiple items at once
   * @param {Object} items - Object with key-value pairs
   * @returns {boolean} Success status (true if all succeeded)
   */
  setMultiple(items) {
    let allSucceeded = true;
    Object.entries(items).forEach(([key, value]) => {
      if (!this.set(key, value)) {
        allSucceeded = false;
      }
    });
    return allSucceeded;
  },

  /**
   * Update an existing object in localStorage
   * @param {string} key - Storage key
   * @param {Object} updates - Object with updates to merge
   * @returns {boolean} Success status
   */
  update(key, updates) {
    const current = this.get(key, {});
    if (typeof current !== 'object' || current === null) {
      console.warn(`Cannot update non-object value for key "${key}"`);
      return false;
    }
    return this.set(key, { ...current, ...updates });
  },

  /**
   * Add item to array stored in localStorage
   * @param {string} key - Storage key
   * @param {*} item - Item to add
   * @returns {boolean} Success status
   */
  pushToArray(key, item) {
    const array = this.get(key, []);
    if (!Array.isArray(array)) {
      console.warn(`Cannot push to non-array value for key "${key}"`);
      return false;
    }
    array.push(item);
    return this.set(key, array);
  },

  /**
   * Remove item from array stored in localStorage
   * @param {string} key - Storage key
   * @param {Function|*} filterOrItem - Filter function or item to remove
   * @returns {boolean} Success status
   */
  removeFromArray(key, filterOrItem) {
    const array = this.get(key, []);
    if (!Array.isArray(array)) {
      console.warn(`Cannot remove from non-array value for key "${key}"`);
      return false;
    }
    
    let filtered;
    if (typeof filterOrItem === 'function') {
      filtered = array.filter(item => !filterOrItem(item));
    } else {
      filtered = array.filter(item => item !== filterOrItem);
    }
    
    return this.set(key, filtered);
  }
};

/**
 * Type-safe storage utilities for specific data types
 */
export const typedStorage = {
  // Authentication helpers
  auth: {
    isLoggedIn: () => storageUtils.get(STORAGE_KEYS.IS_LOGGED_IN) === 'true',
    setLoggedIn: (status) => storageUtils.set(STORAGE_KEYS.IS_LOGGED_IN, String(status)),
    logout: () => storageUtils.remove(STORAGE_KEYS.IS_LOGGED_IN)
  },

  // Draft helpers
  drafts: {
    getAssets: () => storageUtils.get(STORAGE_KEYS.ASSET_DRAFTS, []),
    addAsset: (draft) => storageUtils.pushToArray(STORAGE_KEYS.ASSET_DRAFTS, draft),
    
    getRentals: () => storageUtils.get(STORAGE_KEYS.RENTAL_DRAFTS, []),
    addRental: (draft) => storageUtils.pushToArray(STORAGE_KEYS.RENTAL_DRAFTS, draft),
    
    getIssues: () => storageUtils.get(STORAGE_KEYS.ISSUE_DRAFTS, []),
    addIssue: (draft) => storageUtils.pushToArray(STORAGE_KEYS.ISSUE_DRAFTS, draft)
  },

  // Edit helpers
  edits: {
    getAssets: () => storageUtils.get(STORAGE_KEYS.ASSET_EDITS, {}),
    setAsset: (id, data) => {
      const edits = storageUtils.get(STORAGE_KEYS.ASSET_EDITS, {});
      edits[String(id)] = data;
      return storageUtils.set(STORAGE_KEYS.ASSET_EDITS, edits);
    },
    
    getRentals: () => storageUtils.get(STORAGE_KEYS.RENTAL_EDITS, {}),
    setRental: (id, data) => {
      const edits = storageUtils.get(STORAGE_KEYS.RENTAL_EDITS, {});
      edits[String(id)] = data;
      return storageUtils.set(STORAGE_KEYS.RENTAL_EDITS, edits);
    },
    
    getIssues: () => storageUtils.get(STORAGE_KEYS.ISSUE_EDITS, {}),
    setIssue: (id, data) => {
      const edits = storageUtils.get(STORAGE_KEYS.ISSUE_EDITS, {});
      edits[String(id)] = data;
      return storageUtils.set(STORAGE_KEYS.ISSUE_EDITS, edits);
    }
  },

  // Device info helpers
  devices: {
    getInfo: (assetId) => {
      const map = storageUtils.get(STORAGE_KEYS.DEVICE_INFO_BY_ASSET, {});
      return map[assetId] || {};
    },
    setInfo: (assetId, info) => {
      const map = storageUtils.get(STORAGE_KEYS.DEVICE_INFO_BY_ASSET, {});
      map[assetId] = info;
      return storageUtils.set(STORAGE_KEYS.DEVICE_INFO_BY_ASSET, map);
    }
  },

  // Company data helpers
  company: {
    getInfo: () => storageUtils.get(STORAGE_KEYS.COMPANY_INFO, {}),
    setInfo: (info) => storageUtils.set(STORAGE_KEYS.COMPANY_INFO, info),
    
    getGeofences: () => storageUtils.get(STORAGE_KEYS.GEOFENCE_SETS, []),
    setGeofences: (sets) => storageUtils.set(STORAGE_KEYS.GEOFENCE_SETS, sets),
    clearGeofences: () => storageUtils.remove(STORAGE_KEYS.GEOFENCE_SETS)
  },

  // Vehicle control helpers
  vehicles: {
    getNoRestartMap: () => storageUtils.get(STORAGE_KEYS.NO_RESTART_MAP, {}),
    setNoRestartMap: (map) => storageUtils.set(STORAGE_KEYS.NO_RESTART_MAP, map),
    
    getEngineStatusMap: () => storageUtils.get(STORAGE_KEYS.ENGINE_STATUS_MAP, {}),
    setEngineStatusMap: (map) => storageUtils.set(STORAGE_KEYS.ENGINE_STATUS_MAP, map)
  }
};

export default storageUtils;