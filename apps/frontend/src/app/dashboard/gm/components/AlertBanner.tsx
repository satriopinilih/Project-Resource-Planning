"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { getPendingProjects, BackendProject } from "@/lib/api";

export default function AlertBanner() {
  const [pendingProjects, setPendingProjects] = useState<BackendProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingProjects()
      .then(setPendingProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4 bg-[var(--dash-bg-banner)] rounded-xl border border-[var(--dash-border)]/50">
        <Loader2 className="animate-spin text-[var(--dash-text-muted)]" size={24} />
      </div>
    );
  }

  if (pendingProjects.length === 0) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "TBD";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  };

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 p-4 sm:p-6 lg:p-7 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-500/20 shrink-0">
          <AlertTriangle size={18} className="text-amber-700 dark:text-amber-400" strokeWidth={2} />
        </div>
        <h3 className="text-[14px] sm:text-[15px] font-bold text-amber-900 dark:text-amber-400">
          {pendingProjects.length} Project{pendingProjects.length !== 1 && "s"} Awaiting Schedule
        </h3>
      </div>
      <p className="text-[12px] sm:text-[13px] text-amber-800 dark:text-amber-300/80 mb-4 sm:ml-11">
        The following projects need timeline assignment and team allocation
      </p>

      {/* Project list */}
      <div className="flex flex-col gap-2.5 sm:ml-11">
        {pendingProjects.map((project) => (
          <div
            key={project.projectId}
            className="flex flex-col md:flex-row md:items-center justify-between p-3 sm:px-4 sm:py-3 bg-white dark:bg-black/20 rounded-lg border border-amber-200 dark:border-amber-500/30 gap-3 sm:gap-4 min-w-0"
          >
            {/* Project name & client */}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                {project.projectName}
              </p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 truncate">{project.clientOrganization}</p>
            </div>

            {/* Timeline info */}
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-5 shrink-0 overflow-x-auto py-1">
              <div className="text-center">
                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mb-0.5">Start Date</p>
                <p className="text-[12px] font-semibold text-gray-900 dark:text-white">
                  {formatDate(project.estimatedStartDate)}
                </p>
              </div>
              <div className="w-px h-8 bg-amber-200 dark:bg-amber-500/30 shrink-0" />
              <div className="text-center">
                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mb-0.5">Duration</p>
                <p className="text-[12px] font-semibold text-gray-900 dark:text-white">
                  {project.estimatedDuration ? `${project.estimatedDuration} wks` : "TBD"}
                </p>
              </div>
              <div className="w-px h-8 bg-amber-200 dark:bg-amber-500/30 shrink-0" />
              <div className="text-center">
                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mb-0.5">End Date</p>
                <p className="text-[12px] font-semibold text-gray-900 dark:text-white">
                  {formatDate(project.estimatedEndDate)}
                </p>
              </div>
            </div>

            {/* Action */}
            <Link
              href={`/project/${project.projectId}`}
              className="flex items-center justify-end gap-1.5 text-[13px] font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors duration-200 shrink-0"
            >
              Assign Timeline
              <ArrowRight size={15} strokeWidth={2} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
