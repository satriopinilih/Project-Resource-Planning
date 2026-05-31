"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  Trash2,
  Calendar,
  Loader2,
  Briefcase,
  UserPlus,
  X,
  Search,
  Check,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  FileText,
  ShieldAlert,
  LayoutGrid,
  Minus,
  Plus,
} from "lucide-react";
import {
  getProjectById,
  createHireRequest,
  createTimelineEditRequest,
  updateProject,
  BackendProject,
  BackendEmployee,
  BackendProjectMember,
  getRawEmployees,
  assignMemberToProject,
  unassignMemberFromProject,
  updateRoleCount,
  addRequiredRole,
  AddRequiredRolePayload,
  AssignMemberPayload,
  getHireRequests,
  swapMember,
  SwapMemberPayload,
} from "../../../../../lib/api";

import SmartRecommendationPanel from "../../components/SmartRecommendationPanel";
import ProjectGanttChart from "../../components/ProjectGanttChart";

const mapStatus = (backendStatus: number, startDateStr?: string) => {
  switch (backendStatus) {
    case 0: return { label: "Pending", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case 1: return { label: "Scheduled", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    case 2: {
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (startDate > today) return { label: "Scheduled", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      }
      return { label: "Running", class: "bg-green-500/10 text-green-400 border-green-500/20" };
    }
    case 3: return { label: "Completed", class: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
    default: return { label: "Pending", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  }
};

const mapPriority = (p: number) => {
  switch (p) {
    case 0: return "Low";
    case 1: return "Medium";
    case 2: return "High";
    default: return "Normal";
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const toInputDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

// TimelineBar component
function TimelineBar({ startDate, endDate, projectStart, projectEnd }: {
  startDate?: string | null;
  endDate?: string | null;
  projectStart: string;
  projectEnd?: string | null;
}) {
  const pStart = new Date(projectStart).getTime();
  const pEnd = projectEnd ? new Date(projectEnd).getTime() : pStart + 365 * 24 * 60 * 60 * 1000;
  const mStart = startDate ? new Date(startDate).getTime() : pStart;
  const mEnd = endDate ? new Date(endDate).getTime() : pEnd;
  const total = pEnd - pStart;
  if (total <= 0) return null;
  const left = Math.max(0, Math.min(100, ((mStart - pStart) / total) * 100));
  const width = Math.max(2, Math.min(100 - left, ((mEnd - mStart) / total) * 100));
  return (
    <div className="relative w-full h-2 bg-[var(--dash-bg-input)] rounded-full overflow-hidden">
      <div
        className="absolute top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
    </div>
  );
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [employees, setEmployees] = useState<BackendEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<BackendEmployee | null>(null);
  const [assignRole, setAssignRole] = useState("");
  const [assignStart, setAssignStart] = useState("");
  const [assignEnd, setAssignEnd] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignFromRole, setAssignFromRole] = useState(false); // true = opened from required role card

  // Remove member state
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Update role count state
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);

  // Add Role modal state
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addRoleForm, setAddRoleForm] = useState<{ roleName: string; count: number; workingType: number }>({
    roleName: "Junior Dev",
    count: 1,
    workingType: 0,
  });
  const [addRoleSubmitting, setAddRoleSubmitting] = useState(false);
  const [addRoleError, setAddRoleError] = useState<string | null>(null);

  // Hire Request state
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [hireRequestOpen, setHireRequestOpen] = useState(false);
  const [hireAlreadyRequested, setHireAlreadyRequested] = useState(false);
  const [hireRequestStatus, setHireRequestStatus] = useState<"none" | "Open" | "InProgress" | "Fulfilled" | "Declined">("none");
  const [hireForm, setHireForm] = useState({
    roleNeeded: "Senior Dev",
    quantity: 1,
    notes: "",
  });

  // Timeline Edit Request state
  const [timelineEditOpen, setTimelineEditOpen] = useState(false);
  const [timelineEditNotes, setTimelineEditNotes] = useState("");
  const [timelineEditSubmitting, setTimelineEditSubmitting] = useState(false);
  const [timelineEditRequested, setTimelineEditRequested] = useState(false);
  const [timelineEditStart, setTimelineEditStart] = useState("");
  const [timelineEditEnd, setTimelineEditEnd] = useState("");

  // Start Project state
  const [startingProject, setStartingProject] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Swap Member state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<BackendProjectMember | null>(null);
  const [swapReason, setSwapReason] = useState("");
  const [swapSelectedEmp, setSwapSelectedEmp] = useState<BackendEmployee | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const numericId = useMemo(() => {
    if (!idStr) return null;
    let id = idStr;
    if (id.startsWith("proj")) {
      id = id.replace("proj", "");
    }
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? null : parsed;
  }, [idStr]);

  const fetchProject = async () => {
    try {
      if (!numericId) return;
      const data = await getProjectById(String(numericId));
      setProject(data);
    } catch (err) {
      console.error("Error fetching project details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [numericId]);

  // Cek existing hire request
  useEffect(() => {
    const checkExistingHireRequest = async () => {
      if (!numericId) return;
      try {
        const rows = await getHireRequests(undefined, numericId);
        const hireRows = rows.filter((r) =>
          r.roleNeeded !== "Timeline Edit Request" &&
          r.roleNeeded !== "GM Notification" &&
          r.roleNeeded !== "Project Submission Notification" &&
          r.roleNeeded !== "Project Update Notification"
        );
        const timelineRows = rows.filter((r) => r.roleNeeded === "Timeline Edit Request");

        const latestHire = hireRows[0];
        setHireRequestStatus(latestHire?.status ?? "none");
        setHireAlreadyRequested(hireRows.some((r) => r.status === "Open" || r.status === "InProgress"));
        setTimelineEditRequested(timelineRows.some((r) => r.status === "Open" || r.status === "InProgress"));
      } catch {
        setHireRequestStatus("none");
        setHireAlreadyRequested(false);
        setTimelineEditRequested(false);
      }
    };
    checkExistingHireRequest();
  }, [numericId]);

  const openAssignModal = async (prefillRole?: string) => {
    setAssignModalOpen(true);
    setAssignError(null);
    setSelectedEmp(null);
    setAssignRole(prefillRole || "");
    setAssignFromRole(!!prefillRole); // hide role/date fields if opened from a role card
    setAssignStart(toInputDate(project?.estimatedStartDate));
    setAssignEnd(toInputDate(project?.estimatedEndDate));
    setEmpSearch("");

    if (employees.length === 0) {
      setEmployeesLoading(true);
      try {
        const data = await getRawEmployees();
        setEmployees(data);
      } catch {
      } finally {
        setEmployeesLoading(false);
      }
    }
  };

  const getEmployeeAvailability = (emp: BackendEmployee) => {
    if (!project) return { available: true, reason: "Available" };
    const projStart = new Date(project.estimatedStartDate).getTime();
    const projEnd = project.estimatedEndDate ? new Date(project.estimatedEndDate).getTime() : projStart + 365 * 24 * 60 * 60 * 1000;
    if (!emp.projects || emp.projects.length === 0) return { available: true, reason: "No active assignments" };

    for (const up of emp.projects) {
      const upStart = new Date(up.startDate).getTime();
      const upEnd = up.endDate ? new Date(up.endDate).getTime() : upStart + 365 * 24 * 60 * 60 * 1000;
      if (upStart < projEnd && upEnd > projStart) {
        return { available: false, reason: `Busy until ${up.endDate ? formatDate(up.endDate) : "Ongoing"}`, blockingProject: up.projectName };
      }
    }
    return { available: true, reason: "Available for this timeline" };
  };

  // Role-based filtering map: when assigning from a role card, show only matching employees
  const getRoleFilter = (roleName: string): string[] => {
    const r = roleName.toLowerCase();
    if (r === "pm") return ["pm"];
    if (r === "architect") return ["architect"];
    if (r === "senior dev") return ["senior dev"];
    if (r === "junior dev") return ["senior dev", "junior dev"];
    if (r === "senior ba") return ["senior ba"];
    if (r === "junior ba") return ["senior ba", "junior ba"];
    return []; // empty = no filter, show all
  };

  const filteredEmployees = useMemo(() => {
    const assignedIds = new Set(project?.members?.map((m) => m.userId) ?? []);
    const roleFilters = assignFromRole && assignRole ? getRoleFilter(assignRole) : [];
    return employees
      .filter((emp) => {
        if (assignedIds.has(emp.userId)) return false;
        // Role-based filtering when opened from a role card
        if (roleFilters.length > 0) {
          const empRole = (emp.role || "").toLowerCase();
          if (!roleFilters.some(rf => empRole.includes(rf))) return false;
        }
        if (!empSearch) return true;
        const q = empSearch.toLowerCase();
        return (emp.userName.toLowerCase().includes(q) || emp.role?.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const aAvail = getEmployeeAvailability(a).available;
        const bAvail = getEmployeeAvailability(b).available;
        if (aAvail && !bAvail) return -1;
        if (!aAvail && bAvail) return 1;
        return a.userName.localeCompare(b.userName);
      });
  }, [employees, empSearch, project, assignFromRole, assignRole]);

  const handleAssign = async () => {
    if (!selectedEmp || !project) return;
    const avail = getEmployeeAvailability(selectedEmp);
    if (!avail.available) return setAssignError(`Cannot assign ${selectedEmp.userName}: ${avail.reason}`);
    if (!assignRole.trim()) return setAssignError("Please specify a role for this member.");

    setAssigning(true);
    try {
      const payload: AssignMemberPayload = { userId: selectedEmp.userId, roleInProject: assignRole.trim() };
      if (assignStart) payload.startDate = new Date(assignStart).toISOString();
      if (assignEnd) payload.endDate = new Date(assignEnd).toISOString();
      const updated = await assignMemberToProject(project.projectId, payload);
      setProject(updated);
      setAssignModalOpen(false);
    } catch (err: any) {
      setAssignError(err?.message || "Failed to assign member.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRequestHireFromProject = async () => {
    if (!project || project.projectStatus !== 0) return;
    if (!hireForm.roleNeeded) return;
    try {
      setHireSubmitting(true);
      await createHireRequest({
        projectId: project.projectId,
        projectName: project.projectName,
        roleNeeded: hireForm.roleNeeded,
        quantity: Math.max(1, hireForm.quantity),
        startDate: project.estimatedStartDate,
        endDate: project.estimatedEndDate,
        notes: hireForm.notes || `Requested from project ${project.projectName}`,
      });
      setHireRequestOpen(false);
      setHireAlreadyRequested(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send hire request");
    } finally {
      setHireSubmitting(false);
    }
  };

  const handleRequestTimelineEdit = async () => {
    if (!project) return;
    try {
      setTimelineEditSubmitting(true);
      // Build notes including requested dates
      const requestedDateInfo = (timelineEditStart || timelineEditEnd)
        ? `\nRequested Timeline: ${timelineEditStart ? formatDate(timelineEditStart) : "(same)"} - ${timelineEditEnd ? formatDate(timelineEditEnd) : "(same)"}`
        : "";
      const fullNotes = (timelineEditNotes || `GM requesting timeline review for project ${project.projectName}`) + requestedDateInfo;

      await createTimelineEditRequest({
        projectId: project.projectId,
        projectName: project.projectName,
        notes: fullNotes,
        currentStartDate: timelineEditStart || project.estimatedStartDate,
        currentEndDate: timelineEditEnd || project.estimatedEndDate,
      });
      await createHireRequest({
        projectId: project.projectId,
        projectName: project.projectName,
        roleNeeded: "GM Notification",
        quantity: 1,
        startDate: project.estimatedStartDate,
        endDate: project.estimatedEndDate,
        notes: `[GM ACTION] Timeline edit requested for ${project.projectName}`,
      });
      setTimelineEditOpen(false);
      setTimelineEditRequested(true);
      setTimelineEditNotes("");
      setTimelineEditStart("");
      setTimelineEditEnd("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send timeline edit request");
    } finally {
      setTimelineEditSubmitting(false);
    }
  };

  const handleStartProject = async () => {
    if (!project) return;
    setStartingProject(true);
    try {
      await updateProject(project.projectId, { projectStatus: 1 });
      await fetchProject();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start project");
    } finally {
      setStartingProject(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    setRemovingUserId(userId);
    try {
      await unassignMemberFromProject(project.projectId, userId);
      await fetchProject();
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleUpdateRoleCount = async (roleId: number, currentCount: number, delta: number) => {
    if (!project) return;
    const newCount = currentCount + delta;
    if (newCount < 1) return;
    setUpdatingRoleId(roleId);
    try {
      const updated = await updateRoleCount(project.projectId, roleId, newCount);
      setProject(updated);
    } catch (err: any) {
      alert(err?.message || "Failed to update role count.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleAddRole = async () => {
    if (!project) return;
    setAddRoleSubmitting(true);
    setAddRoleError(null);
    try {
      const payload: AddRequiredRolePayload = {
        roleName: addRoleForm.roleName,
        count: addRoleForm.count,
        workingType: addRoleForm.workingType,
      };
      const updated = await addRequiredRole(project.projectId, payload);
      setProject(updated);
      setAddRoleOpen(false);
      setAddRoleForm({ roleName: "Junior Dev", count: 1, workingType: 0 });
    } catch (err: any) {
      setAddRoleError(err?.message || "Failed to add role.");
    } finally {
      setAddRoleSubmitting(false);
    }
  };

  // ── Swap Member handlers ──
  const openSwapModal = async (member: BackendProjectMember) => {
    setSwapTarget(member);
    setSwapModalOpen(true);
    setSwapError(null);
    setSwapSelectedEmp(null);
    setSwapReason("");
    setSwapSearch("");

    if (employees.length === 0) {
      setEmployeesLoading(true);
      try {
        const data = await getRawEmployees();
        setEmployees(data);
      } catch {
      } finally {
        setEmployeesLoading(false);
      }
    }
  };

  const swapFilteredEmployees = useMemo(() => {
    if (!swapTarget) return [];
    const assignedIds = new Set(project?.members?.filter(m => m.status === "Assigned").map((m) => m.userId) ?? []);
    const roleFilters = getRoleFilter(swapTarget.role);
    return employees
      .filter((emp) => {
        if (assignedIds.has(emp.userId)) return false;
        if (roleFilters.length > 0) {
          const empRole = (emp.role || "").toLowerCase();
          if (!roleFilters.some(rf => empRole.includes(rf))) return false;
        }
        if (!swapSearch) return true;
        const q = swapSearch.toLowerCase();
        return (emp.userName.toLowerCase().includes(q) || emp.role?.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const aAvail = getEmployeeAvailability(a).available;
        const bAvail = getEmployeeAvailability(b).available;
        if (aAvail && !bAvail) return -1;
        if (!aAvail && bAvail) return 1;
        return a.userName.localeCompare(b.userName);
      });
  }, [employees, swapSearch, swapTarget, project]);

  const handleSwapMember = async () => {
    if (!swapTarget || !swapSelectedEmp || !project) return;
    setSwapping(true);
    setSwapError(null);
    try {
      const payload: SwapMemberPayload = {
        oldUserId: swapTarget.userId,
        newUserId: swapSelectedEmp.userId,
        reason: swapReason || undefined,
      };
      const updated = await swapMember(project.projectId, payload);
      setProject(updated);
      setSwapModalOpen(false);
    } catch (err: any) {
      setSwapError(err?.message || "Failed to swap member.");
    } finally {
      setSwapping(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--dash-bg-page)]">
        <AppHeader title="Project Details" role="GM" />
        <div className="flex-1 flex items-center justify-center">
          {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" /> : <p className="text-[var(--dash-text-muted)]">Project not found.</p>}
        </div>
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus, project.estimatedStartDate);
  const totalNeeded = (project.requiredRoles || []).reduce((s, r) => s + (r.requiredCount ?? 0), 0);
  const totalFilled = (project.requiredRoles || []).reduce((s, r) => s + (r.filledCount ?? 0), 0);
  const staffingPct = totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : 0;
  const allRolesFilled = totalNeeded > 0 && totalFilled >= totalNeeded && project.projectStatus === 0;
  const isEditingTeam = project.projectStatus === 0 || isEditMode;

  return (
    <>
      <div className="flex-1 overflow-auto min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
        <AppHeader title="Project Details" role="GM" />

        <main className="flex-1 p-5 lg:p-7 max-w-[1360px] mx-auto space-y-6 pb-10">

          {/* 1. Project Summary Banner */}
          <section className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 pb-5 flex flex-col md:flex-row items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[#2B7FFC]/10 text-[#2B7FFC] text-[11px] font-bold uppercase tracking-widest rounded-md">
                    {project.clientOrganization}
                  </span>
                  <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border ${statusInfo.class}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <h1 className="text-[34px] font-bold text-[var(--dash-text-heading)] tracking-tight">{project.projectName}</h1>
                <p className="text-[14px] text-[var(--dash-text-secondary)] leading-relaxed max-w-4xl">{project.projectDescription}</p>
              </div>

              {project.projectStatus !== 0 && project.projectStatus !== 3 && (
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${isEditMode ? "bg-[var(--dash-bg-input)] hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-heading)]" : "bg-[#2B7FFC] hover:bg-[#2563eb] text-white"
                      }`}
                  >
                    {isEditMode ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                    {isEditMode ? "Done Editing" : "Edit Project"}
                  </button>
                </div>
              )}
            </div>

            {/* Combined Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 border-t border-[var(--dash-border)] bg-[var(--dash-bg-input)]">
              <div className="p-4 flex items-center gap-3 border-r border-[var(--dash-border)]">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Calendar size={18} className="text-blue-400" /></div>
                <div>
                  <p className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">Timeline</p>
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">
                    {formatDate(project.estimatedStartDate)} - {formatDate(project.estimatedEndDate)}
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3 border-r border-[var(--dash-border)]">
                <div className="p-2 bg-amber-500/10 rounded-lg"><TrendingUp size={18} className="text-amber-400" /></div>
                <div>
                  <p className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">Duration</p>
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">{project.estimatedDuration} weeks</p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3 border-r border-[var(--dash-border)]">
                <div className="p-2 bg-purple-500/10 rounded-lg"><FileText size={18} className="text-purple-400" /></div>
                <div>
                  <p className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">Priority</p>
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">{mapPriority(project.priorityLevel)}</p>
                </div>
              </div>
              {/* Staffing Progress merged into stats */}
              <div className="p-4 lg:col-span-2 flex flex-col justify-center gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">Staffing Progress</span>
                  <span className="text-[12px] text-[var(--dash-text-primary)] font-semibold">{totalFilled} / {totalNeeded} roles</span>
                </div>
                <div className="w-full h-2 bg-[var(--dash-bg-page)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${staffingPct === 100 ? "bg-green-500" : "bg-[#2B7FFC]"}`}
                    style={{ width: `${staffingPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Required Skills Row */}
            {(project.requiredSkills?.length ?? 0) > 0 && (
              <div className="p-3 px-5 border-t border-[var(--dash-border)] flex flex-wrap items-center gap-2.5 bg-[var(--dash-bg-input)]">
                <LayoutGrid size={14} className="text-[var(--dash-text-faint)]" />
                <span className="text-[12px] font-medium text-[var(--dash-text-muted)]">Required Skills:</span>
                {project.requiredSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 rounded-md bg-[var(--dash-bg-card)] text-[var(--dash-text-primary)] text-[11px] border border-[var(--dash-border)]">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 2. Smart Recommendations */}
          {project.projectStatus === 0 && numericId && (
            <SmartRecommendationPanel 
              projectId={numericId} 
              refreshTrigger={project.requiredRoles?.length} 
            />
          )}

          {/* 3. Role Management & Team */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">Role Management & Team</h2>
              {isEditingTeam && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setAddRoleOpen(true); setAddRoleError(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-[13px] font-semibold transition-all"
                  >
                    <Plus size={16} />
                    Add Role
                  </button>
                  <button
                    onClick={() => setHireRequestOpen(true)}
                    disabled={hireAlreadyRequested}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={16} />
                    {hireAlreadyRequested ? "Hire Requested" : "Request New Hire"}
                  </button>
                  <button
                    onClick={() => setTimelineEditOpen(true)}
                    disabled={timelineEditRequested}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Calendar size={16} />
                    {timelineEditRequested ? "Already Requested" : "Request Timeline Edit"}
                  </button>
                  {project.projectStatus === 0 && (
                    <button
                      onClick={handleStartProject}
                      disabled={!allRolesFilled || startingProject}
                      title={!allRolesFilled ? "All required roles must be filled before starting" : "Start this project"}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[13px] font-bold transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 disabled:shadow-none"
                    >
                      {startingProject ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {startingProject ? "Starting..." : "Submit Project"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {(!project.requiredRoles || project.requiredRoles.length === 0) ? (
              <div className="py-16 text-center border-2 border-dashed border-[var(--dash-border)] rounded-2xl">
                <Briefcase size={32} className="mx-auto text-[var(--dash-text-faint)] mb-3" />
                <p className="text-[var(--dash-text-muted)] text-[14px]">No specific roles required. Manage your team freely.</p>
                {isEditingTeam && (
                  <button onClick={() => openAssignModal()} className="text-blue-400 text-[13px] mt-2 font-bold hover:underline">
                    Assign members manually
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {project.requiredRoles.map((role) => {
                  const membersInRole = project.members?.filter(m => m.role.toLowerCase() === role.roleName.toLowerCase() && m.status === "Assigned") || [];
                  const isFilled = membersInRole.length >= (role.requiredCount ?? 0);

                  return (
                    <div key={role.id} className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl overflow-hidden flex flex-col shadow-sm">
                      {/* Role Header */}
                      <div className="p-5 border-b border-[var(--dash-border)] bg-[var(--dash-bg-input)]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] flex items-center gap-2">
                              {role.roleName}
                              {isFilled && <CheckCircle2 size={16} className="text-green-400" />}
                            </h3>
                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-[var(--dash-bg-card)] text-[var(--dash-text-muted)] text-[10px] uppercase font-bold tracking-wider rounded border border-[var(--dash-border)]">
                              {role.workingType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* +/- buttons for GM to adjust required count */}
                            {isEditingTeam && (
                              <div className="flex items-center gap-1 bg-[var(--dash-bg-page)] border border-[var(--dash-border)] rounded-lg px-1 py-0.5">
                                <button
                                  onClick={() => handleUpdateRoleCount(role.id, role.requiredCount ?? 1, -1)}
                                  disabled={updatingRoleId === role.id || (role.requiredCount ?? 1) <= (membersInRole.length || 1)}
                                  title="Decrease required count"
                                  className="p-1 rounded text-[var(--dash-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {updatingRoleId === role.id ? <Loader2 size={13} className="animate-spin" /> : <Minus size={13} />}
                                </button>
                                <span className="text-[12px] font-bold text-[var(--dash-text-primary)] w-5 text-center">
                                  {role.requiredCount ?? 1}
                                </span>
                                <button
                                  onClick={() => handleUpdateRoleCount(role.id, role.requiredCount ?? 1, +1)}
                                  disabled={updatingRoleId === role.id}
                                  title="Increase required count"
                                  className="p-1 rounded text-[var(--dash-text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {updatingRoleId === role.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                                </button>
                              </div>
                            )}
                            {!isFilled && isEditingTeam && (
                              <button
                                onClick={() => openAssignModal(role.roleName)}
                                className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md text-[12px] font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <UserPlus size={14} /> Assign ({membersInRole.length}/{role.requiredCount})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="flex items-center justify-between text-[11px] font-medium text-[var(--dash-text-muted)] mb-1.5">
                          <span>Progress</span>
                          <span>{membersInRole.length} / {role.requiredCount} Filled</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--dash-bg-page)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFilled ? "bg-green-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, (membersInRole.length / (role.requiredCount ?? 1)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Assigned Members List */}
                      <div className="p-3 flex-1 flex flex-col gap-2 min-h-[120px]">
                        {membersInRole.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                            <ShieldAlert size={20} className="text-amber-500/50 mb-2" />
                            <p className="text-[12px] text-[var(--dash-text-faint)]">No members assigned.</p>
                          </div>
                        ) : (
                          membersInRole.map(member => (
                            <div key={member.userId} className="p-3 bg-[var(--dash-bg-input)] rounded-xl border border-[var(--dash-border)] flex items-center justify-between group hover:border-[var(--dash-border-hover,#555)] transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {member.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-[var(--dash-text-primary)] truncate">{member.userName}</p>
                                  <p className="text-[11px] text-[var(--dash-text-faint)] truncate">
                                    {formatDate(member.startDate || project.estimatedStartDate)} - {formatDate(member.endDate || project.estimatedEndDate)}
                                  </p>
                                </div>
                              </div>
                              {isEditingTeam && (
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  disabled={removingUserId === member.userId}
                                  className="p-1.5 text-[var(--dash-text-faint)] hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                  {removingUserId === member.userId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Team Timeline (Gantt Chart) — shown for non-Pending projects */}
          {project.projectStatus !== 0 && (project.members || []).length > 0 && (
            <ProjectGanttChart
              project={project}
              isEditMode={isEditingTeam}
              onReplaceClick={openSwapModal}
            />
          )}

          {/* Footer filler */}
          <div className="h-10" />

        </main>
      </div>

      {/* ── Assign Member Modal ── */}
      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAssignModalOpen(false)}
        >
          <div
            className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-[var(--dash-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
              <div>
                <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Assign Team Member</h3>
                {assignRole && (
                  <p className="text-[12px] text-blue-400 font-semibold mt-0.5">For role: {assignRole}</p>
                )}
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Error banner */}
              {assignError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[13px]">
                  <AlertCircle size={16} />
                  {assignError}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 placeholder:text-[var(--dash-text-faint)] transition-colors"
                />
              </div>

              {/* Employee list */}
              {employeesLoading ? (
                <div className="flex items-center justify-center py-10 text-[var(--dash-text-faint)] gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Loading...</span>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-center py-8 text-[var(--dash-text-faint)] text-[13px]">No employees found.</p>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedEmp?.userId === emp.userId;
                      const avail = getEmployeeAvailability(emp);

                      return (
                        <button
                          key={emp.userId}
                          onClick={() => {
                            if (!avail.available) return;
                            setSelectedEmp(emp);
                            if (!assignRole) setAssignRole(emp.role || "");
                          }}
                          disabled={!avail.available}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${!avail.available
                            ? "border-[var(--dash-border)] bg-[var(--dash-bg-input)] opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "border-[#3b82f6] bg-[#3b82f6]/10 cursor-pointer shadow-sm"
                              : "border-[var(--dash-border)] bg-[var(--dash-bg-input)] hover:border-[#3b82f6]/40 hover:bg-[var(--dash-bg-hover)] cursor-pointer"
                            }`}
                        >
                          <div className="flex items-start gap-4 w-full">
                            {/* Avatar */}
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] flex-shrink-0 mt-0.5 ${!avail.available ? "bg-[var(--dash-bg-page)] text-[var(--dash-text-faint)]" : "bg-[#1e3a8a]/40 text-[#60a5fa]"}`}>
                              {emp.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <p className={`text-[15px] font-bold truncate ${!avail.available ? "text-[var(--dash-text-faint)]" : "text-[var(--dash-text-heading)]"}`}>
                                    {emp.userName}
                                  </p>
                                  {avail.available ? (
                                    <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                      Available
                                    </span>
                                  ) : (
                                    <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                      Unavailable
                                    </span>
                                  )}
                                </div>
                                {isSelected && avail.available && (
                                  <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0 shadow-md">
                                    <Check size={12} className="text-white" />
                                  </div>
                                )}
                              </div>

                              <p className={`text-[12px] mt-1 font-medium ${!avail.available ? "text-[var(--dash-text-faint)]" : "text-[var(--dash-text-muted)]"}`}>
                                {emp.role}
                                {emp.departmentName ? ` · ${emp.departmentName}` : ''}
                                {emp.experienceYears !== undefined ? ` · ${emp.experienceYears} yr experience` : ''}
                              </p>

                              {!avail.available && (
                                <div className="mt-2 flex items-start gap-2 text-red-400/80 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                  <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                                  <p className="text-[12px] leading-snug">
                                    <span className="font-semibold">{avail.reason}</span>
                                    {avail.blockingProject && <><br /><span className="opacity-80">Conflict: {avail.blockingProject}</span></>}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Projects */}
                          {avail.available && emp.projects && emp.projects.length > 0 && (
                            <div className="pl-[60px] flex flex-wrap gap-1.5">
                              <span className="text-[9px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider self-center mr-0.5">Projects:</span>
                              {emp.projects.map((proj: any) => (
                                <span
                                  key={proj.projectId ?? proj.projectName}
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${isSelected
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                    : "bg-[var(--dash-bg-page)] text-[var(--dash-text-muted)] border-[var(--dash-border)]"
                                    }`}
                                  title={`Role: ${proj.roleInProject || "—"}`}
                                >
                                  {proj.projectName}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Role field — hidden when opened from a required role card */}
              {!assignFromRole && (
                <div>
                  <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">Role in Project</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Dev, Project Manager..."
                    value={assignRole}
                    onChange={(e) => setAssignRole(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 placeholder:text-[var(--dash-text-faint)] transition-colors"
                  />
                </div>
              )}

              {/* Dates — hidden when opened from a required role card */}
              {!assignFromRole && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">Start</label>
                    <input
                      type="date"
                      value={assignStart}
                      onChange={(e) => setAssignStart(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] text-[var(--dash-text-primary)] outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:light_dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">End</label>
                    <input
                      type="date"
                      value={assignEnd}
                      onChange={(e) => setAssignEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] text-[var(--dash-text-primary)] outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:light_dark]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--dash-border)]">
              <div className="text-[12px] text-[var(--dash-text-muted)]">
                {selectedEmp ? (
                  <span>Selected: <span className="text-[var(--dash-text-heading)] font-semibold">{selectedEmp.userName}</span> as <span className="text-blue-400 font-semibold">{assignRole || "..."}</span></span>
                ) : (
                  <span className="italic">No employee selected</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-[var(--dash-bg-input)] hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-heading)] font-semibold text-[13px] rounded-lg border border-[var(--dash-border)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedEmp}
                  className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-[13px] rounded-lg transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
                >
                  {assigning && <Loader2 size={14} className="animate-spin" />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hire Request Modal ── */}
      {hireRequestOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setHireRequestOpen(false)}>
          <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-[var(--dash-text-primary)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
              <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Request New Hire</h3>
              <button onClick={() => setHireRequestOpen(false)} className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)]"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Project</label>
                <div className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px]">{project.projectName}</div>
              </div>

              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Staff Role Needed</label>
                <select
                  value={hireForm.roleNeeded}
                  onChange={(e) => setHireForm((p) => ({ ...p, roleNeeded: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-[var(--dash-text-primary)]"
                >
                  <option>Senior Dev</option>
                  <option>Junior Dev</option>
                  <option>Senior BA</option>
                  <option>Junior BA</option>
                  <option>Architect</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={hireForm.quantity}
                  onChange={(e) => setHireForm((p) => ({ ...p, quantity: Number(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-[var(--dash-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={hireForm.notes}
                  onChange={(e) => setHireForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Reason and context for HR"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-[var(--dash-text-primary)] placeholder:text-[var(--dash-text-faint)]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--dash-border)] flex justify-end gap-2">
              <button onClick={() => setHireRequestOpen(false)} className="px-4 py-2 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] font-semibold text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)]">Cancel</button>
              <button onClick={handleRequestHireFromProject} disabled={hireSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50">
                {hireSubmitting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline Edit Request Modal ── */}
      {timelineEditOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setTimelineEditOpen(false)}>
          <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-[var(--dash-text-primary)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
              <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Request Timeline Edit</h3>
              <button onClick={() => setTimelineEditOpen(false)} className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)]"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Project</label>
                <div className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px]">{project.projectName}</div>
              </div>

              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Current Timeline</label>
                <div className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-amber-400">
                  {formatDate(project.estimatedStartDate)} - {formatDate(project.estimatedEndDate)}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Requested Timeline</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[var(--dash-text-faint)] mb-1 uppercase tracking-wider font-bold">Start Date</label>
                    <input
                      type="date"
                      value={timelineEditStart}
                      onChange={(e) => setTimelineEditStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-[var(--dash-text-primary)] outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:light_dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--dash-text-faint)] mb-1 uppercase tracking-wider font-bold">End Date</label>
                    <input
                      type="date"
                      value={timelineEditEnd}
                      onChange={(e) => setTimelineEditEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-[var(--dash-text-primary)] outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:light_dark]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[var(--dash-text-muted)] mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={timelineEditNotes}
                  onChange={(e) => setTimelineEditNotes(e.target.value)}
                  placeholder="e.g. Please delay the start date by 2 weeks due to resource constraints."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] text-[13px] text-[var(--dash-text-primary)] placeholder:text-[var(--dash-text-faint)]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--dash-border)] flex justify-end gap-2">
              <button onClick={() => setTimelineEditOpen(false)} className="px-4 py-2 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] font-semibold text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)]">Cancel</button>
              <button onClick={handleRequestTimelineEdit} disabled={timelineEditSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50">
                {timelineEditSubmitting ? "Sending..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Add Role Modal ── */}
      {addRoleOpen && project && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAddRoleOpen(false)}
        >
          <div
            className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-[var(--dash-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
              <div>
                <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Add Required Role</h3>
                <p className="text-[12px] text-purple-400 font-semibold mt-0.5">GM override — add role not set by marketing</p>
              </div>
              <button
                onClick={() => setAddRoleOpen(false)}
                className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Error */}
              {addRoleError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[13px]">
                  <AlertCircle size={16} />
                  {addRoleError}
                </div>
              )}

              {/* Role Name */}
              <div>
                <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">Role</label>
                <select
                  value={addRoleForm.roleName}
                  onChange={(e) => setAddRoleForm((p) => ({ ...p, roleName: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] text-[var(--dash-text-primary)] outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option>PM</option>
                  <option>Architect</option>
                  <option>Senior Dev</option>
                  <option>Junior Dev</option>
                  <option>Senior BA</option>
                  <option>Junior BA</option>
                </select>
              </div>

              {/* Working Type */}
              <div>
                <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">Working Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: "Dedicated", value: 0 }, { label: "Non Dedicated", value: 1 }].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAddRoleForm((p) => ({ ...p, workingType: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-[13px] font-semibold border transition-all ${addRoleForm.workingType === opt.value
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                          : "bg-[var(--dash-bg-input)] border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-purple-500/30"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div>
                <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">Required Count</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAddRoleForm((p) => ({ ...p, count: Math.max(1, p.count - 1) }))}
                    className="w-9 h-9 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] flex items-center justify-center text-[var(--dash-text-muted)] hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-[22px] font-bold text-[var(--dash-text-heading)] w-8 text-center">{addRoleForm.count}</span>
                  <button
                    type="button"
                    onClick={() => setAddRoleForm((p) => ({ ...p, count: Math.min(20, p.count + 1) }))}
                    className="w-9 h-9 rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] flex items-center justify-center text-[var(--dash-text-muted)] hover:text-green-400 hover:border-green-500/30 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Preview</p>
                <p className="text-[13px] text-[var(--dash-text-primary)]">
                  Adding <span className="font-bold text-purple-300">{addRoleForm.count}×</span>{" "}
                  <span className="font-bold text-[var(--dash-text-heading)]">{addRoleForm.roleName}</span>{" "}
                  <span className="text-[var(--dash-text-muted)]">({addRoleForm.workingType === 0 ? "Dedicated" : "Shared"})</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--dash-border)]">
              <button
                onClick={() => setAddRoleOpen(false)}
                className="px-4 py-2 bg-[var(--dash-bg-input)] hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-heading)] font-semibold text-[13px] rounded-lg border border-[var(--dash-border)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                disabled={addRoleSubmitting}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-[13px] rounded-lg transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
              >
                {addRoleSubmitting && <Loader2 size={14} className="animate-spin" />}
                {addRoleSubmitting ? "Adding..." : "Add Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Swap Member Modal ── */}
      {swapModalOpen && project && swapTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSwapModalOpen(false)}
        >
          <div
            className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-[var(--dash-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
              <div>
                <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Replace Team Member</h3>
                <p className="text-[12px] text-amber-400 font-semibold mt-0.5">
                  Replacing <span className="text-[var(--dash-text-heading)]">{swapTarget.userName}</span> as <span className="text-blue-400">{swapTarget.role}</span>
                </p>
              </div>
              <button
                onClick={() => setSwapModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Error */}
              {swapError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[13px]">
                  <AlertCircle size={16} />
                  {swapError}
                </div>
              )}

              {/* Current member info */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-1">Replacing</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[12px]">
                    {swapTarget.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--dash-text-heading)]">{swapTarget.userName}</p>
                    <p className="text-[11px] text-[var(--dash-text-muted)]">{swapTarget.role} · Will be marked as completed</p>
                  </div>
                </div>
              </div>

              {/* Search replacement */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                <input
                  type="text"
                  placeholder="Search replacement employee..."
                  value={swapSearch}
                  onChange={(e) => setSwapSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 placeholder:text-[var(--dash-text-faint)] transition-colors"
                />
              </div>

              {/* Employee list */}
              {employeesLoading ? (
                <div className="flex items-center justify-center py-10 text-[var(--dash-text-faint)] gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Loading...</span>
                </div>
              ) : (
                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-2">
                  {swapFilteredEmployees.length === 0 ? (
                    <p className="text-center py-8 text-[var(--dash-text-faint)] text-[13px]">No available employees found for this role.</p>
                  ) : (
                    swapFilteredEmployees.map((emp) => {
                      const isSelected = swapSelectedEmp?.userId === emp.userId;
                      const avail = getEmployeeAvailability(emp);
                      return (
                        <button
                          key={emp.userId}
                          onClick={() => { if (avail.available) setSwapSelectedEmp(emp); }}
                          disabled={!avail.available}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${!avail.available
                            ? "border-[var(--dash-border)] bg-[var(--dash-bg-input)] opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "border-[#22c55e] bg-[#22c55e]/10 cursor-pointer shadow-sm"
                              : "border-[var(--dash-border)] bg-[var(--dash-bg-input)] hover:border-[#22c55e]/40 cursor-pointer"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0 ${
                            !avail.available ? "bg-[var(--dash-bg-page)] text-[var(--dash-text-faint)]" : "bg-[#22c55e]/20 text-[#22c55e]"
                          }`}>
                            {emp.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-bold text-[var(--dash-text-heading)] truncate">{emp.userName}</p>
                              {avail.available ? (
                                <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">Available</span>
                              ) : (
                                <span className="text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">Busy</span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--dash-text-muted)] truncate">
                              {emp.role}{emp.departmentName ? ` · ${emp.departmentName}` : ''}
                              {emp.experienceYears !== undefined ? ` · ${emp.experienceYears}yr exp` : ''}
                            </p>
                          </div>
                          {isSelected && avail.available && (
                            <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Reason (optional) */}
              <div>
                <label className="block text-[11px] text-[var(--dash-text-faint)] font-semibold mb-1.5 uppercase tracking-wider">Reason for Replacement (Optional)</label>
                <textarea
                  rows={2}
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="e.g. Performance issue, leave of absence, skill mismatch..."
                  className="w-full px-3 py-2 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg text-[13px] outline-none focus:border-amber-500/50 placeholder:text-[var(--dash-text-faint)] transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--dash-border)]">
              <div className="text-[12px] text-[var(--dash-text-muted)]">
                {swapSelectedEmp ? (
                  <span>Replace with: <span className="text-[#22c55e] font-semibold">{swapSelectedEmp.userName}</span></span>
                ) : (
                  <span className="italic">Select a replacement</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSwapModalOpen(false)}
                  className="px-4 py-2 bg-[var(--dash-bg-input)] hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-heading)] font-semibold text-[13px] rounded-lg border border-[var(--dash-border)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwapMember}
                  disabled={swapping || !swapSelectedEmp}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-[13px] rounded-lg transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
                >
                  {swapping && <Loader2 size={14} className="animate-spin" />}
                  {swapping ? "Swapping..." : "Confirm Swap"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
