import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { CompanyProvider, useCompany } from "./contexts/CompanyContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import TermsAgreement from "./pages/TermsAgreement";
import FindId from "./pages/FindId";
import ForgotPassword from "./pages/ForgotPassword";
import Settings from "./pages/Settings";
import AssetStatus from "./pages/AssetStatus";
import Dashboard from "./pages/Dashboard";
import RentalContracts from "./pages/RentalContracts";
import Detail from "./pages/Detail";
import MemberManagement from "./pages/MemberManagement";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import OnboardingDocs from "./pages/OnboardingDocs";
import { getSignedDownloadUrl, deriveObjectName } from "./utils/gcsApi";
import GlobalToast from "./components/GlobalToast";

const DynamicFavicon = () => {
  const { companyInfo } = useCompany();
  const [signedFaviconUrl, setSignedFaviconUrl] = useState("");

  // Data URL favicon (legacy/local preview)
  useEffect(() => {
    const link = document.querySelector("link[rel='icon']");
    const ensureLink = () => {
      if (link) return link;
      const el = document.createElement("link");
      el.setAttribute("rel", "icon");
      document.head.appendChild(el);
      return el;
    };
    const favicon = ensureLink();
    const url = companyInfo && companyInfo.logoDataUrl;
    if (favicon && url) {
      favicon.setAttribute("href", url);
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);/);
        if (match && match[1]) {
          favicon.setAttribute("type", match[1]);
        } else {
          favicon.removeAttribute("type");
        }
      } else {
        favicon.removeAttribute("type");
      }
    }
  }, [companyInfo?.logoDataUrl]);

  // Signed URL favicon (GCS objectName)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let objectName = companyInfo && companyInfo.logoPath;
      if (!objectName) {
        setSignedFaviconUrl("");
        return;
      }
      if (typeof objectName === "string" && /^(https?:)?\/\//i.test(objectName)) {
        const derived = deriveObjectName(objectName);
        if (derived) objectName = derived;
      }
      try {
        const url = await getSignedDownloadUrl(objectName);
        if (!cancelled) setSignedFaviconUrl(url);
      } catch {
        if (!cancelled) setSignedFaviconUrl("");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [companyInfo?.logoPath]);

  useEffect(() => {
    if (!signedFaviconUrl) return;
    const link = document.querySelector("link[rel='icon']");
    const ensureLink = () => {
      if (link) return link;
      const el = document.createElement("link");
      el.setAttribute("rel", "icon");
      document.head.appendChild(el);
      return el;
    };
    const favicon = ensureLink();
    favicon.setAttribute("href", signedFaviconUrl);
    favicon.removeAttribute("type");
  }, [signedFaviconUrl]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <Router>
            <GlobalToast />
          <DynamicFavicon />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/terms" element={<TermsAgreement />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/find-id" element={<FindId />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/onboarding/docs" element={
                <ErrorBoundary>
                  <OnboardingDocs />
                </ErrorBoundary>
              } />
              <Route path="/dashboard" element={
                <ErrorBoundary fallback={<div className="error-boundary"><div className="error-boundary-content"><h2>대시보드 로딩 중 오류가 발생했습니다</h2><button onClick={() => window.location.reload()} className="form-button">새로고침</button></div></div>}>
                  <Dashboard />
                </ErrorBoundary>
              } />
              <Route path="/settings" element={
                <ErrorBoundary>
                  <Settings />
                </ErrorBoundary>
              } />
              <Route path="/assets" element={
                <ErrorBoundary>
                  <AssetStatus />
                </ErrorBoundary>
              } />
              <Route path="/rentals" element={<Navigate to="/rentals/table" replace />} />
              <Route path="/rentals/table" element={
                <ErrorBoundary>
                  <RentalContracts />
                </ErrorBoundary>
              } />
              <Route path="/detail/:type/:id" element={
                <ErrorBoundary>
                  <Detail />
                </ErrorBoundary>
              } />
              <Route path="/members" element={
                <ErrorBoundary>
                  <MemberManagement />
                </ErrorBoundary>
              } />
            </Route>
            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Router>
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
