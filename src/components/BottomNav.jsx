import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiBox,
  FiFileText,
  FiAlertCircle,
  FiUserPlus,
  FiSettings,
  FiLogOut,
  FiMap,
} from "react-icons/fi";

export default function BottomNav() {
  const navigate = useNavigate();

  function handleLogout() {
    try {
      localStorage.removeItem("isLoggedIn");
    } catch {}
    navigate("/", { replace: true });
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Dashboard"
        title="Dashboard"
      >
        <FiHome className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Dashboard</span>
      </NavLink>

      <NavLink
        to="/assets"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Assets"
        title="Assets"
      >
        <FiBox className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Assets</span>
      </NavLink>

      <NavLink
        to="/rentals/table"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Contracts"
        title="Contracts"
      >
        <FiFileText className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Contracts</span>
      </NavLink>

      <NavLink
        to="/rentals/map"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Map"
        title="Map"
      >
        <FiMap className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Map</span>
      </NavLink>

      <NavLink
        to="/returns"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Issues"
        title="Issues"
      >
        <FiAlertCircle className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Issues</span>
      </NavLink>

      <NavLink
        to="/register"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Register"
        title="Register"
      >
        <FiUserPlus className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Register</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
        aria-label="Settings"
        title="Settings"
      >
        <FiSettings className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Settings</span>
      </NavLink>

      <button
        type="button"
        className="bottom-nav__link"
        aria-label="Logout"
        title="Logout"
        onClick={handleLogout}
      >
        <FiLogOut className="bottom-nav__icon" aria-hidden />
        <span className="bottom-nav__label" role="tooltip">Logout</span>
      </button>
    </nav>
  );
}
