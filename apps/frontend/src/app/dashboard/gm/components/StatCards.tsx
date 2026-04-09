"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  FolderKanban,
  Clock,
  CalendarCheck, // Will use for Scheduled if needed
  TrendingUp,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { getProjects, BackendProject } from "@/lib/api";

export default function StatCards() {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Calculate counts based on Backend enum (0 = Pending, 1 = Scheduled, 2 = Running, 3 = Completed)
  const total = projects.length;
  // If there are no projects from the API but we have dummy UI data injected elsewhere,
  // we count exactly what is fetched from the server.
  
  const pending = projects.filter(p => p.projectStatus === 0).length;
  const scheduled = projects.filter(p => p.projectStatus === 1).length;
  const running = projects.filter(p => p.projectStatus === 2).length;
  const completed = projects.filter(p => p.projectStatus === 3).length;

  const stats = [
    {
      label: "Total Projects",
      value: total,
      icon: FolderKanban,
      iconColor: "text-[#3b82f6]",
      iconBg: "bg-[#3b82f6]/10",
      href: "/project?tab=All",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      iconColor: "text-[#f59e0b]",
      iconBg: "bg-[#f59e0b]/10",
      href: "/project?tab=On Hold",
    },
    {
      label: "Scheduled",
      value: scheduled,
      icon: TrendingUp, // Keeping the original icon used
      iconColor: "text-[#a78bfa]",
      iconBg: "bg-[#a78bfa]/10",
      href: "/project?tab=Upcoming",
    },
    {
      label: "Running",
      value: running,
      icon: TrendingUp,
      iconColor: "text-[#22c55e]",
      iconBg: "bg-[#22c55e]/10",
      href: "/project?tab=Active",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
      iconColor: "text-[#64748b]",
      iconBg: "bg-[#64748b]/10",
      href: "/project?tab=Completed",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl">
        <Loader2 className="animate-spin text-[var(--dash-text-muted)]" size={24} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Link
          href={stat.href}
          key={stat.label}
          className="flex items-center justify-between p-9 bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl hover:border-[#3b82f6]/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-pointer"
        >
          <div>
            <p className="text-[12px] text-[var(--dash-text-muted)] font-medium mb-1.5 group-hover:text-[var(--dash-text-primary)] transition-colors">
              {stat.label}
            </p>
            <p className="text-[28px] font-bold text-[var(--dash-text-heading)] leading-none group-hover:text-[#3b82f6] transition-colors">
              {stat.value}
            </p>
          </div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.iconBg} group-hover:scale-110 transition-transform`}
          >
            <stat.icon size={20} className={stat.iconColor} strokeWidth={1.8} />
          </div>
        </Link>
      ))}
    </div>
  );
}
