import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import { typedStorage } from "../utils/storage";

export default function DocsReminderBanner() {
  const auth = useAuth();
  const { companyInfo, loading } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);

  const serverHasFlag = useMemo(() => {
    return !!(companyInfo && Object.prototype.hasOwnProperty.call(companyInfo, "hasBizCertDoc"));
  }, [companyInfo]);

  const needDocsFromServer = useMemo(() => {
    if (!auth.isAuthenticated) return false;
    if (serverHasFlag) {
      return companyInfo.hasBizCertDoc === false;
    }
    return false;
  }, [auth.isAuthenticated, serverHasFlag, companyInfo]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setShow(false);
      return;
    }
    // While company info is loading, don't show to avoid flicker
    if (loading) {
      setShow(false);
      return;
    }
    // Hide on onboarding page itself
    if ((location.pathname || "") === "/onboarding/docs") {
      setShow(false);
      return;
    }
    // Prefer server truth; only fallback to local flag when server hasn't provided definitive value
    if (serverHasFlag) {
      setShow(needDocsFromServer);
      return;
    }
    const flag = typedStorage.flags.getNeedsCompanyDocs();
    setShow(!!flag);
  }, [auth.isAuthenticated, loading, location.pathname, needDocsFromServer, serverHasFlag]);

  if (!show) return null;

  return (
    <div style={{
      backgroundColor: "#FFF8E1",
      borderBottom: "1px solid #FDD835",
      color: "#5D4037",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }} role="status" aria-live="polite">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>회사 서류/로고 업로드를 완료해 주세요.</span>
        <span style={{ fontSize: 13, opacity: 0.9 }}>설정에서 사업자등록증 및 로고를 등록할 수 있습니다.</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="form-button"
          onClick={() => {
            typedStorage.flags.clearNeedsCompanyDocs();
            setShow(false);
            const dest = "/onboarding/docs";
            if (location.pathname !== dest) navigate(dest);
          }}
          style={{ backgroundColor: "#177245" }}
        >
          지금 업로드
        </button>
        <button
          type="button"
          className="form-button"
          onClick={() => {
            typedStorage.flags.clearNeedsCompanyDocs();
            setShow(false);
          }}
          style={{ backgroundColor: "#6c757d" }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
