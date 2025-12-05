import React, { useState } from "react";
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

export default function TopHeader() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { companyInfo, updateCompanyInfo, loading } = useCompany();
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // 사용자 / 회사 정보
    const userInfo = typedStorage.auth.getUserInfo();
    const userName = auth?.user?.name || userInfo?.name || "관리자";
    const companyNameRaw = companyInfo?.name || auth?.user?.company || userInfo?.company;
    const companyName = loading ? "" : (companyNameRaw || "");

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
                    <svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.2278 13.1806C17.1082 13.4517 17.0724 13.7523 17.1253 14.0439C17.1781 14.3354 17.3171 14.6044 17.5243 14.8162L17.5787 14.8705C17.9158 15.2077 18.1052 15.6649 18.1052 16.1416C18.1052 16.6184 17.9158 17.0756 17.5787 17.4128C17.2415 17.7499 16.7843 17.9393 16.3076 17.9393C15.8308 17.9393 15.3736 17.7499 15.0364 17.4128L14.9821 17.3584C14.772 17.1553 14.507 17.0182 14.2198 16.9641C13.9326 16.91 13.6359 16.9413 13.3663 17.0541C13.0967 17.1669 12.8661 17.3562 12.703 17.5987C12.5398 17.8411 12.4514 18.1261 12.4485 18.4183V18.5715C12.4362 19.0398 12.2415 19.4849 11.9059 19.8118C11.5703 20.1388 11.1203 20.3217 10.6518 20.3217C10.1832 20.3217 9.73322 20.1388 9.39761 19.8118C9.06199 19.4849 8.8673 19.0398 8.85502 18.5715V18.4899C8.84856 18.1923 8.75259 17.9034 8.57963 17.6611C8.40667 17.4187 8.16472 17.234 7.88532 17.1311C7.61429 17.0114 7.31362 16.9757 7.02209 17.0285C6.73056 17.0814 6.46156 17.2204 6.24979 17.4276L6.19543 17.4819C5.85831 17.8191 5.40108 18.0085 4.92432 18.0085C4.44755 18.0085 3.99032 17.8191 3.6532 17.4819C3.31608 17.1448 3.12668 16.6876 3.12668 16.2108C3.12668 15.7341 3.31608 15.2768 3.6532 14.9397L3.70755 14.8854C3.91068 14.6753 4.04776 14.4102 4.10185 14.1231C4.15594 13.8359 4.12466 13.5391 4.01188 13.2696C3.89911 13 3.70978 12.7693 3.46731 12.6062C3.22485 12.4431 2.93988 12.3546 2.64767 12.3518H2.49449C2.25458 12.3581 2.01583 12.3162 1.79234 12.2288C1.56885 12.1413 1.36514 12.01 1.19323 11.8425C1.02131 11.675 0.884678 11.4748 0.791383 11.2537C0.698089 11.0326 0.650024 10.795 0.650024 10.555C0.650024 10.315 0.698089 10.0775 0.791383 9.85635C0.884678 9.63522 1.02131 9.43503 1.19323 9.26756C1.36514 9.1001 1.56885 8.96876 1.79234 8.88129C2.01583 8.79383 2.25458 8.752 2.49449 8.7583H2.57479C2.87247 8.75183 3.16131 8.65587 3.40368 8.4829C3.64604 8.30994 3.83071 8.068 3.93361 7.78859C4.0533 7.51756 4.08903 7.21689 4.03618 6.92536C3.98334 6.63383 3.84435 6.36483 3.63714 6.15306L3.58279 6.09871C3.40663 5.93401 3.26541 5.73556 3.16755 5.51515C3.06968 5.29474 3.01717 5.0569 3.01315 4.81577C3.00912 4.57465 3.05366 4.33518 3.14411 4.11163C3.23456 3.88808 3.36907 3.68502 3.53964 3.51454C3.7102 3.34406 3.91333 3.20964 4.13693 3.1193C4.36052 3.02896 4.60001 2.98454 4.84113 2.98868C5.08225 2.99282 5.32007 3.04545 5.54043 3.14342C5.76079 3.24139 5.95918 3.3827 6.12379 3.55894L6.17814 3.6133C6.38991 3.8205 6.65891 3.95949 6.95044 4.01234C7.24197 4.06518 7.54264 4.02946 7.81367 3.90977H7.88532C8.15132 3.79568 8.37811 3.60622 8.5377 3.36475C8.69728 3.12328 8.78269 2.84038 8.78337 2.55094V2.40024C8.79566 1.93187 8.99034 1.48681 9.32596 1.15988C9.66157 0.832953 10.1116 0.65 10.5801 0.65C11.0486 0.65 11.4986 0.832953 11.8343 1.15988C12.1699 1.48681 12.3646 1.93187 12.3768 2.40024V2.48053C12.3797 2.77275 12.4682 3.05771 12.6313 3.30017C12.7944 3.54264 13.025 3.73197 13.2946 3.84475C13.5642 3.95752 13.861 3.9888 14.1481 3.93471C14.4353 3.88062 14.7003 3.74354 14.9104 3.54041L14.9648 3.48606C15.1317 3.31913 15.3299 3.18672 15.548 3.09638C15.7661 3.00604 15.9998 2.95955 16.2359 2.95955C16.472 2.95955 16.7057 3.00604 16.9238 3.09638C17.1419 3.18672 17.3401 3.31913 17.507 3.48606C17.6739 3.65299 17.8064 3.85116 17.8967 4.06925C17.987 4.28735 18.0335 4.52111 18.0335 4.75718C18.0335 4.99325 17.987 5.227 17.8967 5.4451C17.8064 5.6632 17.6739 5.86137 17.507 6.0283L17.4527 6.08265C17.2455 6.29442 17.1065 6.56342 17.0536 6.85495C17.0008 7.14648 17.0365 7.44715 17.1562 7.71818V7.78982C17.2703 8.05583 17.4597 8.28262 17.7012 8.4422C17.9427 8.60179 18.2256 8.6872 18.515 8.68788H18.6682C19.1366 8.70017 19.5816 8.89485 19.9086 9.23047C20.2355 9.56608 20.4184 10.0161 20.4184 10.4846C20.4184 10.9531 20.2355 11.4032 19.9086 11.7388C19.5816 12.0744 19.1366 12.2691 18.6682 12.2814H18.5842C18.2948 12.282 18.0119 12.3674 17.7704 12.527C17.5289 12.6866 17.3395 12.9134 17.2254 13.1794L17.2278 13.1806Z" stroke="#1C1C1C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="10.534" cy="10.486" r="2.779" stroke="#1C1C1C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                {/* Profile (thumb_img + 이름/회사, 드롭다운) */}
                <div className="top-header__profile-wrapper">
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
                title="회사 로고 업로드"
            />
        </header>
    );
}
