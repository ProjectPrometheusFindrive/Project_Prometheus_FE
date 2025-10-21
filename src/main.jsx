import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Initialize theme before React mounts
try {
  const saved = localStorage.getItem('uiTheme');
  let theme = null;
  if (saved) {
    try { theme = JSON.parse(saved); } catch { theme = saved; }
  }
  if (theme !== 'light' && theme !== 'dark') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
} catch {}
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
