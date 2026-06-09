"use client";
import React, { useState, useEffect } from "react";
import PMStatCard from "@/app/dashboard/pm/components/PMStatCard";
import PMTimelineView from "@/app/dashboard/pm/components/PMGanttChart";
import DashboardHeader from "@/app/dashboard/pm/components/PMDashboardHeader";
import AppHeader from "@/components/AppHeader";
import {
  FolderKanban,
  CalendarClock,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getTimelineStats, TimelineStats } from "@/lib/api";

export default function PMDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<TimelineStats>({
    total: 0,
    onHold: 0,
    scheduled: 0,
    running: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await getTimelineStats();
      setStats(statsData);
    } catch (err: any) {
      setError("Error connecting to server.");
      console.error("Silent Catch:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <>
      <div className="p-8 max-w-full mx-auto w-full h-auto overflow-y-auto">
      <DashboardHeader />
      {error && (
        <div className="mb-8 flex items-center justify-between p-4 bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,2fr)_repeat(3,1fr)] gap-8">
        <PMStatCard title="Total Projects" value={stats.total} icon={<FolderKanban />} variant="premium" onClick={() => router.push("/project?filter=All")} />
        <PMStatCard title="Scheduled" value={stats.scheduled} icon={<CalendarClock />} variant="scheduled" onClick={() => router.push("/project?filter=Scheduled")} />
        <PMStatCard title="Running" value={stats.running} icon={<Users />} variant="running" onClick={() => router.push("/project?filter=Running")} />
        <PMStatCard title="Completed" value={stats.completed} icon={<CheckCircle2 />} variant="green" onClick={() => router.push("/project?filter=Completed")} />
      </div>

      <div className="mt-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-80 bg-white/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 animate-pulse">
            <p className="text-gray-500 dark:text-gray-400 italic">Connecting to database...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-80 bg-white/30 dark:bg-black/10 rounded-2xl border border-gray-200 dark:border-gray-800">
            <p className="text-gray-400 italic font-light">Data not found.</p>
          </div>
        ) : (
          <PMTimelineView />
        )}
        </div>
      </div>
    </>
  );
}
