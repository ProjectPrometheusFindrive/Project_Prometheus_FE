# Member Approval & Role Management - Implementation Summary

## Overview

This document summarizes the complete implementation of the member approval workflow and role management system for Project Prometheus Frontend.

**Implementation Date**: 2025-10-16
**Related Backend Spec**: See your backend API spec notes (server/api/auth.py, server/api/members.py)

---

## Features Implemented

### 1. Registration with Pending Status
- Users register via `POST /auth/register` (or `/api/auth/register`)
- Default `membershipStatus` is set to `pending`
- Backend returns `201` with user data (without auto-login)

### 2. Login Blocking for Pending/Rejected Users
- Login attempts for `pending` users return `403 APPROVAL_PENDING`
- Login attempts for `rejected` users return `403 APPROVAL_REJECTED`
- Frontend displays appropriate toast messages
- Error handling in [apiClient.js:126-185](../src/api/apiClient.js#L126-L185)

### 3. Admin Approval Workflow
- **Pending Members List**: `GET /members/pending`
  - `super_admin`: See all pending members across all companies
  - `admin`: See only pending members from their company (`companyId`)
- **Approve Member**: `POST /members/approve`
  - Body: `{ "userId": "user@example.com" }`
  - Sets `membershipStatus = approved`, user can now log in
- **Reject Member**: `POST /members/reject`
  - Body: `{ "userId": "user@example.com", "reason": "optional reason" }`
  - Sets `membershipStatus = rejected`, user blocked from login

### 4. Role Management
- **Change Role**: `PATCH /members/{userId}/role`
  - Body: `{ "role": "admin" | "member" | "super_admin" }`
  - **Permissions**:
    - `super_admin`: Can assign any role including `super_admin`
    - `admin`: Can assign `admin` or `member` only, cannot assign `super_admin`
    - `admin`: Can only change roles for users in their own company
  - **Token Invalidation**: Backend rotates `tokenSalt` → target user must re-login

---

## Architecture

### API Layer

#### 1. API Endpoints ([apiTypes.js](../src/api/apiTypes.js))
```javascript
API_ENDPOINTS = {
  MEMBERS_PENDING: '/members/pending',
  MEMBERS_APPROVE: '/members/approve',
  MEMBERS_REJECT: '/members/reject',
  MEMBER_ROLE: (userId) => `/members/${encodeURIComponent(userId)}/role'
}
```

#### 2. Error Types ([apiTypes.js:68-79](../src/api/apiTypes.js#L68-L79))
```javascript
API_ERRORS = {
  APPROVAL_PENDING: 'APPROVAL_PENDING',   // User registration pending
  APPROVAL_REJECTED: 'APPROVAL_REJECTED', // User registration rejected
  // ... other error types
}
```

#### 3. API Client Methods ([apiClient.js:565-645](../src/api/apiClient.js#L565-L645))
```javascript
membersApi = {
  async fetchPending(),            // Get pending members list
  async approve(userId),           // Approve a member
  async reject(userId, reason),    // Reject a member (reason optional)
  async changeRole(userId, role)   // Change member role
}
```

#### 4. High-Level Wrappers ([api.js:314-354](../src/api/api.js#L314-L354))
```javascript
export async function fetchPendingMembers()                // Returns Array<User>
export async function approveMember(userId)                // Returns boolean
export async function rejectMember(userId, reason = null)  // Returns boolean
export async function changeMemberRole(userId, role)       // Returns boolean
```

### Error Handling

**Location**: [apiClient.js:126-185](../src/api/apiClient.js#L126-L185)

- Detects `APPROVAL_PENDING` and `APPROVAL_REJECTED` errors from 403 responses
- Shows toast notification with backend error message
- Does NOT auto-logout (unlike 401 errors)
- Preserves `error.errorType` for caller inspection

**Example Backend Error Response**:
```json
{
  "status": "error",
  "error": {
    "type": "APPROVAL_PENDING",
    "message": "가입 승인 대기 중입니다. 관리자에게 문의하세요."
  }
}
```

---

## UI Components

### 1. MemberManagement Page ([src/pages/MemberManagement.jsx](../src/pages/MemberManagement.jsx))

**Route**: `/members` (requires `admin` or `super_admin` role)

**Features**:
- Fetches pending members on mount
- Displays table with user details (userId, name, email, company, position, phone, createdAt)
- **Approve/Reject Actions**:
  - Confirm dialog before action
  - Shows loading state during API call
  - Reloads list after success
  - Toast notifications for success/error
- **Role Change Modal**:
  - Select new role from dropdown
  - Permission checks:
    - `admin` cannot assign `super_admin`
    - `admin` cannot modify users from other companies
  - Warning about token invalidation
- **Permission Badge**: Shows "타사" badge for users from different companies (admin view)

**Access Control**:
```javascript
const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);
const isSuperAdmin = user && user.role === ROLES.SUPER_ADMIN;

function canManageMember(member) {
  if (isSuperAdmin) return true;
  return member.companyId === user.companyId; // Admin: same company only
}
```

### 2. NavigationBar Update ([src/components/NavigationBar.jsx](../src/components/NavigationBar.jsx))

**New Link**: "회원" (Members)
- Icon: `FiUsers` from react-icons
- Only visible for `admin` and `super_admin`
- Route: `/members`

**Permission Check**:
```javascript
const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);

{canManageMembers && (
  <NavLink to="/members" ...>
    <FiUsers className="navigation-bar__icon" />
    <span className="navigation-bar__label">회원</span>
  </NavLink>
)}
```

### 3. App Routes ([src/App.jsx:145-149](../src/App.jsx#L145-L149))

```javascript
<Route path="/members" element={
  <ErrorBoundary>
    <MemberManagement />
  </ErrorBoundary>
} />
```

---

## OpenAPI Specification Updates

### New Endpoints

**File**: [openapi/project-prometheus-openapi.yaml](../openapi/project-prometheus-openapi.yaml)

#### 1. `/auth/register` - User Registration
```yaml
POST /auth/register
security: []  # Public endpoint
Request:
  {
    "userId": "user@example.com",
    "password": "...",
    "name": "User Name",
    "companyId": "ACME"
  }
Response:
  201: { "status": "success", "data": { "userId": "...", "name": "...", "createdAt": "..." } }
  400: VALIDATION_ERROR (missing fields)
  409: VALIDATION_ERROR (duplicate userId)
```

#### 2. `/auth/login` - User Login
```yaml
POST /auth/login
security: []  # Public endpoint
Request:
  {
    "userId": "user@example.com",
    "password": "..."
  }
Response:
  200: { "token": "jwt...", "data": { ... } }
  401: AUTH_ERROR (invalid credentials)
  403: APPROVAL_PENDING | APPROVAL_REJECTED
```

#### 3. `/members/pending` - List Pending Members
```yaml
GET /members/pending
security: [Bearer Token]
Response:
  200: { "status": "success", "data": [ { userId, name, email, company, companyId, membershipStatus, createdAt, ... }, ... ] }
  403: FORBIDDEN (member role)
```

#### 4. `/members/approve` - Approve Member
```yaml
POST /members/approve
security: [Bearer Token]
Request:
  { "userId": "user@example.com" }
Response:
  200: { "status": "success" }
  403: FORBIDDEN (cross-company attempt by admin)
  404: NOT_FOUND (user doesn't exist)
```

#### 5. `/members/reject` - Reject Member
```yaml
POST /members/reject
security: [Bearer Token]
Request:
  { "userId": "user@example.com", "reason": "optional" }
Response:
  200: { "status": "success" }
  403: FORBIDDEN (cross-company attempt by admin)
  404: NOT_FOUND (user doesn't exist)
```

#### 6. `/members/{userId}/role` - Change Role
```yaml
PATCH /members/{userId}/role
security: [Bearer Token]
Request:
  { "role": "admin" | "member" | "super_admin" }
Response:
  200: { "status": "success" }
  400: VALIDATION_ERROR (invalid role)
  403: FORBIDDEN (admin trying to assign super_admin, or cross-company)
  404: NOT_FOUND (user doesn't exist)
```

### New Schemas

#### User Schema
```yaml
User:
  type: object
  required: [userId, name, email, companyId, role, membershipStatus]
  properties:
    userId: string (email)
    name: string
    email: string (email)
    phone: string?
    position: string?
    companyId: string
    company: string?
    role: enum [super_admin, admin, member]
    membershipStatus: enum [pending, approved, rejected]
    createdAt: date-time?
    updatedAt: date-time?
```

#### ErrorResponse Schema
```yaml
ErrorResponse:
  type: object
  properties:
    status: "error"
    error:
      type: object
      properties:
        type: enum [VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND,
                    SERVER_ERROR, APPROVAL_PENDING, APPROVAL_REJECTED]
        message: string
    timestamp: date-time?
```

---

## Permission Matrix

| Role         | View Pending | Approve/Reject | Change Role (admin/member) | Assign super_admin |
|--------------|--------------|----------------|---------------------------|-------------------|
| `member`     | ❌           | ❌             | ❌                         | ❌                |
| `admin`      | ✅ (own company) | ✅ (own company) | ✅ (own company)        | ❌                |
| `super_admin`| ✅ (all)      | ✅ (all)        | ✅ (all)                   | ✅                |

**Key Rules**:
1. `admin` can only manage users with the same `companyId`
2. `admin` cannot assign `super_admin` role
3. `super_admin` has unrestricted access
4. All role changes trigger token invalidation (user must re-login)

---

## User Flows

### New User Registration
1. User visits `/signup`
2. Fills in registration form (userId, password, name, companyId, etc.)
3. Submits → `POST /auth/register`
4. Backend creates user with `membershipStatus = pending`
5. User receives confirmation message: "가입 신청이 완료되었습니다. 승인 대기 중입니다."

### Login Attempt (Pending User)
1. User tries to log in → `POST /auth/login`
2. Backend returns `403 APPROVAL_PENDING`
3. Frontend shows toast: "가입 승인 대기 중입니다. 관리자에게 문의하세요."
4. User stays on login page (not logged in)

### Admin Approval Workflow
1. Admin logs in and navigates to `/members`
2. `MemberManagement` page loads → fetches `GET /members/pending`
3. Admin sees pending user in table
4. Admin clicks "승인" (Approve) button
5. Confirm dialog appears: "user@example.com 사용자를 승인하시겠습니까?"
6. Admin confirms → `POST /members/approve`
7. Backend sets `membershipStatus = approved`
8. Frontend reloads pending list (user disappears)
9. Toast notification: "회원이 승인되었습니다."
10. Approved user can now log in successfully

### Role Change Workflow
1. Admin clicks "역할 변경" (Change Role) button for a user
2. Modal opens with:
   - Current role (read-only)
   - Dropdown to select new role (admin/member, or +super_admin for super_admin)
3. Admin selects new role and clicks "변경"
4. Confirm dialog: "userId의 역할을 'admin'로 변경하시겠습니까?\n\n대상 사용자는 재로그인이 필요합니다."
5. Admin confirms → `PATCH /members/{userId}/role`
6. Backend:
   - Updates role
   - Rotates `tokenSalt` → invalidates all existing tokens for that user
7. Frontend shows toast: "역할이 변경되었습니다. 대상 사용자는 재로그인이 필요합니다."
8. Target user's next API call returns 401 → auto-logout → redirect to login

---

## Testing Checklist

### Registration Flow
- [ ] New user can register with valid data
- [ ] Duplicate userId returns 409 error
- [ ] Missing required fields returns 400 error
- [ ] User with `membershipStatus = pending` cannot log in (403 APPROVAL_PENDING)

### Approval Flow
- [ ] Admin can see pending members from their company
- [ ] Super admin can see all pending members
- [ ] Admin can approve pending members
- [ ] Admin can reject pending members with reason
- [ ] Admin cannot approve/reject users from other companies
- [ ] After approval, user can log in successfully
- [ ] After rejection, user still cannot log in (403 APPROVAL_REJECTED)

### Role Management
- [ ] Admin can change roles for users in their company
- [ ] Admin cannot assign `super_admin` role
- [ ] Super admin can assign any role including `super_admin`
- [ ] After role change, target user is logged out (token invalidated)
- [ ] Target user must re-login to get new role

### UI/UX
- [ ] "회원" link appears in nav for admin/super_admin only
- [ ] "회원" link does NOT appear for `member` role
- [ ] MemberManagement page shows "접근 권한이 없습니다" for `member` role
- [ ] Pending members table displays correctly
- [ ] Approve/Reject buttons show loading state during API call
- [ ] Role change modal validates permissions (no super_admin option for admin)
- [ ] Toast notifications appear for all success/error cases
- [ ] "타사" badge appears for cross-company users (admin view)

### Error Handling
- [ ] 403 APPROVAL_PENDING shows appropriate message on login
- [ ] 403 APPROVAL_REJECTED shows appropriate message on login
- [ ] 403 FORBIDDEN shows appropriate message for unauthorized actions
- [ ] 404 NOT_FOUND shows appropriate message for missing users
- [ ] Network errors are handled gracefully

---

## Code Reference

### Key Files Modified/Created

1. **OpenAPI Spec**:
   - [openapi/project-prometheus-openapi.yaml](../openapi/project-prometheus-openapi.yaml) (lines 36-921)

2. **API Layer**:
   - [src/api/apiTypes.js](../src/api/apiTypes.js#L51-L54) - Endpoints
   - [src/api/apiTypes.js](../src/api/apiTypes.js#L77-L78) - Error types
   - [src/api/apiClient.js](../src/api/apiClient.js#L565-L645) - API methods
   - [src/api/apiClient.js](../src/api/apiClient.js#L126-L185) - Error handling
   - [src/api/api.js](../src/api/api.js#L314-L354) - Wrapper functions

3. **UI Components**:
   - [src/pages/MemberManagement.jsx](../src/pages/MemberManagement.jsx) - Main page (NEW)
   - [src/pages/MemberManagement.css](../src/pages/MemberManagement.css) - Styles (NEW)
   - [src/components/NavigationBar.jsx](../src/components/NavigationBar.jsx) - Nav link
   - [src/App.jsx](../src/App.jsx#L145-L149) - Route

4. **Constants**:
   - [src/constants/auth.js](../src/constants/auth.js) - ROLES, isRoleAtLeast (existing)

---

## Backend Integration Notes

### Expected Backend Behavior

1. **Registration** (`POST /auth/register`):
   - Creates user with `membershipStatus = pending` by default
   - Returns 201 with user data (no auto-login)

2. **Login** (`POST /auth/login`):
   - Checks `membershipStatus`
   - If `pending`: return `403 { "error": { "type": "APPROVAL_PENDING", "message": "..." } }`
   - If `rejected`: return `403 { "error": { "type": "APPROVAL_REJECTED", "message": "..." } }`
   - If `approved`: return `200 { "token": "...", "data": {...} }`

3. **Pending Members** (`GET /members/pending`):
   - Filters by `membershipStatus = pending`
   - If `admin`: filters by `companyId = user.companyId`
   - If `super_admin`: returns all pending users

4. **Approve** (`POST /members/approve`):
   - Sets `membershipStatus = approved`
   - If `admin`: validates `target.companyId == user.companyId`
   - Returns 200 on success, 403 if cross-company, 404 if user not found

5. **Reject** (`POST /members/reject`):
   - Sets `membershipStatus = rejected`
   - Optionally stores `reason` field
   - Same permission checks as approve

6. **Role Change** (`PATCH /members/{userId}/role`):
   - Updates `role` field
   - **Rotates `tokenSalt`** → invalidates all tokens for that user
   - If `admin`:
     - Validates `target.companyId == user.companyId`
     - Rejects if `role == super_admin`
   - Returns 200 on success

### JWT Claims (Existing)
```javascript
{
  sub: "userId",
  companyId: "tenant_id",
  role: "admin" | "member" | "super_admin",
  name: "User Name",
  company: "Company Display Name",
  position: "Job Title",
  exp: 1234567890,
  iat: 1234567890
}
```

---

## Future Enhancements

1. **Email Notifications**:
   - Send email to user when approved/rejected
   - Send email to admins when new user registers

2. **Bulk Actions**:
   - Select multiple pending users
   - Approve/reject in batch

3. **Member List (All Users)**:
   - List all approved members
   - Search/filter by company, role, etc.
   - Inline role editing

4. **Audit Log**:
   - Track who approved/rejected whom
   - Track role changes with timestamp

5. **User Deactivation**:
   - Add `isActive` flag
   - Deactivate users without deleting them

6. **Invitation System**:
   - Admins can invite users via email
   - Pre-populate registration form with invite token

---

## Summary

This implementation provides a complete member approval and role management system with:

- ✅ Registration with pending status
- ✅ Login blocking for pending/rejected users
- ✅ Admin approval/rejection workflow
- ✅ Role management with token invalidation
- ✅ Multi-tenancy support (company-based isolation)
- ✅ Permission-based UI controls
- ✅ Comprehensive error handling
- ✅ OpenAPI specification updates
- ✅ Responsive, user-friendly UI

All features follow the existing codebase patterns and integrate seamlessly with the current authentication/authorization system.
