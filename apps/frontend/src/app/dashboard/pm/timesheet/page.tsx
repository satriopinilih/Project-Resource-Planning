"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Layers,
  Loader2,
  Lock,
  Search,
  Users,
} from "lucide-react";
import {
  exportActivityLogCsv,
  getEmployeeById,
  getProjectById,
  getTeamActivityLogs,
  BackendProjectMember,
} from "@/lib/api";
import { ActivityLog } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseLocalDate(d: string) {
  return new Date(d + "T00:00:00");
}

function formatDateLabel(d: string) {
  const date = parseLocalDate(d);
  const today = parseLocalDate(todayJakarta());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hari ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

function formatDateShort(d: string) {
  return parseLocalDate(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function formatDateFull(d: string) {
  return parseLocalDate(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDayNameShort(d: string) {
  return parseLocalDate(d).toLocaleDateString("id-ID", { weekday: "short" });
}

function calcDuration(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

function getMins(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthBounds(year: number, month: number) {
  const days = getDaysInMonth(year, month);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  return {
    monthStr,
    startDate: `${monthStr}-01`,
    endDate: `${monthStr}-${String(days).padStart(2, "0")}`,
    days,
  };
}

const PHASE_PALETTE = [
  { badge: "text-violet-400 bg-violet-500/10 border-violet-500/20", bar: "bg-violet-500" },
  { badge: "text-pink-400 bg-pink-500/10 border-pink-500/20", bar: "bg-pink-500" },
  { badge: "text-blue-400 bg-blue-500/10 border-blue-500/20", bar: "bg-blue-500" },
  { badge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", bar: "bg-cyan-500" },
  { badge: "text-red-400 bg-red-500/10 border-red-500/20", bar: "bg-red-500" },
  { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", bar: "bg-emerald-500" },
  { badge: "text-amber-400 bg-amber-500/10 border-amber-500/20", bar: "bg-amber-500" },
  { badge: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", bar: "bg-indigo-500" },
];

function hashPhase(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PHASE_PALETTE[h % PHASE_PALETTE.length];
}

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function avatarColor(userId: string) {
  let sum = 0;
  for (const c of userId) sum += c.charCodeAt(0);
  return avatarColors[sum % avatarColors.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

type StaffFilter = "all" | "missing_today" | "over_hours";

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PmTeamActivityPage() {
  const [pmProjects, setPmProjects] = useState<{ id: number; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = todayJakarta().split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const filterYear = currentDate.getFullYear();
  const filterMonth = currentDate.getMonth() + 1;
  const { monthStr, startDate, endDate, days: daysCount } = monthBounds(filterYear, filterMonth);

  const [projectMembers, setProjectMembers] = useState<BackendProjectMember[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<BackendProjectMember | null>(null);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayJakarta());

  const todayStr = todayJakarta();

  useEffect(() => {
    if (!selectedDate.startsWith(monthStr)) {
      const today = todayJakarta();
      if (today.startsWith(monthStr)) {
        setSelectedDate(today);
      } else {
        setSelectedDate(`${monthStr}-01`);
      }
    }
  }, [monthStr, selectedDate]);

  useEffect(() => {
    async function initProjects() {
      try {
        const raw = localStorage.getItem("auth_user");
        if (!raw) return;
        const user = JSON.parse(raw);
        const emp = await getEmployeeById(user.userId);
        const pmProjs = (emp.projects ?? [])
          .filter((p) => p.roleInProject === "PM")
          .map((p) => ({ id: Number(p.id), name: p.name }));

        setPmProjects(pmProjs);
        setSelectedProjectId((prev) => prev ?? (pmProjs[0]?.id ?? null));
      } catch {
        // ignore
      }
    }
    initProjects();
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [projData, logsData] = await Promise.all([
        getProjectById(String(selectedProjectId)),
        getTeamActivityLogs(selectedProjectId, { startDate, endDate }),
      ]);

      // Exclude PM from timesheet monitoring grid (role = RoleInProject)
      const staffOnly = (projData.members || []).filter(
        (m) => (m.role || "").toLowerCase() !== "pm"
      );
      setProjectMembers(staffOnly);
      setLogs(logsData || []);
    } catch {
      setProjectMembers([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const staffStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalHours: number;
        daysLogged: Set<string>;
        entries: number;
        hoursByDay: Record<string, number>;
        loggedToday: boolean;
        hasOverHoursDay: boolean;
      }
    > = {};

    for (const m of projectMembers) {
      stats[m.userId] = {
        totalHours: 0,
        daysLogged: new Set(),
        entries: 0,
        hoursByDay: {},
        loggedToday: false,
        hasOverHoursDay: false,
      };
    }

    for (const log of logs) {
      if (!stats[log.userId]) {
        stats[log.userId] = {
          totalHours: 0,
          daysLogged: new Set(),
          entries: 0,
          hoursByDay: {},
          loggedToday: false,
          hasOverHoursDay: false,
        };
      }
      const mins = getMins(log.startTime, log.endTime);
      const isThisProject =
        !log.isRedacted &&
        selectedProjectId !== null &&
        Number(log.projectId) === Number(selectedProjectId);

      // Track total hours per day across all projects for over-hours (>8h) warning
      stats[log.userId].hoursByDay[log.activityDate] =
        (stats[log.userId].hoursByDay[log.activityDate] || 0) + mins / 60;

      // Project-specific metrics (only counted if log belongs to this project)
      if (isThisProject) {
        stats[log.userId].entries++;
        stats[log.userId].daysLogged.add(log.activityDate);
        stats[log.userId].totalHours += mins / 60;
        if (log.activityDate === todayStr) {
          stats[log.userId].loggedToday = true;
        }
      }
    }

    for (const uid of Object.keys(stats)) {
      stats[uid].hasOverHoursDay = Object.values(stats[uid].hoursByDay).some((h) => h > 8);
    }

    return stats;
  }, [projectMembers, logs, todayStr, selectedProjectId]);

  const teamKpi = useMemo(() => {
    const staff = projectMembers;
    let loggedToday = 0;
    let totalHours = 0;
    for (const m of staff) {
      const s = staffStats[m.userId];
      if (s?.loggedToday) loggedToday++;
      totalHours += s?.totalHours || 0;
    }
    return {
      staffCount: staff.length,
      loggedToday,
      missingToday: Math.max(0, staff.length - loggedToday),
      totalHours,
    };
  }, [projectMembers, staffStats]);

  const filteredMembers = useMemo(() => {
    return projectMembers.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.userName.toLowerCase().includes(q) ||
        m.staffRole.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const s = staffStats[m.userId];
      if (staffFilter === "missing_today") return !s?.loggedToday;
      if (staffFilter === "over_hours") return !!s?.hasOverHoursDay;
      return true;
    });
  }, [projectMembers, searchQuery, staffFilter, staffStats]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedStaff(null);
    setFocusDate(null);
  };
  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedStaff(null);
    setFocusDate(null);
  };

  const handleExport = async () => {
    if (!selectedProjectId) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportActivityLogCsv(selectedProjectId, startDate, endDate);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Gagal export CSV.");
    } finally {
      setExporting(false);
    }
  };

  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const openStaffDetail = (member: BackendProjectMember, date?: string) => {
    setSelectedStaff(member);
    if (date) {
      setSelectedDate(date);
    } else {
      const today = todayJakarta();
      if (today.startsWith(monthStr)) {
        setSelectedDate(today);
      } else {
        setSelectedDate(`${monthStr}-01`);
      }
    }
  };

  const currentMemberIndex = useMemo(() => {
    if (!selectedStaff) return -1;
    return projectMembers.findIndex((m) => m.userId === selectedStaff.userId);
  }, [selectedStaff, projectMembers]);

  const canPrevMember = currentMemberIndex > 0;
  const canNextMember = currentMemberIndex < projectMembers.length - 1 && currentMemberIndex !== -1;

  const handlePrevMember = () => {
    if (!canPrevMember) return;
    openStaffDetail(projectMembers[currentMemberIndex - 1]);
  };

  const handleNextMember = () => {
    if (!canNextMember) return;
    openStaffDetail(projectMembers[currentMemberIndex + 1]);
  };

  const selectedStaffStats = useMemo(() => {
    if (!selectedStaff) return null;
    return staffStats[selectedStaff.userId] || null;
  }, [selectedStaff, staffStats]);

  const staffLogs = useMemo(() => {
    if (!selectedStaff) return [];
    return logs.filter((l) => l.userId === selectedStaff.userId);
  }, [logs, selectedStaff]);

  const staffDayLogsMap = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {};
    for (const log of staffLogs) {
      if (!map[log.activityDate]) map[log.activityDate] = [];
      map[log.activityDate].push(log);
    }
    return map;
  }, [staffLogs]);

  // Hari terisi KHUSUS di project ini (100% konsisten dengan Heatmap project ini)
  const staffProjectDaysLogged = useMemo(() => {
    return selectedStaffStats?.daysLogged || new Set<string>();
  }, [selectedStaffStats]);

  const staffMissingDaysCount = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
      if (dateStr > todayStr) continue;
      const dow = parseLocalDate(dateStr).getDay();
      if (dow === 0 || dow === 6) continue;
      if (!staffProjectDaysLogged.has(dateStr)) count++;
    }
    return count;
  }, [daysCount, monthStr, todayStr, staffProjectDaysLogged]);



  const trackerContainerRef = useRef<HTMLDivElement>(null);
  const activeDateRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll Attendance Tracker agar tanggal hari ini / terpilih langsung di tengah (tanpa perlu manual geser)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeDateRef.current && trackerContainerRef.current) {
        const container = trackerContainerRef.current;
        const btn = activeDateRef.current;
        const containerRect = container.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const targetScrollLeft =
          container.scrollLeft +
          (btnRect.left - containerRect.left) -
          container.clientWidth / 2 +
          btnRect.width / 2;

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: "smooth",
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [selectedStaff?.userId, selectedDate, monthStr]);

  const dayNum = useMemo(() => {
    return Number(selectedDate.split("-")[2]);
  }, [selectedDate]);

  const canGoPrevDay = dayNum > 1;
  const canGoNextDay = dayNum < daysCount;

  const handlePrevDay = () => {
    if (!canGoPrevDay) return;
    setSelectedDate(`${monthStr}-${String(dayNum - 1).padStart(2, "0")}`);
  };

  const handleNextDay = () => {
    if (!canGoNextDay) return;
    setSelectedDate(`${monthStr}-${String(dayNum + 1).padStart(2, "0")}`);
  };

  const selectedDayLogs = useMemo(() => {
    return staffDayLogsMap[selectedDate] || [];
  }, [staffDayLogsMap, selectedDate]);

  const thisProjectDayLogs = useMemo(() => {
    if (selectedProjectId === null) return [];
    return selectedDayLogs.filter(
      (l) => !l.isRedacted && Number(l.projectId) === Number(selectedProjectId)
    );
  }, [selectedDayLogs, selectedProjectId]);

  const otherProjectDayLogs = useMemo(() => {
    if (selectedProjectId === null) return [];
    return selectedDayLogs.filter(
      (l) => l.isRedacted || Number(l.projectId) !== Number(selectedProjectId)
    );
  }, [selectedDayLogs, selectedProjectId]);

  const timedThisProjectLogs = useMemo(() => {
    return thisProjectDayLogs.filter((l) => l.startTime && l.endTime);
  }, [thisProjectDayLogs]);

  const thisProjectDayMins = useMemo(() => {
    return thisProjectDayLogs.reduce((acc, l) => acc + getMins(l.startTime, l.endTime), 0);
  }, [thisProjectDayLogs]);

  const allProjectsDayMins = useMemo(() => {
    return selectedDayLogs.reduce((acc, l) => acc + getMins(l.startTime, l.endTime), 0);
  }, [selectedDayLogs]);

  const isSelectedOverHours = allProjectsDayMins > 8 * 60;
  const thisProjectDurationLabel =
    thisProjectDayMins > 0
      ? `${Math.floor(thisProjectDayMins / 60)}j${thisProjectDayMins % 60 > 0 ? ` ${thisProjectDayMins % 60}m` : ""}`
      : null;

  return (
    <div className="min-h-screen bg-[var(--dash-bg-main)]">
      <div className="sticky top-0 z-20 bg-[var(--dash-bg-sidebar)]/80 backdrop-blur-xl border-b border-[var(--dash-border)]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Users size={15} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[var(--dash-text-heading)] leading-none">
                Team Activity
              </h1>
              <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5 hidden sm:block">
                Monitor timesheet tim
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <select
                value={selectedProjectId || ""}
                onChange={(e) => {
                  setSelectedProjectId(Number(e.target.value));
                  setSelectedStaff(null);
                  setFocusDate(null);
                }}
                className="pl-3 pr-8 py-1.5 text-[12px] font-bold bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none text-[var(--dash-text-heading)] cursor-pointer appearance-none max-w-[140px] sm:max-w-none"
              >
                {pmProjects.length === 0 ? <option value="">No projects</option> : null}
                {pmProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] pointer-events-none"
              />
            </div>

            <div className="flex items-center bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg p-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-[var(--dash-bg-hover)] rounded-md text-[var(--dash-text-muted)]"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-2 sm:px-3 text-[12px] font-bold text-[var(--dash-text-heading)] min-w-[100px] sm:min-w-[120px] text-center">
                {currentDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-[var(--dash-bg-hover)] rounded-md text-[var(--dash-text-muted)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={!selectedProjectId || exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] hover:border-indigo-500/40 text-[12px] font-bold text-[var(--dash-text-heading)] transition-colors disabled:opacity-40"
              title="Export CSV bulan ini"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        {exportError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            {exportError}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-[13px] text-[var(--dash-text-faint)]">Memuat data tim...</p>
          </div>
        ) : selectedStaff ? (
          /* ── DETAIL VIEW (STAFF LIST + DETAIL 2-COLUMN) ── */
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  setSelectedStaff(null);
                  setFocusDate(null);
                }}
                className="flex items-center gap-2 text-[12px] font-bold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors"
              >
                <ArrowLeft size={14} /> Kembali ke Heatmap Tim
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Master Column (Left - 4 cols): Daftar Staff di Project Ini */}
              <div className="lg:col-span-4 xl:col-span-4 space-y-3">
                <div className="p-4 sm:p-5 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-400" />
                      <h3 className="text-[13px] font-bold text-[var(--dash-text-heading)]">
                        Anggota Tim
                      </h3>
                    </div>
                    <span className="text-[11px] text-[var(--dash-text-faint)] font-medium">
                      {projectMembers.length} staff
                    </span>
                  </div>

                  {/* Search Staff */}
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]"
                    />
                    <input
                      type="text"
                      placeholder="Cari nama atau role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-[12px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/50 text-[var(--dash-text-heading)] placeholder:text-[var(--dash-text-faint)] transition-colors"
                    />
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-[var(--dash-bg-input)] rounded-xl border border-[var(--dash-border)]">
                    <button
                      type="button"
                      onClick={() => setStaffFilter("all")}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        staffFilter === "all"
                          ? "bg-[var(--dash-bg-card)] text-[var(--dash-text-heading)] shadow-sm"
                          : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)]"
                      }`}
                    >
                      Semua ({projectMembers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffFilter("missing_today")}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        staffFilter === "missing_today"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "text-[var(--dash-text-muted)] hover:text-rose-400"
                      }`}
                    >
                      Belum Log ({teamKpi.missingToday})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffFilter("over_hours")}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        staffFilter === "over_hours"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "text-[var(--dash-text-muted)] hover:text-amber-400"
                      }`}
                    >
                      Lembur
                    </button>
                  </div>

                  {/* Staff List */}
                  <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-8 text-[12px] text-[var(--dash-text-faint)]">
                        Tidak ada staff yang sesuai.
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelected = selectedStaff.userId === member.userId;
                        const s = staffStats[member.userId];
                        const loggedToday = s?.loggedToday;
                        const totalHrs = s?.totalHours || 0;
                        const hasOver = s?.hasOverHoursDay;

                        return (
                          <button
                            key={member.userId}
                            type="button"
                            onClick={() => openStaffDetail(member)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all group ${
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500/50 shadow-sm shadow-indigo-600/10 ring-1 ring-indigo-500/30"
                                : "bg-[var(--dash-bg-input)]/30 border-[var(--dash-border)] hover:bg-[var(--dash-bg-hover)] hover:border-indigo-500/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-black flex-shrink-0 shadow-inner shadow-white/20 ${avatarColor(member.userId)}`}
                              >
                                {initials(member.userName)}
                              </div>

                              <div className="min-w-0">
                                <p
                                  className={`text-[13px] font-bold truncate ${
                                    isSelected
                                      ? "text-indigo-300"
                                      : "text-[var(--dash-text-heading)] group-hover:text-indigo-400 transition-colors"
                                  }`}
                                >
                                  {member.userName}
                                </p>
                                <p className="text-[11px] text-[var(--dash-text-muted)] truncate">
                                  {member.staffRole}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-medium text-[var(--dash-text-faint)]">
                                    {totalHrs.toFixed(1)}j bulan ini
                                  </span>
                                  {hasOver && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                                      ⚠ &gt;8j
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                              {loggedToday ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Logged
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Kosong
                                </span>
                              )}
                              <ChevronRight
                                size={14}
                                className={`transition-transform ${
                                  isSelected
                                    ? "text-indigo-400 translate-x-0.5"
                                    : "text-[var(--dash-text-faint)] group-hover:text-[var(--dash-text-muted)] group-hover:translate-x-0.5"
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Detail Column (Right - 8 cols): Detail Staf Terpilih */}
              <div className="lg:col-span-8 xl:col-span-8 space-y-5">
                {/* Profile Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[18px] font-black shadow-inner shadow-white/20 flex-shrink-0 ${avatarColor(selectedStaff.userId)}`}
                    >
                      {initials(selectedStaff.userName)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[18px] font-black text-[var(--dash-text-heading)] truncate">
                        {selectedStaff.userName}
                      </h2>
                      <p className="text-[12px] text-indigo-400 font-medium">
                        {selectedStaff.staffRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:justify-end">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                        Total jam
                      </p>
                      <p className="text-[18px] font-black text-[var(--dash-text-heading)]">
                        {(selectedStaffStats?.totalHours || 0).toFixed(1)}j
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                        Hari terisi
                      </p>
                      <p className="text-[18px] font-black text-emerald-400">
                        {staffProjectDaysLogged.size}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                        Hari kosong
                      </p>
                      <p
                        className={`text-[18px] font-black ${
                          staffMissingDaysCount > 0 ? "text-rose-400" : "text-[var(--dash-text-heading)]"
                        }`}
                      >
                        {staffMissingDaysCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attendance Tracker (01..31) */}
                <div className="p-5 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={15} className="text-indigo-400" />
                      <h3 className="text-[13px] font-bold text-[var(--dash-text-heading)]">
                        Attendance Tracker
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--dash-text-faint)]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Terisi
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400/80" /> Belum isi
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--dash-border)]" /> Libur
                      </span>
                    </div>
                  </div>

                  <div
                    ref={trackerContainerRef}
                    className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
                  >
                    {daysArray.map((day) => {
                      const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
                      const isLogged = staffProjectDaysLogged.has(dateStr);
                      const dow = parseLocalDate(dateStr).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      const isFuture = dateStr > todayStr;
                      const isMissing = !isLogged && !isWeekend && !isFuture;
                      const isSelected = selectedDate === dateStr;
                      const isToday = dateStr === todayStr;
                      const dayHours = selectedStaffStats?.hoursByDay[dateStr] || 0;
                      const isOverHoursDay = dayHours > 8;

                      return (
                        <button
                          key={day}
                          ref={isSelected ? activeDateRef : null}
                          type="button"
                          onClick={() => setSelectedDate(dateStr)}
                          title={`${formatDateShort(dateStr)}: ${
                            isToday ? "(Hari ini) " : ""
                          }${
                            isLogged
                              ? isOverHoursDay
                                ? `Terisi di project ini (${dayHours.toFixed(1)}j akumulasi - Lembur >8j)`
                                : `Terisi di project ini (${dayHours.toFixed(1)}j)`
                              : isMissing
                                ? "Belum diisi di project ini"
                                : isWeekend
                                  ? "Akhir pekan"
                                  : "Mendatang"
                          } (Klik untuk filter log)`}
                          className="flex flex-col items-center gap-1.5 min-w-[30px] group cursor-pointer flex-shrink-0"
                        >
                          <span
                            className={`text-[10px] font-semibold transition-colors ${
                              isSelected
                                ? "text-indigo-400 font-bold scale-110"
                                : isToday
                                  ? "text-indigo-300 font-bold underline underline-offset-2"
                                  : isWeekend
                                    ? "text-red-400/50"
                                    : isMissing
                                      ? "text-rose-400"
                                      : "text-[var(--dash-text-faint)]"
                            }`}
                          >
                            {String(day).padStart(2, "0")}
                          </span>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--dash-bg-card)] scale-110 shadow-md shadow-indigo-500/30"
                                : isToday
                                  ? "ring-1 ring-indigo-400/60"
                                  : ""
                            } ${
                              isLogged
                                ? isOverHoursDay
                                  ? "bg-amber-500/20 border-amber-500/30"
                                  : "bg-emerald-500/20 border-emerald-500/30"
                                : isWeekend || isFuture
                                  ? "bg-[var(--dash-bg-hover)] border-transparent"
                                  : "bg-rose-500/10 border-rose-500/30"
                            }`}
                          >
                            {isLogged && (
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isOverHoursDay ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Activity Logs (Detail Tanggal Terpilih) */}
                <div className="p-6 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm space-y-5">
                    {/* Top Bar Detail */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--dash-border-subtle)]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={handlePrevDay}
                            disabled={!canGoPrevDay}
                            className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Hari sebelumnya"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextDay}
                            disabled={!canGoNextDay}
                            className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Hari berikutnya"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] leading-none">
                              {formatDateFull(selectedDate)}
                            </h3>
                            {selectedDate === todayStr && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                Hari ini
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--dash-text-faint)] mt-1">
                            {thisProjectDayLogs.length > 0
                              ? `${thisProjectDayLogs.length} entri aktivitas di project ini`
                              : "Belum ada aktivitas tercatat untuk project ini"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {thisProjectDurationLabel ? (
                          <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl border bg-[var(--dash-bg-input)] text-[var(--dash-text-heading)] border-[var(--dash-border)]">
                            Project ini: {thisProjectDurationLabel}
                          </span>
                        ) : null}
                        {isSelectedOverHours && (
                          <span
                            className="text-[11px] font-bold px-3 py-1.5 rounded-xl border bg-amber-500/20 text-amber-400 border-amber-500/30"
                            title="Akumulasi seluruh project >8 jam"
                          >
                            ⚠ Total hari ini &gt;8j
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timeline Bar (jika ada aktivitas dengan jam di project ini) */}
                    {timedThisProjectLogs.length > 0 && (
                      <div className="pt-1 pb-3 border-b border-[var(--dash-border-subtle)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                            Distribusi Jam Kerja (Project Ini)
                          </span>
                        </div>
                        <div className="relative h-2 mb-2">
                          {[8, 10, 12, 14, 16, 18, 20].map((h) => (
                            <span
                              key={h}
                              className="absolute text-[9px] text-[var(--dash-text-faint)] -translate-x-1/2"
                              style={{ left: `${((h - 8) / 12) * 100}%` }}
                            >
                              {String(h).padStart(2, "0")}:00
                            </span>
                          ))}
                        </div>
                        <div className="relative h-6 bg-[var(--dash-bg-input)] rounded-full overflow-hidden border border-[var(--dash-border)]">
                          {timedThisProjectLogs.map((log) => {
                            const [sh, sm] = log.startTime!.split(":").map(Number);
                            const [eh, em] = log.endTime!.split(":").map(Number);
                            const s = sh * 60 + sm;
                            const e = eh * 60 + em;
                            const minT = 8 * 60;
                            const span = 12 * 60;
                            let left = ((s - minT) / span) * 100;
                            let width = ((e - s) / span) * 100;
                            if (left < 0) {
                              width += left;
                              left = 0;
                            }
                            if (left + width > 100) width = 100 - left;
                            const style = hashPhase(log.phaseName);
                            return (
                              <div
                                key={log.id}
                                className={`absolute top-0 bottom-0 ${style.bar} opacity-90 border-r border-[var(--dash-bg-card)]`}
                                style={{
                                  left: `${Math.max(0, left)}%`,
                                  width: `${Math.min(100, width)}%`,
                                }}
                                title={`${log.startTime}-${log.endTime} ${log.phaseName}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Log Items or Empty State for this project */}
                    {thisProjectDayLogs.length > 0 ? (
                      <div className="space-y-3">
                        {thisProjectDayLogs.map((log) => {
                          const style = hashPhase(log.phaseName);
                          return (
                            <div
                              key={log.id}
                              className="p-4 rounded-2xl bg-[var(--dash-bg-input)]/40 border border-[var(--dash-border)] hover:border-indigo-500/30 transition-all"
                            >
                              <div className="space-y-2">
                                <p className="text-[13px] leading-relaxed text-[var(--dash-text-primary)]">
                                  {log.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}
                                  >
                                    {log.phaseName}
                                  </span>
                                  <span className="text-[11px] text-[var(--dash-text-muted)] font-medium">
                                    {log.projectName}
                                  </span>
                                  {log.startTime && log.endTime ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--dash-text-secondary)]">
                                      <Clock size={11} />
                                      {log.startTime}–{log.endTime}
                                      <span className="text-[var(--dash-text-faint)]">
                                        ({calcDuration(log.startTime, log.endTime)})
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-[var(--dash-text-faint)]">
                                      Deskripsi saja
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty State for Selected Date */
                      (() => {
                        const isWeekend =
                          parseLocalDate(selectedDate).getDay() === 0 ||
                          parseLocalDate(selectedDate).getDay() === 6;
                        const isFuture = selectedDate > todayStr;

                        if (isFuture) {
                          return (
                            <div className="text-center py-16 px-6 border border-dashed border-[var(--dash-border)] rounded-2xl bg-[var(--dash-bg-input)]/20">
                              <Clock size={32} className="mx-auto text-[var(--dash-text-faint)] mb-2.5 opacity-60" />
                              <h4 className="text-[14px] font-bold text-[var(--dash-text-heading)]">
                                Tanggal Mendatang
                              </h4>
                              <p className="text-[12px] text-[var(--dash-text-faint)] mt-1 max-w-sm mx-auto">
                                Tanggal ini belum berjalan. Belum ada aktivitas yang dicatat.
                              </p>
                            </div>
                          );
                        }

                        if (isWeekend) {
                          return (
                            <div className="text-center py-16 px-6 border border-dashed border-[var(--dash-border)] rounded-2xl bg-[var(--dash-bg-input)]/20">
                              <Coffee size={32} className="mx-auto text-indigo-400 mb-2.5 opacity-80" />
                              <h4 className="text-[14px] font-bold text-[var(--dash-text-heading)]">
                                Akhir Pekan
                              </h4>
                              <p className="text-[12px] text-[var(--dash-text-faint)] mt-1 max-w-sm mx-auto">
                                Sabtu & Minggu bukan merupakan hari kerja wajib. Staff tidak mencatat jam kerja lembur pada hari ini.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="text-center py-12 px-6 border border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5">
                            <AlertCircle size={32} className="mx-auto text-amber-400 mb-2.5" />
                            <h4 className="text-[14px] font-bold text-amber-200">
                              Belum Ada Log di Project Ini
                            </h4>
                            <p className="text-[12px] text-amber-300/80 mt-1 max-w-sm mx-auto">
                              {selectedStaff.userName} belum mengisi log aktivitas untuk project ini pada hari kerja ini.
                            </p>
                          </div>
                        );
                      })()
                    )}

                    {/* Informasi Aktivitas di Project Lain jika ada */}
                    {otherProjectDayLogs.length > 0 && (
                      <div className="pt-4 border-t border-[var(--dash-border-subtle)] space-y-2.5">
                        <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--dash-text-muted)]">
                          <Lock size={13} className="text-indigo-400" />
                          <span>Aktivitas di Project Lain ({otherProjectDayLogs.length} entri)</span>
                          <span className="text-[10px] font-normal text-[var(--dash-text-faint)]">
                            (dicatat di luar project ini)
                          </span>
                        </div>
                        <div className="space-y-2">
                          {otherProjectDayLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-xl bg-[var(--dash-bg-input)]/30 border border-[var(--dash-border)] flex items-center justify-between text-[12px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[var(--dash-text-muted)] flex-shrink-0">
                                  <Lock size={10} /> {log.projectName || "Project lain"}
                                </span>
                                {log.phaseName && (
                                  <span className="text-[11px] text-[var(--dash-text-faint)] truncate">
                                    {log.phaseName}
                                  </span>
                                )}
                              </div>
                              {log.startTime && log.endTime ? (
                                <span className="text-[11px] font-mono text-[var(--dash-text-secondary)] flex-shrink-0 ml-2">
                                  {log.startTime}–{log.endTime} ({calcDuration(log.startTime, log.endTime)})
                                </span>
                              ) : (
                                <span className="text-[11px] text-[var(--dash-text-faint)] flex-shrink-0 ml-2">
                                  Deskripsi saja
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── OVERVIEW: KPI + HEATMAP ── */
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Staff", value: String(teamKpi.staffCount), hint: "di project ini" },
                {
                  label: "Sudah log hari ini",
                  value: String(teamKpi.loggedToday),
                  hint: "dari " + teamKpi.staffCount,
                  ok: true,
                },
                {
                  label: "Belum log hari ini",
                  value: String(teamKpi.missingToday),
                  hint: "perlu diingatkan",
                  warn: teamKpi.missingToday > 0,
                },
                {
                  label: "Total jam bulan ini",
                  value: `${teamKpi.totalHours.toFixed(1)}j`,
                  hint: "semua staff",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-2xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)]"
                >
                  <p className="text-[10px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p
                    className={`text-[22px] font-black mt-1 leading-none ${
                      item.warn
                        ? "text-rose-400"
                        : item.ok
                          ? "text-emerald-400"
                          : "text-[var(--dash-text-heading)]"
                    }`}
                  >
                    {item.value}
                  </p>
                  <p className="text-[11px] text-[var(--dash-text-muted)] mt-1">{item.hint}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "all", label: "Semua" },
                    { id: "missing_today", label: "Belum log hari ini" },
                    { id: "over_hours", label: "Over 8 jam" },
                  ] as { id: StaffFilter; label: string }[]
                ).map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setStaffFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                      staffFilter === chip.id
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                        : "bg-[var(--dash-bg-card)] border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-indigo-500/30"
                    }`}
                  >
                    {chip.label}
                    {chip.id === "missing_today" && teamKpi.missingToday > 0 && (
                      <span className="ml-1.5 text-rose-400">{teamKpi.missingToday}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Cari staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-full sm:w-56 text-[12px] bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-full outline-none focus:border-indigo-500/50 text-[var(--dash-text-heading)] transition-colors"
                />
              </div>
            </div>

            {/* Heatmap */}
            {filteredMembers.length === 0 ? (
              <div className="text-center py-20 border border-[var(--dash-border)] border-dashed rounded-3xl bg-[var(--dash-bg-card)]/50">
                <p className="text-[13px] text-[var(--dash-text-faint)]">
                  Tidak ada staff yang cocok dengan filter.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--dash-border-subtle)] flex items-center justify-between">
                  <h2 className="text-[14px] font-bold text-[var(--dash-text-heading)]">
                    Heatmap Kehadiran
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--dash-text-faint)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /> Ada log
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/50" /> Kosong
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[var(--dash-bg-input)]" /> Weekend
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px]">
                    <thead>
                      <tr className="border-b border-[var(--dash-border-subtle)]">
                        <th className="sticky left-0 z-10 bg-[var(--dash-bg-card)] text-left px-4 py-3 text-[10px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider w-44">
                          Staff
                        </th>
                        {daysArray.map((day) => {
                          const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
                          const dow = parseLocalDate(dateStr).getDay();
                          const isWeekend = dow === 0 || dow === 6;
                          return (
                            <th
                              key={day}
                              className={`px-0.5 py-2 text-[9px] font-semibold text-center min-w-[22px] ${
                                isWeekend ? "text-red-400/50" : "text-[var(--dash-text-faint)]"
                              }`}
                            >
                              {day}
                            </th>
                          );
                        })}
                        <th className="px-3 py-2 text-[10px] font-bold text-[var(--dash-text-faint)] uppercase text-right">
                          Jam
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => {
                        const stats = staffStats[member.userId];
                        return (
                          <tr
                            key={member.userId}
                            className="border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)]/30 transition-colors"
                          >
                            <td className="sticky left-0 z-10 bg-[var(--dash-bg-card)] px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => openStaffDetail(member)}
                                className="flex items-center gap-2.5 text-left group w-full"
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${avatarColor(member.userId)}`}
                                >
                                  {initials(member.userName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-bold text-[var(--dash-text-heading)] truncate group-hover:text-indigo-300 transition-colors">
                                    {member.userName}
                                  </p>
                                  <p className="text-[10px] text-[var(--dash-text-faint)] truncate">
                                    {member.staffRole}
                                    {!stats?.loggedToday && (
                                      <span className="text-rose-400 ml-1">· belum hari ini</span>
                                    )}
                                  </p>
                                </div>
                              </button>
                            </td>
                            {daysArray.map((day) => {
                              const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
                              const isLogged = stats?.daysLogged.has(dateStr);
                              const dow = parseLocalDate(dateStr).getDay();
                              const isWeekend = dow === 0 || dow === 6;
                              const isFuture = dateStr > todayStr;
                              const dayH = stats?.hoursByDay[dateStr] || 0;
                              const isOver = dayH > 8;

                              let cellClass =
                                "bg-[var(--dash-bg-input)]/40 border border-transparent";
                              if (isWeekend || isFuture) {
                                cellClass = "bg-transparent";
                              } else if (isLogged) {
                                cellClass = isOver
                                  ? "bg-amber-500/70 hover:bg-amber-400 cursor-pointer"
                                  : "bg-emerald-500/70 hover:bg-emerald-400 cursor-pointer";
                              } else {
                                cellClass =
                                  "bg-rose-500/35 hover:bg-rose-500/50 cursor-pointer border border-rose-500/10";
                              }

                              return (
                                <td key={day} className="px-0.5 py-2">
                                  <button
                                    type="button"
                                    disabled={isWeekend || isFuture}
                                    onClick={() => {
                                      if (isLogged) openStaffDetail(member, dateStr);
                                      else if (!isWeekend && !isFuture) openStaffDetail(member);
                                    }}
                                    title={
                                      isLogged
                                        ? `${dateStr}: ${dayH.toFixed(1)}j`
                                        : isWeekend || isFuture
                                          ? dateStr
                                          : `${dateStr}: belum isi`
                                    }
                                    className={`block w-4 h-4 mx-auto rounded-sm transition-colors disabled:cursor-default ${cellClass}`}
                                  />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right text-[12px] font-bold text-[var(--dash-text-heading)] tabular-nums">
                              {(stats?.totalHours || 0).toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
