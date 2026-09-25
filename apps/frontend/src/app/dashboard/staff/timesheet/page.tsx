"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Edit3,
  FolderOpen,
  Loader2,
  Plus,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  createActivityLog,
  deleteActivityLog,
  getEmptyWorkDays,
  getEmployeeById,
  getMyActivityLogs,
  getMyHolidays,
  getProjectPhases,
  updateActivityLog,
} from "@/lib/api";
import { ActivityLog, CreateActivityLogPayload, ProjectPhase } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMaxDate() {
  return todayJakarta();
}

function getMinDate() {
  const [y, m, d] = todayJakarta().split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 7);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
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

function calcDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
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

function monthBounds(filterMonth: string) {
  const [y, m] = filterMonth.split("-").map(Number);
  const days = getDaysInMonth(y, m);
  return {
    startDate: `${filterMonth}-01`,
    endDate: `${filterMonth}-${String(days).padStart(2, "0")}`,
  };
}

// ── Phase style (hash-based, survives rename) ──────────────────────────────────

const PHASE_PALETTE = [
  { dot: "bg-violet-500", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", bar: "bg-gradient-to-r from-violet-500 to-purple-500" },
  { dot: "bg-pink-500", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20", bar: "bg-gradient-to-r from-pink-500 to-rose-500" },
  { dot: "bg-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", bar: "bg-gradient-to-r from-blue-500 to-indigo-500" },
  { dot: "bg-cyan-500", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", bar: "bg-gradient-to-r from-cyan-500 to-teal-500" },
  { dot: "bg-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20", bar: "bg-gradient-to-r from-red-500 to-orange-500" },
  { dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", bar: "bg-gradient-to-r from-emerald-500 to-green-500" },
  { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", bar: "bg-gradient-to-r from-amber-500 to-yellow-500" },
  { dot: "bg-indigo-500", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", bar: "bg-gradient-to-r from-indigo-500 to-blue-500" },
];

function hashPhase(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PHASE_PALETTE[h % PHASE_PALETTE.length];
}

// ── Log Form Modal ─────────────────────────────────────────────────────────────

interface LogFormProps {
  phases: ProjectPhase[];
  userProjects: { id: number; name: string }[];
  useTimeRange: boolean;
  editLog?: ActivityLog | null;
  defaultProjectId?: number | null;
  defaultDate?: string;
  onClose: () => void;
  onSaved: (overHours?: boolean) => void;
}

function LogFormModal({
  phases,
  userProjects,
  useTimeRange,
  editLog,
  defaultProjectId,
  defaultDate,
  onClose,
  onSaved,
}: LogFormProps) {
  const [projectId, setProjectId] = useState(
    editLog?.projectId ?? (defaultProjectId ?? userProjects[0]?.id ?? 0)
  );
  const [phaseId, setPhaseId] = useState(editLog?.projectPhaseId ?? (phases[0]?.id ?? 0));
  const [activityDate, setActivityDate] = useState(
    editLog?.activityDate ?? defaultDate ?? getMaxDate()
  );
  const [startTime, setStartTime] = useState(editLog?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(editLog?.endTime ?? "17:00");
  const [description, setDescription] = useState(editLog?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useTimeRange ? calcDuration(startTime, endTime) : null;
  const selectedPhase = phases.find((p) => p.id === Number(phaseId));
  const phaseStyle = selectedPhase ? hashPhase(selectedPhase.name) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Deskripsi tidak boleh kosong.");
      return;
    }

    if (useTimeRange && startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        setError("Waktu selesai harus setelah waktu mulai.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: CreateActivityLogPayload = {
        projectId: Number(projectId),
        projectPhaseId: Number(phaseId),
        activityDate,
        description: description.trim(),
        ...(useTimeRange && startTime && endTime ? { startTime, endTime } : {}),
      };

      let overHours = false;
      if (editLog) {
        const res = await updateActivityLog(editLog.id, payload);
        overHours = res.overHoursWarning;
      } else {
        const res = await createActivityLog(payload);
        overHours = res.overHoursWarning;
      }
      onSaved(overHours);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan log.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-[var(--dash-bg-card)] border border-[var(--dash-border)] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dash-border)]">
          <div className="flex items-center gap-3">
            {phaseStyle && <div className={`w-2.5 h-2.5 rounded-full ${phaseStyle.dot}`} />}
            <h2 className="text-[15px] font-bold text-[var(--dash-text-heading)]">
              {editLog ? "Edit Activity Log" : "Tambah Activity Log"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
              Project
            </label>
            <div className="relative">
              <FolderOpen
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]"
              />
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                disabled={!!editLog}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors disabled:opacity-50 appearance-none cursor-pointer"
              >
                {userProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] pointer-events-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                Tanggal
              </label>
              <input
                type="date"
                value={activityDate}
                min={getMinDate()}
                max={getMaxDate()}
                onChange={(e) => setActivityDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                Phase
              </label>
              <div className="relative">
                <select
                  value={phaseId}
                  onChange={(e) => setPhaseId(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2.5 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors appearance-none cursor-pointer"
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] pointer-events-none"
                />
              </div>
            </div>
          </div>

          {useTimeRange && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                  Mulai
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                    Selesai
                  </label>
                  {duration && (
                    <span className="text-[10px] font-bold text-indigo-400">{duration}</span>
                  )}
                </div>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Apa yang kamu kerjakan?"
              required
              rows={3}
              className="w-full px-4 py-3 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : editLog ? (
                "Simpan Perubahan"
              ) : (
                "Submit Activity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MyTimesheetPage() {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [userProjects, setUserProjects] = useState<{ id: number; name: string }[]>([]);
  const [emptyDays, setEmptyDays] = useState<string[]>([]);
  const [useTimeRange, setUseTimeRange] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);

  const [filterMonth, setFilterMonth] = useState(() => {
    const d = todayJakarta();
    return d.slice(0, 7);
  });

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>();
  const [editLog, setEditLog] = useState<ActivityLog | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [overHoursWarning, setOverHoursWarning] = useState(false);

  // Selected Date State
  const [selectedDate, setSelectedDate] = useState<string>(() => todayJakarta());

  const trackerContainerRef = useRef<HTMLDivElement>(null);
  const activeDateRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedDate.startsWith(filterMonth)) {
      const today = todayJakarta();
      if (today.startsWith(filterMonth)) {
        setSelectedDate(today);
      } else {
        setSelectedDate(`${filterMonth}-01`);
      }
    }
  }, [filterMonth, selectedDate]);

  // Auto-scroll Attendance Tracker agar tanggal hari ini / terpilih langsung di tengah
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
  }, [selectedDate, filterMonth]);

  useEffect(() => {
    const stored = localStorage.getItem("timesheet_use_time_range");
    if (stored !== null) setUseTimeRange(stored === "true");
  }, []);

  const handleToggleTimeRange = (val: boolean) => {
    setUseTimeRange(val);
    localStorage.setItem("timesheet_use_time_range", String(val));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const session = getSessionUser();
      const { startDate, endDate } = monthBounds(filterMonth);

      const [phaseData, emptyData, logData, emp, holidayData] = await Promise.all([
        getProjectPhases(),
        getEmptyWorkDays().catch(() => [] as string[]),
        getMyActivityLogs(undefined, startDate, endDate).catch(() => [] as ActivityLog[]),
        session?.userId ? getEmployeeById(session.userId).catch(() => null) : Promise.resolve(null),
        (() => {
          const [y, m] = filterMonth.split("-").map(Number);
          return getMyHolidays(y, m, filterProjectId);
        })().catch(() => [] as { date: string; name: string }[]),
      ]);
      setPhases(phaseData);
      setEmptyDays(emptyData);
      setHolidays(holidayData);
      setLogs(logData);

      if (emp?.projects) {
        const active = emp.projects
          .filter((p) => p.status !== "Completed" && p.status !== "Deleted")
          .map((p) => ({ id: Number(p.id), name: p.name }));
        setUserProjects(active);
        setFilterProjectId((prev) => {
          if (prev && active.some((p) => p.id === prev)) return prev;
          return active[0]?.id ?? null;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterProjectId]);

  useEffect(() => {
    if (!filterMonth) return;
    const [y, m] = filterMonth.split("-").map(Number);
    getMyHolidays(y, m, filterProjectId)
      .then((data) => setHolidays(data))
      .catch(() => {});
  }, [filterMonth, filterProjectId]);

  useEffect(() => {
    if (userProjects.length > 0) {
      setFilterProjectId((prev) => {
        if (prev && userProjects.some((p) => p.id === prev)) return prev;
        return userProjects[0].id;
      });
    } else {
      setFilterProjectId(null);
    }
  }, [userProjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddForm = (date?: string) => {
    setEditLog(null);
    const targetDate = date || (selectedDate !== "all" ? selectedDate : undefined);
    setFormDefaultDate(targetDate);
    setShowForm(true);
  };

  const handleSaved = (overHours?: boolean) => {
    setShowForm(false);
    setEditLog(null);
    setFormDefaultDate(undefined);
    if (overHours) {
      setOverHoursWarning(true);
      setTimeout(() => setOverHoursWarning(false), 5000);
    }
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteError(null);
    try {
      await deleteActivityLog(deleteId);
      setDeleteId(null);
      loadData();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus log.");
    }
  };

  const displayLogs = useMemo(() => {
    if (!filterProjectId) return logs;
    return logs.filter((l) => l.projectId === filterProjectId);
  }, [logs, filterProjectId]);

  const dayLogsMap = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {};
    for (const log of displayLogs) {
      if (!map[log.activityDate]) map[log.activityDate] = [];
      map[log.activityDate].push(log);
    }
    return map;
  }, [displayLogs]);

  const [year, month] = filterMonth.split("-").map(Number);
  const daysCount = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);
  const daysLogged = useMemo(() => new Set(displayLogs.map((l) => l.activityDate)), [displayLogs]);
  const todayStr = todayJakarta();
  const minBackdate = getMinDate();

  // Build holiday map: date -> holiday name from Master Holidays database
  const holidayMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of holidays) map[h.date] = h.name;
    return map;
  }, [holidays]);

  const kpi = useMemo(() => {
    let totalMins = 0;
    for (const log of displayLogs) totalMins += getMins(log.startTime, log.endTime);

    let missedWeekdays = 0;
    let passedWeekdays = 0;
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${filterMonth}-${String(day).padStart(2, "0")}`;
      if (dateStr > todayStr) continue;
      const dow = parseLocalDate(dateStr).getDay();
      if (dow === 0 || dow === 6) continue;
      if (holidayMap[dateStr]) continue; // skip holidays
      passedWeekdays++;
      if (!daysLogged.has(dateStr)) missedWeekdays++;
    }

    const completionRate = passedWeekdays > 0 ? Math.round((daysLogged.size / passedWeekdays) * 100) : 0;

    return {
      hours: totalMins / 60,
      daysFilled: daysLogged.size,
      daysMissed: missedWeekdays,
      passedWeekdays,
      completionRate,
    };
  }, [displayLogs, daysCount, filterMonth, todayStr, daysLogged]);

  // Breakdown project untuk ringkasan di kolom kiri
  const projectBreakdown = useMemo(() => {
    const map: Record<
      number,
      {
        id: number;
        name: string;
        mins: number;
        logCount: number;
        dates: Set<string>;
      }
    > = {};

    for (const p of userProjects) {
      map[p.id] = { id: p.id, name: p.name, mins: 0, logCount: 0, dates: new Set<string>() };
    }

    for (const l of logs) {
      if (!map[l.projectId]) {
        map[l.projectId] = {
          id: l.projectId,
          name: l.projectName || `Project #${l.projectId}`,
          mins: 0,
          logCount: 0,
          dates: new Set<string>(),
        };
      }
      map[l.projectId].mins += getMins(l.startTime, l.endTime);
      map[l.projectId].logCount += 1;
      map[l.projectId].dates.add(l.activityDate);
    }

    const targetDays = kpi.passedWeekdays;

    return Object.values(map)
      .map((p) => {
        const hours = p.mins / 60;
        const daysFilled = p.dates.size;
        const daysMissed = Math.max(0, targetDays - daysFilled);
        const completionRate = targetDays > 0 ? Math.round((daysFilled / targetDays) * 100) : 0;

        const hoursLabel =
          hours > 0
            ? `${hours.toFixed(1)}j`
            : p.logCount > 0
              ? `${p.logCount} log`
              : "0j";

        return {
          ...p,
          hours,
          daysFilled,
          daysMissed,
          completionRate,
          hoursLabel,
        };
      })
      .sort((a, b) => b.daysFilled - a.daysFilled || b.logCount - a.logCount);
  }, [logs, userProjects, kpi.passedWeekdays]);

  const allDaysLogged = useMemo(() => new Set(logs.map((l) => l.activityDate)), [logs]);

  // Daftar hari kerja di bulan ini yang belum diisi (paling baru di atas, exclude holidays)
  const missingWorkdaysList = useMemo(() => {
    const list: string[] = [];
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${filterMonth}-${String(day).padStart(2, "0")}`;
      if (dateStr > todayStr) continue;
      const dow = parseLocalDate(dateStr).getDay();
      if (dow === 0 || dow === 6) continue;
      if (holidayMap[dateStr]) continue; // skip holidays
      if (!allDaysLogged.has(dateStr)) {
        list.push(dateStr);
      }
    }
    return list.reverse();
  }, [daysCount, filterMonth, todayStr, allDaysLogged, holidayMap]);

  const dayNum = useMemo(() => {
    return Number(selectedDate.split("-")[2]);
  }, [selectedDate]);

  const canGoPrevDay = dayNum > 1;
  const canGoNextDay = dayNum < daysCount;

  const handlePrevDay = () => {
    if (!canGoPrevDay) return;
    setSelectedDate(`${filterMonth}-${String(dayNum - 1).padStart(2, "0")}`);
  };

  const handleNextDay = () => {
    if (!canGoNextDay) return;
    setSelectedDate(`${filterMonth}-${String(dayNum + 1).padStart(2, "0")}`);
  };

  const selectedDayLogs = useMemo(() => {
    return dayLogsMap[selectedDate] || [];
  }, [dayLogsMap, selectedDate]);

  const timedSelectedDayLogs = useMemo(() => {
    return selectedDayLogs.filter((l) => l.startTime && l.endTime);
  }, [selectedDayLogs]);

  const selectedDayMins = useMemo(() => {
    return selectedDayLogs.reduce((acc, l) => acc + getMins(l.startTime, l.endTime), 0);
  }, [selectedDayLogs]);

  const isSelectedOverHours = selectedDayMins > 8 * 60;
  const selectedDurationLabel =
    selectedDayMins > 0
      ? `${Math.floor(selectedDayMins / 60)}j${selectedDayMins % 60 > 0 ? ` ${selectedDayMins % 60}m` : ""}`
      : null;

  const canAdd = userProjects.length > 0;

  return (
    <div className="min-h-screen bg-[var(--dash-bg-main)]">
      <div className="sticky top-0 z-20 bg-[var(--dash-bg-sidebar)]/80 backdrop-blur-xl border-b border-[var(--dash-border)]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <CalendarDays size={15} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[var(--dash-text-heading)] leading-none">
                My Timesheet
              </h1>
              <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5 hidden sm:block">
                Daily activity tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              onClick={() => handleToggleTimeRange(!useTimeRange)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${useTimeRange
                  ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-400"
                  : "bg-[var(--dash-bg-input)] border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-indigo-500/30"
                }`}
            >
              <Timer size={13} />
              <span className="text-[11px] font-bold hidden sm:inline">Time Range</span>
              <div
                className={`relative w-8 h-4 rounded-full transition-colors ${useTimeRange ? "bg-indigo-500" : "bg-[var(--dash-border)]"
                  }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${useTimeRange ? "left-[17px]" : "left-0.5"
                    }`}
                />
              </div>
            </div>

            <button
              onClick={() => openAddForm(selectedDate !== "all" && selectedDate <= todayStr && selectedDate >= minBackdate ? selectedDate : undefined)}
              disabled={!canAdd && !loading}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/25 disabled:opacity-40"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Log</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        {overHoursWarning && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Zap size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-[13px] text-amber-300 font-medium">
              Lebih dari 8 jam tercatat dalam satu hari. Log tetap tersimpan.
            </p>
            <button onClick={() => setOverHoursWarning(false)} className="ml-auto text-amber-400">
              <X size={15} />
            </button>
          </div>
        )}

        {emptyDays.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold text-amber-200">
                  {emptyDays.length} hari kerja minggu ini belum diisi
                </p>
                <p className="text-[12px] text-amber-300/80 mt-0.5">
                  {emptyDays.map(formatDateShort).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {emptyDays.slice(0, 4).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDate(d);
                    if (canAdd) openAddForm(d);
                  }}
                  disabled={!canAdd}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-[11px] font-bold transition-colors disabled:opacity-40"
                >
                  Isi {formatDateShort(d)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !canAdd && (
          <div className="text-center py-10 border border-[var(--dash-border)] border-dashed rounded-3xl bg-[var(--dash-bg-card)]/50">
            <FolderOpen size={28} className="mx-auto text-[var(--dash-text-faint)] mb-3" />
            <p className="text-[14px] font-bold text-[var(--dash-text-heading)]">
              Belum ada project aktif
            </p>
            <p className="text-[12px] text-[var(--dash-text-faint)] mt-1 max-w-sm mx-auto">
              Kamu belum ditugaskan ke project yang sedang berjalan. Hubungi PM untuk ditambahkan ke
              project.
            </p>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              label: "Jam tercatat",
              value: `${kpi.hours.toFixed(1)}j`,
              hint: "bulan ini",
            },
            {
              label: "Hari terisi",
              value: String(kpi.daysFilled),
              hint: "dengan log",
            },
            {
              label: "Hari terlewat",
              value: String(kpi.daysMissed),
              hint: "weekday kosong",
              warn: kpi.daysMissed > 0,
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
                className={`text-[22px] font-black mt-1 leading-none ${item.warn ? "text-rose-400" : "text-[var(--dash-text-heading)]"
                  }`}
              >
                {item.value}
              </p>
              <p className="text-[11px] text-[var(--dash-text-muted)] mt-1">{item.hint}</p>
            </div>
          ))}
        </div>

        {/* Monthly Tracker */}
        <div className="p-6 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[14px] font-bold text-[var(--dash-text-heading)]">
                Attendance Tracker
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {userProjects.length > 0 && (
                <div className="relative">
                  <select
                    value={filterProjectId ?? userProjects[0]?.id ?? ""}
                    onChange={(e) =>
                      setFilterProjectId(Number(e.target.value))
                    }
                    className="pl-3 pr-8 py-1.5 text-[12px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/50 text-[var(--dash-text-heading)] appearance-none cursor-pointer"
                  >
                    {userProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] pointer-events-none"
                  />
                </div>
              )}
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 text-[12px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/50 text-[var(--dash-text-heading)] transition-colors"
              />
            </div>
          </div>

          <div
            ref={trackerContainerRef}
            className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
          >
            {daysArray.map((day) => {
              const dateStr = `${filterMonth}-${String(day).padStart(2, "0")}`;
              const isLogged = daysLogged.has(dateStr);
              const dayOfWeek = parseLocalDate(dateStr).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isFuture = dateStr > todayStr;
              const holidayName = holidayMap[dateStr];
              const isHoliday = !!holidayName;
              const isMissing = !isLogged && !isWeekend && !isFuture && !isHoliday;
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  ref={isSelected ? activeDateRef : null}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  title={`${formatDateShort(dateStr)}: ${isHoliday ? `Libur — ${holidayName}` :
                      isLogged ? "Terisi" : isMissing ? "Belum diisi" : isWeekend ? "Akhir pekan" : "Mendatang"
                    } (Klik untuk buka detail)`}
                  className="flex flex-col items-center gap-2 min-w-[32px] group cursor-pointer"
                >
                  <span
                    className={`text-[10px] font-semibold transition-colors ${isSelected
                        ? "text-indigo-400 font-bold scale-110"
                        : isHoliday
                          ? "text-amber-400"
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
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${isSelected
                        ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--dash-bg-card)] scale-110 shadow-md shadow-indigo-500/30"
                        : ""
                      } ${isHoliday
                        ? "bg-amber-500/20 border-amber-500/40 group-hover:bg-amber-500/30"
                        : isLogged
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                          : isWeekend || isFuture
                            ? "bg-[var(--dash-bg-hover)] border-transparent"
                            : isMissing
                              ? "bg-rose-500/15 border-rose-500/40 group-hover:border-rose-400 group-hover:bg-rose-500/25"
                              : "bg-[var(--dash-bg-input)] border-[var(--dash-border)]"
                      }`}
                  >
                    {isHoliday && !isLogged && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                    {isLogged && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--dash-text-faint)] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Terisi
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400/80" /> Belum isi
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Hari libur
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--dash-border)]" /> Weekend / depan
            </span>
          </div>
        </div>

        {/* 2-Column Master-Detail Section */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Master Column (Left - 4 cols): Ringkasan Project & Distribusi Jam */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-4">
              {/* Card 1: Alokasi Project */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-indigo-400" />
                    <h3 className="text-[13px] font-bold text-[var(--dash-text-heading)]">
                      Alokasi Project
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--dash-text-faint)] font-medium">
                    {userProjects.length} ditugaskan
                  </span>
                </div>

                <div className="space-y-2">
                  {projectBreakdown.map((p) => {
                    const isSelected = filterProjectId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFilterProjectId(p.id)}
                        className={`w-full p-2.5 rounded-2xl border text-left transition-all group ${isSelected
                            ? "bg-indigo-600/15 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30"
                            : "bg-[var(--dash-bg-input)]/30 border-[var(--dash-border)] hover:bg-[var(--dash-bg-hover)]"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[12px] font-bold truncate ${isSelected
                                ? "text-indigo-300"
                                : "text-[var(--dash-text-heading)] group-hover:text-indigo-400"
                              }`}
                          >
                            {p.name}
                          </span>
                          <span className="text-[11px] font-bold text-[var(--dash-text-heading)] flex-shrink-0">
                            {p.hoursLabel}
                          </span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-[var(--dash-bg-input)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${p.completionRate === 100 ? "bg-emerald-500" : "bg-indigo-500"
                              }`}
                            style={{ width: `${Math.max(p.completionRate, p.daysFilled > 0 ? 3 : 0)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--dash-text-faint)]">
                          <span>{p.daysFilled} terisi • {p.daysMissed} belum diisi</span>
                          <span>{p.completionRate}% kelengkapan</span>
                        </div>
                      </button>
                    );
                  })}

                  {projectBreakdown.length === 0 && (
                    <p className="text-[11px] text-[var(--dash-text-faint)] text-center py-3">
                      Belum ada project yang ditugaskan.
                    </p>
                  )}
                </div>
              </div>

              {/* Hari Perlu Diisi */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays
                      size={16}
                      className={missingWorkdaysList.length > 0 ? "text-rose-400" : "text-emerald-400"}
                    />
                    <h3 className="text-[13px] font-bold text-[var(--dash-text-heading)]">
                      Hari Perlu Diisi
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${missingWorkdaysList.length > 0
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}
                  >
                    {missingWorkdaysList.length > 0 ? `${missingWorkdaysList.length} hari kosong` : "Lengkap"}
                  </span>
                </div>

                {missingWorkdaysList.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[var(--dash-text-muted)]">
                      Klik untuk langsung melengkapi timesheet pada tanggal yang terlewat:
                    </p>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {missingWorkdaysList.map((dateStr) => {
                        const isPassedBackdate = dateStr < minBackdate;
                        return (
                          <div
                            key={dateStr}
                            className="flex items-center justify-between p-2 rounded-xl bg-[var(--dash-bg-input)]/40 border border-[var(--dash-border)] hover:border-rose-500/30 transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedDate(dateStr)}
                              className="flex items-center gap-2 text-left min-w-0 group"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                              <span className="text-[11px] font-bold text-[var(--dash-text-heading)] group-hover:text-indigo-400 transition-colors truncate">
                                {formatDateFull(dateStr)}
                              </span>
                            </button>

                            {canAdd && !isPassedBackdate ? (
                              <button
                                type="button"
                                onClick={() => openAddForm(dateStr)}
                                className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
                              >
                                <Plus size={12} /> Isi
                              </button>
                            ) : isPassedBackdate ? (
                              <span className="text-[9px] text-[var(--dash-text-faint)]">Lewat batas</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2 text-emerald-400 text-[12px] font-medium">
                    <CheckCircle2 size={16} />
                    <span>Semua hari kerja telah terisi rapi!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Column (Right - 8 cols): Detail Aktivitas Hari Terpilih */}
            <div className="lg:col-span-8 xl:col-span-8">
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
                        {holidayMap[selectedDate] && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            🎉 {holidayMap[selectedDate]}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--dash-text-faint)] mt-1">
                        {holidayMap[selectedDate]
                          ? selectedDayLogs.length > 0
                            ? `${selectedDayLogs.length} aktivitas log tercatat`
                            : `Hari libur — ${holidayMap[selectedDate]}`
                          : selectedDayLogs.length > 0
                            ? `${selectedDayLogs.length} aktivitas log tercatat`
                            : parseLocalDate(selectedDate).getDay() === 0 || parseLocalDate(selectedDate).getDay() === 6
                              ? "Akhir pekan — tidak wajib mengisi log"
                              : selectedDate > todayStr
                                ? "Tanggal mendatang"
                                : "Belum ada aktivitas tercatat pada tanggal ini"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {selectedDurationLabel && (
                      <span
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${isSelectedOverHours
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-[var(--dash-bg-input)] text-[var(--dash-text-heading)] border-[var(--dash-border)]"
                          }`}
                      >
                        Total: {selectedDurationLabel} {isSelectedOverHours && "⚠ (>8j)"}
                      </span>
                    )}

                    {canAdd && selectedDate <= todayStr && (
                      <button
                        type="button"
                        onClick={() => openAddForm(selectedDate)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold shadow-md shadow-indigo-600/20 transition-all"
                      >
                        <Plus size={14} /> Tambah Log
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Bar (jika ada aktivitas dengan jam) */}
                {timedSelectedDayLogs.length > 0 && (
                  <div className="pt-1 pb-3 border-b border-[var(--dash-border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">
                        Distribusi Jam Kerja
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
                      {timedSelectedDayLogs.map((log) => {
                        const s =
                          log.startTime!.split(":").map(Number)[0] * 60 +
                          log.startTime!.split(":").map(Number)[1];
                        const e =
                          log.endTime!.split(":").map(Number)[0] * 60 +
                          log.endTime!.split(":").map(Number)[1];
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

                {/* Log Items or Empty State */}
                {selectedDayLogs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayLogs.map((log) => {
                      const style = hashPhase(log.phaseName);
                      return (
                        <div
                          key={log.id}
                          className="p-4 rounded-2xl bg-[var(--dash-bg-input)]/40 border border-[var(--dash-border)] hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-[13px] leading-relaxed text-[var(--dash-text-primary)]">
                                {log.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`} />
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
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditLog(log);
                                  setFormDefaultDate(undefined);
                                  setShowForm(true);
                                }}
                                className="p-2 hover:bg-[var(--dash-bg-hover)] text-indigo-400 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteId(log.id);
                                }}
                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty States per Kondisi Tanggal */
                  (() => {
                    const isWeekend =
                      parseLocalDate(selectedDate).getDay() === 0 || parseLocalDate(selectedDate).getDay() === 6;
                    const isFuture = selectedDate > todayStr;
                    const isHolidayDay = !!holidayMap[selectedDate];
                    const canAddForDay = canAdd && !isFuture && selectedDate >= minBackdate;

                    // 1. Hari Libur (prioritaskan tampilkan nama hari libur, baik di masa lalu, hari ini, maupun mendatang)
                    if (isHolidayDay) {
                      return (
                        <div className="text-center py-16 px-6 border border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5">
                          <span className="text-4xl mb-3 block">🎉</span>
                          <h4 className="text-[15px] font-bold text-amber-200">{holidayMap[selectedDate]}</h4>
                          <p className="text-[12px] text-amber-300/80 mt-1 max-w-sm mx-auto">
                            Hari ini adalah hari libur ({holidayMap[selectedDate]}). Tidak perlu mengisi log kerja.
                          </p>
                          {canAddForDay && (
                            <button
                              type="button"
                              onClick={() => openAddForm(selectedDate)}
                              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[12px] font-bold transition-colors"
                            >
                              <Plus size={14} /> Catat Log (Opsional)
                            </button>
                          )}
                        </div>
                      );
                    }

                    // 2. Tanggal Mendatang (bukan hari libur)
                    if (isFuture) {
                      return (
                        <div className="text-center py-16 px-6 border border-dashed border-[var(--dash-border)] rounded-2xl bg-[var(--dash-bg-input)]/20">
                          <Clock size={32} className="mx-auto text-[var(--dash-text-faint)] mb-2.5 opacity-60" />
                          <h4 className="text-[14px] font-bold text-[var(--dash-text-heading)]">Tanggal Mendatang</h4>
                          <p className="text-[12px] text-[var(--dash-text-faint)] mt-1 max-w-sm mx-auto">
                            Tanggal ini belum berjalan. Anda hanya dapat mengisi log untuk hari ini atau backdate hingga 7 hari sebelumnya.
                          </p>
                        </div>
                      );
                    }

                    if (isWeekend) {
                      return (
                        <div className="text-center py-16 px-6 border border-dashed border-[var(--dash-border)] rounded-2xl bg-[var(--dash-bg-input)]/20">
                          <Coffee size={32} className="mx-auto text-indigo-400 mb-2.5 opacity-80" />
                          <h4 className="text-[14px] font-bold text-[var(--dash-text-heading)]">Akhir Pekan</h4>
                          <p className="text-[12px] text-[var(--dash-text-faint)] mt-1 max-w-sm mx-auto">
                            Sabtu & Minggu bukan merupakan hari kerja wajib. Jika ada pekerjaan lembur di akhir pekan, Anda tetap dapat mencatatnya.
                          </p>
                          {canAddForDay && (
                            <button
                              type="button"
                              onClick={() => openAddForm(selectedDate)}
                              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-[12px] font-bold transition-colors"
                            >
                              <Plus size={14} /> Catat Log Lembur
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="text-center py-16 px-6 border border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5">
                        <AlertCircle size={32} className="mx-auto text-amber-400 mb-2.5" />
                        <h4 className="text-[14px] font-bold text-amber-200">Belum Ada Log Tercatat</h4>
                        <p className="text-[12px] text-amber-300/80 mt-1 max-w-sm mx-auto">
                          Hari kerja ini masih kosong. Pastikan Anda mengisi aktivitas kerja agar jam kerja harian tercatat lengkap.
                        </p>
                        {canAddForDay ? (
                          <button
                            type="button"
                            onClick={() => openAddForm(selectedDate)}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-all shadow-md shadow-indigo-600/20"
                          >
                            <Plus size={14} /> Isi Log {formatDateShort(selectedDate)}
                          </button>
                        ) : selectedDate < minBackdate ? (
                          <p className="text-[11px] text-rose-400/80 mt-3">
                            Sudah melewati batas backdate 7 hari kerja.
                          </p>
                        ) : null}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && canAdd && (
        <LogFormModal
          phases={phases}
          userProjects={userProjects}
          useTimeRange={useTimeRange}
          editLog={editLog}
          defaultProjectId={filterProjectId}
          defaultDate={formDefaultDate}
          onClose={() => {
            setShowForm(false);
            setEditLog(null);
            setFormDefaultDate(undefined);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] mb-2">
              Hapus Log?
            </h3>
            <p className="text-[13px] text-[var(--dash-text-muted)] mb-4">
              Yakin ingin menghapus activity log ini? Tindakan ini tidak bisa dibatalkan.
            </p>
            {deleteError && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl text-[13px] font-bold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
