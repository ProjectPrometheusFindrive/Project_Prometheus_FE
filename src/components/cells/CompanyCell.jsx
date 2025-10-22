import React from "react";
import GCSImage from "../GCSImage";

/**
 * CompanyCell - 회사 정보 표시 셀 컴포넌트
 * 로고 이미지와 회사명, 사업자등록번호를 표시합니다.
 */
export default function CompanyCell({ row }) {
    const name = row?.company || row?.companyName || row?.company_id || row?.companyId || "-";
    const biz = row?.bizRegNo || row?.businessNumber || row?.bizNo || row?.biz_reg_no || "";
    // Check multiple possible field names for logo path
    const logoPath = row?.companyLogoPath || row?.company_logo_path || row?.logoPath || row?.logo_path ||
                    (row?.companyInfo && (row.companyInfo.logoPath || row.companyInfo.logo_path)) || "";

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {logoPath && (
                <GCSImage
                    objectName={logoPath}
                    alt={`${name} CI`}
                    style={{ width: "32px", height: "32px", objectFit: "contain", flexShrink: 0 }}
                />
            )}
            <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600 }}>{name}</div>
                {biz ? (
                    <div style={{ fontSize: "0.8rem", color: "#999" }}>( {biz} )</div>
                ) : (
                    <div style={{ fontSize: "0.8rem", color: "#bbb" }}>( - )</div>
                )}
            </div>
        </div>
    );
}
