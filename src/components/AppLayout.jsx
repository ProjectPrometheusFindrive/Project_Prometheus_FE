import React from "react";
import { Outlet } from "react-router-dom";
import TopHeader from "./TopHeader";
import NavigationBar from "./NavigationBar";
import DocsReminderBanner from "./DocsReminderBanner";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <TopHeader />
      <DocsReminderBanner />
      <div className="app-main">
        <NavigationBar />
        <div className="app-content bg-slate-50">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
