import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import AssetStatus from "./pages/AssetStatus";
import RentalContracts from "./pages/RentalContracts";
import ProblemVehicles from "./pages/ProblemVehicles";
import AssetRegistration from "./pages/AssetRegistration";
import RentalRegistration from "./pages/RentalRegistration";
import IssueRegistration from "./pages/IssueRegistration";
import AppLayout from "./components/AppLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/assets" element={<AssetStatus />} />
          <Route path="/rentals" element={<RentalContracts />} />
          <Route path="/returns" element={<ProblemVehicles />} />
          <Route path="/new-asset" element={<AssetRegistration />} />
          <Route path="/new-rental" element={<RentalRegistration />} />
          <Route path="/new-issue" element={<IssueRegistration />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
