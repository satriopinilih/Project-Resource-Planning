"use client";

import React from "react";
import PMSidebar from "@/app/pm/components/PMSidebar";
import PMHeader from "@/app/pm/components/PMHeader";
import { useTheme } from "@/contexts/ThemeContext";

export default function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="flex min-h-screen bg-[#E9EEF6] dark:bg-[#202020] transition-colors">
      <PMSidebar />

      <div className="flex-1 flex flex-col">
        <PMHeader />

        <main className="flex-1 p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
          </div>

          {/* Profile Information */}
          <div className="bg-white dark:bg-[#292B2F] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Profile Information
            </h2>

            <div className="flex items-start gap-8">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-[#2B7FFC] flex items-center justify-center text-white flex-shrink-0">
                <svg
                  className="w-10 h-10"
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

              {/* Profile Details */}
              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    Alex Turner
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    User ID
                  </div>
                  <div className="text-gray-900 dark:text-white">EMP004</div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </div>
                  <div className="inline-block px-4 py-1.5 bg-gray-100 dark:bg-[#29385B] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full border border-gray-300 dark:border-gray-600">
                    PM
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-[#292B2F] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Appearance
            </h2>

            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Theme
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Switch between light and dark mode
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#29385B]/30 rounded-lg mb-6">
              <span className="text-gray-900 dark:text-white font-medium">
                {isDarkMode ? (
                  <span className="flex items-center gap-2">
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
                    Dark Mode
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
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
                    Light Mode
                  </span>
                )}
              </span>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDarkMode ? "bg-[#2B7FFC]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="text-sm font-medium text-[#2B7FFC] mb-4">
                Current Theme Colors:
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div
                    className={`h-16 border-2 rounded-lg mb-2 ${
                      isDarkMode
                        ? "bg-[#202020] border-gray-700"
                        : "bg-[#E9EEF6] border-gray-200"
                    }`}
                  ></div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Background
                  </div>
                </div>
                <div>
                  <div
                    className={`h-16 border-2 rounded-lg mb-2 ${
                      isDarkMode
                        ? "bg-[#292B2F] border-gray-600"
                        : "bg-white border-gray-200"
                    }`}
                  ></div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Card
                  </div>
                </div>
                <div>
                  <div
                    className={`h-16 border-2 rounded-lg mb-2 ${
                      isDarkMode
                        ? "bg-[#29385B] border-gray-600"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  ></div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Sidebar
                  </div>
                </div>
                <div>
                  <div className="h-16 border-2 rounded-lg mb-2 bg-[#2B7FFC] border-[#2B7FFC]"></div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Primary
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white dark:bg-[#292B2F] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Data Management
            </h2>

            {/* Local Storage */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-[#2B7FFC]/10 border border-blue-200 dark:border-[#2B7FFC]/30 rounded-lg mb-6">
              <div className="p-2 bg-blue-100 dark:bg-[#2B7FFC]/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-[#2B7FFC]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Local Storage
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  All data is saved in your browser
                </div>
              </div>
            </div>

            {/* Reset to Demo Data */}
            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Reset to Demo Data
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Restore the default demo projects and assignments
                </div>
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-[#2B7FFC] text-white rounded-lg hover:bg-[#2B7FFC]/90 transition-colors font-medium">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset Demo
              </button>
            </div>

            {/* Clear All Data */}
            <div className="flex items-center justify-between py-4">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Clear All Data
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Remove all projects and assignments from storage
                </div>
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear Data
              </button>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white dark:bg-[#292B2F] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              System Information
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Version
                </div>
                <div className="text-gray-900 dark:text-white">1.0.0</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Environment
                </div>
                <div className="text-gray-900 dark:text-white">Production</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Current Year
                </div>
                <div className="text-gray-900 dark:text-white">2026</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Storage
                </div>
                <div className="text-gray-900 dark:text-white">
                  Local Browser
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
