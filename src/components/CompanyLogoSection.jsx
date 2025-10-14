import React, { useState } from "react";
import { useCompany } from "../contexts/CompanyContext";
import GCSImage from "./GCSImage";
import DragDropUpload from "./DragDropUpload";
import defaultLogo from "../assets/default-logo.svg";

function CompanyLogoSection() {
  const { companyInfo, updateCompanyInfo } = useCompany();
  const [uploading, setUploading] = useState(false);

  const handleUploadSuccess = (objectName) => {
    updateCompanyInfo({ logoPath: objectName, logoDataUrl: "" });
  };

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
          <DragDropUpload folder="company/ci" accept="image/png,image/jpeg,image/jpg,image/webp" onUploadSuccess={handleUploadSuccess} onError={(e) => console.error(e)} />
        </div>
      </div>
    </div>
  );
}

export default CompanyLogoSection;

