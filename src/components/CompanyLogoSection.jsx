import React, { useMemo, useState } from "react";
import { useCompany } from "../contexts/CompanyContext";
import { useAuth } from "../contexts/AuthContext";
import GCSImage from "./GCSImage";
import DragDropUpload from "./DragDropUpload";
import defaultLogo from "../assets/default-logo.svg";

function CompanyLogoSection() {
  const { companyInfo, updateCompanyInfo } = useCompany();
  const auth = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUploadSuccess = (objectName) => {
    updateCompanyInfo({ logoPath: objectName, logoDataUrl: "" });
  };

  const companyId = useMemo(() => (
    auth?.user?.company || companyInfo?.company || companyInfo?.name || ""
  ), [auth?.user?.company, companyInfo?.company, companyInfo?.name]);

  const folder = useMemo(() => (
    companyId ? `company/${encodeURIComponent(companyId)}/docs` : ""
  ), [companyId]);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="header-row" style={{ marginBottom: 10 }}>
        <div>
          <h2>회사 로고</h2>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          {companyInfo?.logoPath ? (
            <GCSImage objectName={companyInfo.logoPath} alt="Company Logo" className="logo-preview" />
          ) : companyInfo?.logoDataUrl ? (
            <img src={companyInfo.logoDataUrl} alt="Company Logo" className="logo-preview" />
          ) : (
            <img src={defaultLogo} alt="Default Logo" className="logo-preview" />
          )}
        </div>
        <div style={{ minWidth: 280, flex: 1 }}>
          {folder ? (
            <DragDropUpload
              folder={folder}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onUploadSuccess={handleUploadSuccess}
              onError={(e) => console.error(e)}
            />
          ) : (
            <div style={{ color: "#888", fontSize: 13 }}>
              회사 식별 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyLogoSection;
