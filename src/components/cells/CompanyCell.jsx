import React from "react";
import GCSImage from "../GCSImage";

/**
 * CompanyCell - 회사 정보 표시 셀 컴포넌트
 * 로고 이미지(CI)와 회사명을 한 줄로 표시합니다.
 */
const CompanyCell = React.memo(function CompanyCell({ row }) {
    const name = row?.company || row?.companyName || row?.company_id || row?.companyId || "-";
    // Check multiple possible field names for logo path
    const logoPath = row?.companyLogoPath || row?.company_logo_path || row?.logoPath || row?.logo_path ||
                    (row?.companyInfo && (row.companyInfo.logoPath || row.companyInfo.logo_path)) || "";

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {logoPath && (
                <GCSImage
                    objectName={logoPath}
                    alt={`${name} CI`}
                    style={{ width: "24px", height: "24px", objectFit: "contain", flexShrink: 0 }}
                />
            )}
            <span className="company-cell__name" style={{ fontSize: "14px", fontFamily: "Pretendard", fontWeight: 500, color: "#1C1C1C" }}>
                {name}
            </span>
        </div>
    );
});

export default CompanyCell;
