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
  LayoutGrid,
  ChevronRight,
  X,
  Search,
  Check,
  AlertCircle,
  Target,
  TrendingUp,
  CheckCircle2,
  Users2,
  Building2,
  FileText,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  getProjectById,
  createHireRequest,
  BackendProject,
  BackendProjectMember,
  BackendRequiredRole,
  getRawEmployees,
  BackendEmployee,
  assignMemberToProject,
  unassignMemberFromProject,
  AssignMemberPayload,
  getHireRequests,
} from "../../../../../lib/api";
import SmartRecommendationPanel from "../../components/SmartRecommendationPanel";

const mapStatus = (backendStatus: number, startDateStr?: string) => {
  // Backend enum: 0=Pending, 1=Scheduled, 2=Running, 3=Completed
  // Same as dashboard StatCards and project list
  switch (backendStatus) {
    case 0: return { label: "Pending",   class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case 1: return { label: "Scheduled", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    case 2: {
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (startDate > today) return { label: "Scheduled", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      }
      return { label: "Active", class: "bg-green-500/10 text-green-400 border-green-500/20" };
    }
    case 3: return { label: "Completed", class: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
    default: return { label: "Pending",  class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
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

/* ── Timeline bar helper ── */
function TimelineBar({
  startDate,
  endDate,
  projectStart,
  projectEnd,
}: {
  startDate: string | null;
  endDate: string | null;
  projectStart: string;
  projectEnd: string;
}) {
  const pStart = new Date(projectStart).getTime();
  const pEnd = new Date(projectEnd).getTime();
  const mStart = startDate ? new Date(startDate).getTime() : pStart;
  const mEnd = endDate ? new Date(endDate).getTime() : pEnd;
  const total = pEnd - pStart || 1;
  const left = Math.max(0, Math.min(100, ((mStart - pStart) / total) * 100));
  const width = Math.max(2, Math.min(100 - left, ((mEnd - mStart) / total) * 100));

  return (
    <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
      <div
        className="absolute top-0 h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] rounded-full transition-all duration-500"
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

  // Remove member state
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [hireRequestOpen, setHireRequestOpen] = useState(false);
  const [hireAlreadyRequested, setHireAlreadyRequested] = useState(false);
  const [hireRequestStatus, setHireRequestStatus] = useState<"none" | "Open" | "InProgress" | "Fulfilled" | "Declined">("none");
  const [hireForm, setHireForm] = useState({
    roleNeeded: "Senior Dev",
    quantity: 1,
    notes: "",
  });

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

  useEffect(() => {
    const checkExistingHireRequest = async () => {
      if (!numericId) return;
      try {
        const rows = await getHireRequests(undefined, numericId);
        const latest = rows[0];
        setHireRequestStatus(latest?.status ?? "none");
        setHireAlreadyRequested(rows.some((r) => r.status === "Open" || r.status === "InProgress"));
      } catch {
        setHireRequestStatus("none");
        setHireAlreadyRequested(false);
      }
    };
    checkExistingHireRequest();
  }, [numericId]);

  const openAssignModal = async (prefillRole?: string) => {
    setAssignModalOpen(true);
    setAssignError(null);
    setSelectedEmp(null);
    setAssignRole(prefillRole || "");
    setAssignStart(toInputDate(project?.estimatedStartDate));
    setAssignEnd(toInputDate(project?.estimatedEndDate));
    setEmpSearch("");

    if (employees.length === 0) {
      setEmployeesLoading(true);
      try {
        const data = await getRawEmployees();
        setEmployees(data);
      } catch {
        // silent
      } finally {
        setEmployeesLoading(false);
      }
    }
  };

  // Compute availability for each employee against the current project timeline
  const getEmployeeAvailability = (emp: BackendEmployee): { available: boolean; reason: string; blockingProject?: string } => {
    if (!project) return { available: true, reason: "Available" };
    const projStart = new Date(project.estimatedStartDate).getTime();
    const projEnd = project.estimatedEndDate ? new Date(project.estimatedEndDate).getTime() : projStart + 365 * 24 * 60 * 60 * 1000;
    if (!emp.projects || emp.projects.length === 0) {
      return { available: true, reason: "No active assignments" };
    }
    for (const up of emp.projects) {
      const upStart = new Date(up.startDate).getTime();
      const upEnd = up.endDate ? new Date(up.endDate).getTime() : upStart + 365 * 24 * 60 * 60 * 1000;
      if (upStart < projEnd && upEnd > projStart) {
        const endDateStr = up.endDate ? formatDate(up.endDate) : "Ongoing";
        return { available: false, reason: `Busy until ${endDateStr}`, blockingProject: up.projectName };
      }
    }
    return { available: true, reason: "Available for this timeline" };
  };

  const filteredEmployees = useMemo(() => {
    const assignedIds = new Set(project?.members?.map((m) => m.userId) ?? []);
    return employees
      .filter((emp) => {
        if (assignedIds.has(emp.userId)) return false;
        if (!empSearch) return true;
        const q = empSearch.toLowerCase();
        return (
          emp.userName.toLowerCase().includes(q) ||
          emp.role?.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aAvail = getEmployeeAvailability(a).available;
        const bAvail = getEmployeeAvailability(b).available;
        if (aAvail && !bAvail) return -1;
        if (!aAvail && bAvail) return 1;
        return a.userName.localeCompare(b.userName);
      });
  }, [employees, empSearch, project?.members, project]);

  const handleAssign = async () => {
    if (!selectedEmp || !project) return;
    const avail = getEmployeeAvailability(selectedEmp);
    if (!avail.available) {
      setAssignError(`Cannot assign ${selectedEmp.userName}: ${avail.reason} (${avail.blockingProject})`);
      return;
    }
    if (!assignRole.trim()) {
      setAssignError("Please specify a role for this member.");
      return;
    }
    setAssigning(true);
    setAssignError(null);
    try {
      const payload: AssignMemberPayload = {
        userId: selectedEmp.userId,
        roleInProject: assignRole.trim(),
      };
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

  if (loading || !project) {
    return (
      <div className="flex flex-col min-h-screen bg-[#18181b]">
        <AppHeader title="Project Details" role="GM" />
        <div className="flex-1 flex items-center justify-center">
          {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" /> : <p className="text-gray-400">Project not found.</p>}
        </div>
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus, project.estimatedStartDate);
  const totalNeeded = project.requiredRoles?.reduce((s, r) => s + r.requiredCount, 0) || 0;
  const totalFilled = project.requiredRoles?.reduce((s, r) => s + r.filledCount, 0) || 0;
  const staffingPct = totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : 0;

  return (
    <>
      <div className="flex-1 overflow-auto min-h-screen bg-[#202020] transition-colors duration-300">
        <AppHeader title="Project Details" role="GM" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="w-full space-y-8 pb-12">
            
            {/* Status Context Header */}
            {project.projectStatus === 0 && (
               <div className="bg-[#1e3a8a]/20 border border-[#1e3a8a]/40 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-[#1e3a8a]/40 text-[#60a5fa] rounded-lg">
                        <LayoutGrid size={20} />
                     </div>
                     <div>
                        <p className="text-[14px] font-bold text-white">Project Setup Phase</p>
                        <p className="text-[12px] text-[#60a5fa]">Marketing has initiated this project. Finalize timeline and staff assignment below.</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHireRequestOpen(true)}
                      disabled={hireSubmitting || hireAlreadyRequested}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-semibold disabled:opacity-50"
                    >
                      {hireAlreadyRequested
                        ? "Already Requested"
                        : hireRequestStatus === "Declined"
                          ? "Declined - Request Again"
                          : hireRequestStatus === "Fulfilled"
                            ? "Fulfilled - Request Again"
                            : "Request New Hire"}
                    </button>
                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-400">
                      Step 1 of 2: Assign Timeline & Team
                      <ChevronRight size={14} />
                    </div>
                  </div>
               </div>
            )}

            {/* ── 1. Project Summary Banner ── */}
            <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="p-8 pb-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 max-w-3xl flex-1 mr-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2B7FFC]/10 rounded-lg">
                        <Briefcase size={18} className="text-[#2B7FFC]" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                        {project.clientOrganization}
                      </span>
                    </div>
                    <h1 className="text-[26px] font-bold text-white tracking-tight">{project.projectName}</h1>
                    <p className="text-[14px] text-gray-400 leading-relaxed">
                      {project.projectDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-4 py-2 rounded-full text-[13px] font-semibold ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                    <button className="px-5 py-2 bg-[#2B7FFC] hover:bg-[#2563eb] text-white rounded-lg text-[13px] font-semibold transition-all">
                      Edit Project
                    </button>
                    <button className="p-2 border border-red-500/30 text-red-500 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 border-t border-gray-700/50">
                <div className="p-5 flex items-center gap-3 border-r border-gray-700/50">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Calendar size={16} className="text-blue-400" /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Start Date</p>
                    <p className="text-[13px] font-semibold text-gray-200 mt-0.5">{formatDate(project.estimatedStartDate)}</p>
                  </div>
                </div>
                <div className="p-5 flex items-center gap-3 border-r border-gray-700/50">
                  <div className="p-2 bg-purple-500/10 rounded-lg"><Clock size={16} className="text-purple-400" /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. End Date</p>
                    <p className="text-[13px] font-semibold text-gray-200 mt-0.5">{formatDate(project.estimatedEndDate)}</p>
                  </div>
                </div>
                <div className="p-5 flex items-center gap-3 border-r border-gray-700/50">
                  <div className="p-2 bg-amber-500/10 rounded-lg"><TrendingUp size={16} className="text-amber-400" /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Duration</p>
                    <p className="text-[13px] font-semibold text-gray-200 mt-0.5">{project.estimatedDuration} weeks</p>
                  </div>
                </div>
                <div className="p-5 flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg"><Users2 size={16} className="text-green-400" /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Assigned</p>
                    <p className="text-[13px] font-semibold text-gray-200 mt-0.5">
                      {project.members?.length ?? 0}
                      {(project.requiredRoles?.length ?? 0) > 0 && (
                        <span className="text-gray-500 font-normal">
                          {" "}/ {project.requiredRoles.reduce((sum, r) => sum + r.requiredCount, 0)} needed
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Required Roles Section — Marketing's staffing request */}
              {(project.requiredRoles?.length ?? 0) > 0 && (
                <div className="border-t border-gray-700/50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={16} className="text-[#2B7FFC]" />
                    <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Required Team Roles</h3>
                    <span className="ml-auto text-[11px] text-gray-500">Requested by Marketing</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {project.requiredRoles.map((role) => {
                      const isFilled = role.filledCount >= role.requiredCount;
                      const isPartial = role.filledCount > 0 && role.filledCount < role.requiredCount;
                      return (
                        <div
                          key={role.id}
                          className={`relative p-4 rounded-xl border transition-all ${
                            isFilled
                              ? "bg-green-500/5 border-green-500/25"
                              : isPartial
                              ? "bg-amber-500/5 border-amber-500/25"
                              : "bg-[#202532] border-gray-700/40"
                          }`}
                        >
                          {/* Fill indicator */}
                          <div className="flex items-start justify-between mb-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              role.workingType === "Dedicated"
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-purple-500/15 text-purple-400"
                            }`}>
                              {role.workingType}
                            </span>
                            {isFilled ? (
                              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                            ) : isPartial ? (
                              <ShieldAlert size={16} className="text-amber-400 shrink-0" />
                            ) : (
                              <UserPlus size={16} className="text-gray-600 shrink-0" />
                            )}
                          </div>

                          <p className="text-[14px] font-bold text-white mb-1">{role.roleName}</p>
                          <p className="text-[11px] text-gray-500 mb-2">×{role.requiredCount} needed</p>

                          {/* Progress */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-gray-500">
                                {role.filledCount}/{role.requiredCount} filled
                              </span>
                              <span className={`text-[11px] font-bold ${
                                isFilled ? "text-green-400" : isPartial ? "text-amber-400" : "text-gray-600"
                              }`}>
                                {isFilled ? "Complete" : isPartial ? "Partial" : "Open"}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isFilled
                                    ? "bg-green-500"
                                    : isPartial
                                    ? "bg-amber-500"
                                    : "bg-gray-700"
                                }`}
                                style={{ width: `${Math.min(100, (role.filledCount / role.requiredCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Required Skills Section (Project-level, separate from roles) */}
                  {(project.requiredSkills?.length ?? 0) > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <LayoutGrid size={14} className="text-purple-400" />
                        <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Required Skills</h4>
                        <span className="ml-auto text-[11px] text-gray-600">{project.requiredSkills.length} skills</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-[#202532] text-gray-300 border border-gray-700/60 font-medium hover:border-purple-500/40 hover:text-purple-300 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60 shrink-0"></span>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staffing progress summary */}
                  {(() => {
                    const totalNeeded = project.requiredRoles.reduce((s, r) => s + r.requiredCount, 0);
                    const totalFilled = project.requiredRoles.reduce((s, r) => s + r.filledCount, 0);
                    const pct = totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : 0;
                    return (
                      <div className="mt-4 p-3 bg-[#202532] rounded-xl border border-gray-700/40 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[12px] text-gray-400 font-medium">Overall Staffing Progress</span>
                            <span className={`text-[12px] font-bold ${
                              pct === 100 ? "text-green-400" : pct > 0 ? "text-amber-400" : "text-gray-500"
                            }`}>{pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                pct === 100
                                  ? "bg-gradient-to-r from-green-600 to-green-400"
                                  : "bg-gradient-to-r from-amber-600 to-amber-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[12px] font-semibold text-gray-300 shrink-0">
                          {totalFilled} / {totalNeeded} roles filled
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Priority badge */}
              <div className="border-t border-gray-700/50 px-6 py-3 flex items-center gap-2">
                <FileText size={13} className="text-gray-600" />
                <span className="text-[12px] text-gray-500">Priority:</span>
                <span className={`text-[12px] font-bold ${
                  project.priorityLevel === 2 ? "text-red-400" :
                  project.priorityLevel === 1 ? "text-amber-400" : "text-green-400"
                }`}>
                  {mapPriority(project.priorityLevel)}
                </span>
                <span className="mx-2 text-gray-700">·</span>
                <Building2 size={13} className="text-gray-600" />
                <span className="text-[12px] text-gray-500">Client:</span>
                <span className="text-[12px] text-gray-300 font-medium">{project.clientOrganization}</span>
              </div>
            </section>
            
            {project.projectStatus === 0 ? (
              /* ── PLANNING UI (For Upcoming Projects) ── */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                  {/* Assigned Team Members Component */}
                  <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-[18px] font-bold text-white tracking-tight">Assign Team Members</h2>
                    </div>

                    <div className="space-y-6">
                      {project.requiredRoles?.map((role) => {
                        const membersInRole = project.members?.filter(
                          (m) =>
                            m.role.toLowerCase() === role.roleName.toLowerCase()
                        ) || [];
                        const isDedicated = role.workingType === 'Dedicated';

                        return (
                          <div key={role.id} className="border border-[var(--dash-border)] rounded-[1.25rem] bg-[#1a1f2e]/60 p-6 shadow-sm overflow-hidden relative">
                            {/* Accent line for top of card */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>

                            <div className="flex justify-between items-start mb-5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-white font-black text-[16px] tracking-tight">{role.roleName}</h3>
                                  <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold uppercase tracking-wider ${
                                    isDedicated 
                                      ? 'bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/20' 
                                      : 'bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20'
                                  }`}>
                                    {role.workingType}
                                  </span>
                                </div>
                                <p className="text-[13px] text-gray-400 font-medium">Need {role.requiredCount} <span className="mx-1">•</span> Selected {membersInRole.length}</p>
                                
                                {isDedicated ? (
                                  <p className="text-[11px] text-amber-500/90 font-medium flex items-center gap-1.5 mt-2">
                                    <AlertCircle size={13} /> Must not have overlapping assignments
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-[#34d399]/90 font-medium flex items-center gap-1.5 mt-2">
                                    <CheckCircle2 size={13} /> Can work on multiple projects in parallel
                                  </p>
                                )}
                              </div>
                              
                              {membersInRole.length < role.requiredCount && (
                                <button
                                  onClick={() => openAssignModal(role.roleName)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[12px] font-bold rounded-lg transition-all"
                                >
                                  <UserPlus size={14} /> Assign
                                </button>
                              )}
                            </div>

                            <div className="space-y-3 mt-4">
                              {membersInRole.map(member => (
                                <div key={member.userId} className="bg-[#111318]/60 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-gray-600 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-[14px] flex-shrink-0">
                                      {member.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                    </div>
                                    <div>
                                      <h3 className="text-[14px] font-bold text-gray-100">{member.userName}</h3>
                                      <p className="text-[11px] text-gray-400">{member.role}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="text-right">
                                       <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Timeline</span>
                                       <span className="text-[11px] text-gray-300 font-medium bg-[#2a2f3e] px-2 py-1 rounded">
                                         {member.startDate ? formatDate(member.startDate) : formatDate(project.estimatedStartDate)} — {member.endDate ? formatDate(member.endDate) : formatDate(project.estimatedEndDate)}
                                       </span>
                                     </div>
                                     <button
                                        onClick={() => handleRemoveMember(member.userId)}
                                        disabled={removingUserId === member.userId}
                                        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-50"
                                        title="Remove from project"
                                      >
                                        {removingUserId === member.userId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                      </button>
                                  </div>
                                </div>
                              ))}

                              {membersInRole.length === 0 && (
                                <div className="py-6 border-2 border-dashed border-gray-700/50 rounded-xl flex items-center justify-center">
                                  <p className="text-[13px] text-[var(--dash-text-faint)] font-medium italic">No members assigned to this role yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {(!project.requiredRoles || project.requiredRoles.length === 0) && (
                         <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-700/50 rounded-xl bg-[#1a1c1e]/30">
                            <Briefcase size={36} className="text-gray-600 mb-4" />
                            <p className="text-gray-400 text-[14px] font-medium">No roles required for this project.</p>
                            <button onClick={() => openAssignModal()} className="text-blue-400 text-[13px] mt-2 font-bold hover:underline">
                              Assign members manually
                            </button>
                         </div>
                      )}
                    </div>
                  </section>

                  {/* Recommendations */}
                  {numericId && <SmartRecommendationPanel projectId={numericId} />}
                </div>

                <div className="space-y-8">
                  {/* Assignment Sidebar */}
                  <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-[18px] font-bold text-white">Assignment Detail</h2>
                      <Clock size={18} className="text-gray-500" />
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                         <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">Start Date</p>
                         <div className="flex items-center gap-3 p-3 bg-[#202532] border border-gray-700/30 rounded-lg text-[14px] font-medium text-gray-200">
                           <Calendar size={16} className="text-[#3b82f6]" />
                           {project.estimatedStartDate ? formatDate(project.estimatedStartDate) : 'Click to Set Date'}
                         </div>
                      </div>

                      <div className="space-y-2">
                         <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">End Date</p>
                         <div className="flex items-center gap-3 p-3 bg-[#202532] border border-gray-700/30 rounded-lg text-[14px] font-medium text-gray-200">
                           <Calendar size={16} className="text-[#3b82f6]" />
                           {project.estimatedEndDate ? formatDate(project.estimatedEndDate) : 'Click to Set Date'}
                         </div>
                      </div>

                      <div className="pt-4 border-t border-gray-700/50">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[13px] text-gray-400">Project Duration</p>
                          <p className="text-[14px] font-bold text-white">{project.estimatedDuration || 8} Weeks</p>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-[13px] text-gray-400">Team Members</p>
                          <p className="text-[14px] font-bold text-white">{project.members?.length ?? 0}</p>
                        </div>
                        <button
                          onClick={() => openAssignModal()}
                          className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl text-[14px] font-bold transition-all shadow-lg shadow-[#3b82f6]/20 cursor-pointer"
                        >
                          Assign New Member
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              /* ── STANDARD UI (For Active/Completed Projects) ── */
              <div className="space-y-6">
                {/* Assigned Team */}
                <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[18px] font-bold text-white">Assigned Team</h2>
                    <button
                      onClick={() => openAssignModal()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
                    >
                      <UserPlus size={16} />
                      Assign Member
                    </button>
                  </div>
                  {(!project.members || project.members.length === 0) ? (
                    <div className="py-8 text-center border border-dashed border-gray-700 rounded-xl">
                      <p className="text-gray-500 text-[14px]">No team members assigned.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {project.members.map((member) => (
                        <div key={member.userId} className="bg-[#202532] border border-gray-700/30 rounded-xl p-5 hover:border-gray-600/50 transition-colors group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/40 flex items-center justify-center text-[#60a5fa] font-bold text-[14px] flex-shrink-0">
                                {member.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <h3 className="text-[14px] font-bold text-gray-100">{member.userName}</h3>
                                <p className="text-[12px] text-gray-400">{member.role} · {member.staffRole || 'Member'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#064e3b]/30 text-[#34d399] border border-[#064e3b]/50">
                                {member.status || "Assigned"}
                              </span>
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={removingUserId === member.userId}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-50"
                                title="Remove from project"
                              >
                                {removingUserId === member.userId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Timeline bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                              <span>{member.startDate ? formatDate(member.startDate) : formatDate(project.estimatedStartDate)}</span>
                              <span>{member.endDate ? formatDate(member.endDate) : formatDate(project.estimatedEndDate)}</span>
                            </div>
                            <TimelineBar
                              startDate={member.startDate}
                              endDate={member.endDate}
                              projectStart={project.estimatedStartDate}
                              projectEnd={project.estimatedEndDate}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Timeline Info */}
                <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
                  <h2 className="text-[18px] font-bold text-white mb-6">Project Timeline</h2>
                  <div className="grid grid-cols-3 gap-8">
                    <div className="space-y-1.5">
                      <p className="text-[12px] text-gray-500 font-medium">Start Date</p>
                      <div className="flex items-center gap-2 text-[14px] font-medium text-gray-200">
                        <Calendar size={16} className="text-gray-400" />
                        {formatDate(project.estimatedStartDate)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[12px] text-gray-500 font-medium">End Date</p>
                      <div className="flex items-center gap-2 text-[14px] font-medium text-gray-200">
                        <Calendar size={16} className="text-gray-400" />
                        {project.estimatedEndDate ? formatDate(project.estimatedEndDate) : 'Ongoing'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[12px] text-gray-500 font-medium">Duration</p>
                      <div className="text-[14px] font-medium text-gray-200">
                        {project.estimatedDuration || 8} weeks
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Assign Member Modal (Redesigned) ── */}
      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAssignModalOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <div>
                <h3 className="text-[17px] font-bold">Assign Team Member</h3>
                {assignRole && (
                  <p className="text-[12px] text-blue-400 font-semibold mt-0.5">For role: {assignRole}</p>
                )}
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
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
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 placeholder:text-gray-600 transition-colors"
                />
              </div>

              {/* Employee list */}
              {employeesLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Loading...</span>
                </div>
              ) : (
                <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-center py-8 text-gray-600 text-[13px]">No employees found.</p>
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
                          className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                            !avail.available
                              ? "border-gray-800/50 bg-[#0f0f0f]/50 opacity-50 cursor-not-allowed"
                              : isSelected
                                ? "border-[#3b82f6] bg-[#3b82f6]/10 cursor-pointer"
                                : "border-gray-800 bg-[#0f0f0f] hover:border-gray-700 hover:bg-[#151515] cursor-pointer"
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 ${
                            !avail.available ? "bg-gray-800 text-gray-600" : "bg-[#1e3a8a]/30 text-[#60a5fa]"
                          }`}>
                            {emp.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] font-semibold truncate ${!avail.available ? "text-gray-500" : "text-gray-200"}`}>
                                {emp.userName}
                              </p>
                              {avail.available ? (
                                <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Available
                                </span>
                              ) : (
                                <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                  Unavailable
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] truncate ${!avail.available ? "text-gray-600" : "text-gray-500"}`}>
                              {emp.role} · {emp.departmentName}
                            </p>
                            {!avail.available && (
                              <p className="text-[10px] text-red-400/80 mt-0.5">
                                <ShieldAlert size={10} className="inline mr-1" />
                                {avail.reason} — {avail.blockingProject}
                              </p>
                            )}
                          </div>

                          {/* Right side */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {avail.available && emp.skills?.slice(0, 2).map((skill) => (
                              <span key={skill} className="px-1.5 py-0.5 text-[9px] bg-gray-800 text-gray-400 rounded font-medium hidden md:inline">{skill}</span>
                            ))}
                            {isSelected && avail.available && (
                              <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center ml-1">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Role field */}
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">Role in Project</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Dev, Project Manager..."
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 placeholder:text-gray-600 transition-colors"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">Start</label>
                  <input
                    type="date"
                    value={assignStart}
                    onChange={(e) => setAssignStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] text-gray-200 outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">End</label>
                  <input
                    type="date"
                    value={assignEnd}
                    onChange={(e) => setAssignEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] text-gray-200 outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <div className="text-[12px] text-gray-500">
                {selectedEmp ? (
                  <span>Selected: <span className="text-white font-semibold">{selectedEmp.userName}</span> as <span className="text-blue-400 font-semibold">{assignRole || "..."}</span></span>
                ) : (
                  <span className="italic">No employee selected</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white font-semibold text-[13px] rounded-lg border border-gray-800 transition-colors cursor-pointer"
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

      {hireRequestOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setHireRequestOpen(false)}>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h3 className="text-[17px] font-bold">Request New Hire</h3>
              <button onClick={() => setHireRequestOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] text-gray-400 mb-1">Project</label>
                <div className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-gray-800 text-[13px]">{project.projectName}</div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-400 mb-1">Staff Role Needed</label>
                <select
                  value={hireForm.roleNeeded}
                  onChange={(e) => setHireForm((p) => ({ ...p, roleNeeded: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-gray-800 text-[13px]"
                >
                  <option>Senior Dev</option>
                  <option>Junior Dev</option>
                  <option>Senior BA</option>
                  <option>Junior BA</option>
                  <option>Architect</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={hireForm.quantity}
                  onChange={(e) => setHireForm((p) => ({ ...p, quantity: Number(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-gray-800 text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-400 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={hireForm.notes}
                  onChange={(e) => setHireForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Reason and context for HR"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-gray-800 text-[13px]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-2">
              <button onClick={() => setHireRequestOpen(false)} className="px-4 py-2 bg-[#1f1f1f] border border-gray-800 rounded-lg text-[13px] font-semibold">Cancel</button>
              <button onClick={handleRequestHireFromProject} disabled={hireSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50">
                {hireSubmitting ? "Sending..." : "Hire"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
