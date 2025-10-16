import React, { createContext, useState, useContext, useEffect } from "react";
import defaultLogo from "../assets/default-logo.svg";
import { fetchCompanyInfo, saveCompanyInfo } from "../api";
import { deriveObjectName } from "../utils/gcsApi";

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const [companyInfo, setCompanyInfo] = useState({
    name: "Project Prometheus",
    // Keep empty so index.html's default favicon remains until a custom logo exists
    logoDataUrl: "",
    // GCS object name (preferred)
    logoPath: "",
  });

  useEffect(() => {
    let mounted = true;
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
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateCompanyInfo = (partial) => {
    // Accept partial updates and persist optimistically
    if (!partial || typeof partial !== "object") return;
    setCompanyInfo((prev) => {
      const next = { ...prev, ...partial };
      // IMPORTANT: send only the changed fields to backend to avoid
      // re-sending unrelated stale values (e.g., bizCertDocGcsObjectName)
      (async () => {
        try {
          await saveCompanyInfo(partial);
        } catch (e) {
          // Non-fatal: keep UI state, log error
          console.error("Failed to persist company info:", e);
        }
      })();
      return next;
    });
  };

  return (
    <CompanyContext.Provider value={{ companyInfo, updateCompanyInfo }}>
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
