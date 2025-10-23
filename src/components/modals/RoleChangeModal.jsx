import React from "react";
import { ROLES } from "../../constants/auth";

export default function RoleChangeModal({ member, newRole, setNewRole, onClose, onConfirm, loading = false, onWithdraw, canChangeRole = false }) {
  if (!member) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>멤버 관리</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>사용자 ID</label>
            <input type="text" value={member.userId} disabled className="input-disabled" />
          </div>
          <div className="form-group">
            <label>이름</label>
            <input type="text" value={member.name} disabled className="input-disabled" />
          </div>
          <div className="form-group">
            <label>현재 역할</label>
            <input type="text" value={member.role} disabled className="input-disabled" />
          </div>
          <div className="form-group">
            <label htmlFor="newRole">새로운 역할 (admin ↔ member만 변경 가능)</label>
            <select
              id="newRole"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="select-input"
              disabled={!canChangeRole}
            >
              <option value={ROLES.MEMBER}>member</option>
              <option value={ROLES.ADMIN}>admin</option>
            </select>
          </div>
          <div className="info-box">
            <strong>주의:</strong> 역할 변경 시 대상 사용자의 토큰이 무효화되어 재로그인이 필요합니다. 역할 변경은 super_admin만 가능합니다.
          </div>
          <div className="info-box" style={{ backgroundColor: '#fff3cd', borderColor: '#ffeeba', color: '#856404' }}>
            <strong>탈퇴 안내:</strong> 탈퇴 시 계정이 비활성화되며, 동일 회사의 관리자 수가 1명뿐인 경우 진행 전 경고가 표시됩니다.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            취소
          </button>
          {onWithdraw && (
            <button className="btn-withdraw" onClick={() => onWithdraw(member)} disabled={loading}>
              {loading ? "처리 중..." : "탈퇴"}
            </button>
          )}
          <button className="btn-primary" onClick={onConfirm} disabled={loading || !canChangeRole || newRole === member.role}>
            {loading ? "처리 중..." : "변경"}
          </button>
        </div>
      </div>
    </div>
  );
}
