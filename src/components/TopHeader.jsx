import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { typedStorage } from "../utils/storage";
import defaultLogo from "../assets/default-logo.svg";
import CiUploadModal from "./CiUploadModal";
import { useCompany } from "../contexts/CompanyContext";

export default function TopHeader() {
    const navigate = useNavigate();
    const { companyInfo, updateCompanyInfo } = useCompany();
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    function handleLogout() {
        typedStorage.auth.logout();
        navigate("/", { replace: true });
    }

    function onUploadClick() {
        setIsModalOpen(true);
    }

    function handleModalClose() {
        setIsModalOpen(false);
    }

    async function handleModalSubmit(file, previewUrl) {
        if (!file.type.startsWith("image/")) {
            alert("이미지 파일을 선택해 주세요.");
            return;
        }

        setUploading(true);
        try {
            updateCompanyInfo({ logoDataUrl: previewUrl });
            setIsModalOpen(false);
        } catch (err) {
            console.error("Failed to save logo:", err);
        } finally {
            setUploading(false);
        }
    }

    return (
        <header className="top-header" role="banner">
            <div className="top-header__left">
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
                    Findrive
                </div>
            </div>

            <div className="top-header__right">
                <span className="top-header__user-id">관리자</span>
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
