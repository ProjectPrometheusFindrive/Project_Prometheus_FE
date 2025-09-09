import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiFileText, FiInfo } from "react-icons/fi";
import { FaCar } from "react-icons/fa";
import { typedStorage } from "../utils/storage";

export default function NavigationBar() {
    const navigate = useNavigate();


    return (
        <nav className="navigation-bar" role="navigation" aria-label="Main Navigation">

            <NavLink to="/dashboard" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="Home" title="Home">
                <FiHome className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Home
                </span>
            </NavLink>

            <NavLink to="/assets" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="자산등록관리" title="자산등록관리">
                <FaCar className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    자산등록관리
                </span>
            </NavLink>

            <NavLink to="/rentals/table" className={({ isActive }) => `navigation-bar__link ${isActive ? "is-active" : ""}`} aria-label="계약등록관리" title="계약등록관리">
                <FiFileText className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    계약등록관리
                </span>
            </NavLink>


            <NavLink to="/settings" className={({ isActive }) => `navigation-bar__link navigation-bar__info ${isActive ? "is-active" : ""}`} aria-label="Info" title="Info">
                <FiInfo className="navigation-bar__icon" aria-hidden />
                <span className="navigation-bar__label" role="tooltip">
                    Info
                </span>
            </NavLink>
        </nav>
    );
}
