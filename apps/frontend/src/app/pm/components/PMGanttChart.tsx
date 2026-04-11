"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProjectTimeline, getResourceTimeline, getProjects, TimelineItem } from "@/lib/api";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function PMTimelineView() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"Projects" | "Resources">(
    "Projects",
  );
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [projectNameToId, setProjectNameToId] = useState<Record<string, number>>({});

  const navigateByName = (projectName: string) => {
    const id = projectNameToId[projectName];
    if (id) {
      router.push(`/pm/projects/${id}`);
    }
  };

  const getYearPercentage = (dateString: string, year: number): number => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 0;
    const startOfYear = new Date(year, 0, 1).getTime();
    const endOfYear = new Date(year, 11, 31).getTime();
    return Math.max(
      0,
      Math.min(
        100,
        ((date.getTime() - startOfYear) / (endOfYear - startOfYear)) * 100,
      ),
    );
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
        projects.forEach((p) => { map[p.projectName] = p.projectId; });
        setProjectNameToId(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = viewMode === "Projects"
          ? await getProjectTimeline()
          : await getResourceTimeline();

        const sortedResult = result.sort((a, b) => {
          const earliestA =
            a.bars.length > 0
              ? Math.min(
                ...a.bars.map((bar) =>
                  new Date(bar.startDate).getTime(),
                ),
              )
              : Infinity;
          const earliestB =
            b.bars.length > 0
              ? Math.min(
                ...b.bars.map((bar) =>
                  new Date(bar.startDate).getTime(),
                ),
              )
              : Infinity;
          return earliestA - earliestB;
        });

        setTimelineData(sortedResult);
      } catch (error) {
        setTimelineData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [viewMode]);

  const projectPalette = useMemo(() => {
    const palette: { [key: string]: string } = {};
    const uniqueNames = Array.from(
      new Set(
        timelineData.flatMap((item) => item.bars.map((bar: any) => bar.title)),
      ),
    );

    const total = uniqueNames.length;
    uniqueNames.forEach((name, index) => {
      const hueBase = 230;
      const hueRange = 100;
      const hue = total > 1 ? hueBase - index * (hueRange / (total - 1)) : 230;
      const lightness = index % 2 === 0 ? "50%" : "40%";
      palette[name] = `hsl(${hue}, 75%, ${lightness})`;
    });
    return palette;
  }, [timelineData]);

  return (
    <div className="flex flex-col h-[500px] bg-[var(--dash-bg-card)] rounded-xl border border-[var(--dash-border-subtle)] shadow-sm mt-6 overflow-hidden text-[var(--dash-text-heading)]">
      <div className="flex-none p-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Timeline View
            </h2>
            <div className="flex items-center gap-3 bg-[var(--dash-bg-input)] px-3 py-1 rounded-lg border border-[var(--dash-border-subtle)]">
              <button
                onClick={() => setCurrentYear((prev) => prev - 1)}
                className="hover:text-blue-500"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold w-12 text-center">
                {currentYear}
              </span>
              <button
                onClick={() => setCurrentYear((prev) => prev + 1)}
                className="hover:text-blue-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex bg-[var(--dash-bg-input)] p-1 rounded-lg border border-[var(--dash-border-subtle)]">
            <button
              onClick={() => setViewMode("Projects")}
              className={`px-5 py-1.5 rounded-l-md text-[11px] font-semibold transition-all ${viewMode === "Projects" ? "bg-[#2B7FFC] text-white shadow-md" : "text-gray-400"}`}
            >
              Projects
            </button>
            <button
              onClick={() => setViewMode("Resources")}
              className={`px-5 py-1.5 rounded-r-md text-[11px] font-semibold transition-all ${viewMode === "Resources" ? "bg-[#2B7FFC] text-white shadow-md" : "text-gray-400"}`}
            >
              Resources
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border-t border-[var(--dash-border-subtle)]">
        <div className="relative">
          <div className="sticky top-0 z-30 grid grid-cols-[260px_1fr] bg-[var(--dash-bg-card)] border-b border-[var(--dash-border-subtle)]">
            <div className="p-4 text-[10px] uppercase font-bold text-[var(--dash-text-faint)] border-r border-[var(--dash-border-subtle)]">
              {viewMode === "Projects" ? "Project / Client" : "Staff / Role"}
            </div>
            <div className="grid grid-cols-12">
              {MONTHS.map((m) => (
                <div
                  key={m}
                  className="py-4 text-center text-[10px] text-[var(--dash-text-muted)] font-bold tracking-widest uppercase"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 grid grid-cols-[260px_1fr] pointer-events-none z-0">
              <div className="border-r border-[var(--dash-border-subtle)]" />
              <div className="grid grid-cols-12">
                {MONTHS.map((_, i) => (
                  <div
                    key={i}
                    className="border-r border-gray-100 dark:border-gray-700/20"
                  />
                ))}
              </div>
            </div>

            <div className="relative z-10">
              {timelineData.map((item, idx) => {
                const { flatBars, totalLevels } = organizeBars(item.bars);
                const dynamicRowHeight =
                  totalLevels > 0 ? totalLevels * 42 + 20 : 64;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[260px_1fr] items-stretch border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group"
                    style={{ minHeight: `${dynamicRowHeight}px` }}
                  >
                    <div
                      onClick={() => {
                        if (viewMode === "Projects") {
                          navigateByName(item.label);
                        }
                      }}
                      className={`sticky left-0 z-20 bg-white dark:bg-[var(--dash-bg-card)] p-4 border-r border-gray-100 dark:border-gray-700/50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] ${viewMode === "Projects" ? "cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/10" : ""}`}
                    >
                      <div
                        className={`text-[13px] font-semibold truncate ${viewMode === "Projects" ? "group-hover:text-[#2B7FFC]" : ""}`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[10px] text-[var(--dash-text-muted)] mt-0.5 truncate">
                        {item.subLabel}
                      </div>
                    </div>

                    <div className="relative py-4">
                      {flatBars.map((bar: any, bIdx: number) => {
                        const start = getYearPercentage(
                          bar.startDate,
                          currentYear,
                        );
                        const end = getYearPercentage(bar.endDate, currentYear);
                        if (start >= 100 || end <= 0) return null;
                        const barColor = projectPalette[bar.title] || "#3B82F6";

                        return (
                          <div
                            key={bIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateByName(bar.title);
                            }}
                            className="absolute h-8 rounded-md flex items-center px-3 text-[10px] font-bold text-white shadow-sm transition-all hover:scale-[1.02] hover:brightness-110 hover:z-50 cursor-pointer"
                            style={{
                              left: `${start}%`,
                              width: `${Math.max(1, end - start)}%`,
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
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-none p-6 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-700/60">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-7 gap-y-3">
          {Object.entries(projectPalette).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2 overflow-hidden">
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
    </div>
  );
}
