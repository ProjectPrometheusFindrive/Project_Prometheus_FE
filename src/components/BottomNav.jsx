import React from "react";
import { NavLink } from "react-router-dom";

export default function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
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
    </nav>
  );
}

