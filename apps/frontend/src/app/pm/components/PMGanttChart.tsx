"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"Projects" | "Resources">(
    "Projects",
  );
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
        if (barStart > new Date(lastBarInLevel.endDate).getTime()) {
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
    const fetchData = async () => {
      try {
        setLoading(true);
        const endpoint = viewMode.toLowerCase().trim().split(" ")[0];
        const response = await fetch(
          `http://localhost:5103/api/timeline/${endpoint}`,
        );
        const result = await response.json();
        setTimelineData(result);
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
    uniqueNames.forEach((name, index) => {
      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
      palette[name] = colors[index % colors.length];
    });
    return palette;
  }, [timelineData]);

  return (
    /* Container Utama: Tinggi pas layar laptop (100vh) dikurangi margin */
    <div className="flex flex-col h-[calc(100vh-40px)] bg-white dark:bg-[#2A2B2E] rounded-xl border border-gray-800/50 dark:border-gray-700 shadow-sm mt-6 overflow-hidden text-gray-900 dark:text-white">
      {/* 1. Header & Navigasi (Tetap di Atas / Fixed) */}
      <div className="flex-none p-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Timeline View
            </h2>

            {/* Navigasi Tahun di Tengah Atas */}
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
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

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("Projects")}
              className={`px-5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${viewMode === "Projects" ? "bg-white dark:bg-gray-700 text-[#2B7FFC] shadow-sm" : "text-gray-500"}`}
            >
              Projects
            </button>
            <button
              onClick={() => setViewMode("Resources")}
              className={`px-5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${viewMode === "Resources" ? "bg-[#2B7FFC] text-white shadow-md" : "text-gray-400"}`}
            >
              Resources
            </button>
          </div>
        </div>
      </div>

      {/* 2. Area Timeline (Scrollable Area) */}
      <div className="flex-1 overflow-auto border-t border-gray-100 dark:border-gray-700/50">
        <div className="min-w-[1200px] relative">
          {/* Header Bulan (Sticky di atas area scroll) */}
          <div className="sticky top-0 z-30 grid grid-cols-[260px_1fr] bg-white dark:bg-[#2A2B2E] border-b border-gray-100 dark:border-gray-700">
            <div className="p-4 text-[10px] uppercase font-bold text-gray-400 border-r border-gray-100 dark:border-gray-700/50">
              {viewMode === "Projects" ? "Project / Client" : "Staff / Role"}
            </div>
            <div className="grid grid-cols-12">
              {MONTHS.map((m) => (
                <div
                  key={m}
                  className="py-4 text-center text-[10px] text-gray-500 font-bold tracking-widest uppercase"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Konten Timeline */}
          <div className="relative">
            {/* Grid Lines (Background) */}
            <div className="absolute inset-0 grid grid-cols-[260px_1fr] pointer-events-none z-0">
              <div className="border-r border-gray-100 dark:border-gray-700/30" />
              <div className="grid grid-cols-12">
                {MONTHS.map((_, i) => (
                  <div
                    key={i}
                    className="border-r border-gray-100 dark:border-gray-700/20"
                  />
                ))}
              </div>
            </div>

            {/* Baris Data */}
            <div className="relative z-10">
              {timelineData.map((item, idx) => {
                const { flatBars, totalLevels } = organizeBars(item.bars);
                const dynamicRowHeight =
                  totalLevels > 0 ? totalLevels * 42 + 20 : 64;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[260px_1fr] items-stretch border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                    style={{ minHeight: `${dynamicRowHeight}px` }}
                  >
                    {/* Sticky Sidebar (Client Name) */}
                    <div className="sticky left-0 z-20 bg-white dark:bg-[#2A2B2E] p-4 border-r border-gray-100 dark:border-gray-700/50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      <div className="text-[13px] font-semibold truncate group-hover:text-[#2B7FFC]">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {item.subLabel}
                      </div>
                    </div>

                    {/* Bars Area */}
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
                            className="absolute h-8 rounded-md flex items-center px-3 text-[10px] font-bold text-white shadow-sm transition-all hover:scale-[1.02] hover:z-50"
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

      {/* 3. Legend (Tetap di Bawah / Fixed) */}
      <div className="flex-none p-6 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-700/60">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Client:
          </span>
          {Object.entries(projectPalette).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-xs"
                style={{ backgroundColor: color }}
              />
              <span className="text-[13px] text-gray-500 dark:text-white">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
