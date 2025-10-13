import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { CompanyProvider, useCompany } from "./contexts/CompanyContext";
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
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import ErrorBoundary from "./components/ErrorBoundary";

const DynamicFavicon = () => {
  const { companyInfo } = useCompany();

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
      // Update MIME type to match data URL if present
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);/);
        if (match && match[1]) {
          favicon.setAttribute("type", match[1]);
        } else {
          favicon.removeAttribute("type");
        }
      } else {
        // For non-data URLs, let the browser infer type
        favicon.removeAttribute("type");
      }
    }
  }, [companyInfo?.logoDataUrl]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <CompanyProvider>
        <Router>
          <DynamicFavicon />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/terms" element={<TermsAgreement />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/find-id" element={<FindId />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
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
            </Route>
            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CompanyProvider>
    </ErrorBoundary>
  );
}

export default App;
