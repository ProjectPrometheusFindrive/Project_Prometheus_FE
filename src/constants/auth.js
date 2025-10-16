/**
 * Authentication & RBAC constants and JSDoc stubs for multitenancy
 * - Stage 0: Prepare shapes including companyId and role
 */

// Role constants (normalized, backend-aligned)
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MEMBER: "member",
};

export const DEFAULT_ROLE = ROLES.MEMBER;

// Role order for comparisons (member < admin < super_admin)
const ROLE_ORDER = [ROLES.MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

/**
 * Check if `role` has at least the privileges of `required`.
 * @param {string} role
 * @param {string} required
 * @returns {boolean}
 */
export function isRoleAtLeast(role, required) {
  const a = ROLE_ORDER.indexOf(String(role || ""));
  const b = ROLE_ORDER.indexOf(String(required || ""));
  if (a < 0 || b < 0) return false;
  return a >= b;
}

/**
 * @typedef {Object} JWTPayload
 * @property {string} sub - Subject (userId)
 * @property {string} [companyId] - Tenant/company identifier
 * @property {('super_admin'|'admin'|'member')} [role] - Assigned role
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [company] - Company display name
 * @property {string} [position]
 * @property {string|number} [ts]
 * @property {number} [iat]
 * @property {number} [exp]
 * @property {string} [iss]
 * @property {string} [aud]
 */

/**
 * @typedef {Object} User
 * @property {string} userId
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [company] - Company display name
 * @property {string} [position]
 * @property {string} [companyId] - Tenant/company identifier
 * @property {('super_admin'|'admin'|'member')} [role]
 */

export default {
  ROLES,
  DEFAULT_ROLE,
  isRoleAtLeast,
};

