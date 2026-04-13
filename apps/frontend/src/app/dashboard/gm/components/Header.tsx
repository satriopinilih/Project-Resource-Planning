"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Sun, Moon, User, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getRequestHistory } from "@/lib/api";

interface HeaderProps {
  title: string;
}

interface NotificationItem {
  referenceId: string;
  employeeName: string;
  requestType: string;
  status: string;
  reviewedDate?: string;
  requestedDate: string;
}

export default function Header({ title }: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [userName, setUserName] = useState("General Manager");
  
  // Notification States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const auth = localStorage.getItem("auth_user");
    if (auth) {
      try {
        setUserName(JSON.parse(auth).userName);
      } catch (e) {}
    }

    const savedReadIds = localStorage.getItem("read_notifications");
    if (savedReadIds) {
      try {
        setReadIds(JSON.parse(savedReadIds));
      } catch (e) {}
    }
    
    fetchNotifications();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const data = await getRequestHistory('HR');
      // Filter those that have been processed (not Pending)
      const processed = data
        .filter((r: any) => r.status === 'Approved' || r.status === 'Declined')
        .sort((a: any, b: any) => {
          const dateA = new Date(a.reviewedDate || a.requestedDate).getTime();
          const dateB = new Date(b.reviewedDate || b.requestedDate).getTime();
          return dateB - dateA;
        });
      setNotifications(processed);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.referenceId)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.referenceId);
    setReadIds(allIds);
    localStorage.setItem("read_notifications", JSON.stringify(allIds));
    setShowDropdown(false);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-[80px] px-8 bg-[var(--dash-bg-header)] backdrop-blur-xl border-b border-[var(--dash-border)] transition-colors duration-300">
      {/* Page Title */}
      <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">
        {title}
      </h2>

      {/* Right section */}
      <div className="flex items-center gap-6">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => {
              setShowDropdown(!showDropdown);
              if (!showDropdown) fetchNotifications();
            }}
            className="relative p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer"
          >
            <Bell size={22} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-[var(--dash-bg-header)] animate-pulse" />
            )}
          </button>

          {/* Notification Dropdown */}
          {showDropdown && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#1f1f1f]">
                <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">{unreadCount}</span>}
                </h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-2 text-gray-500">
                    <Bell size={24} strokeWidth={1.5} />
                    <p className="text-[13px]">No notifications yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((notif) => {
                      const isUnread = !readIds.includes(notif.referenceId);
                      const isApproved = notif.status === 'Approved';
                      return (
                        <div key={notif.referenceId} className={`p-4 border-b border-gray-800 transition-colors ${isUnread ? 'bg-[#2B7FFC]/5' : 'hover:bg-[#1f1f1f]'}`}>
                          <div className="flex gap-3">
                            <div className="shrink-0 mt-1">
                              {isApproved ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <XCircle size={16} className="text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-gray-300 leading-snug">
                                <span className="font-bold text-white">{notif.employeeName}</span>{"'s"} contract extension request was <span className={`font-bold ${isApproved ? 'text-emerald-400' : 'text-red-400'}`}>{notif.status.toLowerCase()}</span> by HR.
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                                {notif.reviewedDate || notif.requestedDate}
                                {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto mr-1" />}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
