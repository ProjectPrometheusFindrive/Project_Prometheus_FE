import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { typedStorage } from "../utils/storage";
import { fetchCompanyInfo, saveCompanyInfo } from "../api";
import defaultLogo from "../assets/default-logo.svg";

export default function TopHeader() {
    const navigate = useNavigate();
    const [companyInfo, setCompanyInfo] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const loadCompanyInfo = async () => {
            try {
                const info = await fetchCompanyInfo();
                setCompanyInfo(info);
            } catch (error) {
                console.error('Failed to load company info:', error);
            }
        };
        loadCompanyInfo();
    }, []);

    function handleLogout() {
        typedStorage.auth.logout();
        navigate("/", { replace: true });
    }

    function onUploadClick() {
        const input = document.getElementById("header-logo-upload");
        if (input) input.click();
    }

    function onFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("이미지 파일을 선택해 주세요.");
            return;
        }
        const reader = new FileReader();
        setUploading(true);
        reader.onload = async () => {
            try {
                const next = { ...(companyInfo || {}), logoDataUrl: reader.result };
                await saveCompanyInfo(next);
                setCompanyInfo(next);
            } catch (err) {
                console.error("Failed to save logo:", err);
            } finally {
                setUploading(false);
                e.target.value = ""; // reset input
            }
        };
        reader.readAsDataURL(file);
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
                <div className="top-header__service-name">Findrive</div>
                <input id="header-logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
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
        </header>
    );
}
