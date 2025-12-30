import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import { typedStorage } from "../utils/storage";
import { useAuth } from "../contexts/AuthContext";
import CiUploadModal from "./modals/CiUploadModal";
import ThemeToggle from "./ThemeToggle";
import { useCompany } from "../contexts/CompanyContext";
import { uploadOne } from "../utils/uploadHelpers";
import GCSImage from "./GCSImage";
import { emitToast } from "../utils/toast";
import log from "../utils/logger";
import NavigationBar from "./NavigationBar";
import { ROLES, isRoleAtLeast } from "../constants/auth";

export default function TopHeader() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { companyInfo, updateCompanyInfo, loading } = useCompany();
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileWrapperRef = useRef(null);

    // Close profile menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileWrapperRef.current && !profileWrapperRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }
        if (isProfileMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isProfileMenuOpen]);

    // 사용자 / 회사 정보
    const userInfo = typedStorage.auth.getUserInfo();
    const userName = auth?.user?.name || userInfo?.name || "관리자";
    const companyNameRaw = companyInfo?.name || auth?.user?.company || userInfo?.company;
    const companyName = loading ? "" : (companyNameRaw || "");

    // 회원 관리는 관리자 이상에게만 노출
    const canManageMembers = auth?.user && isRoleAtLeast(auth.user.role, ROLES.ADMIN);

    const hasLogoPath = !!(companyInfo && companyInfo.logoPath);
    const hasLogoDataUrl = !!(companyInfo && companyInfo.logoDataUrl);
    const baseForInitial = (companyName || "").trim();
    const avatarInitial = baseForInitial ? baseForInitial.charAt(0) : "?";

    async function handleModalSubmit(file) {
        if (!file || (file.type && !String(file.type).startsWith("image/"))) {
            emitToast("이미지 파일을 선택해주세요.", "warning");
            return;
        }

        setUploading(true);
        try {
            const companyId = auth?.user?.companyId || companyInfo?.companyId || "ci";
            const folder = `company/${companyId}/docs`;
            log.debug("[upload-ui] logo upload start");
            log.debug("file:", { name: file?.name, size: file?.size, type: file?.type });
            const res = await uploadOne(file, { folder, label: "logo" });
            log.debug("[upload-ui] uploadOne result:", res);
            log.debug("[upload-ui] updating company logo objectName:", res?.objectName || "(none)");
            updateCompanyInfo({ logoPath: res?.objectName || "", logoDataUrl: "" });
            setIsModalOpen(false);
        } catch (err) {
            log.error("Failed to save logo:", err);
            emitToast("로고 저장 실패: " + (err?.message || String(err)), "error");
        } finally {
            log.debug("[upload-ui] logo upload complete");
            setUploading(false);
        }
    }

    function handleLogout() {
        auth.logout();
        navigate("/", { replace: true });
    }

    function openLogoModal() {
        setIsProfileMenuOpen(false);
        setIsModalOpen(true);
    }

    return (
        <header className="top-header bg-white shadow-sm" role="banner">
            {/* Left: 브랜드 로고 + 서비스명 */}
            <div
                className="top-header__left"
                onClick={() => navigate("/dashboard")}
            >
                <div
                    className="top-header__service-name"
                    role="link"
                    tabIndex={0}
                    title="대시보드로 이동"
                    aria-label="Findrive 대시보드로 이동"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate("/dashboard");
                        }
                    }}
                >
                    <span className="top-header__service-name--findrive">Findrive</span>
                </div>
            </div>

            {/* Center: GNB */}
            <NavigationBar />

            {/* Right: 설정 / 테마 / 프로필 */}
            <div className="top-header__right">
                <ThemeToggle />

                {/* Profile (thumb_img + 이름/회사, 드롭다운) */}
                <div className="top-header__profile-wrapper" ref={profileWrapperRef}>
                    <button
                        type="button"
                        className="top-header__profile-btn"
                        aria-haspopup="menu"
                        aria-expanded={isProfileMenuOpen}
                        onClick={() => setIsProfileMenuOpen((open) => !open)}
                    >
                        <div className="top-header__profile-thumb">
                            <span className="top-header__profile-bar" aria-hidden="true" />
                            <div className="top-header__profile-avatar">
                                {hasLogoPath ? (
                                    <GCSImage
                                        objectName={companyInfo.logoPath}
                                        alt="Company CI"
                                        className="top-header__profile-avatar-img"
                                    />
                                ) : hasLogoDataUrl ? (
                                    <img
                                        src={companyInfo.logoDataUrl}
                                        alt="Company CI"
                                        className="top-header__profile-avatar-img"
                                    />
                                ) : (
                                    <span className="top-header__profile-avatar-initial">
                                        {avatarInitial}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="top-header__profile-text">
                            <span className="top-header__profile-name">{userName}</span>
                            {companyName && (
                                <span className="top-header__profile-company">{companyName}</span>
                            )}
                        </div>
                        <FiChevronDown aria-hidden className="top-header__profile-chevron" />
                    </button>

                    {isProfileMenuOpen && (
                        <div
                            className="top-header__profile-menu"
                            role="menu"
                            aria-label="사용자 메뉴"
                        >
                            <button
                                type="button"
                                className="top-header__profile-menu-item"
                                role="menuitem"
                                onClick={openLogoModal}
                            >
                                로고관리
                            </button>
                            <button
                                type="button"
                                className="top-header__profile-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setIsProfileMenuOpen(false);
                                    navigate("/settings");
                                }}
                            >
                                회사정보설정
                            </button>
                            {canManageMembers && (
                                <button
                                    type="button"
                                    className="top-header__profile-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        navigate("/members");
                                    }}
                                >
                                    회원관리
                                </button>
                            )}
                            <button
                                type="button"
                                className="top-header__profile-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setIsProfileMenuOpen(false);
                                    navigate("/support");
                                }}
                            >
                                고객센터
                            </button>
                            <button
                                type="button"
                                className="top-header__profile-menu-item top-header__profile-menu-item--logout"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                <span className="top-header__profile-menu-item-text">로그아웃</span>
                                <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.91111 13H3V3H6.91111M10.7407 11.1746L14 8M14 8L10.7407 4.8254M14 8H6.91111" stroke="#888888" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CiUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                title="로고관리"
            />
        </header>
    );
}
