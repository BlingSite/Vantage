"use client";

import AppSidebar from "./AppSidebar";

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fb]">
      <AppSidebar />
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
