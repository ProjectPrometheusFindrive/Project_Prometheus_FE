import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

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
      <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">Home</span>
      </NavLink>
      <NavLink to="/assets" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">Assets</span>
      </NavLink>
      <NavLink to="/rentals" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">Rentals</span>
      </NavLink>
      <NavLink to="/returns" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">Issues</span>
      </NavLink>
      <NavLink to="/register" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">Register</span>
      </NavLink>
      {/* Settings at the end with a gear icon */}
      <NavLink to="/settings" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`} aria-label="설정">
        <span className="bottom-nav__icon" aria-hidden>⚙️</span>
        <span className="bottom-nav__label">설정</span>
      </NavLink>
      {/* Logout next to settings with a door icon */}
      <button type="button" className="bottom-nav__link" aria-label="로그아웃" onClick={handleLogout}>
        <span className="bottom-nav__icon" aria-hidden>🚪</span>
        <span className="bottom-nav__label">로그아웃</span>
      </button>
    </nav>
  );
}
