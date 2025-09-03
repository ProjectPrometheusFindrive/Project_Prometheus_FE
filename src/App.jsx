import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import AssetStatus from "./pages/AssetStatus";
import RentalContracts from "./pages/RentalContracts";
import ProblemVehicles from "./pages/ProblemVehicles";
import Registration from "./pages/Registration";
import Detail from "./pages/Detail";
import AppLayout from "./components/AppLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="/assets" element={<AssetStatus />} />
          <Route path="/rentals" element={<RentalContracts />} />
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
