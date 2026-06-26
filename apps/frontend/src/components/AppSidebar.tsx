"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  UserCheck,
  FileText,
  PlusCircle,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type Role = "GM" | "HR" | "PM" | "Marketing" | "Staff" | null;

interface NavItem {
  label: string;
  href?: string;
  icon: React.FC<{ size?: number; strokeWidth?: number }>;
  subItems?: { label: string; href: string }[];
}

const navByRole: Record<string, NavItem[]> = {
  GM: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Project", href: "/project", icon: FolderKanban },
    { label: "Team Member", href: "/team-members", icon: Users },
    {
      label: "Master Data",
      icon: Database,
      subItems: [
        { label: "Skills", href: "/dashboard/master-data/skills" },
        { label: "Holidays", href: "/dashboard/master-data/holidays" },
      ]
    },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  HR: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Team Member", href: "/team-members", icon: Users },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  PM: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Project", href: "/project", icon: FolderKanban },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  Marketing: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Project", href: "/project", icon: FolderKanban },
    { label: "Add Project", href: "/dashboard/add-project", icon: PlusCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  Staff: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
};

interface AppSidebarProps {
  role: Role;
}

export default function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role ?? "Staff"] ?? navByRole["Staff"];

  // Collapsible sub-menu states
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.subItems?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href))) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[var(--dash-bg-sidebar)] border-r border-[var(--dash-border)] transition-colors duration-300">
      {/* Branding */}
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-[20px] font-bold text-[var(--dash-text-heading)] leading-tight tracking-tight">
          Resource Planning
        </h1>
        <p className="text-[14px] text-[var(--dash-text-muted)] mt-1 font-medium">
          Consulting System
        </p>
      </div>

      {/* Separator */}
      <div className="border-t border-[var(--dash-border)] mb-6" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 px-6">
        {navItems.map((item) => {
          if (item.subItems) {
            const isSubItemActive = item.subItems.some(
              (sub) => pathname === sub.href || pathname.startsWith(sub.href)
            );
            const isOpen = openSubMenus[item.label];

            return (
              <div key={item.label} className="flex flex-col">
                <button
                  onClick={() => toggleSubMenu(item.label)}
                  className={`
                    flex items-center justify-between w-full px-4 py-3 rounded-xl text-[16px] font-medium
                    transition-all duration-200 cursor-pointer border border-transparent
                    ${isSubItemActive
                      ? "bg-[var(--dash-sidebar-active-bg)]/20 text-[var(--dash-sidebar-active-text)]"
                      : "text-[var(--dash-text-primary)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-sidebar-hover)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={22} strokeWidth={isSubItemActive ? 2 : 1.8} />
                    {item.label}
                  </div>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-1 pl-4 mt-1 border-l border-[var(--dash-border)] ml-6">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href || pathname.startsWith(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`
                            px-4 py-2 rounded-lg text-[14px] font-medium transition-colors
                            ${isSubActive
                              ? "text-blue-600 dark:text-[#60a5fa] bg-blue-50/50 dark:bg-[#1e3a5f]/40 font-bold"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }
                          `}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            pathname === item.href ||
            (item.href && item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href ?? "#"}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-[16px] font-medium
                transition-all duration-200
                ${isActive
                  ? "bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)] border border-[var(--dash-sidebar-active-border)]"
                  : "text-[var(--dash-text-primary)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-sidebar-hover)]"
                }
              `}
            >
              <item.icon size={22} strokeWidth={isActive ? 2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-[var(--dash-border)] mb-1" />

      {/* Logout */}
      <div className="px-4 py-3">
        <button
          onClick={() => {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent text-[var(--dash-text-primary)] hover:text-[var(--dash-sidebar-active-text)] hover:bg-[var(--dash-sidebar-active-bg)] hover:border-[var(--dash-sidebar-active-border)] transition-colors w-full"
        >
          <LogOut size={22} strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  );
}
