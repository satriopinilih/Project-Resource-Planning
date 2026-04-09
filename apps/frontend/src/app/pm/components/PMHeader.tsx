"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getPrimaryRole, getSessionUser, SessionUser } from "@/lib/auth";

export default function HeaderPM() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    setUser(getSessionUser());
  }, []);

  const role = getPrimaryRole(user?.roles ?? []);

  return (
    <header className="bg-white dark:bg-[#292B2F] border-b border-gray-200 dark:border-gray-700 px-8 py-4 transition-colors">
      <div className="flex items-center justify-end gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isDarkMode ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
        {/* User Info (PM Version) */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.userName || "User"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {role || "Team Member"}
            </div>
          </div>

          <div className="w-10 h-10 rounded-full bg-[#2B7FFC] flex items-center justify-center text-white font-semibold shadow-sm">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800">
            PM
          </div>

          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            3
          </div>
        </div>
      </div>
    </header>
  );
}
