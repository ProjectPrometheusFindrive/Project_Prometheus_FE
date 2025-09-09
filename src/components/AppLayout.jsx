import React from "react";
import { Outlet } from "react-router-dom";
import TopHeader from "./TopHeader";
import NavigationBar from "./NavigationBar";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <TopHeader />
      <div className="app-main">
        <NavigationBar />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
