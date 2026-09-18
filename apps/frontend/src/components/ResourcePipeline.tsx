"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getProjects, getRawEmployees, BackendProject, BackendEmployee } from "@/lib/api";

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

const formatShortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);

const formatFullDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);

// ── Types ─────────────────────────────────────────────────────────────────────
type ProjectStatus = "pending" | "scheduled" | "running" | "completed" | "deleted" | "hold" | "babysitting" | "warranty";

interface EmployeeAllocation {
  projectId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  startDay: number; // days from windowStart
  endDay: number;
  status: ProjectStatus;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  tracks: EmployeeAllocation[][];
}

// Backend ProjectStatus: 0=Pending, 1=Scheduled, 2=Running, 3=Completed, 4=Deleted, 5=Hold, 6=Babysitting, 7=Warranty
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

// Read-only variant — no hover color shift, pointer events disabled
const statusBarColorsReadOnly: Record<ProjectStatus, string> = {
  pending: "bg-amber-500/80 border-amber-500/30",
  scheduled: "bg-[#3b82f6]/80 border-[#3b82f6]/30",
  running: "bg-[#22c55e]/80 border-[#22c55e]/30",
  completed: "bg-[#64748b]/80 border-[#64748b]/30",
  deleted: "bg-red-500/80 border-red-500/30",
  hold: "bg-orange-500/80 border-orange-500/30",
  babysitting: "bg-indigo-600/80 border-indigo-600/30",
  warranty: "bg-blue-600/80 border-blue-600/30",
};

const filterConfig: {
  status: ProjectStatus;
  label: string;
  activeClass: string;
  dotClass: string;
}[] = [
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

const SYSTEM_USER_IDS = ["GM001", "HR123"];

const getPrimaryProjectName = (emp: Employee) => {
  const names = emp.tracks.flatMap((t) => t.map((a) => a.projectName));
  if (names.length === 0) return null;
  names.sort((a, b) => a.localeCompare(b));
  return names[0];
};

interface ResourcePipelineProps {
  /** When true, chart bars are non-clickable (no Link navigation). Intended for read-only views such as HR dashboard. */
  readOnly?: boolean;
}

export default function ResourcePipeline({ readOnly = false }: ResourcePipelineProps) {
  const [apiEmployees, setApiEmployees] = useState<BackendEmployee[]>([]);
  const [apiProjects, setApiProjects] = useState<BackendProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default active filters: scheduled, running, hold, babysitting, warranty
  const [activeFilters, setActiveFilters] = useState<Set<ProjectStatus>>(
    new Set(["scheduled", "running", "hold", "babysitting", "warranty"])
  );

  const [sortBy, setSortBy] = useState<string>("project-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    if (typeof window === "undefined") return 5;
    try {
      const saved = localStorage.getItem("pipeline_items_per_page");
      const parsed = saved ? Number(saved) : 5;
      return [5, 10, 15].includes(parsed) ? parsed : 5;
    } catch {
      return 5;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pipeline_items_per_page");
      if (saved) {
        const parsed = Number(saved);
        if ([5, 10, 15].includes(parsed)) {
          setItemsPerPage(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleItemsPerPageChange = (val: number) => {
    setItemsPerPage(val);
    setCurrentPage(1);
    try {
      localStorage.setItem("pipeline_items_per_page", String(val));
    } catch {
      // Ignore
    }
  };
  const [searchQuery, setSearchQuery] = useState("");

  // Default window starts at the Monday of the current week
  const [windowStart, setWindowStart] = useState<Date>(() => {
    return toMonday(new Date());
  });

  const handlePrev = () => setWindowStart((prev) => addDays(prev, -12 * 7));
  const handleNext = () => setWindowStart((prev) => addDays(prev, 12 * 7));

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
    Promise.all([getProjects(), getRawEmployees()])
      .then(([projects, emps]) => {
        setApiProjects(projects);
        setApiEmployees(emps);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const { employees, columns } = useMemo(() => {
    const windowEnd = addDays(windowStart, 12 * 7 - 1); // 83 days later

    const cols = Array.from({ length: 12 }).map((_, i) => {
      const colStart = addDays(windowStart, i * 7);
      return {
        label: formatShortDate(colStart),
      };
    });

    const projectMap = new Map<
      number,
      {
        name: string;
        start: Date;
        end: Date;
        status: number;
        startDateRaw?: string;
        babysittingStart: Date | null;
        babysittingEnd: Date | null;
        warrantyStart: Date | null;
        warrantyEnd: Date | null;
      }
    >();
    (apiProjects || []).forEach((p) => {
      if (p && p.projectId) {
        projectMap.set(p.projectId, {
          name: p.projectName,
          start: p.estimatedStartDate ? new Date(p.estimatedStartDate) : new Date(),
          end: p.estimatedEndDate ? new Date(p.estimatedEndDate) : new Date(),
          status: p.projectStatus,
          startDateRaw: p.estimatedStartDate,
          babysittingStart: p.babysittingStartDate ? new Date(p.babysittingStartDate) : null,
          babysittingEnd: p.babysittingEndDate ? new Date(p.babysittingEndDate) : null,
          warrantyStart: p.warrantyStartDate ? new Date(p.warrantyStartDate) : null,
          warrantyEnd: p.warrantyEndDate ? new Date(p.warrantyEndDate) : null,
        });
      }
    });

    const builtEmployees: Employee[] = (apiEmployees || [])
      .filter((e) => e && !SYSTEM_USER_IDS.includes(e.userId))
      .map((emp) => {
        const allocations: EmployeeAllocation[] = (emp.projects || [])
          .map((p) => {
            if (!p) return null;
            if (p.roleInProject?.includes("Notification")) return null;
            const proj = projectMap.get(p.projectId);
            if (!proj) return null;

            const pStart = p.startDate ? new Date(p.startDate) : proj.start;
            const pEnd = p.endDate ? new Date(p.endDate) : proj.end;

            // Check if project overlaps with the 12-week window
            if (pEnd < windowStart || pStart > windowEnd) return null;

            let isBabysittingPhase = false;
            let isWarrantyPhase = false;

            if (proj.babysittingStart && proj.babysittingEnd) {
              const bStartMs = proj.babysittingStart.getTime();
              const bEndMs = proj.babysittingEnd.getTime();
              const pStartMs = pStart.getTime();
              if (pStartMs >= bStartMs - 12 * 3600 * 1000 && pStartMs < bEndMs) {
                isBabysittingPhase = true;
              }
            }

            if (!isBabysittingPhase && proj.warrantyStart && proj.warrantyEnd) {
              const wStartMs = proj.warrantyStart.getTime();
              const wEndMs = proj.warrantyEnd.getTime();
              const pStartMs = pStart.getTime();
              if (pStartMs >= wStartMs - 12 * 3600 * 1000 && pStartMs < wEndMs) {
                isWarrantyPhase = true;
              }
            }

            const mainStatus = mapStatus(proj.status, proj.startDateRaw);
            let allocStatus: ProjectStatus = mainStatus;

            if (isBabysittingPhase) {
              allocStatus = "babysitting";
            } else if (isWarrantyPhase) {
              allocStatus = "warranty";
            }

            // If the member's assignment is completed (e.g. they were replaced), override to completed
            if (p.status === 1) {
              allocStatus = "completed";
            }

            // Filter logic: if active filters exist and status is not in active filters, exclude
            if (activeFilters.size > 0 && !activeFilters.has(allocStatus)) {
              return null;
            }

            const startDay = diffDays(windowStart, pStart);
            const endDay = diffDays(windowStart, pEnd);

            let displayName = proj.name;
            if (isBabysittingPhase) {
              displayName = `${proj.name} (Babysitting)`;
            } else if (isWarrantyPhase) {
              displayName = `${proj.name} (Warranty)`;
            }

            return {
              projectId: String(p.projectId),
              projectName: displayName,
              startDate: pStart,
              endDate: pEnd,
              startDay,
              endDay,
              status: allocStatus,
            } as EmployeeAllocation;
          })
          .filter((a): a is EmployeeAllocation => a !== null);

        // Sort by start date
        allocations.sort((a, b) => a.startDay - b.startDay);

        const tracks: EmployeeAllocation[][] = [];
        allocations.forEach((alloc) => {
          let placed = false;
          for (const track of tracks) {
            const overlaps = track.some(
              (a) => Math.max(alloc.startDay, a.startDay) <= Math.min(alloc.endDay, a.endDay)
            );
            if (!overlaps) {
              track.push(alloc);
              placed = true;
              break;
            }
          }
          if (!placed) {
            tracks.push([alloc]);
          }
        });

        return {
          id: emp.userId,
          name: emp.userName || "Unknown",
          role: emp.role || "-",
          tracks,
        };
      });

    return { employees: builtEmployees, columns: cols };
  }, [apiEmployees, apiProjects, windowStart, activeFilters]);

  const windowEnd = useMemo(() => addDays(windowStart, 12 * 7 - 1), [windowStart]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((emp) => {
        if (emp.name.toLowerCase().includes(lowerQuery)) return true;
        const hasMatchingProject = emp.tracks.some((track) =>
          track.some((alloc) => alloc.projectName.toLowerCase().includes(lowerQuery))
        );
        return hasMatchingProject;
      });
    }

    return [...result].sort((a, b) => {
      if (sortBy === "project-asc" || sortBy === "project-desc") {
        const projA = getPrimaryProjectName(a);
        const projB = getPrimaryProjectName(b);
        if (projA && projB) {
          const cmp = projA.localeCompare(projB);
          if (cmp !== 0) return sortBy === "project-asc" ? cmp : -cmp;
          return a.name.localeCompare(b.name);
        }
        if (projA && !projB) return -1;
        if (!projA && projB) return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      // default: role priority
      const roleOrder: Record<string, number> = {
        PM: 1,
        Architect: 2,
        "Senior Dev": 3,
        "Junior Dev": 4,
        "Senior BA": 5,
        "Junior BA": 6,
      };
      const aPriority = roleOrder[a.role] || 99;
      const bPriority = roleOrder[b.role] || 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return a.name.localeCompare(b.name);
    });
  }, [employees, searchQuery, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, activeFilters, itemsPerPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const currentEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div 
      className={
        readOnly 
          ? "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          : "bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300"
      }
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">
            Resource Pipeline View
          </h3>
          <p className="text-[12px] text-[var(--dash-text-muted)] mt-0.5">
            {formatFullDate(windowStart)} – {formatFullDate(windowEnd)} (12 Weeks)
            {readOnly && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-white/10">
                View Only
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
          {!loading && !error && (
            <span className="px-3 py-1.5 text-[12px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-lg whitespace-nowrap">
              Total Employees: {filteredEmployees.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Filter Chips & Controls ── */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
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

          {/* Right side: Sort By & Search */}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[var(--dash-text-muted)] whitespace-nowrap">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-2.5 text-[12px] font-semibold text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none focus:border-[#3b82f6]/50 transition-colors"
              >
                <option value="project-asc">Project Name (A-Z)</option>
                <option value="project-desc">Project Name (Z-A)</option>
                <option value="role">Role Priority (Default)</option>
                <option value="name-asc">Employee Name (A-Z)</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]"
                strokeWidth={1.8}
              />
              <input
                type="text"
                placeholder="Search employee or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-[12px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[var(--dash-text-heading)] placeholder:text-[var(--dash-text-faint)] focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--dash-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading pipeline...</span>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#ef4444] py-6 text-center">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header Columns */}
            <div className="flex mb-1.5">
              <div className="w-[180px] shrink-0" />
              <div className="flex-1 grid grid-cols-12">
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className="text-center text-[11px] text-[var(--dash-text-muted)] font-medium pb-2 border-r border-[var(--dash-border-subtle)] last:border-r-0"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* List Karyawan */}
            {currentEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center py-3 border-t border-[var(--dash-border-subtle)] group hover:bg-[#1a1f2e]/30 transition-colors"
              >
                {/* Info Karyawan */}
                <div className="w-[180px] shrink-0 pr-4">
                  <p className="text-[13px] font-semibold text-[var(--dash-text-heading)] leading-tight truncate">
                    {employee.name}
                  </p>
                  <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5 truncate">
                    {employee.role}
                  </p>
                </div>

                {/* Container Timeline Bar */}
                <div className="flex-1 relative min-h-[32px] flex flex-col justify-center gap-2 py-1">
                  {/* Garis Vertikal Background */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    {columns.map((_, i) => (
                      <div
                        key={i}
                        className="border-l border-[var(--dash-border-subtle)] h-full"
                      />
                    ))}
                  </div>

                  {/* Render Tracks (Proyek) */}
                  {(employee.tracks || []).map((track, tIdx) => (
                    <div key={tIdx} className="relative h-[28px] w-full">
                      {(track || []).map((alloc, aIdx) => {
                        const totalDays = 12 * 7;
                        // Limit to window
                        const leftPct = Math.max(0, (alloc.startDay / totalDays) * 100);
                        // Calculate right boundary
                        const endPct = Math.min(100, ((alloc.endDay + 1) / totalDays) * 100);
                        const widthPct = Math.max(1, endPct - leftPct);

                        const isPhaseCompleted = alloc.status === "completed";
                        const isBabysitting = alloc.status === "babysitting" || alloc.projectName.endsWith("(Babysitting)");
                        const isWarranty = alloc.status === "warranty" || alloc.projectName.endsWith("(Warranty)");

                        const sharedStyle = {
                          left: `calc(${leftPct}% + 4px)`,
                          width: `calc(${widthPct}% - 8px)`,
                        };

                        const sharedClassName = `
                          absolute top-0 h-full px-3 rounded-md text-[11px] font-semibold text-white
                          truncate flex items-center border shadow-sm
                          ${readOnly
                            ? statusBarColorsReadOnly[alloc.status]
                            : `transition-all duration-200 cursor-pointer ${statusBarColors[alloc.status]}`
                          }
                          ${isPhaseCompleted
                            ? "opacity-50"
                            : isBabysitting
                              ? "opacity-85 border-indigo-400/40 border-dashed"
                              : isWarranty
                                ? "opacity-85 border-blue-400/40 border-dashed"
                                : ""
                          }
                        `;

                        const tooltipTitle = `${alloc.projectName} (${formatShortDate(alloc.startDate)} - ${formatShortDate(alloc.endDate)})`;

                        if (readOnly) {
                          return (
                            <div
                              key={aIdx}
                              style={sharedStyle}
                              title={tooltipTitle}
                              className={sharedClassName}
                            >
                              {alloc.projectName}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={aIdx}
                            href={`/project/${alloc.projectId}`}
                            style={sharedStyle}
                            title={tooltipTitle}
                            className={sharedClassName}
                          >
                            {alloc.projectName}
                          </Link>
                        );
                      })}
                    </div>
                  ))}

                  {/* Jika Karyawan Kosong (Available) */}
                  {(!employee.tracks || employee.tracks.length === 0) && (
                    <div className="relative h-[28px] w-full flex items-center">
                      <span className="absolute left-[44%] text-[11px] text-[var(--dash-text-faint)] italic">
                        Available
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredEmployees.length === 0 && (
              <p className="text-center text-[13px] text-[var(--dash-text-faint)] py-8">
                No employees or projects found matching your search.
              </p>
            )}

            {/* Pagination Footer */}
            {filteredEmployees.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-3 border-t border-[var(--dash-border-subtle)]">
                <div className="flex items-center gap-4">
                  <p className="text-[12px] text-[var(--dash-text-faint)]">
                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--dash-text-faint)]">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-2 py-1 text-[11px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-md hover:text-[var(--dash-text-heading)] transition-colors focus:outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--dash-text-faint)] mr-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
