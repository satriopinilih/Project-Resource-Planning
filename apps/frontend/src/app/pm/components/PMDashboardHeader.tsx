"use client";
import React, { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export default function DashboardHeader() {
  const [time, setTime] = useState(new Date());
  const [userName, setUserName] = useState("Project Manager");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const user = getSessionUser();
    if (user?.userName) {
      setUserName(user.userName);
    }
    
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
      <div>
        <h1 className="text-4xl font-bold text-[var(--dash-text-heading)] tracking-tight">
          {getGreeting()}, <span className="text-green-600 dark:text-[var(--color-primary)]">{userName}</span>
        </h1>
        <p className="text-[var(--dash-text-muted)] text-sm mt-1 leading-relaxed">
          Overview of your current project landscape.
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Improved Time & Date Container */}
        <div className="flex items-center bg-[var(--dash-bg-card)] backdrop-blur-md p-1.5 rounded-2xl border border-[var(--dash-border-subtle)] shadow-sm transition-all hover:border-[var(--dash-border)]">
          {/* Time Segment */}
          <div className="flex items-center gap-3 px-4 py-2 border-r border-[var(--dash-border-subtle)]">
            <div className="p-2 bg-blue-500/10 rounded-xl shadow-inner">
              <Clock className="w-4 h-4 text-[#2B7FFC]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[var(--dash-text-faint)] uppercase font-black tracking-widest leading-none mb-1">
                Local
              </span>
              <span className="text-sm font-mono font-bold text-[var(--dash-text-primary)] tabular-nums">
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
          </div>

          {/* Date Segment */}
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="p-2 bg-purple-500/10 rounded-xl shadow-inner">
              <CalendarIcon className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[var(--dash-text-faint)] uppercase font-black tracking-widest leading-none mb-1">
                Calendar
              </span>
              <span className="text-sm font-bold text-[var(--dash-text-primary)]">
                {formatDate(time)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
