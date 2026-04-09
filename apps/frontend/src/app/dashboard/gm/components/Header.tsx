"use client";

import { useState, useEffect } from "react";
import { Bell, Sun, Moon, User } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [userName, setUserName] = useState("General Manager");

  // Hydrate from localStorage on mount
  useEffect(() => {
    const auth = localStorage.getItem("auth_user");
    if (auth) {
      try {
        setUserName(JSON.parse(auth).userName);
      } catch (e) {}
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-[80px] px-8 bg-[var(--dash-bg-header)] backdrop-blur-xl border-b border-[var(--dash-border)] transition-colors duration-300">
      {/* Page Title */}
      <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">
        {title}
      </h2>

      {/* Right section */}
      <div className="flex items-center gap-6">
        {/* Notification bell */}
        <button className="relative p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer">
          <Bell size={22} strokeWidth={1.8} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-[var(--dash-bg-header)]" />
        </button>

        {/* Theme toggle (Light / Dark) */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <Sun size={22} strokeWidth={1.8} />
          ) : (
            <Moon size={22} strokeWidth={1.8} />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[var(--dash-border)]" />

        {/* User info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[15px] font-bold text-[var(--dash-text-heading)] leading-tight">
              {userName}
            </p>
            <p className="text-[12px] text-[var(--dash-text-faint)] font-medium mt-0.5">GM</p>
          </div>
          {/* Avatar circle */}
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#2563eb] text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]">
            <User size={22} strokeWidth={2} />
          </div>
          {/* Role Pill */}
          <div className="px-3 py-1.5 rounded-full text-[13px] font-bold bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20">
            GM
          </div>
        </div>
      </div>
    </header>
  );
}
