import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiFileText, FiInfo, FiUsers } from "react-icons/fi";
import { FaCar } from "react-icons/fa";
import { typedStorage } from "../utils/storage";
import { useAuth } from "../contexts/AuthContext";
import { ROLES, isRoleAtLeast } from "../constants/auth";

export default function NavigationBar() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Show Members link only for admin and super_admin
    const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);

    return (
        <nav className="navigation-bar" role="navigation" aria-label="Main Navigation">
            <NavLink to="/dashboard" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Home" title="Home">
                <FiHome className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    홈
                </span>
            </NavLink>

            <NavLink to="/assets" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="자산" title="자산">
                <FaCar className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    자산
                </span>
            </NavLink>

            <NavLink to="/rentals/table" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="계약" title="계약">
                <FiFileText className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    계약
                </span>
            </NavLink>

            {canManageMembers && (
                <NavLink to="/members" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="회원 관리" title="회원 관리">
                    <FiUsers className="navigation-bar__icon" aria-hidden />
                    <span className="navigation-bar__label" role="tooltip">
                        회원
                    </span>
                </NavLink>
            )}

            <NavLink to="/settings" className={({ isActive }) => `navigation-bar__link navigation-bar__info ${isActive ? "is-active" : ""}`} aria-label="정보" title="정보">
                <FiInfo className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    정보
                </span>
            </NavLink>
        </nav>
    );
}
