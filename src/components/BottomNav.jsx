import React from "react";
import { NavLink } from "react-router-dom";

export default function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
      <NavLink to="/assets" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">자산 현황</span>
      </NavLink>
      <NavLink to="/rentals" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">대여 계약 현황</span>
      </NavLink>
      <NavLink to="/returns" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">반납 지연/도난 현황</span>
      </NavLink>
      <NavLink to="/new-asset" className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}>
        <span className="bottom-nav__label">신규 등록</span>
      </NavLink>
    </nav>
  );
}

