import React, { createContext, useState, useContext, useEffect } from "react";
import { fetchCompanyInfo, saveCompanyInfo } from "../api";
import { deriveObjectName } from "../utils/gcsApi";
import { useAuth } from "./AuthContext";

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const auth = useAuth();
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    // Keep empty so index.html's default favicon remains until a custom logo exists
    logoDataUrl: "",
    // GCS object name (preferred)
    logoPath: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Only fetch when authenticated; otherwise reset to defaults and stop loading
    if (!auth?.isAuthenticated) {
      if (mounted) {
        setCompanyInfo((prev) => ({ ...prev, name: "", logoDataUrl: "", logoPath: "" }));
        setLoading(false);
      }
      return () => { mounted = false; };
    }
    (async () => {
      try {
        const info = await fetchCompanyInfo();
        if (!mounted) return;
        const next = { ...(info || {}) };
        // Prefer logoPath (GCS objectName). If absent, try to derive from legacy URLs.
        const legacyUrl = info && typeof info.logoDataUrl === "string" ? info.logoDataUrl : "";
        const incomingLogoPath = info && typeof info.logoPath === "string" ? info.logoPath : "";
        if (!incomingLogoPath && legacyUrl) {
          const derived = deriveObjectName(legacyUrl);
          if (derived) {
            next.logoPath = derived;
          }
        }
        // Keep logoDataUrl only if it's a data URL (local/preview). Otherwise empty.
        next.logoDataUrl = legacyUrl && legacyUrl.startsWith("data:") ? legacyUrl : "";
        // Ensure fields exist
        if (!next.logoPath) next.logoPath = incomingLogoPath || "";
        setCompanyInfo(next);
      } catch (e) {
        // Fallback: keep as-is so default favicon remains
        if (mounted) {
          setCompanyInfo((prev) => ({ ...prev, logoDataUrl: prev.logoDataUrl || "", logoPath: prev.logoPath || "" }));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth?.isAuthenticated]);

  const updateCompanyInfo = async (partial) => {
    // Accept partial updates and persist optimistically
    if (!partial || typeof partial !== "object") return;
    // Optimistic update for immediate UI feedback
    setCompanyInfo((prev) => ({ ...prev, ...partial }));

    // IMPORTANT: send only the changed fields to backend to avoid
    // re-sending unrelated stale values (e.g., bizCertDocGcsObjectName)
    try {
      await saveCompanyInfo(partial);
      // Refetch to sync with server state after successful save
      const freshInfo = await fetchCompanyInfo();
      if (freshInfo) {
        const next = { ...freshInfo };
        // Prefer logoPath (GCS objectName). If absent, try to derive from legacy URLs.
        const legacyUrl = freshInfo && typeof freshInfo.logoDataUrl === "string" ? freshInfo.logoDataUrl : "";
        const incomingLogoPath = freshInfo && typeof freshInfo.logoPath === "string" ? freshInfo.logoPath : "";
        if (!incomingLogoPath && legacyUrl) {
          const derived = deriveObjectName(legacyUrl);
          if (derived) {
            next.logoPath = derived;
          }
        }
        // Keep logoDataUrl only if it's a data URL (local/preview). Otherwise empty.
        next.logoDataUrl = legacyUrl && legacyUrl.startsWith("data:") ? legacyUrl : "";
        // Ensure fields exist
        if (!next.logoPath) next.logoPath = incomingLogoPath || "";
        setCompanyInfo(next);
      }
    } catch (e) {
      // Non-fatal: keep optimistic UI state, log error
      console.error("Failed to persist company info:", e);
    }
  };

  return (
    <CompanyContext.Provider value={{ companyInfo, updateCompanyInfo, loading }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};
