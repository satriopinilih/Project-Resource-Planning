"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Settings,
  LogOut,
} from "lucide-react";

export default function MarketingSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/project", icon: FolderKanban },
    { label: "Add Project", href: "/dashboard/mrkt/add-project", icon: PlusCircle },
    { label: "Settings", href: "/dashboard/mrkt/settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-white dark:bg-[var(--dash-bg-sidebar)] border-r border-gray-200 dark:border-[var(--dash-border)] transition-colors duration-300">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-[20px] font-bold text-gray-900 dark:text-[var(--dash-text-heading)] leading-tight tracking-tight">Resource Planning</h1>
        <p className="text-[14px] text-gray-500 dark:text-[var(--dash-text-muted)] mt-1 font-medium">Consulting System</p>
      </div>

      <div className="border-t border-gray-200 dark:border-[var(--dash-border)] mb-6" />

      <nav className="flex-1 flex flex-col gap-2 px-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 ${isActive ? "bg-blue-100/50 dark:bg-[#1e3a5f]/60 text-blue-600 dark:text-[#60a5fa]" : "text-gray-600 dark:text-[var(--dash-text-primary)] hover:text-gray-900 dark:hover:text-[var(--dash-text-heading)] hover:bg-gray-100 dark:hover:bg-[var(--dash-sidebar-hover)]"}`}
            >
              <item.icon size={20} className={isActive ? "text-blue-600 dark:text-[#60a5fa]" : "text-gray-500 dark:text-[var(--dash-text-muted)] group-hover:text-gray-900 dark:group-hover:text-white"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-[var(--dash-border)] mt-auto mb-2" />

      <div className="px-4 py-4 mb-2">
        <button
          onClick={() => {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            window.location.href = "/login";
          }}
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-[15px] font-medium text-gray-600 dark:text-[var(--dash-text-primary)] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full group"
        >
          <LogOut size={20} className="text-gray-500 dark:text-[var(--dash-text-muted)] group-hover:text-red-700 dark:group-hover:text-red-400" />
          Logout
        </button>
      </div>
    </aside>
  );
}
