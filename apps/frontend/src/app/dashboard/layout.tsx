"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { getPrimaryRole, getSessionUser } from "@/lib/auth";

type Role = "GM" | "HR" | "PM" | "Marketing" | "Staff";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("Staff");
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes("/dashboard/gm/")) return null;
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
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <AppSidebar role={role} />
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {title ? <AppHeader title={title} role={role} /> : null}
        {children}
      </main>
    </div>
  );
}
