"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Project } from "@/lib/types";

/* ─── helpers ─────────────────────────────────────────────────────────── */
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatFullDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);

const getWeekLabel = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;

const WINDOW_WEEKS = 12;

/* ─── props ───────────────────────────────────────────────────────────── */
interface GanttTimelineProps {
  projects: Project[];
}

export default function GanttTimeline({ projects }: GanttTimelineProps) {
  const [windowStart, setWindowStart] = useState(() => getMonday(new Date()));
  const [filterScheduled, setFilterScheduled] = useState(true);
  const [filterRunning, setFilterRunning] = useState(true);

  const [tooltip, setTooltip] = useState<{
    project: Project;
    x: number;
    y: number;
  } | null>(null);

  /* ── derived window ──────────────────────────────────────────────────── */
  const windowEnd = useMemo(() => {
    const end = new Date(windowStart);
    end.setDate(end.getDate() + WINDOW_WEEKS * 7 - 1);
    return end;
  }, [windowStart]);

  const columns = useMemo<Date[]>(() => {
    const cols: Date[] = [];
    for (let i = 0; i < WINDOW_WEEKS; i++) {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i * 7);
      cols.push(d);
    }
    return cols;
  }, [windowStart]);

  /* ── navigation ──────────────────────────────────────────────────────── */
  const handlePrev = () =>
    setWindowStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - WINDOW_WEEKS * 7); return d; });
  const handleNext = () =>
    setWindowStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + WINDOW_WEEKS * 7); return d; });

  /* ── percentage helper ───────────────────────────────────────────────── */
  const toPercent = (dateStr: string) => {
    const ms = new Date(dateStr).getTime();
    const startMs = windowStart.getTime();
    const endMs = startMs + WINDOW_WEEKS * 7 * 24 * 3600 * 1000;
    if (ms <= startMs) return 0;
    if (ms >= endMs) return 100;
    return ((ms - startMs) / (endMs - startMs)) * 100;
  };



  /* ── filter ──────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const startMs = windowStart.getTime();
    const endMs = windowEnd.getTime();
    return projects
      .filter(p => {
        if ((p.status === "Scheduled" || p.status === "Upcoming") && !filterScheduled) return false;
        if (p.status === "Running" && !filterRunning) return false;
        if (p.status === "Completed") return false; // never show completed here
        // must overlap with window
        const ps = new Date(p.startDate).getTime();
        const pe = new Date(p.endDate).getTime();
        return ps <= endMs && pe >= startMs;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [projects, windowStart, windowEnd, filterScheduled, filterRunning]);

  /* ─── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col bg-[var(--dash-bg-card)] rounded-md border border-[var(--dash-border-subtle)] shadow-sm overflow-hidden text-[var(--dash-text-heading)]">

      {/* ── Controls header ─────────────────────────────────────────────── */}
      <div className="flex-none p-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--dash-text-heading)]">Project Timeline</h2>
            <p className="text-sm text-[var(--dash-text-muted)] font-medium">
              {formatFullDate(windowStart)} — {formatFullDate(windowEnd)} ({WINDOW_WEEKS} Weeks)
            </p>
          </div>

          {/* Prev / Next navigation */}
          <div className="flex items-center gap-3 bg-[var(--dash-bg-input)] px-3 py-1.5 rounded-lg border border-[var(--dash-border-subtle)] shadow-sm">
            <button onClick={handlePrev} title="Previous 12 Weeks" className="hover:text-blue-500 cursor-pointer p-0.5 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-bold text-[var(--dash-text-muted)] uppercase tracking-wider select-none">
              Previous / Next
            </span>
            <button onClick={handleNext} title="Next 12 Weeks" className="hover:text-blue-500 cursor-pointer p-0.5 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Filter toggles — Scheduled + Running only (no Completed) */}
        <div className="flex items-center gap-4 mt-6 pb-2">
          <span className="text-[10px] font-bold text-[var(--dash-text-muted)] uppercase tracking-wider">Filter:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterScheduled(v => !v)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${filterScheduled
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : "bg-transparent text-[var(--dash-text-muted)] border-[var(--dash-border)] hover:border-purple-500/20 hover:text-purple-400"
                }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setFilterRunning(v => !v)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${filterRunning
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-transparent text-[var(--dash-text-muted)] border-[var(--dash-border)] hover:border-green-500/20 hover:text-green-400"
                }`}
            >
              Running
            </button>
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="relative min-w-[900px] pr-8 pl-6">

          {/* Sticky header row with week labels */}
          <div className="sticky top-0 z-30 grid grid-cols-[220px_1fr] bg-[var(--dash-bg-card)] border-b border-t border-[var(--dash-border-subtle)] shadow-xs">
            <div className="p-4 pl-0 text-[10px] uppercase font-bold text-[var(--dash-text-faint)] border-r border-[var(--dash-border-subtle)]">
              Project / Client
            </div>
            <div className="grid grid-cols-12">
              {columns.map((colDate, idx) => (
                <div
                  key={idx}
                  className="relative py-4 text-center text-[10px] text-[var(--dash-text-muted)] font-bold tracking-widest uppercase flex items-center justify-center h-full"
                >
                  {getWeekLabel(colDate)}
                  {idx < columns.length - 1 && (
                    <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-[var(--dash-border-subtle)] pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data rows */}
          <div className="relative z-10">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-[var(--dash-text-faint)] italic text-[13px]">
                No projects match the selected filters or fall within this window.
              </div>
            ) : (
              filtered.map((project) => {
                const startPct = toPercent(project.startDate);
                const endPct = toPercent(project.endDate);
                const width = Math.max(0.5, endPct - startPct);
                const color =
                  project.status === "Running"
                    ? "#22c55e"
                    : project.status === "Scheduled" || project.status === "Upcoming"
                      ? "#a855f7"
                      : "#64748b";

                return (
                  <div
                    key={project.id}
                    className="grid grid-cols-[220px_1fr] items-stretch border-b border-[var(--dash-border-subtle)]/40 group"
                    style={{ minHeight: 64 }}
                  >
                    {/* Left label */}
                    <div className="sticky left-0 z-20 bg-white dark:bg-[var(--dash-bg-card)] p-4 pl-0 border-r border-[var(--dash-border-subtle)]">
                      <div className="text-[13px] font-semibold truncate">{project.name}</div>
                      <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5 truncate">
                        {project.client}  {" "}
                        <span className={
                          project.status === "Running"
                            ? "text-green-400 font-semibold"
                            : project.status === "Scheduled" || project.status === "Upcoming"
                              ? "text-purple-400 font-semibold"
                              : "text-gray-400 font-semibold"
                        }>
                          {project.status}
                        </span>
                      </div>
                    </div>

                    {/* Bar area */}
                    <div className="relative py-4">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none z-0">
                        {columns.map((_, i) => (
                          i < columns.length - 1 ? (
                            <div key={i} className="h-full relative flex items-center justify-end">
                              <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[var(--dash-border-subtle)]" />
                            </div>
                          ) : (
                            <div key={i} className="h-full" />
                          )
                        ))}
                      </div>

                      {/* Gantt bar */}
                      {startPct < 100 && endPct > 0 && (
                        <div
                          onMouseEnter={(e) => {
                            setTooltip({ project, x: e.clientX, y: (e.currentTarget as HTMLElement).getBoundingClientRect().top - 8 });
                          }}
                          onMouseMove={(e) => {
                            setTooltip({ project, x: e.clientX, y: (e.currentTarget as HTMLElement).getBoundingClientRect().top - 8 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          className="absolute h-8 rounded-md flex items-center px-3 text-[10px] font-bold text-white shadow-sm select-none z-10 transition-opacity duration-150 hover:opacity-90 cursor-default"
                          style={{
                            left: `${startPct}%`,
                            width: `${width}%`,
                            top: 12,
                            backgroundColor: color,
                          }}
                        >
                          <span className="truncate">{project.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>


      {/* ── Floating tooltip ─────────────────────────────────────────────── */}
      {tooltip && (() => {
        const p = tooltip.project;
        const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const isRunning = p.status === "Running";
        const statusColor = isRunning ? "text-green-400" : "text-purple-400";
        const dotColor = isRunning ? "bg-green-400" : "bg-purple-400";
        return (
          <div
            className="fixed z-[100] pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
          >
            <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border-subtle)] rounded-xl shadow-2xl px-4 py-3 min-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-[13px] font-bold text-[var(--dash-text-heading)]">{p.name}</span>
              </div>
              <div className="space-y-1 text-[11px] text-[var(--dash-text-muted)]">
                <p><span className="font-semibold">Client:</span> {p.client}</p>
                <p><span className="font-semibold">Status:</span> <span className={`font-medium ${statusColor}`}>{p.status}</span></p>
                <p><span className="font-semibold">Period:</span> {fmtDate(p.startDate)} — {fmtDate(p.endDate)}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
