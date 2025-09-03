import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import FindId from "./pages/FindId";
import ForgotPassword from "./pages/ForgotPassword";
import Settings from "./pages/Settings";
import AssetStatus from "./pages/AssetStatusFixed";
import Dashboard from "./pages/Dashboard";
import RentalContracts from "./pages/RentalContracts";
import RentalsMapPage from "./pages/RentalsMapPage";
import ProblemVehicles from "./pages/ProblemVehicles";
import Registration from "./pages/Registration";
import Detail from "./pages/Detail";
import AppLayout from "./components/AppLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/find-id" element={<FindId />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/assets" element={<AssetStatus />} />
          <Route path="/rentals" element={<Navigate to="/rentals/table" replace />} />
          <Route path="/rentals/table" element={<RentalContracts />} />
          <Route path="/rentals/map" element={<RentalsMapPage />} />
          <Route path="/returns" element={<ProblemVehicles />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/detail/:type/:id" element={<Detail />} />
        </Route>
        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
