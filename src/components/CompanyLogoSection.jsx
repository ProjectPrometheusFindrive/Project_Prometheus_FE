import React, { useMemo, useState } from "react";
import { useCompany } from "../contexts/CompanyContext";
import { useAuth } from "../contexts/AuthContext";
import GCSImage from "./GCSImage";
import DragDropUpload from "./DragDropUpload";
// Default logo served from public root
const defaultLogoUrl = "/PPFD.png";

function CompanyLogoSection() {
  const { companyInfo, updateCompanyInfo } = useCompany();
  const auth = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUploadSuccess = (objectName) => {
    updateCompanyInfo({ logoPath: objectName, logoDataUrl: "" });
  };

  // Use canonical companyId; avoid falling back to display name for folder rules
  const companyId = useMemo(() => (
    auth?.user?.companyId || companyInfo?.companyId || ""
  ), [auth?.user?.companyId, companyInfo?.companyId]);

  const folder = useMemo(() => {
    // Use logged-in companyId for general company docs; fallback to "ci" when absent
    const id = (companyId && String(companyId).trim()) ? companyId : "ci";
    // Do not URL-encode; BE validates allowed characters and expects raw companyId
    return `company/${id}/docs`;
  }, [companyId]);

  return (
    <div className="card mb-4">
      <div className="header-row mb-2">
        <div>
          <h2>회사 로고</h2>
        </div>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <div>
          {companyInfo?.logoPath ? (
            <GCSImage objectName={companyInfo.logoPath} alt="Company Logo" className="logo-preview" />
          ) : companyInfo?.logoDataUrl ? (
            <img src={companyInfo.logoDataUrl} alt="Company Logo" className="logo-preview" />
          ) : (
            <img src={defaultLogoUrl} alt="Default Logo" className="logo-preview" />
          )}
        </div>
        <div className="min-w-[280px] flex-1">
          {folder ? (
            <DragDropUpload
              folder={folder}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onUploadSuccess={handleUploadSuccess}
              onError={(e) => console.error(e)}
            />
          ) : (
            <div className="text-[13px] text-gray-500">
              회사 식별 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyLogoSection;
