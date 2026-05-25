"use client";

import React, { useState, useMemo, useRef } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { BackendProject, BackendProjectMember } from "../../../../lib/api";

type ViewMode = "week" | "month";

type GanttProps = {
  project: BackendProject;
  isEditMode: boolean;
  onReplaceClick: (member: BackendProjectMember) => void;
};

/* ── Helper functions ── */

const formatShortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);

const formatFullDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);

const toMonday = (d: Date) => {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
};

const toStartOfMonth = (d: Date) => {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

const diffDays = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

const ROLE_COLORS: Record<string, string> = {
  "pm": "#8b5cf6",
  "architect": "#f59e0b",
  "senior dev": "#3b82f6",
  "junior dev": "#22d3ee",
  "senior ba": "#f97316",
  "junior ba": "#a78bfa",
};

const getRoleColor = (role: string) =>
  ROLE_COLORS[role.toLowerCase()] ?? "#6b7280";

export default function ProjectGanttChart({ project, isEditMode, onReplaceClick }: GanttProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSwap = project.projectStatus === 1 || project.projectStatus === 2;

  /* ── Derive time boundaries ── */
  const projStart = useMemo(() => new Date(project.estimatedStartDate), [project.estimatedStartDate]);
  const projEnd = useMemo(() => {
    const e = project.estimatedEndDate ? new Date(project.estimatedEndDate) : addDays(projStart, 365);
    return e;
  }, [project.estimatedEndDate, projStart]);

  /* ── Build time columns (weeks or months) ── */
  const columns = useMemo(() => {
    const cols: { start: Date; end: Date; label: string }[] = [];

    if (viewMode === "week") {
      let cursor = toMonday(projStart);
      const endLimit = addDays(projEnd, 7);
      while (cursor < endLimit) {
        const wEnd = addDays(cursor, 6);
        cols.push({
          start: new Date(cursor),
          end: wEnd,
          label: formatShortDate(cursor),
        });
        cursor = addDays(cursor, 7);
      }
    } else {
      let cursor = toStartOfMonth(projStart);
      const endLimit = addMonths(projEnd, 1);
      while (cursor < endLimit) {
        const mEnd = addDays(addMonths(cursor, 1), -1);
        cols.push({
          start: new Date(cursor),
          end: mEnd,
          label: new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(cursor),
        });
        cursor = addMonths(cursor, 1);
      }
    }

    return cols;
  }, [viewMode, projStart, projEnd]);

  const totalDays = useMemo(() => {
    if (columns.length === 0) return 1;
    return Math.max(1, diffDays(columns[0].start, addDays(columns[columns.length - 1].end, 1)));
  }, [columns]);

  const gridStart = useMemo(() => (columns.length > 0 ? columns[0].start : projStart), [columns, projStart]);

  /* ── Group members by role ── */
  const roleGroups = useMemo(() => {
    const all = project.members || [];
    const map = new Map<string, BackendProjectMember[]>();
    for (const m of all) {
      const role = m.role || "Unassigned";
      if (!map.has(role)) map.set(role, []);
      map.get(role)!.push(m);
    }
    // Sort: active first, then completed
    for (const [, members] of map) {
      members.sort((a, b) => {
        if (a.status === "Assigned" && b.status !== "Assigned") return -1;
        if (a.status !== "Assigned" && b.status === "Assigned") return 1;
        return 0;
      });
    }
    return map;
  }, [project.members]);

  /* ── Today marker ── */
  const todayPct = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = diffDays(gridStart, today);
    return (d / totalDays) * 100;
  }, [gridStart, totalDays]);

  const showToday = todayPct >= 0 && todayPct <= 100;

  const COL_WIDTH = viewMode === "week" ? 100 : 140;
  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 200;

  /* ── Tooltip state ── */
  const [tooltip, setTooltip] = useState<{
    member: BackendProjectMember;
    x: number;
    y: number;
  } | null>(null);

  const handleBarHover = (e: React.MouseEvent, member: BackendProjectMember) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      member,
      x: e.clientX,
      y: rect.top - 8,
    });
  };

  /* ── Scroll helpers ── */
  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -COL_WIDTH * 3, behavior: "smooth" });
  };
  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: COL_WIDTH * 3, behavior: "smooth" });
  };

  if ((project.members || []).length === 0) return null;

  return (
    <section className="mt-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">
          Team Timeline
        </h2>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg overflow-hidden">
            {(["week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 text-[12px] font-semibold transition-all capitalize ${
                  viewMode === mode
                    ? "bg-[#3b82f6] text-white"
                    : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)]"
                }`}
              >
                {mode === "week" ? "Per Week" : "Per Month"}
              </button>
            ))}
          </div>
          {/* Scroll buttons */}
          <button onClick={scrollLeft} className="p-1.5 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={scrollRight} className="p-1.5 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 text-[11px] font-semibold text-[var(--dash-text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          Active
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#6b7280]" />
          Completed / Replaced
        </div>
        {showToday && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-500" style={{ display: "inline-block" }} />
            Today
          </div>
        )}
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="flex">
          {/* ── Sticky left labels ── */}
          <div className="shrink-0 border-r border-[var(--dash-border)]" style={{ width: LABEL_WIDTH }}>
            {/* Header spacer */}
            <div className="h-10 bg-[var(--dash-bg-input)] border-b border-[var(--dash-border)]" />
            {/* Role groups */}
            {[...roleGroups.entries()].map(([role, members]) => (
              <div key={role}>
                {/* Role header */}
                <div
                  className="px-3 flex items-center gap-2 border-b border-[var(--dash-border)] bg-[var(--dash-bg-input)]"
                  style={{ height: 32 }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getRoleColor(role) }}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)] truncate">
                    {role}
                  </span>
                  <span className="text-[10px] text-[var(--dash-text-faint)]">({members.length})</span>
                </div>
                {/* Member rows */}
                {members.map((m) => (
                  <div
                    key={`${m.userId}-${m.status}`}
                    className="px-3 flex items-center justify-between gap-2 border-b border-[var(--dash-border)] group"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          m.status === "Assigned"
                            ? "bg-[#22c55e]/20 text-[#22c55e]"
                            : "bg-[#6b7280]/20 text-[#6b7280]"
                        }`}
                      >
                        {m.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[12px] font-semibold truncate ${
                          m.status === "Assigned" ? "text-[var(--dash-text-primary)]" : "text-[var(--dash-text-faint)] line-through"
                        }`}>
                          {m.userName}
                        </p>
                        <p className="text-[10px] text-[var(--dash-text-faint)] truncate">
                          {m.status === "Completed" && m.replacedByUserName
                            ? `→ ${m.replacedByUserName}`
                            : m.status}
                        </p>
                      </div>
                    </div>
                    {/* Replace button */}
                    {isEditMode && canSwap && m.status === "Assigned" && (
                      <button
                        onClick={() => onReplaceClick(m)}
                        title={`Replace ${m.userName}`}
                        className="p-1 rounded-md text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-all shrink-0 cursor-pointer shadow-sm"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── Scrollable time grid ── */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div className="relative" style={{ minWidth: columns.length * COL_WIDTH }}>
              {/* Column headers */}
              <div className="flex h-10 bg-[var(--dash-bg-input)] border-b border-[var(--dash-border)]">
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[11px] font-semibold text-[var(--dash-text-muted)] border-r border-[var(--dash-border)] last:border-r-0 shrink-0"
                    style={{ width: COL_WIDTH }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Rows with bars */}
              {[...roleGroups.entries()].map(([role, members]) => (
                <div key={role}>
                  {/* Role header row spacer */}
                  <div className="border-b border-[var(--dash-border)]" style={{ height: 32 }} />
                  {/* Member bars */}
                  {members.map((m) => {
                    const mStart = m.startDate ? new Date(m.startDate) : projStart;
                    const mEnd = m.endDate ? new Date(m.endDate) : projEnd;
                    const startDay = diffDays(gridStart, mStart);
                    const endDay = diffDays(gridStart, mEnd);
                    const leftPct = Math.max(0, (startDay / totalDays) * 100);
                    const widthPct = Math.max(1, Math.min(100 - leftPct, ((endDay - startDay) / totalDays) * 100));

                    const isActive = m.status === "Assigned";

                    return (
                      <div
                        key={`${m.userId}-${m.status}`}
                        className="relative border-b border-[var(--dash-border)]"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex">
                          {columns.map((_, ci) => (
                            <div
                              key={ci}
                              className="border-r border-[var(--dash-border)] last:border-r-0 shrink-0 h-full"
                              style={{ width: COL_WIDTH }}
                            />
                          ))}
                        </div>

                        {/* Bar */}
                        <div
                          className={`absolute top-2.5 rounded-md cursor-pointer transition-all hover:brightness-110 ${
                            isActive
                              ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a] shadow-sm shadow-green-500/20"
                              : "bg-gradient-to-r from-[#6b7280] to-[#4b5563] opacity-60"
                          }`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            height: ROW_HEIGHT - 20,
                            minWidth: 12,
                          }}
                          onMouseEnter={(e) => handleBarHover(e, m)}
                          onMouseMove={(e) => handleBarHover(e, m)}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white truncate">
                            {m.userName.split(" ")[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Today marker */}
              {showToday && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none"
                  style={{ left: `${todayPct}%` }}
                >
                  <div className="absolute -top-0 -left-[5px] w-3 h-3 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl shadow-2xl px-4 py-3 min-w-[220px]">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  tooltip.member.status === "Assigned" ? "bg-[#22c55e]" : "bg-[#6b7280]"
                }`}
              />
              <span className="text-[13px] font-bold text-[var(--dash-text-heading)]">
                {tooltip.member.userName}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-[var(--dash-text-muted)]">
              <p>
                <span className="font-semibold">Role:</span> {tooltip.member.role}
              </p>
              <p>
                <span className="font-semibold">Period:</span>{" "}
                {tooltip.member.startDate ? formatFullDate(new Date(tooltip.member.startDate)) : "Project start"}{" "}
                → {tooltip.member.endDate ? formatFullDate(new Date(tooltip.member.endDate)) : "Project end"}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                <span
                  className={
                    tooltip.member.status === "Assigned" ? "text-[#22c55e]" : "text-[#6b7280]"
                  }
                >
                  {tooltip.member.status}
                </span>
              </p>
              {tooltip.member.status === "Completed" && tooltip.member.replacedByUserName && (
                <p className="text-amber-400">
                  <span className="font-semibold">Replaced by:</span> {tooltip.member.replacedByUserName}
                </p>
              )}
              {tooltip.member.swapReason && (
                <p className="text-blue-400 italic">
                  <span className="font-semibold not-italic">Reason:</span> {tooltip.member.swapReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
