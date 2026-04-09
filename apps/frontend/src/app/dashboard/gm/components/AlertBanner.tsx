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

  const displayProjects = pendingProjects.length > 0 ? pendingProjects : [
    {
      projectId: 9999,
      projectName: "Data Analytics Platform (Dummy Data)",
      clientOrganization: "FinServe Corp.",
      projectDescription: "Temporary dummy project",
      estimatedStartDate: new Date().toISOString(),
      estimatedEndDate: new Date().toISOString(),
      estimatedDuration: 12,
      projectStatus: 0,
      priorityLevel: 1,
      members: []
    }
  ] as BackendProject[];

  return (
    <div className="rounded-xl border border-[#f59e0b]/25 bg-[var(--dash-bg-banner)] p-9 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#f59e0b]/15">
          <AlertTriangle size={18} className="text-[#f59e0b]" strokeWidth={2} />
        </div>
        <h3 className="text-[15px] font-bold text-[var(--dash-text-heading)]">
          {displayProjects.length} Project{displayProjects.length !== 1 && "s"} Awaiting Schedule
        </h3>
      </div>
      <p className="text-[13px] text-[var(--dash-text-muted)] ml-11 mb-4">
        The following projects need timeline assignment and team allocation
      </p>

      {/* Project list */}
      <div className="flex flex-col gap-2 ml-11">
        {displayProjects.map((project) => (
          <div
            key={project.projectId}
            className="flex items-center justify-between px-4 py-3 bg-[var(--dash-bg-banner-inner)] rounded-lg border border-[var(--dash-border)]/60"
          >
            <div>
              <p className="text-[14px] font-semibold text-[var(--dash-text-heading)]">
                {project.projectName}
              </p>
              <p className="text-[12px] text-[var(--dash-text-muted)]">{project.clientOrganization}</p>
            </div>
            <Link
<<<<<<< HEAD
              href={`/dashboard/gm/projects/${project.projectId}`}
=======
              href={`/project/${project.projectId}`}
>>>>>>> main
              className="flex items-center gap-1.5 text-[13px] font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors duration-200"
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
