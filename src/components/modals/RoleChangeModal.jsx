import { ROLES } from "../../constants/auth";
import "./RoleChangeModal.css";

export default function RoleChangeModal({ member, newRole, setNewRole, onClose, onConfirm, loading = false, onWithdraw, canChangeRole = false }) {
  if (!member) return null;

  return (
    <div className="role-change-overlay" onClick={onClose}>
      <div className="role-change-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="role-change-header">
          <h3 className="role-change-title">멤버관리</h3>
          <button className="role-change-close" onClick={onClose}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z" fill="#1C1C1C"/>
              <path d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z" fill="#1C1C1C"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="role-change-form">
          {/* 사용자 ID */}
          <div className="role-change-row">
            <label className="role-change-label">사용자 ID</label>
            <div className="role-change-input-wrapper">
              <input
                type="text"
                className="role-change-input"
                value={member.userId}
                disabled
              />
            </div>
          </div>

          {/* 이름 */}
          <div className="role-change-row">
            <label className="role-change-label">이름</label>
            <div className="role-change-input-wrapper">
              <input
                type="text"
                className="role-change-input"
                value={member.name}
                disabled
              />
            </div>
          </div>

          {/* 현재 역할 */}
          <div className="role-change-row">
            <label className="role-change-label">현재 역할</label>
            <div className="role-change-input-wrapper">
              <input
                type="text"
                className="role-change-input role-change-input--disabled"
                value={member.role}
                disabled
              />
            </div>
          </div>

          {/* 새로운 역할 */}
          <div className="role-change-row">
            <label className="role-change-label">새로운 역할</label>
            <div className="role-change-input-wrapper">
              <div className="role-change-select-wrapper">
                <select
                  className="role-change-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={!canChangeRole}
                >
                  <option value={ROLES.MEMBER}>member</option>
                  <option value={ROLES.ADMIN}>admin</option>
                </select>
                <svg className="role-change-select-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <p className="role-change-hint">*admin ↔ member 만 변경이 가능합니다.</p>
        </div>

        {/* Info Box */}
        <div className="role-change-info-box">
          <div className="role-change-info-section">
            <p className="role-change-info-title role-change-info-title--warning">주의사항</p>
            <ul className="role-change-info-list">
              <li>역할 변경 시 대상 사용자의 토큰이 무효화되어 재로그인이 필요합니다.</li>
              <li>역할 변경은 Super admin 또는 동일 회사의 Admin이 가능하며, Super admin 역할로 변경은 허용되지 않습니다.</li>
            </ul>
          </div>
          <div className="role-change-info-section">
            <p className="role-change-info-title role-change-info-title--caution">탈퇴안내</p>
            <ul className="role-change-info-list">
              <li>탈퇴 시 계정이 비활성화되며, 동일 회사의 관리자 수가 1명뿐인 경우 진행 전 경고가 표시됩니다.</li>
            </ul>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="role-change-footer">
          <button
            className="role-change-btn role-change-btn--primary"
            onClick={onConfirm}
            disabled={loading || !canChangeRole || newRole === member.role}
          >
            {loading ? "처리 중..." : "내용 변경하기"}
          </button>
          {onWithdraw && (
            <button
              className="role-change-btn role-change-btn--withdraw"
              onClick={() => onWithdraw(member)}
              disabled={loading}
            >
              {loading ? "처리 중..." : "해당 ID 탈퇴"}
            </button>
          )}
          <button
            className="role-change-btn role-change-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
