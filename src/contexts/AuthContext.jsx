import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../api";
import { typedStorage } from "../utils/storage";
import { emitToast } from "../utils/toast";
import { getJwtPayload } from "../utils/jwt";
import { onUnauthorized } from "../utils/authEvents";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("unauthenticated"); // 'checking' | 'authenticated' | 'unauthenticated'
  const [user, setUser] = useState(null);

  // Bootstrap from existing token on mount
  useEffect(() => {
    let cancelled = false;
    const token = typedStorage.auth.getToken();
    if (!token) {
      // Clear any stale auth flags to avoid false positives
      try { typedStorage.auth.logout(); } catch {}
      setStatus("unauthenticated");
      setUser(null);
      return;
    }
    setStatus("checking");
    (async () => {
      try {
        const u = await getCurrentUser();
        // Merge JWT claims (companyId/role/company) as fallback if missing in response
        const claims = getJwtPayload(token) || {};
        const merged = {
          ...(u || {}),
          companyId: (u && u.companyId) || claims.companyId,
          role: (u && u.role) || claims.role,
          company: (u && u.company) || claims.company,
        };
        if (cancelled) return;
        setUser(merged || null);
        typedStorage.auth.setUserInfo(merged || {});
        typedStorage.auth.setLoggedIn(true);
        setStatus("authenticated");
      } catch (e) {
        if (cancelled) return;
        // Token invalid
        typedStorage.auth.logout();
        setUser(null);
        setStatus("unauthenticated");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Global handler for 401/unauthorized events from the API client
  useEffect(() => {
    const unsubscribe = onUnauthorized((message) => {
      try {
        typedStorage.auth.logout();
      } catch {}
      setUser(null);
      setStatus("unauthenticated");
      try {
        const fallback = "인증이 만료되었거나 무효화되었습니다. 다시 로그인해 주세요.";
        const msg = message || fallback;
        emitToast(msg, "error", 4000);
      } catch {}
      try {
        // Using HashRouter; send to login route
        if (typeof window !== "undefined") {
          const dest = "#/";
          if (window.location.hash !== dest) {
            window.location.hash = dest;
          }
        }
      } catch {}
    });
    return unsubscribe;
  }, [setStatus, setUser]);

  // Expose helpers
  const api = useMemo(() => ({
    status,
    user,
    isAuthenticated: status === "authenticated",
    setAuthenticated: (token, u) => {
      try {
        if (token) typedStorage.auth.setToken(token);
        const claims = token ? (getJwtPayload(token) || {}) : {};
        const merged = {
          ...(u || {}),
          companyId: (u && u.companyId) || claims.companyId,
          role: (u && u.role) || claims.role,
          company: (u && u.company) || claims.company,
        };
        if (merged) typedStorage.auth.setUserInfo(merged);
        typedStorage.auth.setLoggedIn(true);
        setUser(merged || null);
        setStatus("authenticated");
      } catch {}
    },
    logout: (msg) => {
      try {
        typedStorage.auth.logout();
        setUser(null);
        setStatus("unauthenticated");
        if (msg) emitToast(msg, "error", 3500);
      } catch {}
    }
  }), [status, user]);

  return (
    <AuthContext.Provider value={api}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
