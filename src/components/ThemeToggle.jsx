import React, { useEffect, useState } from "react";
import { typedStorage } from "../utils/storage";

export default function ThemeToggle() {
  const getInitial = () => {
    const saved = typedStorage.prefs.getTheme();
    if (saved === "light" || saved === "dark") return saved;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
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
      className="top-header__logout-btn"
    >
      {isDark ? "☀️" : "🌙"}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
