import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const auth = useAuth();

  if (auth.status === "checking") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner" aria-label="Loading" />
          <div style={{ color: "#555", fontSize: 14 }}>세션 확인 중...</div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
