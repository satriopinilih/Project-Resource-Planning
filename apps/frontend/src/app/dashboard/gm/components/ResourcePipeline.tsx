"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getProjects, getRawEmployees, BackendProject, BackendEmployee } from "@/lib/api";

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

interface EmployeeAllocation {
  projectId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  startDay: number; // days from windowStart
  endDay: number;
  color: "green" | "blue" | "gray" | "amber";
}

interface Employee {
  id: string;
  name: string;
  role: string;
  tracks: EmployeeAllocation[][];
}

const allocationColors = {
  green: "bg-[#22c55e]/90 hover:bg-[#22c55e] border-[#22c55e]/30 text-white",
  blue: "bg-[#3b82f6]/90 hover:bg-[#3b82f6] border-[#3b82f6]/30 text-white",
  amber: "bg-amber-500/90 hover:bg-amber-500 border-amber-500/30 text-white",
  gray: "bg-gray-500/90 hover:bg-gray-500 border-gray-500/30 text-white",
};

const SYSTEM_USER_IDS = ["GM001", "HR123"];

export default function ResourcePipeline() {
  const [apiEmployees, setApiEmployees] = useState<BackendEmployee[]>([]);
  const [apiProjects, setApiProjects] = useState<BackendProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default window starts at the Monday of the current week
  const [windowStart, setWindowStart] = useState<Date>(() => {
    return toMonday(new Date());
  });

  const handlePrev = () => setWindowStart((prev) => addDays(prev, -12 * 7));
  const handleNext = () => setWindowStart((prev) => addDays(prev, 12 * 7));

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
    const totalWindowDays = 12 * 7;

    const cols = Array.from({ length: 12 }).map((_, i) => {
      const colStart = addDays(windowStart, i * 7);
      return {
        label: formatShortDate(colStart),
      };
    });

    const projectMap = new Map<number, { name: string; start: Date; end: Date; status: number }>();
    (apiProjects || []).forEach((p) => {
      if (p && p.projectId && p.projectStatus !== 0) {
        projectMap.set(p.projectId, {
          name: p.projectName,
          start: new Date(p.estimatedStartDate),
          end: new Date(p.estimatedEndDate),
          status: p.projectStatus,
        });
      }
    });

    const builtEmployees = (apiEmployees || [])
      .filter((e) => e && !SYSTEM_USER_IDS.includes(e.userId))
      .map((emp) => {
        const allocations: EmployeeAllocation[] = (emp.projects || [])
          .map((p) => {
            if (!p) return null;
            const proj = projectMap.get(p.projectId);
            if (!proj) return null;

            const pStart = p.startDate ? new Date(p.startDate) : proj.start;
            const pEnd = p.endDate ? new Date(p.endDate) : proj.end;

            // Check if project overlaps with the 12-week window
            if (pEnd < windowStart || pStart > windowEnd) return null;

            let statusColor: "blue" | "green" | "gray" | "amber" = "gray";
            if (proj.status === 1) statusColor = "blue";
            if (proj.status === 2) statusColor = "green";
            if (proj.status === 3) statusColor = "gray";

            // If the member's assignment is completed (e.g. they were replaced), override to gray
            if (p.status === 1) { // 1 = Completed
              statusColor = "gray";
            }

            const startDay = diffDays(windowStart, pStart);
            const endDay = diffDays(windowStart, pEnd);

            return {
              projectId: String(p.projectId),
              projectName: proj.name,
              startDate: pStart,
              endDate: pEnd,
              startDay,
              endDay,
              color: statusColor,
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
      })
      .sort((a, b) => {
        const roleOrder: Record<string, number> = {
          "PM": 1,
          "Architect": 2,
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

    return { employees: builtEmployees, columns: cols };
  }, [apiEmployees, apiProjects, windowStart]);

  const windowEnd = useMemo(() => addDays(windowStart, 12 * 7 - 1), [windowStart]);

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">
            Resource Pipeline View
          </h3>
          <p className="text-[12px] text-[var(--dash-text-muted)] mt-0.5">
            {formatFullDate(windowStart)} - {formatFullDate(windowEnd)} (12 Weeks)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {!loading && !error && (
            <span className="px-3 py-1.5 text-[12px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-lg">
              Total Employees: {employees.length}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {!loading && !error && (
        <div className="flex items-center gap-5 mb-5 text-[11px] font-semibold text-[var(--dash-text-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
            Scheduled
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
            Running
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-500" />
            Completed
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
            <div className="flex mb-3">
              <div className="w-[180px] shrink-0" />
              <div className="flex-1 grid grid-cols-12">
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

            {/* List Karyawan */}
            {employees.map((employee) => (
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

                        return (
                          <Link
                            key={aIdx}
                            href={`/project/${alloc.projectId}`}
                            style={{
                              left: `calc(${leftPct}% + 4px)`,
                              width: `calc(${widthPct}% - 8px)`,
                            }}
                            title={`${alloc.projectName} (${formatShortDate(alloc.startDate)} - ${formatShortDate(alloc.endDate)})`}
                            className={`
                              absolute top-0 h-full px-3 rounded-md text-[11px] font-semibold
                              truncate flex items-center transition-all duration-200 cursor-pointer border shadow-sm
                              ${allocationColors[alloc.color]}
                            `}
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

            {employees.length === 0 && (
              <p className="text-center text-[13px] text-[var(--dash-text-faint)] py-8">
                No employees found. Make sure the backend is seeded.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}