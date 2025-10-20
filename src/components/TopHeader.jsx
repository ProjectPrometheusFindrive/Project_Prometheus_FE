import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { typedStorage } from "../utils/storage";
import { useAuth } from "../contexts/AuthContext";
// Default logo served from public root
const defaultLogo = "/PPFD.png";
import CiUploadModal from "./CiUploadModal";
import { useCompany } from "../contexts/CompanyContext";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";
import { chooseUploadMode } from "../constants/uploads";
import GCSImage from "./GCSImage";

export default function TopHeader() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { companyInfo, updateCompanyInfo, loading } = useCompany();
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Get user info from storage
    const userInfo = typedStorage.auth.getUserInfo();
    const userName = (auth?.user?.name) || userInfo?.name || "관리자";
    const userRoleRaw = (auth?.user?.role) || userInfo?.role || "member";
    const userRole = String(userRoleRaw || "member");
    const roleLabel = userRole.replace("_", "-");
    // Display company name strictly from company profile for consistency
    const companyName = loading ? "" : ((companyInfo && companyInfo.name) || "");

    function handleLogout() {
        auth.logout();
        navigate("/", { replace: true });
    }

    function onUploadClick() {
        setIsModalOpen(true);
    }

    function handleModalClose() {
        setIsModalOpen(false);
    }

    async function handleModalSubmit(file, previewUrl) {
        if (!file || (file.type && !String(file.type).startsWith("image/"))) {
            alert("이미지 파일을 선택해 주세요.");
            return;
        }

        setUploading(true);
        try {
            // Use canonical companyId for uploads: company/{companyId}/docs
            const companyId = auth?.user?.companyId || companyInfo?.companyId || "ci";
            const folder = `company/${companyId}/docs`;
            const mode = chooseUploadMode(file.size);
            let objectName = "";
            console.groupCollapsed("[upload-ui] logo upload start");
            console.debug("file:", { name: file?.name, size: file?.size, type: file?.type });
            console.debug("mode:", mode, "folder:", folder);
            if (mode === "signed-put") {
                const { promise } = uploadViaSignedPut(file, { folder, onProgress: (p) => console.debug("[upload-ui] signed-put progress:", p) });
                const res = await promise;
                console.debug("[upload-ui] signed-put result:", res);
                objectName = res.objectName || "";
            } else {
                const { promise } = uploadResumable(file, { folder, onProgress: (p) => console.debug("[upload-ui] resumable progress:", p) });
                const res = await promise;
                console.debug("[upload-ui] resumable result:", res);
                objectName = res.objectName || "";
            }
            console.debug("[upload-ui] updating company logo objectName:", objectName || "(none)");
            // Persist preferred field: logoPath (objectName). Clear legacy data URL.
            updateCompanyInfo({ logoPath: objectName, logoDataUrl: "" });
            setIsModalOpen(false);
        } catch (err) {
            console.error("Failed to save logo:", err);
            alert("업로드 실패: " + (err?.message || String(err)));
        } finally {
            console.groupEnd();
            setUploading(false);
        }
    }

    return (
        <header className="top-header" role="banner">
            <div className="top-header__left">
                {companyInfo?.logoPath ? (
                    <GCSImage
                        objectName={companyInfo.logoPath}
                        alt="Company Logo"
                        className="top-header__logo"
                        title={uploading ? "업로드 중..." : "로고 업로드"}
                        role="button"
                        tabIndex={0}
                        onClick={() => !uploading && onUploadClick()}
                        onKeyDown={(e) => {
                            if (uploading) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onUploadClick();
                            }
                        }}
                    />
                ) : (
                    <img
                        src={companyInfo?.logoDataUrl || defaultLogo}
                        alt="Company Logo"
                        className="top-header__logo"
                        title={uploading ? "업로드 중..." : "로고 업로드"}
                        role="button"
                        tabIndex={0}
                        onClick={() => !uploading && onUploadClick()}
                        onKeyDown={(e) => {
                            if (uploading) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onUploadClick();
                            }
                        }}
                        onError={(e) => {
                            e.target.src = defaultLogo;
                        }}
                    />
                )}
                <div
                    className="top-header__service-name"
                    role="link"
                    tabIndex={0}
                    title="대시보드로 이동"
                    onClick={() => navigate("/dashboard")}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate("/dashboard");
                        }
                    }}
                >
                    <span className="top-header__service-name--findrive">Findrive</span>
                    {companyName && (
                        <>
                            <span className="top-header__service-name--separator"> · </span>
                            <span className="top-header__service-name--company">{companyName}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="top-header__right">
                <div className="top-header__user" aria-label={`사용자 ${userName}, 역할 ${roleLabel}`}>
                    <span className="top-header__user-id">{userName}</span>
                    <span className="top-header__user-separator" aria-hidden>·</span>
                    <span
                        className={`top-header__user-role role-${userRole}`}
                        title={`역할: ${roleLabel}`}
                        aria-label={`현재 사용자 역할: ${roleLabel}`}
                    >
                        {roleLabel}
                    </span>
                </div>
                <button
                    type="button"
                    className="top-header__logout-btn"
                    aria-label="Logout"
                    title="Logout"
                    onClick={handleLogout}
                >
                    <FiLogOut className="top-header__icon" aria-hidden />
                    Logout
                </button>
            </div>

            <CiUploadModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                title="회사 로고 업로드"
            />
        </header>
    );
}
