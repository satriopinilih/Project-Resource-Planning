"use client";

import { useState, useEffect, useMemo } from "react";
import { getSessionUser, SessionUser } from "@/lib/auth";
import { getEmployeeById, getEmployeeFormOptions, updateEmployeeSkills, LookupItem } from "@/lib/api";
import { Employee, Project, ContractHistoryItem } from "@/lib/types";
import {
  Loader2, Search, Calendar as CalendarIcon, FolderKanban, CalendarClock, Users,
  CheckCircle2, AlertTriangle, FileText, ChevronRight, Clock
} from "lucide-react";
import Link from "next/link";
import GanttTimeline from "./GanttTimeline";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
};

// ── Contract Detail Widget ────────────────────────────────────────────────────
function ContractDetailWidget({ employee }: { employee: Employee }) {
  const active = employee.contractHistory?.find((h) => h.isActive);
  const rawDays = active?.daysUntilExpiry ?? employee.daysRemaining;
  const daysLeft: number | null = rawDays !== undefined ? rawDays : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 60 && daysLeft >= 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <FileText size={15} className="text-blue-400" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-[var(--dash-text-heading)]">Contract Detail</h3>
          <p className="text-[10px] text-[var(--dash-text-faint)]">Your current contract information</p>
        </div>
      </div>

      {/* Role */}
      <div className="mb-3">
        <p className="text-[10px] text-[var(--dash-text-faint)] uppercase tracking-wider font-semibold mb-0.5">Role</p>
        <p className="text-[14px] font-bold text-[var(--dash-text-heading)]">{employee.role}</p>
      </div>

      {/* Current Contract Period */}
      {active && (
        <div className="mb-3">
          <p className="text-[10px] text-[var(--dash-text-faint)] uppercase tracking-wider font-semibold mb-0.5">
            Current Contract Period
          </p>
          <p className="text-[13px] font-semibold text-[var(--dash-text-primary)]">
            {fmtDate(active.startDate)} – {active.endDate ? fmtDate(active.endDate) : "No End Date"}
          </p>
          {active.duration && (
            <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">({active.duration})</p>
          )}
        </div>
      )}

      {/* Days Until Expiry */}
      {(isExpiringSoon || isExpired) && (
        <div className={`mt-3 flex items-start gap-2.5 p-3 rounded-xl border ${
          isExpired
            ? "bg-red-500/10 border-red-500/20"
            : "bg-amber-500/10 border-amber-500/20"
        }`}>
          <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${isExpired ? "text-red-400" : "text-amber-400"}`} />
          <div>
            <p className={`text-[12px] font-bold ${isExpired ? "text-red-400" : "text-amber-400"}`}>
              {isExpired ? "Contract Expired" : `${daysLeft} days left`}
            </p>
            <p className={`text-[10px] mt-0.5 ${isExpired ? "text-red-300/70" : "text-amber-300/70"}`}>
              {isExpired
                ? "Please contact HR to renew your contract."
                : `Contract will expire on ${fmtDate(active?.endDate ?? employee.contractEnd)}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contract History Preview Widget ──────────────────────────────────────────
function ContractHistoryPreview({ history }: { history: ContractHistoryItem[] }) {
  const preview = history.slice(0, 3);

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Clock size={15} className="text-purple-400" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-[var(--dash-text-heading)]">Contract History</h3>
          <p className="text-[10px] text-[var(--dash-text-faint)]">History of your contract extensions</p>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-[var(--dash-border)]" />

        <div className="space-y-4">
          {preview.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 pl-6 relative">
              {/* Node */}
              <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 z-10 ${
                item.isActive
                  ? "bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  : "bg-[var(--dash-bg-card)] border-[var(--dash-border)]"
              }`} />
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[12px] font-semibold text-[var(--dash-text-primary)]">
                    {fmtDate(item.startDate)} – {item.endDate ? fmtDate(item.endDate) : "Ongoing"}
                  </p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    item.isActive
                      ? "bg-green-500/15 text-green-400 border border-green-500/20"
                      : "bg-[var(--dash-bg-input)] text-[var(--dash-text-faint)] border border-[var(--dash-border)]"
                  }`}>
                    {item.isActive ? "Current" : "Completed"}
                  </span>
                </div>
                {item.extendedBy && (
                  <p className="text-[10px] text-[var(--dash-text-faint)]">Extended by {item.extendedBy}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Full History Button */}
      <Link
        href="/dashboard/contract-history"
        className="mt-5 flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-[var(--dash-border)] text-[12px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-200"
      >
        View full history
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<LookupItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [submittingSkills, setSubmittingSkills] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  const filteredSkills = useMemo(() => {
    if (!skillSearchQuery.trim()) return availableSkills;
    return availableSkills.filter(skill =>
      skill.name.toLowerCase().includes(skillSearchQuery.toLowerCase())
    );
  }, [availableSkills, skillSearchQuery]);

  useEffect(() => {
    const sessionUser = getSessionUser();
    setUser(sessionUser);

    if (sessionUser?.userId) {
      getEmployeeById(sessionUser.userId)
        .then((data) => {
          setEmployee(data);
          if (data.skills && data.skills.length === 0) {
            getEmployeeFormOptions().then((options) => {
              setAvailableSkills(options.skills);
              setIsSkillModalOpen(true);
            });
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const hasAnyCompletedProjects = employee?.projects?.some(p => p.status === 'Completed') ?? false;

  const activeProjects = useMemo(() => {
    if (!employee?.projects) return [];
    let projects = employee.projects.filter(p => p.status !== 'Completed' && !p.roleInProject?.includes('Notification'));
    if (searchQuery.trim()) {
      projects = projects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.roleInProject && p.roleInProject.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return projects;
  }, [employee, searchQuery]);

  const completedProjects = useMemo(() => {
    if (!employee?.projects) return [];
    let projects = employee.projects.filter(p => p.status === 'Completed' && !p.roleInProject?.includes('Notification'));
    if (completedSearchQuery.trim()) {
      projects = projects.filter((p) =>
        p.name.toLowerCase().includes(completedSearchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(completedSearchQuery.toLowerCase()) ||
        (p.roleInProject && p.roleInProject.toLowerCase().includes(completedSearchQuery.toLowerCase()))
      );
    }
    return projects;
  }, [employee, completedSearchQuery]);

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-[var(--dash-text-muted)]">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-[14px]">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <p className="text-[14px] text-[#ef4444]">{error}</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const totalCount = employee?.projects?.filter(p => !p.roleInProject?.includes('Notification')).length ?? 0;
  const scheduledCount = employee?.projects?.filter(p => p.status === 'Scheduled' && !p.roleInProject?.includes('Notification')).length ?? 0;
  const runningCount = employee?.projects?.filter(p => p.status === 'Running' && !p.roleInProject?.includes('Notification')).length ?? 0;
  const completedCount = employee?.projects?.filter(p => p.status === 'Completed' && !p.roleInProject?.includes('Notification')).length ?? 0;

  const contractHistory = employee?.contractHistory ?? [];

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-[var(--dash-text-heading)] tracking-tight">
                {greeting}, {user?.userName}
              </h1>
              <p className="text-[var(--dash-text-muted)] text-sm mt-1 leading-relaxed">
                Overview of your current project landscape.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[var(--dash-bg-card)] backdrop-blur-md p-1.5 rounded-2xl border border-[var(--dash-border)] shadow-sm">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="p-2 bg-blue-500/10 rounded-xl dark:bg-blue-500/20">
                    <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[var(--dash-text-faint)] uppercase font-black tracking-widest leading-none mb-1">
                      Calendar
                    </span>
                    <span className="text-sm font-bold text-[var(--dash-text-primary)]">
                      {formatDate(new Date())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 select-none">
            <div className="sm:col-span-2 bg-[#2563eb] text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/80">Total Projects</p>
                <h3 className="text-3xl font-bold text-white mt-1.5">{totalCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--dash-text-muted)]">Scheduled</p>
                <h3 className="text-3xl font-bold text-purple-400 mt-1.5">{scheduledCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5 text-purple-400" />
              </div>
            </div>

            <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--dash-text-muted)]">Running</p>
                <h3 className="text-3xl font-bold text-emerald-500 mt-1.5">{runningCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--dash-text-muted)]">Completed</p>
                <h3 className="text-3xl font-bold text-[var(--dash-text-heading)] mt-1.5">{completedCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[var(--dash-text-muted)]" />
              </div>
            </div>
          </div>

      {/* Two-column layout for Projects and Contract sidebar */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Left: Projects ── */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* My Assigned Projects Table */}
          <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">My Assigned Projects</h3>
                <p className="text-[12px] text-[var(--dash-text-muted)] mt-1">Overview of your current and upcoming project assignments</p>
              </div>

              <div className="relative w-72">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]"
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 text-[13px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none placeholder:text-[var(--dash-text-faint)] focus:border-[#3b82f6]/50 transition-colors duration-200"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--dash-border-subtle)] text-[11px] uppercase tracking-wider text-[var(--dash-text-muted)] font-semibold">
                    <th className="pb-2 px-4 pl-0">Project Name</th>
                    <th className="pb-2 px-4">Client</th>
                    <th className="pb-2 px-4">My Role</th>
                    <th className="pb-2 px-4">Start Date</th>
                    <th className="pb-2 px-4">End Date</th>
                    <th className="pb-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map((project: Project, index: number) => (
                    <tr
                      key={project.userProjectId ?? `${project.id}-${index}`}
                      className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[var(--dash-bg-hover)] transition-colors group"
                    >
                      <td className="py-2.5 px-4 pl-0 text-[13px] font-semibold text-[var(--dash-text-heading)] hover:text-[#3b82f6] transition-colors">
                        {project.name}
                      </td>
                      <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                        {project.client}
                      </td>
                      <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--dash-bg-input)] border border-[var(--dash-border-subtle)]">
                          {project.roleInProject || "Member"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                        {project.startDate}
                      </td>
                      <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                        {project.endDate}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${project.status === 'Completed'
                          ? 'bg-[#64748b]/20 border-[#64748b]/60 text-[#64748b]'
                          : project.status === 'Scheduled'
                            ? 'bg-[#3b82f6]/20 border-[#3b82f6]/60 text-[#3b82f6]'
                            : project.status === 'Hold'
                              ? 'bg-[#f59e0b]/20 border-[#f59e0b]/60 text-[#f59e0b]'
                              : 'bg-[#22c55e]/20 border-[#22c55e]/60 text-[#22c55e]'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'Completed' ? 'bg-[#64748b]' :
                            project.status === 'Scheduled' ? 'bg-[#3b82f6]' : project.status === 'Hold' ? 'bg-[#f59e0b]' : 'bg-[#22c55e]'
                            }`} />
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {activeProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[13px] text-[var(--dash-text-faint)]">
                        No active projects found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gantt-style Project Timeline */}
          {activeProjects.length > 0 && (
            <GanttTimeline projects={activeProjects} />
          )}

          {/* Completed Projects */}
          {hasAnyCompletedProjects && (
            <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300 shadow-sm mt-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">Past / Completed Assignments</h3>
                  <p className="text-[12px] text-[var(--dash-text-muted)] mt-1">Projects where your involvement has concluded</p>
                </div>

                <div className="relative w-72">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    placeholder="Search past projects..."
                    value={completedSearchQuery}
                    onChange={(e) => setCompletedSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-4 text-[13px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none placeholder:text-[var(--dash-text-faint)] focus:border-[#3b82f6]/50 transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse opacity-70">
                  <thead>
                    <tr className="border-b border-[var(--dash-border-subtle)] text-[11px] uppercase tracking-wider text-[var(--dash-text-muted)] font-semibold">
                      <th className="pb-2 px-4 pl-0">Project Name</th>
                      <th className="pb-2 px-4">Client</th>
                      <th className="pb-2 px-4">My Role</th>
                      <th className="pb-2 px-4">Start Date</th>
                      <th className="pb-2 px-4">End Date</th>
                      <th className="pb-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedProjects.map((project: Project, index: number) => (
                      <tr
                        key={project.userProjectId ?? `${project.id}-${index}`}
                        className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[var(--dash-bg-hover)] transition-colors group"
                      >
                        <td className="py-2.5 px-4 pl-0 text-[13px] font-semibold text-[var(--dash-text-heading)]">
                          {project.name}
                        </td>
                        <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                          {project.client}
                        </td>
                        <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--dash-bg-input)] border border-[var(--dash-border-subtle)]">
                            {project.roleInProject || "Member"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                          {project.startDate}
                        </td>
                        <td className="py-2.5 px-4 text-[13px] text-[var(--dash-text-muted)] whitespace-nowrap">
                          {project.endDate}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-[#64748b]/20 border-[#64748b]/60 text-[#64748b]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#64748b]" />
                            {project.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {completedProjects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[13px] text-[var(--dash-text-faint)]">
                          No matching past projects found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Contract sidebar ── */}
        {employee && (
          <div className="w-full xl:w-[320px] shrink-0 space-y-4">
            <ContractDetailWidget employee={employee} />
            {contractHistory.length > 0 && (
              <ContractHistoryPreview history={contractHistory} />
            )}
          </div>
        )}
      </div>

      {/* Skill Selection Modal */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="relative bg-[#0d121f]/90 border border-white/[0.08] rounded-3xl p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-blue-600" />

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <h2 className="text-[22px] font-extrabold tracking-tight text-white mb-2">
                Select Your Expertise
              </h2>
              <p className="text-[14px] text-slate-400 max-w-sm">
                Choose the skills that define your professional focus. This helps team leads match you with ideal projects.
              </p>
            </div>

            {skillError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {skillError}
              </div>
            )}

            <div className="space-y-3 mb-5 relative z-10">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search and filter skills..."
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-[13px] text-white bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>

              <div className="flex items-center justify-between text-[12px] px-1">
                <span className="text-slate-400">
                  {selectedSkillIds.length > 0 ? (
                    <span>
                      Selected <strong className="text-indigo-400 font-bold">{selectedSkillIds.length}</strong> {selectedSkillIds.length === 1 ? 'skill' : 'skills'}
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      Select at least 1 skill to proceed
                    </span>
                  )}
                </span>

                {selectedSkillIds.length > 0 && (
                  <button
                    onClick={() => setSelectedSkillIds([])}
                    className="text-slate-500 hover:text-white transition-colors duration-150 font-medium cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 max-h-[220px] overflow-y-auto pr-1 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredSkills.length === 0 ? (
                <div className="w-full text-center py-8 text-[13px] text-slate-500 border border-dashed border-white/[0.05] rounded-2xl bg-white/[0.01]">
                  No matching skills found
                </div>
              ) : (
                filteredSkills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => {
                        setSelectedSkillIds(prev =>
                          isSelected ? prev.filter(id => id !== skill.id) : [...prev, skill.id]
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer text-center ${isSelected
                        ? "bg-blue-600 text-white border border-blue-500"
                        : "bg-white/[0.03] text-slate-300 border border-white/[0.08]"
                        }`}
                    >
                      {skill.name}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] pt-5 relative z-10">
              <span className="text-[11px] text-slate-500">
                You can change these options later in settings.
              </span>

              <button
                disabled={selectedSkillIds.length === 0 || submittingSkills}
                onClick={async () => {
                  if (!user?.userId) return;
                  setSubmittingSkills(true);
                  setSkillError(null);
                  try {
                    await updateEmployeeSkills(user.userId, selectedSkillIds);
                    setIsSkillModalOpen(false);
                    const updated = await getEmployeeById(user.userId);
                    setEmployee(updated);
                  } catch (err: any) {
                    setSkillError(err.message || "Failed to save skills");
                  } finally {
                    setSubmittingSkills(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-300 shadow-[0_4px_15px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_22px_rgba(37,99,235,0.45)] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2 justify-center cursor-pointer"
              >
                {submittingSkills && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                <span>Save &amp; Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
