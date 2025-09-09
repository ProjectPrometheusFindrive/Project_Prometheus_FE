import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { typedStorage } from "../utils/storage";
import { fetchCompanyInfo } from "../api";
import defaultLogo from "../assets/default-logo.svg";

export default function TopHeader() {
    const navigate = useNavigate();
    const [companyInfo, setCompanyInfo] = useState(null);

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

    return (
        <header className="top-header" role="banner">
            <div className="top-header__left">
                <img 
                    src={companyInfo?.logoDataUrl || defaultLogo} 
                    alt="Company Logo" 
                    className="top-header__logo"
                    onError={(e) => {
                        e.target.src = defaultLogo;
                    }}
                />
                <div className="top-header__service-name">Findrive</div>
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