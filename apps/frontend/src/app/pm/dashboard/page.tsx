"use client";
import React, { useState, useEffect } from "react";
import PMStatCard from "@/app/pm/components/PMStatCard";
import PMTimelineView from "@/app/pm/components/PMGanttChart";
import {
  FolderKanban,
  CalendarClock,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";

import { useRouter } from "next/navigation";

interface DashboardStats {
  total: number;
  onHold: number;
  scheduled: number;
  running: number;
  completed: number;
}

export default function PMDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
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

      const statsRes = await fetch("http://localhost:5103/api/timeline/stats");

      if (!statsRes.ok) {
        throw new Error("Server merespons, tapi gagal mengambil data.");
      }

      const statsData = await statsRes.json();
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
    <div className="p-8 max-w-[1600px] mx-auto w-full h-full overflow-y-auto">
      {/* WELCOME SECTION */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Monitor progress, resource scheduling and team metrics.
        </p>
      </div>

      {/* ALERT ERROR SECTION */}
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

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_repeat(4,1fr)] gap-8">
        <PMStatCard
          title="Total Projects"
          value={stats.total}
          icon={<FolderKanban />}
          variant="premium"
          onClick={() => router.push("/pm/projects?filter=All")}
        />
        <PMStatCard
          title="On Hold"
          value={stats.onHold}
          icon={<AlertCircle />}
          variant="amber"
          onClick={() => router.push("/pm/projects?filter=On Hold")}
        />
        <PMStatCard
          title="Scheduled"
          value={stats.scheduled}
          icon={<CalendarClock />}
          variant="sky"
          onClick={() => router.push("/pm/projects?filter=Upcoming")}
        />
        <PMStatCard
          title="Running"
          value={stats.running}
          icon={<Users />}
          variant="blue"
          onClick={() => router.push("/pm/projects?filter=Active")}
        />
        <PMStatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 />}
          variant="green"
          onClick={() => router.push("/pm/projects?filter=Completed")}
        />
      </div>

      {/* TIMELINE SECTION */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
          Project Timeline
        </h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-80 bg-white/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 animate-pulse">
            <p className="text-gray-500 dark:text-gray-400 italic">
              Connecting to database...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-80 bg-white/30 dark:bg-black/10 rounded-2xl border border-gray-200 dark:border-gray-800">
            <p className="text-gray-400 italic font-light">
              Data not found.
            </p>
          </div>
        ) : (
          <PMTimelineView />
        )}
      </div>
    </div>
  );
}
