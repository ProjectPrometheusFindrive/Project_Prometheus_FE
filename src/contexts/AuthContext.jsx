import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../api";
import { typedStorage } from "../utils/storage";
import { emitToast } from "../utils/toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("unauthenticated"); // 'checking' | 'authenticated' | 'unauthenticated'
  const [user, setUser] = useState(null);

  // Bootstrap from existing token on mount
  useEffect(() => {
    let cancelled = false;
    const token = typedStorage.auth.getToken();
    if (!token) {
      setStatus("unauthenticated");
      setUser(null);
      return;
    }
    setStatus("checking");
    (async () => {
      try {
        const u = await getCurrentUser();
        if (cancelled) return;
        setUser(u || null);
        typedStorage.auth.setUserInfo(u || {});
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

  // Expose helpers
  const api = useMemo(() => ({
    status,
    user,
    isAuthenticated: status === "authenticated",
    setAuthenticated: (token, u) => {
      try {
        if (token) typedStorage.auth.setToken(token);
        if (u) typedStorage.auth.setUserInfo(u);
        typedStorage.auth.setLoggedIn(true);
        setUser(u || null);
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

