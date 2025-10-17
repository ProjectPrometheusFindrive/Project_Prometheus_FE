import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { emitToast } from "../utils/toast";
import { storageUtils, STORAGE_KEYS } from "../utils/storage";

// Handles approval-related query params and cross-page signals on mount.
// - approval, code, userId: show success/error toasts and clean the URL
// - approve_user: store focus intent for MemberManagement and toast
export default function useApprovalQueryEffects() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const approval = params.get("approval");
    const code = params.get("code");
    const userId = params.get("userId");
    const approveUser = params.get("approve_user");

    if (approveUser) {
      try {
        storageUtils.set(STORAGE_KEYS.APPROVE_USER_FOCUS, { userId: approveUser, ts: Date.now() });
      } catch {}
      emitToast(`대기 회원 ${approveUser}을(를) 강조 표시합니다.`, "info", 3000);
    }

    if (approval) {
      if (approval === "success" && userId) {
        emitToast("승인이 완료되었습니다.", "success", 3500);
        try { window.dispatchEvent(new CustomEvent("app:refresh-pending-members")); } catch {}
      } else if (approval === "error") {
        const map = {
          missing_token: "승인 토큰이 없습니다.",
          invalid_token: "승인 토큰이 유효하지 않습니다.",
          token_payload: "승인 토큰 정보가 올바르지 않습니다.",
          user_not_found: "해당 사용자를 찾을 수 없습니다.",
          mismatch: "요청 정보가 일치하지 않습니다.",
          already_processed: "이미 처리된 승인 요청입니다.",
          server_error: "승인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        };
        const msg = map[code] || "승인 처리 중 오류가 발생했습니다.";
        emitToast(msg, "error", 4000);
      }
      // Clean query to avoid repeated toasts
      navigate({ pathname: location.pathname }, { replace: true });
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

