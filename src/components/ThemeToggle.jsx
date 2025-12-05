import React, { useEffect, useState } from "react";
import { typedStorage } from "../utils/storage";

export default function ThemeToggle() {
  const getInitial = () => {
    const saved = typedStorage.prefs.getTheme();
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  };

  const [theme, setTheme] = useState(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    typedStorage.prefs.setTheme(theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const isDark = theme === "dark";
  const label = isDark ? "라이트 모드" : "다크 모드";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className="top-header__icon-button"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="4" fill="currentColor"/>
        <line x1="10" y1="1" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="10" y1="17" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="19" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="3" y1="10" x2="1" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="15.95" y1="4.05" x2="14.54" y2="5.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="5.46" y1="14.54" x2="4.05" y2="15.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="15.95" y1="15.95" x2="14.54" y2="14.54" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="5.46" y1="5.46" x2="4.05" y2="4.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  );
}
