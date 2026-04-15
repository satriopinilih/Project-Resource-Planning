"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getProjects, BackendProject } from "@/lib/api";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type ProjectStatus = "pending" | "scheduled" | "running" | "completed";

interface TimelineProject {
  id: string;
  name: string;
  client: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
}

// Backend ProjectStatus: 0=Pending, 1=Scheduled, 2=Running, 3=Completed
function mapStatus(s: number): ProjectStatus {
  if (s === 0) return "pending";
  if (s === 1) return "scheduled";
  if (s === 2) return "running";
  if (s === 3) return "completed";
  return "pending";
}

function projectToTimeline(p: BackendProject): TimelineProject {
  const start = p.estimatedStartDate ? new Date(p.estimatedStartDate) : new Date();
  const end = p.estimatedEndDate ? new Date(p.estimatedEndDate) : start;
  return {
    id: String(p.projectId),
    name: p.projectName,
    client: p.clientOrganization,
    startDate: start,
    endDate: end,
    status: mapStatus(p.projectStatus),
  };
}

function getRangeForYear(project: TimelineProject, year: number) {
  const projectStartYear = project.startDate.getFullYear();
  const projectEndYear = project.endDate.getFullYear();
  if (projectStartYear > year || projectEndYear < year) return null;

  const startMonth = projectStartYear < year ? 0 : project.startDate.getMonth();
  const endMonth = projectEndYear > year ? 11 : project.endDate.getMonth();
  return { startMonth, endMonth };
}

const statusColors: Record<ProjectStatus, string> = {
  pending: "bg-[#f59e0b]",
  scheduled: "bg-[#3b82f6]",
  running: "bg-[#22c55e]",
  completed: "bg-[#64748b]",
};

const statusBarColors: Record<ProjectStatus, string> = {
  pending: "bg-[#f59e0b]/90 hover:bg-[#f59e0b]",
  scheduled: "bg-[#3b82f6]/90 hover:bg-[#3b82f6]",
  running: "bg-[#22c55e]/90 hover:bg-[#22c55e]",
  completed: "bg-[#64748b]/90 hover:bg-[#64748b]",
};

const legendItems: { label: string; status: ProjectStatus }[] = [
  { label: "Pending", status: "pending" },
  { label: "Scheduled", status: "scheduled" },
  { label: "Running", status: "running" },
  { label: "Completed", status: "completed" },
];

export default function ProjectTimeline() {
  const [projects, setProjects] = useState<TimelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    getProjects()
      .then((data) => setProjects(data.map(projectToTimeline)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">
          Project Timeline - {selectedYear}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedYear((prev) => prev - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <button
            type="button"
            onClick={() => setSelectedYear((prev) => prev + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--dash-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading timeline...</span>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#ef4444] py-6 text-center">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Month headers */}
              <div className="grid grid-cols-[220px_repeat(12,1fr)] gap-0 mb-2">
                <div />
                {months.map((month) => (
                  <div
                    key={month}
                    className="text-center text-[11px] text-[var(--dash-text-muted)] font-medium pb-3"
                  >
                    {month}
                  </div>
                ))}
              </div>

              {/* Project rows */}
              {projects
                .map((project) => {
                  const visibleRange = getRangeForYear(project, selectedYear);
                  if (!visibleRange) return null;
                  const { startMonth, endMonth } = visibleRange;

                  return (
                    <div
                      key={project.id}
                      className="grid grid-cols-[220px_repeat(12,1fr)] gap-0 items-center py-3"
                    >
                      <div className="pr-4">
                        <p className="text-[13px] font-semibold text-[var(--dash-text-heading)] leading-tight">
                          {project.name}
                        </p>
                        <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">
                          {project.client}
                        </p>
                      </div>

                      {months.map((_, monthIdx) => {
                        const isStart = monthIdx === startMonth;
                        const isInRange = monthIdx > startMonth && monthIdx <= endMonth;

                        if (isStart) {
                          const spanCols = Math.max(1, endMonth - startMonth + 1);
                          return (
                            <div
                              key={monthIdx}
                              className="relative px-0.5"
                              style={{ gridColumn: `span ${spanCols}` }}
                            >
                              <Link
                                href={`/project/${project.id}`}
                                className={`
                                  block w-full py-2 px-3 rounded-md text-[11px] font-semibold text-white
                                  truncate transition-all duration-200 cursor-pointer
                                  ${statusBarColors[project.status]}
                                `}
                              >
                                {project.name}
                              </Link>
                            </div>
                          );
                        }

                        if (isInRange) return null;

                        return (
                          <div
                            key={monthIdx}
                            className="h-9 border-l border-[var(--dash-border-subtle)]"
                          />
                        );
                      })}
                    </div>
                  );
                })
                .filter(Boolean)}

              {projects.filter((project) => getRangeForYear(project, selectedYear)).length === 0 && (
                <p className="text-center text-[13px] text-[var(--dash-text-faint)] py-8">
                  No projects found for {selectedYear}.
                </p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[var(--dash-border-subtle)]">
            {legendItems.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${statusColors[item.status]}`} />
                <span className="text-[12px] text-[var(--dash-text-muted)]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
