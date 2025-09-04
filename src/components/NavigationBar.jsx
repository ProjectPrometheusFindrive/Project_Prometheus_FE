import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiFileText, FiAlertTriangle, FiPlus, FiSettings, FiLogOut, FiMap } from "react-icons/fi";
import { FaCar } from "react-icons/fa";

export default function NavigationBar() {
    const navigate = useNavigate();

    function handleLogout() {
        try {
            localStorage.removeItem("isLoggedIn");
        } catch {}
        navigate("/", { replace: true });
    }

    return (
        <nav className="navigation-bar" role="navigation" aria-label="Main Navigation">
            <NavLink to="/dashboard" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Dashboard" title="Dashboard">
                <FiHome className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Dashboard
                </span>
            </NavLink>

            <NavLink to="/assets" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Assets" title="Assets">
                <FaCar className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Assets
                </span>
            </NavLink>

            <NavLink to="/rentals/table" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Contracts" title="Contracts">
                <FiFileText className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Contracts
                </span>
            </NavLink>

            <NavLink to="/returns" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Issues" title="Issues">
                <FiAlertTriangle className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Issues
                </span>
            </NavLink>

            <NavLink to="/rentals/map" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Map" title="Map">
                <FiMap className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Map
                </span>
            </NavLink>

            <NavLink to="/settings" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Settings" title="Settings">
                <FiSettings className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Settings
                </span>
            </NavLink>

            <button type="button" className="navigation-bar__link navigation-bar__logout" aria-label="Logout" title="Logout" onClick={handleLogout}>
                <FiLogOut className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Logout
                </span>
            </button>
        </nav>
    );
}
