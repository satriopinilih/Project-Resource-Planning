"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { getProjects, BackendProject } from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const toMonday = (d: Date) => {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
};
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const diffDays = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
const formatShort = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
const formatFull = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);

// ── Types ─────────────────────────────────────────────────────────────────────
type ProjectStatus = "pending" | "scheduled" | "running" | "completed" | "deleted" | "hold" | "babysitting" | "warranty";

interface TimelineBar {
  title: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
}

interface TimelineProject {
  id: string;
  name: string;
  client: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  bars: TimelineBar[];
}

// Backend ProjectStatus: 0=Pending, 1=Scheduled, 2=Running, 3=Completed, 4=Deleted, 5=Hold, 6=Babysitting, 7=Warranty
// Status 2 (Running) with a future start date is treated as "scheduled" (same logic as projects/page.tsx)
function mapStatus(s: number, startDateStr?: string): ProjectStatus {
  if (s === 1) return "scheduled";
  if (s === 2) {
    if (startDateStr) {
      const start = new Date(startDateStr);
      const today = new Date();
      start.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (start > today) return "scheduled";
    }
    return "running";
  }
  if (s === 3) return "completed";
  if (s === 4) return "deleted";
  if (s === 5) return "hold";
  if (s === 6) return "babysitting";
  if (s === 7) return "warranty";
  return "pending";
}

function projectToTimeline(p: BackendProject): TimelineProject {
  const mainStart = p.estimatedStartDate ? new Date(p.estimatedStartDate) : new Date();
  const mainEnd = p.estimatedEndDate ? new Date(p.estimatedEndDate) : new Date();
  const mainStatus = mapStatus(p.projectStatus, p.estimatedStartDate);

  const bars: TimelineBar[] = [
    {
      title: p.projectName,
      startDate: mainStart,
      endDate: mainEnd,
      status: (mainStatus === "completed" || mainStatus === "babysitting" || mainStatus === "warranty") 
        ? "completed" 
        : mainStatus,
    }
  ];

  if (p.babysittingDuration > 0 && p.babysittingStartDate && p.babysittingEndDate) {
    let bsStatus: ProjectStatus = "scheduled";
    if (mainStatus === "babysitting") {
      bsStatus = "running";
    } else if (mainStatus === "warranty" || mainStatus === "completed") {
      bsStatus = "completed";
    }

    bars.push({
      title: `${p.projectName} (Babysitting)`,
      startDate: new Date(p.babysittingStartDate),
      endDate: new Date(p.babysittingEndDate),
      status: bsStatus,
    });
  }

  if (p.warrantyDuration > 0 && p.warrantyStartDate && p.warrantyEndDate) {
    let wrStatus: ProjectStatus = "scheduled";
    if (mainStatus === "warranty") {
      wrStatus = "running";
    } else if (mainStatus === "completed") {
      wrStatus = "completed";
    }

    bars.push({
      title: `${p.projectName} (Warranty)`,
      startDate: new Date(p.warrantyStartDate),
      endDate: new Date(p.warrantyEndDate),
      status: wrStatus,
    });
  }

  const maxEnd = bars.reduce((max, bar) => bar.endDate > max ? bar.endDate : max, mainEnd);

  return {
    id: String(p.projectId),
    name: p.projectName,
    client: p.clientOrganization,
    startDate: mainStart,
    endDate: maxEnd,
    status: mainStatus,
    bars,
  };
}

// ── Status styling ────────────────────────────────────────────────────────────
const statusBarColors: Record<ProjectStatus, string> = {
  pending: "bg-amber-500/90 hover:bg-amber-500 border-amber-500/30",
  scheduled: "bg-[#3b82f6]/90 hover:bg-[#3b82f6] border-[#3b82f6]/30",
  running: "bg-[#22c55e]/90 hover:bg-[#22c55e] border-[#22c55e]/30",
  completed: "bg-[#64748b]/90 hover:bg-[#64748b] border-[#64748b]/30",
  deleted: "bg-red-500/90 hover:bg-red-500 border-red-500/30",
  hold: "bg-orange-500/90 hover:bg-orange-500 border-orange-500/30",
  babysitting: "bg-indigo-600/90 hover:bg-indigo-600 border-indigo-600/30",
  warranty: "bg-blue-600/90 hover:bg-blue-600 border-blue-600/30",
};

const filterConfig: {
  status: ProjectStatus;
  label: string;
  activeClass: string;
  dotClass: string;
}[] = [
    {
      status: "pending",
      label: "Pending",
      activeClass: "bg-amber-500/20 border-amber-500/60 text-amber-400",
      dotClass: "bg-amber-500",
    },
    {
      status: "scheduled",
      label: "Scheduled",
      activeClass: "bg-[#3b82f6]/20 border-[#3b82f6]/60 text-[#3b82f6]",
      dotClass: "bg-[#3b82f6]",
    },
    {
      status: "running",
      label: "Running",
      activeClass: "bg-[#22c55e]/20 border-[#22c55e]/60 text-[#22c55e]",
      dotClass: "bg-[#22c55e]",
    },
    {
      status: "babysitting",
      label: "Babysitting",
      activeClass: "bg-indigo-600/20 border-indigo-600/60 text-indigo-400",
      dotClass: "bg-indigo-600",
    },
    {
      status: "warranty",
      label: "Warranty",
      activeClass: "bg-blue-600/20 border-blue-600/60 text-blue-400",
      dotClass: "bg-blue-600",
    },
    {
      status: "completed",
      label: "Completed",
      activeClass: "bg-[#64748b]/20 border-[#64748b]/60 text-[#64748b]",
      dotClass: "bg-[#64748b]",
    },
    {
      status: "deleted",
      label: "Deleted",
      activeClass: "bg-red-500/20 border-red-500/60 text-red-500",
      dotClass: "bg-red-500",
    },
    {
      status: "hold",
      label: "Hold",
      activeClass: "bg-orange-500/20 border-orange-500/60 text-orange-500",
      dotClass: "bg-orange-500",
    },
  ];

// ── Component ─────────────────────────────────────────────────────────────────
type ViewMode = "Daily" | "Weekly" | "Monthly";

export default function ProjectTimeline() {
  const [allProjects, setAllProjects] = useState<TimelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default: show Pending, Scheduled, Running, Hold, Babysitting, Warranty (hide Completed)
  const [activeFilters, setActiveFilters] = useState<Set<ProjectStatus>>(
    new Set(["pending", "scheduled", "running", "hold", "babysitting", "warranty"])
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("Weekly");

  const getInitialStart = (mode: ViewMode) => {
    const now = new Date();
    if (mode === "Monthly") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return toMonday(now);
  };

  const [windowStart, setWindowStart] = useState<Date>(() => getInitialStart("Weekly"));

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setWindowStart(getInitialStart(mode));
  };

  const handlePrev = () => setWindowStart((prev) => {
    if (viewMode === "Daily") return addDays(prev, -14);
    if (viewMode === "Weekly") return addDays(prev, -12 * 7);
    return new Date(prev.getFullYear(), prev.getMonth() - 6, 1);
  });
  const handleNext = () => setWindowStart((prev) => {
    if (viewMode === "Daily") return addDays(prev, 14);
    if (viewMode === "Weekly") return addDays(prev, 12 * 7);
    return new Date(prev.getFullYear(), prev.getMonth() + 6, 1);
  });

  const toggleFilter = (status: ProjectStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  useEffect(() => {
    getProjects()
      .then((data) => setAllProjects(data.map(projectToTimeline)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const { windowEnd, TOTAL_DAYS } = useMemo(() => {
    if (viewMode === "Daily") {
      return { windowEnd: addDays(windowStart, 13), TOTAL_DAYS: 14 };
    }
    if (viewMode === "Weekly") {
      const days = 12 * 7;
      return { windowEnd: addDays(windowStart, days - 1), TOTAL_DAYS: days };
    }
    // Monthly
    const end = new Date(windowStart.getFullYear(), windowStart.getMonth() + 6, 0); // last day of 6th month
    const totalDays = diffDays(windowStart, end) + 1;
    return { windowEnd: end, TOTAL_DAYS: totalDays };
  }, [windowStart, viewMode]);

  const { columns, filteredProjects, hiddenPastCount, hiddenFutureCount } = useMemo(() => {
    let cols: { label: string }[] = [];
    if (viewMode === "Daily") {
      cols = Array.from({ length: 14 }).map((_, i) => ({
        label: formatShort(addDays(windowStart, i)),
      }));
    } else if (viewMode === "Weekly") {
      cols = Array.from({ length: 12 }).map((_, i) => ({
        label: formatShort(addDays(windowStart, i * 7)),
      }));
    } else if (viewMode === "Monthly") {
      cols = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
        return {
          label: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d),
        };
      });
    }

    let past = 0;
    let future = 0;

    const filtered = allProjects.filter((p) => {
      if (!activeFilters.has(p.status)) return false;
      if (searchQuery.trim() !== "" && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Only show if overlaps with the current 12-week window
      if (p.endDate < windowStart) {
        past++;
        return false;
      }
      if (p.startDate > windowEnd) {
        future++;
        return false;
      }
      return true;
    });

    return { columns: cols, filteredProjects: filtered, hiddenPastCount: past, hiddenFutureCount: future };
  }, [allProjects, activeFilters, searchQuery, windowStart, windowEnd, viewMode]);

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300">
      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">
            Project Timeline
          </h3>
          <p className="text-[12px] text-[var(--dash-text-muted)] mt-0.5">
            {formatFull(windowStart)} — {formatFull(windowEnd)}
          </p>
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {hiddenPastCount > 0 && (
              <span
                className="absolute -top-1.5 -left-1.5 bg-blue-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm z-10 pointer-events-none"
                title={`${hiddenPastCount} project(s) hidden in past`}
              >
                {hiddenPastCount > 9 ? '9+' : hiddenPastCount}
              </span>
            )}
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
            {hiddenFutureCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm z-10 pointer-events-none"
                title={`${hiddenFutureCount} project(s) hidden in future`}
              >
                {hiddenFutureCount > 9 ? '9+' : hiddenFutureCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Chips ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] font-semibold text-[var(--dash-text-faint)] uppercase tracking-wide mr-1">
          Filter:
        </span>
        {filterConfig.map(({ status, label, activeClass, dotClass }) => {
          const isActive = activeFilters.has(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleFilter(status)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150 ${isActive
                ? activeClass
                : "border-[var(--dash-border)] text-[var(--dash-text-faint)] hover:border-[var(--dash-border-subtle)] hover:text-[var(--dash-text-muted)]"
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full transition-colors ${isActive ? dotClass : "bg-[var(--dash-text-faint)]"
                  }`}
              />
              {label}
              {isActive && (
                <span className="ml-0.5 opacity-60 text-[10px]">✓</span>
              )}
            </button>
          );
        })}

        {/* View toggle & Search */}
        <div className="ml-auto flex items-center gap-4">
          {/* View toggle */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg p-0.5">
              {(["Daily", "Weekly", "Monthly"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === mode
                      ? "bg-[#3b82f6] text-white shadow-sm"
                      : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)]"
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="relative w-[260px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]"
              strokeWidth={1.8}
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-[13px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none placeholder:text-[var(--dash-text-faint)] focus:border-[#3b82f6]/50 transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--dash-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading timeline...</span>
        </div>
      )}
      {error && (
        <p className="text-[13px] text-[#ef4444] py-6 text-center">{error}</p>
      )}

      {/* ── Timeline Grid ── */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Column headers */}
            <div className="flex mb-2">
              <div className="w-[220px] shrink-0" />
              <div
                className="flex-1 grid"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              >
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className="text-center text-[11px] text-[var(--dash-text-muted)] font-medium pb-3 border-r border-[var(--dash-border-subtle)] last:border-r-0"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Project rows */}
            {filteredProjects.map((project) => {
              return (
                <div
                  key={project.id}
                  className="flex items-center py-2.5 border-t border-[var(--dash-border-subtle)] group hover:bg-[#1a1f2e]/30 transition-colors"
                >
                  {/* Project label */}
                  <div className="w-[220px] shrink-0 pr-4">
                    <p className="text-[13px] font-semibold text-[var(--dash-text-heading)] leading-tight truncate">
                      {project.name}
                    </p>
                    <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5 truncate">
                      {project.client}
                    </p>
                  </div>

                  {/* Bar area */}
                  <div className="flex-1 relative h-[36px]">
                    {/* Vertical grid lines */}
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                    >
                      {columns.map((_, i) => (
                        <div
                          key={i}
                          className="border-l border-[var(--dash-border-subtle)] h-full"
                        />
                      ))}
                    </div>

                    {/* The bars */}
                    {project.bars.map((bar, barIdx) => {
                      const barStartDay = diffDays(windowStart, bar.startDate);
                      const barEndDay = diffDays(windowStart, bar.endDate);

                      if (bar.endDate < windowStart || bar.startDate > windowEnd) return null;

                      const clampedStart = Math.max(0, barStartDay);
                      const clampedEnd = Math.min(TOTAL_DAYS - 1, barEndDay);

                      const leftPct = (clampedStart / TOTAL_DAYS) * 100;
                      const widthPct = Math.max(1, ((clampedEnd - clampedStart + 1) / TOTAL_DAYS) * 100);

                      const isPhaseCompleted = bar.status === "completed";
                      const isBabysitting = bar.title.endsWith("(Babysitting)");
                      const isWarranty = bar.title.endsWith("(Warranty)");

                      return (
                        <Link
                          key={barIdx}
                          href={`/project/${project.id}`}
                          title={`${bar.title} (${formatFull(bar.startDate)} – ${formatFull(bar.endDate)})`}
                          style={{
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                            left: `calc(${leftPct}% + 3px)`,
                            width: `calc(${widthPct}% - 6px)`,
                            height: "28px",
                          }}
                          className={`flex items-center px-3 rounded-md text-[11px] font-semibold text-white truncate border shadow-sm transition-all duration-200 ${statusBarColors[bar.status]} ${
                            isPhaseCompleted 
                              ? "opacity-50" 
                              : isBabysitting
                                ? "opacity-85 border-indigo-400/40 border-dashed"
                                : isWarranty
                                  ? "opacity-85 border-blue-400/40 border-dashed"
                                  : ""
                          }`}
                        >
                          {bar.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <p className="text-center text-[13px] text-[var(--dash-text-faint)] py-10">
                No projects match the selected filters in this time window.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
