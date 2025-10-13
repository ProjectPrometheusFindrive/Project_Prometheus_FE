import React, { createContext, useState, useContext, useEffect } from "react";
import defaultLogo from "../assets/default-logo.svg";
import { fetchCompanyInfo, saveCompanyInfo } from "../api";

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const [companyInfo, setCompanyInfo] = useState({
    name: "Project Prometheus",
    // Keep empty so index.html's default favicon remains until a custom logo exists
    logoDataUrl: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const info = await fetchCompanyInfo();
        if (!mounted) return;
        const next = {
          ...(info || {}),
          // Empty string means "use default favicon from index.html"; UI components will fall back to defaultLogo
          logoDataUrl: (info && info.logoDataUrl) ? info.logoDataUrl : "",
        };
        setCompanyInfo(next);
      } catch (e) {
        // Fallback to defaults on error
        if (mounted) {
          setCompanyInfo((prev) => ({ ...prev, logoDataUrl: prev.logoDataUrl || defaultLogo }));
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateCompanyInfo = (partial) => {
    // Accept partial updates and persist optimistically
    setCompanyInfo((prev) => {
      const next = { ...prev, ...(partial || {}) };
      (async () => {
        try {
          await saveCompanyInfo(next);
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
