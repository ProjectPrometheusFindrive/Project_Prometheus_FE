import React from "react";
import { Outlet } from "react-router-dom";
import NavigationBar from "./NavigationBar";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <NavigationBar />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
