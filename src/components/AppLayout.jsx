import React from "react";
import { Outlet } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import TopRightControls from "./TopRightControls";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <NavigationBar />
      <TopRightControls />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
