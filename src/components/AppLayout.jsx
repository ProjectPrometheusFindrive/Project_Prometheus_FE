import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import TopRightControls from "./TopRightControls";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <BottomNav />
      <TopRightControls />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
