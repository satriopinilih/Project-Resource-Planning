'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [userName, setUserName] = useState('User');
  const [roleLabel, setRoleLabel] = useState('Staff');

  useEffect(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return;

    try {
      const user = JSON.parse(raw) as { userName?: string; roles?: string[] };
      const roles = user.roles ?? [];
      const primaryRole = roles.includes('GM')
        ? 'GM'
        : roles.includes('HR')
        ? 'HR'
        : roles.includes('PM')
        ? 'PM'
        : roles.includes('Marketing')
        ? 'Marketing'
        : roles.includes('Staff')
        ? 'Staff'
        : 'Staff';

      setUserName(user.userName || 'User');
      setRoleLabel(primaryRole);
    } catch {
      setUserName('User');
      setRoleLabel('Staff');
    }
  }, []);

  return (
    <header className="bg-white dark:bg-[#292B2F] border-b border-gray-200 dark:border-gray-700 px-8 py-4 transition-colors">
      <div className="flex items-center justify-end gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isDarkMode ? (
            // Sun icon for light mode
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // Moon icon for dark mode
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{userName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</div>
          </div>
          
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#2B7FFC] flex items-center justify-center text-white font-semibold">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          {/* Role Badge */}
          <div className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full border border-red-200 dark:border-red-800">
            {roleLabel}
          </div>

          {/* Notification Badge */}
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
            1
          </div>
        </div>
      </div>
    </header>
  );
}
