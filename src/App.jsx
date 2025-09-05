import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import FindId from "./pages/FindId";
import ForgotPassword from "./pages/ForgotPassword";
import Settings from "./pages/Settings";
import AssetStatus from "./pages/AssetStatus";
import Dashboard from "./pages/Dashboard";
import RentalContracts from "./pages/RentalContracts";
import RentalsMapPage from "./pages/RentalsMapPage";
import ProblemVehicles from "./pages/ProblemVehicles";
import Detail from "./pages/Detail";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
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
            <Route path="/rentals/map" element={
              <ErrorBoundary>
                <RentalsMapPage />
              </ErrorBoundary>
            } />
            <Route path="/issue" element={
              <ErrorBoundary>
                <ProblemVehicles />
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
    </ErrorBoundary>
  );
}

export default App;
