import React from "react";
import { NavLink } from "react-router-dom";


export default function NavigationBar() {
  const linkClass = ({ isActive }) =>
    `navigation-bar__link ${isActive ? "is-active" : ""}`;

  return (
    <nav
      className="navigation-bar"
      role="navigation"
      aria-label="주요 메뉴"
    >
      <NavLink to="/dashboard" className={linkClass}>
        <span className="navigation-bar__label">대시보드</span>
      </NavLink>

      <NavLink to="/assets" className={linkClass}>
        <span className="navigation-bar__label">자산등록관리</span>
      </NavLink>

      <NavLink to="/rentals/table" className={linkClass}>
        <span className="navigation-bar__label">계약등록관리</span>
      </NavLink>

      <NavLink to="/revenue" className={linkClass}>
        <span className="navigation-bar__label">매출관리</span>
      </NavLink>

    </nav>
  );
}
