import React from "react";
import { NavLink } from "react-router-dom";

// Navigation icons for mobile bottom bar
const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 22V12H15V22" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AssetIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 17H5C3.89543 17 3 16.1046 3 15V9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17Z" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7.5" cy="14" r="1.5" fill={active ? "#0A45EA" : "#1C1C1C"}/>
    <circle cx="16.5" cy="14" r="1.5" fill={active ? "#0A45EA" : "#1C1C1C"}/>
    <path d="M5 7L7 3H17L19 7" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17V20" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 20H16" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ContractIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 13H16" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 17H16" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const RevenueIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V22" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke={active ? "#0A45EA" : "#1C1C1C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function NavigationBar({ isMobile = false }) {
  const linkClass = ({ isActive }) =>
    `navigation-bar__link ${isActive ? "is-active" : ""}`;

  // Desktop navigation (header)
  if (!isMobile) {
    return (
      <nav
        className="navigation-bar navigation-bar--desktop"
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

        <NavLink to="/revenue" className={linkClass}>
          <span className="navigation-bar__label">매출관리</span>
        </NavLink>
      </nav>
    );
  }

  // Mobile navigation (bottom bar)
  return (
    <nav
      className="navigation-bar navigation-bar--mobile"
      role="navigation"
      aria-label="주요 메뉴"
    >
      <NavLink to="/dashboard" className={linkClass}>
        {({ isActive }) => (
          <>
            <HomeIcon active={isActive} />
            <span className="navigation-bar__label">홈</span>
          </>
        )}
      </NavLink>

      <NavLink to="/assets" className={linkClass}>
        {({ isActive }) => (
          <>
            <AssetIcon active={isActive} />
            <span className="navigation-bar__label">자산</span>
          </>
        )}
      </NavLink>

      <NavLink to="/rentals/table" className={linkClass}>
        {({ isActive }) => (
          <>
            <ContractIcon active={isActive} />
            <span className="navigation-bar__label">계약</span>
          </>
        )}
      </NavLink>

      <NavLink to="/revenue" className={linkClass}>
        {({ isActive }) => (
          <>
            <RevenueIcon active={isActive} />
            <span className="navigation-bar__label">매출</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
