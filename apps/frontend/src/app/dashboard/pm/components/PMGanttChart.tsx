"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProjectTimeline, getResourceTimeline, getProjects, TimelineItem } from "@/lib/api";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatFullDate = (d: Date) => {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
};

const getWeekLabel = (d: Date) => {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
};

export default function PMTimelineView() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"Projects" | "Resources">(
    "Projects",
  );
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectNameToId, setProjectNameToId] = useState<
    Record<string, number>
  >({});

  const [windowStart, setWindowStart] = useState(() => getMonday(new Date()));

  const [filterScheduled, setFilterScheduled] = useState(true);
  const [filterRunning, setFilterRunning] = useState(true);
  const [filterCompleted, setFilterCompleted] = useState(false);

  const windowEnd = useMemo(() => {
    const end = new Date(windowStart);
    end.setDate(end.getDate() + 12 * 7 - 1);
    return end;
  }, [windowStart]);

  const handlePrev = () => {
    setWindowStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 12 * 7);
      return d;
    });
  };

  const handleNext = () => {
    setWindowStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 12 * 7);
      return d;
    });
  };

  const columns = useMemo(() => {
    const cols: Date[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i * 7);
      cols.push(d);
    }
    return cols;
  }, [windowStart]);

  const navigateByName = (projectName: string) => {
    const id = projectNameToId[projectName];
    if (id) {
      router.push(`/project/${id}`);
    }
  };

  const getWindowPercentage = (dateString: string, start: Date): number => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 0;
    const startMs = start.getTime();

    const endMs = startMs + 12 * 7 * 24 * 60 * 60 * 1000;
    const currentMs = date.getTime();

    if (currentMs <= startMs) return 0;
    if (currentMs >= endMs) return 100;

    return ((currentMs - startMs) / (endMs - startMs)) * 100;
  };

  const organizeBars = (bars: any[]) => {
    const sorted = [...bars].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    const levels: any[][] = [];
    sorted.forEach((bar) => {
      let assignedLevel = 0;
      const barStart = new Date(bar.startDate).getTime();
      for (let i = 0; i < levels.length; i++) {
        const lastBarInLevel = levels[i][levels[i].length - 1];
        if (barStart >= new Date(lastBarInLevel.endDate).getTime()) {
          assignedLevel = i;
          break;
        }
        assignedLevel = i + 1;
      }
      if (!levels[assignedLevel]) levels[assignedLevel] = [];
      levels[assignedLevel].push({ ...bar, level: assignedLevel });
    });
    return { flatBars: levels.flat(), totalLevels: levels.length };
  };

  useEffect(() => {
    getProjects()
      .then((projects) => {
        const map: Record<string, number> = {};
        projects.forEach((p) => {
          map[p.projectName] = p.projectId;
        });
        setProjectNameToId(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result =
          viewMode === "Projects"
            ? await getProjectTimeline()
            : await getResourceTimeline();
        const getStatusRank = (status?: string) => {
          if (status === "Completed" || status === "3") return 1;
          if (status === "Running" || status === "2") return 2;
          if (status === "Scheduled" || status === "1") return 3;
          return 4;
        };

        const getResourceRank = (bars: any[]) => {
          if (!bars || bars.length === 0) return 4;
          const statuses = bars.map((b) => b.status);
          const hasRunning = statuses.some((s) => s === "Running" || s === "2");
          if (hasRunning) return 2;
          const hasCompleted = statuses.some((s) => s === "Completed" || s === "3");
          if (hasCompleted) return 1;
          const hasScheduled = statuses.some((s) => s === "Scheduled" || s === "1");
          if (hasScheduled) return 3;
          return 4;
        };

        const sortedResult = result.sort((a, b) => {
          const rankA =
            viewMode === "Projects"
              ? getStatusRank(a.bars[0]?.status)
              : getResourceRank(a.bars);
          const rankB =
            viewMode === "Projects"
              ? getStatusRank(b.bars[0]?.status)
              : getResourceRank(b.bars);

          if (rankA !== rankB) {
            return rankA - rankB;
          }

          const earliestA =
            a.bars.length > 0
              ? Math.min(
                  ...a.bars.map((bar) => new Date(bar.startDate).getTime()),
                )
              : Infinity;
          const earliestB =
            b.bars.length > 0
              ? Math.min(
                  ...b.bars.map((bar) => new Date(bar.startDate).getTime()),
                )
              : Infinity;
          return earliestA - earliestB;
        });
        setTimelineData(sortedResult);
      } catch {
        setTimelineData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [viewMode]);

  const projectPalette = useMemo(() => {
    const palette: { [key: string]: string } = {};

    // 1. Ambil nama project yang MINIMAL punya satu bar aktif (belum Completed)
    const activeProjectNames = Array.from(
      new Set(
        timelineData.flatMap((item) =>
          item.bars
            .filter((bar: any) => {
              const isBarCompleted =
                bar.status === "Completed" ||
                bar.status === "3" ||
                bar.projectStatus === "Completed" ||
                bar.projectStatus === "3";
              return !isBarCompleted;
            })
            .map((bar: any) => bar.title),
        ),
      ),
    );

    // Generate color pallete for only active projects
    const total = activeProjectNames.length;
    activeProjectNames.forEach((name, index) => {
      const hueBase = 230;
      const hueRange = 100;
      const hue = total > 1 ? hueBase - index * (hueRange / (total - 1)) : 230;
      const lightness = index % 2 === 0 ? "50%" : "40%";
      palette[name] = `hsl(${hue}, 75%, ${lightness})`;
    });
    return palette;
  }, [timelineData]);

  const isStatusChecked = (statusStr: string) => {
    if (statusStr === "Scheduled" || statusStr === "1") return filterScheduled;
    if (statusStr === "Running" || statusStr === "2") return filterRunning;
    if (statusStr === "Completed" || statusStr === "3") return filterCompleted;
    return true;
  };

  const filteredTimelineData = useMemo(() => {
    const startWindowMs = windowStart.getTime();
    const endWindowMs = windowEnd.getTime();

    const getVisibleAndInWindowBars = (bars: any[]) => {
      return bars.filter((bar) => {
        if (!isStatusChecked(bar.status)) return false;

        const barStartMs = new Date(bar.startDate).getTime();
        const barEndMs = new Date(bar.endDate).getTime();

        return barStartMs <= endWindowMs && barEndMs >= startWindowMs;
      });
    };

    if (viewMode === "Projects") {
      return (
        timelineData
          .map((item) => ({
            ...item,
            bars: getVisibleAndInWindowBars(item.bars),
          }))
          .filter((item) => item.bars.length > 0)
      );
    } else {
      return (
        timelineData
          .map((item) => ({
            ...item,
            bars: getVisibleAndInWindowBars(item.bars),
          }))
          .filter((item) => item.bars.length > 0)
      );
    }
  }, [
    timelineData,
    viewMode,
    filterScheduled,
    filterRunning,
    filterCompleted,
    windowStart,
    windowEnd,
  ]);

  const renderProjectSubLabel = (item: TimelineItem) => {
    if (viewMode !== "Projects") {
      return (
        <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5 truncate">
          {item.subLabel}
        </div>
      );
    }

    const status = item.bars[0]?.status;
    let statusText = "Scheduled";
    let statusColorClass = "text-purple-400";

    if (status === "Running" || status === "2") {
      statusText = "Running";
      statusColorClass = "text-green-400";
    } else if (status === "Completed" || status === "3") {
      statusText = "Completed";
      statusColorClass = "text-gray-400";
    }

    return (
      <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5 truncate">
        {item.subLabel} -{" "}
        <span className={`${statusColorClass} font-semibold`}>
          {statusText}
        </span>
      </div>
    );
  };

  const [tooltip, setTooltip] = useState<{
    bar: any;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const handleBarHover = (e: React.MouseEvent, bar: any, label: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      bar,
      label,
      x: e.clientX,
      y: rect.top - 8,
    });
  };
  

  return (
    <div className="flex flex-col h-[650px] bg-[var(--dash-bg-card)] rounded-md border border-[var(--dash-border-subtle)] shadow-sm mt-6 overflow-hidden text-[var(--dash-text-heading)]">
      {/* Title, Range, Navigation and View Switch controls */}
      <div className="flex-none p-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--dash-text-heading)]">
              Project Timeline
            </h2>
            <p className="text-sm text-[var(--dash-text-muted)] font-medium">
              {formatFullDate(windowStart)} — {formatFullDate(windowEnd)} (12
              Weeks)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Prev / Next 12 Weeks Navigation */}
            <div className="flex items-center gap-3 bg-[var(--dash-bg-input)] px-3 py-1.5 rounded-lg border border-[var(--dash-border-subtle)] shadow-sm">
              <button
                onClick={handlePrev}
                title="Previous 12 Weeks"
                className="hover:text-blue-500 cursor-pointer p-0.5 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[10px] font-bold text-[var(--dash-text-muted)] uppercase tracking-wider select-none">
                Previous/Next
              </span>
              <button
                onClick={handleNext}
                title="Next 12 Weeks"
                className="hover:text-blue-500 cursor-pointer p-0.5 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Project / Resource switch */}
            <div className="flex bg-[var(--dash-bg-input)] p-1 rounded-lg border border-[var(--dash-border-subtle)] shadow-sm">
              <button
                onClick={() => setViewMode("Projects")}
                className={`px-5 py-1.5 rounded-l-md text-[11px] font-semibold transition-all cursor-pointer ${
                  viewMode === "Projects"
                    ? "bg-[#2B7FFC] text-white shadow-md"
                    : "text-gray-400"
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setViewMode("Resources")}
                className={`px-5 py-1.5 rounded-r-md text-[11px] font-semibold transition-all cursor-pointer ${
                  viewMode === "Resources"
                    ? "bg-[#2B7FFC] text-white shadow-md"
                    : "text-gray-400"
                }`}
              >
                Resources
              </button>
            </div>
          </div>
        </div>

        {/* Filter Status Toggles */}
        <div className="flex items-center gap-4 mt-6 pb-2">
          <span className="text-[10px] font-bold text-[var(--dash-text-muted)] uppercase tracking-wider">
            Filter:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterScheduled((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${
                filterScheduled
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : "bg-transparent text-[var(--dash-text-muted)] border-[var(--dash-border)] hover:border-purple-500/20 hover:text-purple-400"
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setFilterRunning((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${
                filterRunning
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-transparent text-[var(--dash-text-muted)] border-[var(--dash-border)] hover:border-green-500/20 hover:text-green-400"
              }`}
            >
              Running
            </button>
            <button
              onClick={() => setFilterCompleted((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${
                filterCompleted
                  ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  : "bg-transparent text-[var(--dash-text-muted)] border-[var(--dash-border)] hover:border-gray-500/20 hover:text-gray-400"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Grid Content */}
      <div className="flex-1 overflow-auto">
        <div className="relative min-w-[1000px] pr-8 pl-6">
          {/* Header Row showing 12 weeks */}
          <div className="sticky top-0 z-30 grid grid-cols-[260px_1fr] bg-[var(--dash-bg-card)] border-b border-t border-[var(--dash-border-subtle)] shadow-xs">
            <div className="p-4 pl-0 text-[10px] uppercase font-bold text-[var(--dash-text-faint)] border-r border-[var(--dash-border-subtle)]">
              {viewMode === "Projects" ? "Project / Client" : "Staff / Role"}
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

          <div className="relative">
            {/* Rows of Timeline data */}
            <div className="relative z-10">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--dash-text-faint)] gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Loading timeline data...</span>
                </div>
              ) : filteredTimelineData.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-[var(--dash-text-faint)] italic text-[13px]">
                  No items match the selected status filters.
                </div>
              ) : (
                filteredTimelineData.map((item, idx) => {
                  const visibleBars = item.bars.filter((bar) =>
                    isStatusChecked(bar.status),
                  );
                  const { flatBars, totalLevels } = organizeBars(visibleBars);
                  const dynamicRowHeight =
                    totalLevels > 0 ? totalLevels * 42 + 20 : 64;

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[260px_1fr] items-stretch border-b border-[var(--dash-border-subtle)]/40 group"
                      style={{ minHeight: `${dynamicRowHeight}px` }}
                    >
                      <div
                        onClick={() => {
                          if (viewMode === "Projects") {
                            navigateByName(item.label);
                          }
                        }}
                        className={`sticky left-0 z-20 bg-white dark:bg-[var(--dash-bg-card)] p-4 pl-0 border-r border-[var(--dash-border-subtle)] ${
                          viewMode === "Projects" ? "cursor-pointer" : ""
                        }`}
                      >
                        <div className="text-[13px] font-semibold truncate">
                          {item.label}
                        </div>
                        {renderProjectSubLabel(item)}
                      </div>

                      {/* Right Gantt bars container */}
                      <div className="relative py-4">
                        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none z-0">
                          {columns.map((colDate, i) => {
                            const lineTimeMs =
                              colDate.getTime() + 7 * 24 * 60 * 60 * 1000;

                            const isLineCovered =
                              flatBars && flatBars.length > 0
                                ? flatBars.some((bar: any) => {
                                    const barStartMs = new Date(
                                      bar.startDate,
                                    ).getTime();
                                    const barEndMs = new Date(
                                      bar.endDate,
                                    ).getTime();

                                    return (
                                      lineTimeMs > barStartMs &&
                                      lineTimeMs < barEndMs
                                    );
                                  })
                                : false;

                            if (i === columns.length - 1) {
                              return (
                                <div key={i} className="h-full relative" />
                              );
                            }

                            return (
                              <div
                                key={i}
                                className="h-full relative flex items-center justify-end"
                              >
                                {!isLineCovered && (
                                  <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[var(--dash-border-subtle)]" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Layer Bar Gantt */}
                        {flatBars.map((bar: any, bIdx: number) => {
                          const start = getWindowPercentage(
                            bar.startDate,
                            windowStart,
                          );
                          const end = getWindowPercentage(
                            bar.endDate,
                            windowStart,
                          );
                          if (start >= 100 || end <= 0) return null;
                          const width = end - start;
                          if (width <= 0) return null;
                          const isBarCompleted =
                            bar.status === "Completed" ||
                            bar.status === "3" ||
                            bar.projectStatus === "Completed" ||
                            bar.projectStatus === "3";

                          const barColor = isBarCompleted
                            ? "#6b7280" // Abu-abu kalau sudah selesai
                            : viewMode === "Projects"
                              ? projectPalette[bar.title] || "#3B82F6" // Warna default/palette untuk tab Project
                              : bar.status === "Scheduled"
                                ? "#a855f7" // Ungu (Tailwind purple-500) untuk Scheduled
                                : "#22c55e"; // Hijau (Tailwind green-500) untuk Running

                          return (
                            <div
                              key={bIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateByName(bar.title);
                              }}
                              onMouseEnter={(e) =>
                                handleBarHover(e, bar, item.label)
                              }
                              onMouseMove={(e) =>
                                handleBarHover(e, bar, item.label)
                              }
                              onMouseLeave={() => setTooltip(null)}
                              className={`absolute h-8 rounded-md flex items-center px-3 text-[10px] font-bold text-white shadow-sm cursor-pointer select-none transition-all duration-300 ease-in-out z-10 ${
                                isBarCompleted ? "opacity-60" : ""
                              }`}
                              style={{
                                left: `${start}%`,
                                width: `${Math.max(1, width)}%`,
                                backgroundColor: barColor,
                                top: `${12 + bar.level * 42}px`,
                              }}
                            >
                              <span className="truncate">{bar.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Color Palette Legend */}
      {viewMode === "Projects" && (
        <div className="flex-none p-6 border-t bg-gray-600/10 dark:bg-black/30 border-gray-100 dark:border-gray-700/60">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-7 gap-y-3">
            {Object.entries(projectPalette).map(([name, color]) => (
              <div
                key={name}
                className="flex items-center gap-2 overflow-hidden"
              >
                <div
                  className="flex-none w-4 h-4 rounded-xs"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-[13px] text-gray-500 dark:text-white truncate"
                  title={name}
                >
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pop-up Floating Tooltip */}
      {tooltip &&
        (() => {
          const formattedStart = new Date(
            tooltip.bar.startDate,
          ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const formattedEnd = new Date(tooltip.bar.endDate).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" },
          );

          let statusText = "Scheduled";
          let statusColor = "bg-purple-400 text-purple-400";
          if (tooltip.bar.status === "Running" || tooltip.bar.status === "2") {
            statusText = "Running";
            statusColor = "bg-green-400 text-green-400";
          } else if (
            tooltip.bar.status === "Completed" ||
            tooltip.bar.status === "3"
          ) {
            statusText = "Completed";
            statusColor = "bg-gray-400 text-gray-400";
          }

          return (
            <div
              className="fixed z-[100] pointer-events-none"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border-subtle)] rounded-xl shadow-2xl px-4 py-3 min-w-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full ${statusColor.split(" ")[0]}`}
                  />
                  <span className="text-[13px] font-bold text-[var(--dash-text-heading)]">
                    {tooltip.bar.title}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-[var(--dash-text-muted)]">
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    <span
                      className={`font-medium ${statusColor.split(" ")[1]}`}
                    >
                      {statusText}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Period:</span>{" "}
                    {formattedStart} — {formattedEnd}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
