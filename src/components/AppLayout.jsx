import React from "react";
import { Outlet } from "react-router-dom";
import TopHeader from "./TopHeader";
import DocsReminderBanner from "./DocsReminderBanner";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <TopHeader />
      <DocsReminderBanner />
      <div className="app-main">
        <div className="app-content bg-slate-50">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
