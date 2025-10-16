import React, { useEffect, useState } from "react";
import { changePassword } from "../api";
import { typedStorage } from "../utils/storage";
import { emitToast } from "../utils/toast";

export default function ChangePasswordModal({ open, onClose, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!currentPassword || !newPassword) {
      setError("현재 비밀번호와 새 비밀번호를 입력하세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // Server invalidates token; proactively log out and notify
      typedStorage.auth.logout();
      emitToast("비밀번호가 변경되었습니다. 다시 로그인해 주세요.", "success", 4000);
      if (onChanged) onChanged();
      if (onClose) onClose();
      try {
        window.location.hash = "#/";
      } catch {}
    } catch (err) {
      setError(err?.message || "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>비밀번호 변경 필요</h3>
          <button className="close-btn" onClick={onClose} aria-label="닫기">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="info-box" style={{ marginBottom: 12 }}>
              임시 비밀번호로 로그인했습니다. 즉시 새 비밀번호로 변경해 주세요.
            </p>
            <div className="form-group">
              <label htmlFor="cp-current">현재 비밀번호</label>
              <input id="cp-current" type="password" className="login-input" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="cp-new">새 비밀번호</label>
              <input id="cp-new" type="password" className="login-input" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="cp-confirm">새 비밀번호 확인</label>
              <input id="cp-confirm" type="password" className="login-input" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
            </div>
            {error && <div className="error-banner">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>취소</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "변경 중..." : "변경"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

