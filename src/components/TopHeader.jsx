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

                <button
                    type="button"
                    className="top-header__icon-button"
                    aria-label="환경 설정"
                    title="환경 설정"
                    onClick={() => navigate("/settings")}
                >
                    <svg width="26" height="26" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="34" height="34" rx="17" fill="#F8F8F8" />
                        <path d="M20.2794 17.5C20.2794 18.0497 20.1164 18.5871 19.811 19.0442C19.5056 19.5012 19.0715 19.8575 18.5636 20.0678C18.0558 20.2782 17.4969 20.3332 16.9578 20.226C16.4186 20.1188 15.9234 19.854 15.5347 19.4653C15.1459 19.0766 14.8812 18.5814 14.774 18.0422C14.6667 17.5031 14.7218 16.9442 14.9322 16.4364C15.1425 15.9285 15.4988 15.4944 15.9558 15.189C16.4129 14.8836 16.9503 14.7206 17.5 14.7206C18.2371 14.7206 18.9441 15.0134 19.4653 15.5347C19.9866 16.0559 20.2794 16.7628 20.2794 17.5Z" stroke="#1C1C1C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M24.1484 20.1954C24.0287 20.4665 23.993 20.7671 24.0458 21.0587C24.0987 21.3502 24.2376 21.6192 24.4448 21.831L24.4992 21.8853C24.8363 22.2224 25.0257 22.6797 25.0257 23.1564C25.0257 23.6332 24.8363 24.0904 24.4992 24.4276C24.1621 24.7647 23.7048 24.9541 23.2281 24.9541C22.7513 24.9541 22.2941 24.7647 21.957 24.4276L21.9026 24.3732C21.6925 24.1701 21.4275 24.033 21.1403 23.9789C20.8531 23.9248 20.5564 23.9561 20.2868 24.0689C20.0172 24.1817 19.7866 24.371 19.6235 24.6134C19.4604 24.8559 19.3719 25.1409 19.369 25.4331V25.5863C19.3567 26.0546 19.1621 26.4997 18.8264 26.8266C18.4908 27.1536 18.0408 27.3365 17.5723 27.3365C17.1038 27.3365 16.6538 27.1536 16.3181 26.8266C15.9825 26.4997 15.7878 26.0546 15.7756 25.5863V25.5047C15.7691 25.2071 15.6731 24.9182 15.5002 24.6758C15.3272 24.4335 15.0853 24.2488 14.8058 24.1459C14.5348 24.0262 14.2341 23.9905 13.9426 24.0433C13.6511 24.0962 13.3821 24.2352 13.1703 24.4424L13.116 24.4967C12.7788 24.8339 12.3216 25.0233 11.8448 25.0233C11.3681 25.0233 10.9109 24.8339 10.5737 24.4967C10.2366 24.1596 10.0472 23.7024 10.0472 23.2256C10.0472 22.7489 10.2366 22.2916 10.5737 21.9545L10.6281 21.9002C10.8312 21.6901 10.9683 21.425 11.0224 21.1379C11.0765 20.8507 11.0452 20.5539 10.9324 20.2844C10.8196 20.0148 10.6303 19.7841 10.3878 19.621C10.1454 19.4579 9.86042 19.3694 9.5682 19.3666H9.41502C9.17511 19.3729 8.93637 19.331 8.71287 19.2436C8.48938 19.1561 8.28567 19.0248 8.11376 18.8573C7.94184 18.6898 7.80521 18.4896 7.71192 18.2685C7.61862 18.0474 7.57056 17.8098 7.57056 17.5698C7.57056 17.3298 7.61862 17.0923 7.71192 16.8711C7.80521 16.65 7.94184 16.4498 8.11376 16.2824C8.28567 16.1149 8.48938 15.9836 8.71287 15.8961C8.93637 15.8086 9.17511 15.7668 9.41502 15.7731H9.49532C9.793 15.7666 10.0818 15.6707 10.3242 15.4977C10.5666 15.3247 10.7512 15.0828 10.8541 14.8034C10.9738 14.5324 11.0096 14.2317 10.9567 13.9402C10.9039 13.6486 10.7649 13.3796 10.5577 13.1679L10.5033 13.1135C10.3272 12.9488 10.1859 12.7504 10.0881 12.5299C9.99021 12.3095 9.93771 12.0717 9.93368 11.8306C9.92965 11.5894 9.97419 11.35 10.0646 11.1264C10.1551 10.9029 10.2896 10.6998 10.4602 10.5293C10.6307 10.3589 10.8339 10.2244 11.0575 10.1341C11.2811 10.0438 11.5205 9.99933 11.7617 10.0035C12.0028 10.0076 12.2406 10.0602 12.461 10.1582C12.6813 10.2562 12.8797 10.3975 13.0443 10.5737L13.0987 10.6281C13.3104 10.8353 13.5794 10.9743 13.871 11.0271C14.1625 11.08 14.4632 11.0443 14.7342 10.9246H14.8058C15.0719 10.8105 15.2986 10.621 15.4582 10.3795C15.6178 10.1381 15.7032 9.85517 15.7039 9.56574V9.41503C15.7162 8.94666 15.9109 8.50161 16.2465 8.17468C16.5821 7.84775 17.0321 7.66479 17.5006 7.66479C17.9692 7.66479 18.4192 7.84775 18.7548 8.17468C19.0904 8.50161 19.2851 8.94666 19.2974 9.41503V9.49533C19.3003 9.78754 19.3887 10.0725 19.5518 10.315C19.715 10.5574 19.9456 10.7468 20.2152 10.8595C20.4848 10.9723 20.7815 11.0036 21.0687 10.9495C21.3559 10.8954 21.6209 10.7583 21.831 10.5552L21.8853 10.5009C22.0522 10.3339 22.2504 10.2015 22.4685 10.1112C22.6866 10.0208 22.9204 9.97434 23.1564 9.97434C23.3925 9.97434 23.6263 10.0208 23.8444 10.1112C24.0625 10.2015 24.2606 10.3339 24.4276 10.5009C24.5945 10.6678 24.7269 10.866 24.8172 11.084C24.9076 11.3021 24.9541 11.5359 24.9541 11.772C24.9541 12.008 24.9076 12.2418 24.8172 12.4599C24.7269 12.678 24.5945 12.8762 24.4276 13.0431L24.3732 13.0974C24.166 13.3092 24.027 13.5782 23.9742 13.8697C23.9213 14.1613 23.957 14.4619 24.0767 14.733V14.8046C24.1908 15.0706 24.3803 15.2974 24.6217 15.457C24.8632 15.6166 25.1461 15.702 25.4356 15.7027H25.5887C26.0571 15.715 26.5022 15.9096 26.8291 16.2453C27.156 16.5809 27.339 17.0309 27.339 17.4994C27.339 17.9679 27.156 18.418 26.8291 18.7536C26.5022 19.0892 26.0571 19.2839 25.5887 19.2962H25.5047C25.2153 19.2968 24.9324 19.3822 24.6909 19.5418C24.4495 19.7014 24.26 19.9282 24.1459 20.1942L24.1484 20.1954Z" stroke="#1C1C1C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

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
                                className="top-header__profile-menu-item top-header__profile-menu-item--danger"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                로그아웃
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
