"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Project",
    href: "/project",
    icon: FolderKanban,
  },
  {
    label: "Team Member",
    href: "/team-members",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

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
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-[16px] font-medium
                transition-all duration-200
                ${isActive
                  ? "bg-blue-100 text-blue-700 dark:bg-[#1e3a5f]/60 dark:text-[#60a5fa] "
                  : "text-[var(--dash-text-primary)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-sidebar-hover)] "
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
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full"
        >
          <LogOut size={22} strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  );
}
