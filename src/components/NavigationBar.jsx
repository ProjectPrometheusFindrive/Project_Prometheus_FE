import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLES, isRoleAtLeast } from "../constants/auth";

export default function NavigationBar() {
    const { user } = useAuth();

    // 회원 관리는 관리자 이상에게만 노출
    const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);

    const linkClass = ({ isActive }) =>
        `navigation-bar__link ${isActive ? "is-active" : ""}`;

    return (
        <nav
            className="navigation-bar"
            role="navigation"
            aria-label="주요 메뉴"
        >
            <NavLink to="/dashboard" className={linkClass}>
                <span className="navigation-bar__label">홈</span>
            </NavLink>

            <NavLink to="/assets" className={linkClass}>
                <span className="navigation-bar__label">자산등록관리</span>
            </NavLink>

            <NavLink to="/rentals/table" className={linkClass}>
                <span className="navigation-bar__label">계약등록관리</span>
            </NavLink>

            {canManageMembers && (
                <NavLink to="/members" className={linkClass}>
                    <span className="navigation-bar__label">회원관리</span>
                </NavLink>
            )}

            <NavLink
                to="/settings"
                className={({ isActive }) =>
                    `navigation-bar__link navigation-bar__info ${
                        isActive ? "is-active" : ""
                    }`
                }
            >
                <span className="navigation-bar__label">고객센터</span>
            </NavLink>
        </nav>
    );
}
