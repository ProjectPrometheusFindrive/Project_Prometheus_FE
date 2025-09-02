import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function TopRightControls() {
  const navigate = useNavigate();

  function handleLogout() {
    try {
      localStorage.removeItem("isLoggedIn");
    } catch {}
    navigate("/", { replace: true });
  }

  return (
    <div className="top-controls" role="toolbar" aria-label="Quick actions">
      <Link to="/settings" className="top-controls__link">Settings</Link>
      <button type="button" className="top-controls__button" onClick={handleLogout}>Logout</button>
    </div>
  );
}

