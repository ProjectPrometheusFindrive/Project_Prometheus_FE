import React from "react";
import { ROLES } from "../../constants/auth";

export default function RoleChangeModal({ member, newRole, setNewRole, onClose, onConfirm, loading = false }) {
  if (!member) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>역할 변경</h3>
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
            >
              <option value={ROLES.MEMBER}>member</option>
              <option value={ROLES.ADMIN}>admin</option>
            </select>
          </div>
          <div className="info-box">
            <strong>주의:</strong> 역할 변경 시 대상 사용자의 토큰이 무효화되어 재로그인이 필요합니다.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            취소
          </button>
          <button className="btn-primary" onClick={onConfirm} disabled={loading || newRole === member.role}>
            {loading ? "처리 중..." : "변경"}
          </button>
        </div>
      </div>
    </div>
  );
}

