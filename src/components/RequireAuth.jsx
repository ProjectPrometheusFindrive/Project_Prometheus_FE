import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const location = useLocation();
  let loggedIn = false;
  try {
    loggedIn = localStorage.getItem("isLoggedIn") === "true";
  } catch {}

  if (!loggedIn) {
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

