import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const auth = useAuth();
  const { companyInfo } = useCompany();

  const needsCompanyDocs = useMemo(() => {
    // Only enforce when server-provided flag is available
    if (companyInfo && Object.prototype.hasOwnProperty.call(companyInfo, "hasBizCertDoc")) {
      return companyInfo.hasBizCertDoc === false;
    }
    return false;
  }, [companyInfo]);

  if (auth.status === "checking") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner" aria-label="Loading" />
          <div style={{ color: "#555", fontSize: 14 }}>세션 확인 중...</div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // After authentication, require company docs to be uploaded.
  // Allow access to the onboarding page itself to complete the task.
  const path = location.pathname || "";
  if (needsCompanyDocs && path !== "/onboarding/docs") {
    return (
      <Navigate
        to="/onboarding/docs"
        replace
        state={{ from: path }}
      />
    );
  }

  return children;
}
