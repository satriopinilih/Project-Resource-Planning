"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { getPrimaryRole, getSessionUser } from "@/lib/auth";

type Role = "GM" | "HR" | "PM" | "Marketing" | "Staff";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("Staff");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const getTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes("/dashboard/gm/")) return null;
    if (pathname.startsWith("/dashboard/pm")) return null;
    if (pathname.includes("/projects/") ) return "Project Details";
    if (pathname.includes("/projects")) return "Projects";
    if (pathname.includes("/add-project")) return "Add New Project";
    if (pathname.includes("/settings")) return "Settings";
    if (pathname.includes("/team") || pathname.includes("/team-members")) return "Team Members";
    if (pathname.includes("/notifications")) return "Notifications";
    return "Dashboard";
  };

  const title = getTitle();

  useEffect(() => {
    const sessionUser = getSessionUser();
    const resolvedRole = (getPrimaryRole(sessionUser?.roles ?? []) as Role | null) ?? "Staff";
    setRole(resolvedRole);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-[var(--dash-bg-page)] transition-colors duration-300 overflow-x-hidden">
      <AppSidebar
        role={role}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:pl-64 w-full">
        {title ? (
          <AppHeader
            title={title}
            role={role}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />
        ) : null}
        <main className="flex-1 min-w-0 w-full flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
