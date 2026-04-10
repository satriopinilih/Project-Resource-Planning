import React from "react";
import MarketingSidebar from "./components/MarketingSidebar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <MarketingSidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative">
        {children}
      </div>
    </div>
  );
}
