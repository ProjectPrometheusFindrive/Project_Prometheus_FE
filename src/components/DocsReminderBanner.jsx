import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import { typedStorage } from "../utils/storage";

export default function DocsReminderBanner() {
  const auth = useAuth();
  const { companyInfo } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setShow(false);
      return;
    }
    const flag = typedStorage.flags.getNeedsCompanyDocs();
    setShow(!!flag);
  }, [auth.isAuthenticated]);

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
            if (location.pathname !== "/settings") navigate("/settings");
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

