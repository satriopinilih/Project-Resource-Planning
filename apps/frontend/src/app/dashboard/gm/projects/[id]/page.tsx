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
  TrendingUp,
  CheckCircle2,
  FileText,
  ShieldAlert,
  X,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  getProjectById,
  BackendProject,
  BackendEmployee,
  getRawEmployees,
  assignMemberToProject,
  unassignMemberFromProject,
  AssignMemberPayload,
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

export default function ProjectDetailsPage() {
  const params = useParams();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);

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

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const numericId = useMemo(() => {
    if (!idStr) return null;
    let id = idStr;
    if (id.startsWith("proj")) id = id.replace("proj", "");
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
      } catch { } finally {
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

  const filteredEmployees = useMemo(() => {
    const assignedIds = new Set(project?.members?.map((m) => m.userId) ?? []);
    return employees
      .filter((emp) => {
        if (assignedIds.has(emp.userId)) return false;
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
  }, [employees, empSearch, project]);

  const handleAssign = async () => {
    if (!selectedEmp || !project) return;
    const avail = getEmployeeAvailability(selectedEmp);
    if (!avail.available) return setAssignError(`Cannot assign ${selectedEmp.userName}: ${avail.reason}`);
    if (!assignRole.trim()) return setAssignError("Please specify a role.");

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
      <div className="flex-1 overflow-auto min-h-screen bg-[#1e1e20]">
        <AppHeader title="Project Details" role="GM" />

        <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto space-y-8 pb-12">

          {/* 1. Project Summary Banner */}
          <section className="bg-[#292B2F] border border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-8 pb-6 flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[#2B7FFC]/10 text-[#2B7FFC] text-[11px] font-bold uppercase tracking-widest rounded-md">
                    {project.clientOrganization}
                  </span>
                  <span className={`px-3 py-1 rounded-md text-[11px] font-bold border uppercase tracking-widest ${statusInfo.class}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{project.projectName}</h1>
                <p className="text-[14px] text-gray-400 leading-relaxed max-w-4xl">{project.projectDescription}</p>
              </div>

              <div className="flex gap-3 shrink-0">
                <button className="px-5 py-2.5 bg-[#2B7FFC] hover:bg-[#2563eb] text-white rounded-lg text-[13px] font-semibold transition-all">
                  Edit Project
                </button>
              </div>
            </div>

            {/* Combined Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 border-t border-gray-700/50 bg-[#25272a]">
              <div className="p-5 flex items-center gap-3 border-r border-gray-700/50">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Calendar size={18} className="text-blue-400" /></div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Timeline</p>
                  <p className="text-[13px] font-semibold text-gray-200 mt-0.5">
                    {formatDate(project.estimatedStartDate)} - {formatDate(project.estimatedEndDate)}
                  </p>
                </div>
              </div>
              <div className="p-5 flex items-center gap-3 border-r border-gray-700/50">
                <div className="p-2 bg-amber-500/10 rounded-lg"><TrendingUp size={18} className="text-amber-400" /></div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Duration</p>
                  <p className="text-[13px] font-semibold text-gray-200 mt-0.5">{project.estimatedDuration} weeks</p>
                </div>
              </div>
              <div className="p-5 flex items-center gap-3 border-r border-gray-700/50">
                <div className="p-2 bg-purple-500/10 rounded-lg"><FileText size={18} className="text-purple-400" /></div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Priority</p>
                  <p className="text-[13px] font-semibold text-gray-200 mt-0.5">{mapPriority(project.priorityLevel)}</p>
                </div>
              </div>

              {/* Staffing Progress */}
              <div className="p-5 lg:col-span-2 flex flex-col justify-center gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Staffing Progress</span>
                  <span className="text-[12px] text-gray-300 font-semibold">{totalFilled} / {totalNeeded} roles</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${staffingPct === 100 ? "bg-green-500" : "bg-[#2B7FFC]"}`}
                    style={{ width: `${staffingPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Required Skills Row */}
            {(project.requiredSkills?.length ?? 0) > 0 && (
              <div className="p-4 px-6 border-t border-gray-700/50 flex flex-wrap items-center gap-3 bg-[#202225]">
                <LayoutGrid size={14} className="text-gray-500" />
                <span className="text-[12px] font-medium text-gray-400">Required Skills:</span>
                {project.requiredSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 text-[11px] border border-gray-700/50">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 2. Smart Recommendations — hanya untuk Pending (belum di-assign) */}
          {project.projectStatus === 0 && numericId && (
            <SmartRecommendationPanel projectId={numericId} />
          )}

          {/* 3. Role Management & Team */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-bold text-white tracking-tight">Role Management & Team</h2>
              <button
                onClick={() => openAssignModal()}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[13px] font-semibold transition-all"
              >
                <UserPlus size={16} /> Assign Custom Member
              </button>
            </div>

            {(!project.requiredRoles || project.requiredRoles.length === 0) ? (
              <div className="py-16 text-center border-2 border-dashed border-gray-700 rounded-2xl bg-[#292B2F]/30">
                <Briefcase size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 text-[14px]">No specific roles required. Manage your team freely.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {project.requiredRoles.map((role) => {
                  const membersInRole = project.members?.filter(m => m.role.toLowerCase() === role.roleName.toLowerCase()) || [];
                  const isFilled = membersInRole.length >= role.requiredCount;

                  return (
                    <div key={role.id} className="bg-[#292B2F] border border-gray-700/50 rounded-2xl overflow-hidden flex flex-col">
                      {/* Role Header */}
                      <div className="p-5 border-b border-gray-700/50 bg-[#2e3136]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                              {role.roleName}
                              {isFilled && <CheckCircle2 size={16} className="text-green-400" />}
                            </h3>
                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] uppercase font-bold tracking-wider rounded">
                              {role.workingType}
                            </span>
                          </div>
                          {!isFilled && (
                            <button
                              onClick={() => openAssignModal(role.roleName)}
                              className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <UserPlus size={14} /> Assign
                            </button>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 mb-1.5">
                          <span>Progress</span>
                          <span>{membersInRole.length} / {role.requiredCount} Filled</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFilled ? "bg-green-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, (membersInRole.length / role.requiredCount) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Assigned Members List */}
                      <div className="p-3 flex-1 flex flex-col gap-2 bg-[#25272a]/50">
                        {membersInRole.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                            <ShieldAlert size={20} className="text-amber-500/50 mb-2" />
                            <p className="text-[12px] text-gray-500">No members assigned.</p>
                          </div>
                        ) : (
                          membersInRole.map(member => (
                            <div key={member.userId} className="p-3 bg-[#202225] rounded-xl border border-gray-700/40 flex items-center justify-between group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {member.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-gray-200 truncate">{member.userName}</p>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {member.startDate ? formatDate(member.startDate) : "TBD"} — {member.endDate ? formatDate(member.endDate) : "TBD"}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={removingUserId === member.userId}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                {removingUserId === member.userId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
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
        </main>
      </div>

      {/* ── Assign Member Modal ── */}
      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAssignModalOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
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
              {/* Error */}
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

              {/* Employee List */}
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
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 ${
                            !avail.available ? "bg-gray-800 text-gray-600" : "bg-[#1e3a8a]/30 text-[#60a5fa]"
                          }`}>
                            {emp.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] font-semibold truncate ${!avail.available ? "text-gray-500" : "text-gray-200"}`}>
                                {emp.userName}
                              </p>
                              {avail.available ? (
                                <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                  Available
                                </span>
                              ) : (
                                <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                                  Unavailable
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] truncate ${!avail.available ? "text-gray-600" : "text-gray-500"}`}>
                              {emp.role} · {emp.departmentName}
                            </p>
                          </div>

                          {isSelected && avail.available && (
                            <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center ml-1 shrink-0">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Role input */}
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">Role in Project</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Dev, Project Manager..."
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] text-white outline-none focus:border-[#3b82f6]/50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <div className="text-[12px] text-gray-500">
                {selectedEmp
                  ? <span>Selected: <span className="text-white font-semibold">{selectedEmp.userName}</span></span>
                  : <span className="italic">No employee selected</span>
                }
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-gray-800 text-white rounded-lg text-[13px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedEmp}
                  className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg text-[13px] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {assigning && <Loader2 size={14} className="animate-spin" />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}