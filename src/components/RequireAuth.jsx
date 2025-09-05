import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { typedStorage } from "../utils/storage";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const loggedIn = typedStorage.auth.isLoggedIn();

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

