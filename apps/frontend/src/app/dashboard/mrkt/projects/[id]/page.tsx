"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Briefcase,
  X,
  TrendingUp,
  Users2,
  Building2,
  FileText,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import {
  getProjectById,
  createHireRequest,
  getHireRequests,
  BackendProject,
  updateProject,
  getEmployeeFormOptions,
  EmployeeFormOptions
} from "@/lib/api";

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
    case 4: return { label: "Deleted", class: "bg-red-500/10 text-red-400 border-red-500/20" };
    default: return { label: "Unknown", class: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
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

export default function ProjectDetailsPage() {
  const ALLOWED_STAFF_ROLES = ["PM", "Senior Dev", "Junior Dev", "Senior BA", "Junior BA", "Architect"];
  const ALLOWED_WORKING_TYPES = ["Dedicated", "Non-Dedicated"];

  const params = useParams();
  const router = useRouter();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    projectName: "",
    clientOrganization: "",
    projectDescription: "",
    estimatedDuration: 8,
    priorityLevel: 0,
    estimatedStartDate: "",
    estimatedEndDate: "",
    projectStatus: 0,
    requiredRoles: [] as any[],
    requiredSkillIds: [] as number[],
  });
  const [formOptions, setFormOptions] = useState<EmployeeFormOptions>({ departments: [], skills: [], roles: [], staffRoles: [] });
  const [hasPendingRescheduleRequest, setHasPendingRescheduleRequest] = useState(false);
  const [rescheduleRequestNote, setRescheduleRequestNote] = useState<string>("");
  const allowedStaffRoles = useMemo(
    () => formOptions.staffRoles.filter((r) => ALLOWED_STAFF_ROLES.includes(r.name)),
    [formOptions.staffRoles]
  );

  const getAvailableRolesForEditRow = (currentRole: string) => {
    const allRoles = allowedStaffRoles.length > 0
      ? allowedStaffRoles.map((r) => r.name)
      : ALLOWED_STAFF_ROLES;
    const selectedOtherRoles = editForm.requiredRoles
      .filter(r => r.role !== currentRole)
      .map(r => r.role);
    return allRoles.filter(
      role => !selectedOtherRoles.includes(role)
    );
  };

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
    getEmployeeFormOptions().then(setFormOptions).catch(console.error);
  }, [numericId]);

  useEffect(() => {
    const loadRescheduleStatus = async () => {
      if (!numericId) return;
      try {
        const rows = await getHireRequests(undefined, numericId);
        const timelineRows = rows.filter(
          (r) => r.roleNeeded === "Timeline Edit Request" && (r.status === "Open" || r.status === "InProgress")
        );
        setHasPendingRescheduleRequest(timelineRows.length > 0);
        setRescheduleRequestNote(timelineRows[0]?.notes || "");
      } catch {
        setHasPendingRescheduleRequest(false);
        setRescheduleRequestNote("");
      }
    };
    loadRescheduleStatus();
  }, [numericId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setEditSubmitting(true);
    
    // Validate uniqueness of roles
    const selectedRoles = editForm.requiredRoles.map(r => r.role);
    const uniqueRoles = new Set(selectedRoles);
    if (uniqueRoles.size !== selectedRoles.length) {
      alert("Duplicate roles detected. Each role must be unique.");
      setEditSubmitting(false);
      return;
    }

    try {
      await updateProject(project.projectId, {
        projectName: editForm.projectName,
        clientOrganization: editForm.clientOrganization,
        projectDescription: editForm.projectDescription,
        estimatedDuration: editForm.estimatedDuration,
        priorityLevel: editForm.priorityLevel,
        estimatedStartDate: editForm.estimatedStartDate ? new Date(editForm.estimatedStartDate).toISOString() : project.estimatedStartDate,
        estimatedEndDate: editForm.estimatedEndDate ? new Date(editForm.estimatedEndDate).toISOString() : project.estimatedEndDate,
        projectStatus: editForm.projectStatus,
        requiredRoles: editForm.requiredRoles.map(r => {
          const workingTypeMap: Record<string, number> = { "Dedicated": 0, "Non-Dedicated": 1 };
          return {
            id: typeof r.id === 'string' && r.id.includes('.') ? 0 : Number(r.id),
            staffRoleId: r.staffRoleId || 0,
            roleName: r.role,
            requiredCount: r.count,
            workingType: workingTypeMap[r.workingType] ?? 1
          };
        }),
        requiredSkillIds: editForm.requiredSkillIds
      });
      await fetchProject();
      setEditModalOpen(false);
    } catch (err: any) {
      alert("Failed to update project: " + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" /> : <p className="text-gray-400">Project not found.</p>}
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus, project.estimatedStartDate);

  return (
    <>
      <div className="flex-1 overflow-auto min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="w-full space-y-8 pb-12">

            {/* Status Context Header */}
            {project.projectStatus === 0 && (
              <div className="bg-blue-100 border border-blue-300 dark:bg-[#1e3a8a]/20 dark:border-[#1e3a8a]/40 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1e3a8a]/40 text-[#60a5fa] rounded-lg">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[var(--dash-text-heading)]">Project Setup Phase</p>
                    <p className="text-[12px] text-blue-700 dark:text-[#60a5fa]">Marketing has initiated this project. Finalize timeline and staff assignment below.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--dash-text-muted)]">
                    Step 1 of 2: Assign Timeline & Team
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            )}

            {hasPendingRescheduleRequest && (
              <div className="bg-amber-100 border border-amber-300 dark:bg-amber-500/10 dark:border-amber-400/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-amber-900 dark:text-amber-200">GM requested a project reschedule</p>
                    <p className="text-[12px] text-amber-800 dark:text-amber-300 mt-1">
                      {rescheduleRequestNote ? rescheduleRequestNote.replace("[TIMELINE EDIT REQUEST] ", "") : "Please review this request in the Marketing dashboard notifications."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 1. Project Summary Banner ── */}
            <section className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="p-8 pb-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 max-w-3xl flex-1 mr-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2B7FFC]/10 rounded-lg">
                        <Briefcase size={18} className="text-[#2B7FFC]" />
                      </div>
                      <span className="text-[11px] font-bold text-[var(--dash-text-muted)] uppercase tracking-widest">
                        {project.clientOrganization}
                      </span>
                    </div>
                    <h1 className="text-[26px] font-bold text-[var(--dash-text-heading)] tracking-tight">{project.projectName}</h1>
                    <p className="text-[14px] text-[var(--dash-text-secondary)] leading-relaxed">
                      {project.projectDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-4 py-2 rounded-full text-[13px] font-semibold ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                    {project.projectStatus !== 3 && (
                      <button onClick={() => {
                        setEditForm({
                          projectName: project.projectName,
                          clientOrganization: project.clientOrganization,
                          projectDescription: project.projectDescription,
                          estimatedDuration: project.estimatedDuration,
                          priorityLevel: project.priorityLevel,
                          estimatedStartDate: project.estimatedStartDate ? project.estimatedStartDate.split('T')[0] : '',
                          estimatedEndDate: project.estimatedEndDate ? project.estimatedEndDate.split('T')[0] : '',
                          projectStatus: project.projectStatus,
                          requiredRoles: project.requiredRoles?.map(r => ({
                            id: r.id || Math.random().toString(36).substring(2, 9),
                            role: r.roleName,
                            count: r.requiredCount,
                            workingType: r.workingType || "Dedicated"
                          })) || [],
                          requiredSkillIds: project.requiredSkillIds || [],
                        });
                        setEditModalOpen(true);
                      }}
                        className="px-5 py-2 bg-[#2B7FFC] hover:bg-[#2563eb] text-white rounded-lg text-[13px] font-semibold transition-all">
                        Edit Project
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 border-t border-[var(--dash-border)]">
                <div className="p-5 flex items-center gap-3 border-r border-[var(--dash-border)]">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Calendar size={16} className="text-blue-400" /></div>
                  <div>
                    <p className="text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">Est. Start Date</p>
                    <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">{formatDate(project.estimatedStartDate)}</p>
                  </div>
                </div>
                <div className="p-5 flex items-center gap-3 border-r border-[var(--dash-border)]">
                  <div className="p-2 bg-purple-500/10 rounded-lg"><Clock size={16} className="text-purple-400" /></div>
                  <div>
                    <p className="text-[10px] text-[var(--dash-text-muted)] font-bold uppercase tracking-wider">Est. End Date</p>
                    <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">{formatDate(project.estimatedEndDate)}</p>
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
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority badge */}
              <div className="border-t border-[var(--dash-border)] px-6 py-3 flex items-center gap-2">
                <FileText size={13} className="text-gray-600" />
                <span className="text-[12px] text-[var(--dash-text-muted)]">Priority:</span>
                <span className={`text-[12px] font-bold ${project.priorityLevel === 2 ? "text-red-400" :
                  project.priorityLevel === 1 ? "text-amber-400" : "text-green-400"
                  }`}>
                  {mapPriority(project.priorityLevel)}
                </span>
                <span className="mx-2 text-[var(--dash-text-faint)]">·</span>
                <Building2 size={13} className="text-gray-600" />
                <span className="text-[12px] text-[var(--dash-text-muted)]">Client:</span>
                <span className="text-[12px] text-[var(--dash-text-primary)] font-medium">{project.clientOrganization}</span>
              </div>
            </section>

            {/* Simplified Project View */}
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

            {/* Project Requirements Section */}
            <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm transition-all duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <h2 className="text-[18px] font-bold text-white tracking-tight">Project Requirements</h2>
              </div>

              <div className="space-y-10">
                {/* Skills Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
                    <h3 className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Required Skills</h3>
                  </div>

                  {project.requiredSkills && project.requiredSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5 ml-3">
                      {project.requiredSkills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 bg-[#1a1a1b] border border-gray-800 hover:border-blue-500/40 text-blue-400 rounded-xl text-[12px] font-semibold transition-all duration-300 shadow-sm flex items-center gap-2 group"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 group-hover:bg-blue-400"></div>
                          {skill}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[13px] text-gray-500 italic ml-3">
                      <AlertCircle size={14} />
                      No specific skills required.
                    </div>
                  )}
                </div>

                {/* Roles Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                    <h3 className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Team Role Composition</h3>
                  </div>

                  {project.requiredRoles && project.requiredRoles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-3">
                      {project.requiredRoles.map((role) => (
                        <div
                          key={role.id}
                          className="relative p-5 bg-[#1a1a1b] border border-gray-800 rounded-2xl flex flex-col gap-4 group hover:border-[#3b82f6]/30 hover:bg-[#1e1e1f] transition-all duration-300 shadow-sm overflow-hidden"
                        >
                          {/* Decorative background element */}
                          <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                            <Users2 size={64} className="translate-x-4 -translate-y-4" />
                          </div>

                          <div className="flex items-start justify-between">
                            <div className="p-2.5 bg-gray-800 rounded-xl text-gray-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all duration-300">
                              <Users2 size={20} />
                            </div>
                            <div className="px-3 py-1 bg-[#202021] border border-gray-800 rounded-full">
                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">{role.workingType}</span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[15px] font-bold text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{role.roleName}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <div className="flex -space-x-2">
                                {[...Array(Math.min(role.requiredCount, 3))].map((_, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full border-2 border-[#1a1a1b] bg-gray-800 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                                  </div>
                                ))}
                                {role.requiredCount > 3 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-[#1a1a1b] bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400">
                                    +{role.requiredCount - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-[12px] text-gray-500 font-medium">
                                <span className="text-gray-200 font-black">{role.requiredCount}</span> positions needed
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[13px] text-gray-500 italic ml-3">
                      <AlertCircle size={14} />
                      No role requirements specified.
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* ── Edit Project Modal ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditModalOpen(false)}>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-white" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditSubmit}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
                <h3 className="text-[17px] font-bold">Edit Project Details</h3>
                <button type="button" onClick={() => setEditModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-[12px] text-gray-400 mb-1">Project Name</label>
                  <input type="text" value={editForm.projectName} onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors" required />
                </div>
                <div>
                  <label className="block text-[12px] text-gray-400 mb-1">Client Organization</label>
                  <input type="text" value={editForm.clientOrganization} onChange={(e) => setEditForm({ ...editForm, clientOrganization: e.target.value })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors" required />
                </div>
                <div>
                  <label className="block text-[12px] text-gray-400 mb-1">Project Description</label>
                  <textarea rows={3} value={editForm.projectDescription} onChange={(e) => setEditForm({ ...editForm, projectDescription: e.target.value })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] text-gray-400 mb-1">Start Date</label>
                    <input type="date" value={editForm.estimatedStartDate} onChange={(e) => setEditForm({ ...editForm, estimatedStartDate: e.target.value })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:dark]" required />
                  </div>
                  <div>
                    <label className="block text-[12px] text-gray-400 mb-1">End Date</label>
                    <input type="date" value={editForm.estimatedEndDate} onChange={(e) => setEditForm({ ...editForm, estimatedEndDate: e.target.value })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors [color-scheme:dark]" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] text-gray-400 mb-1">Duration (Weeks)</label>
                    <input type="number" value={editForm.estimatedDuration} onChange={(e) => setEditForm({ ...editForm, estimatedDuration: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors" required />
                  </div>
                  <div>
                    <label className="block text-[12px] text-gray-400 mb-1">Priority</label>
                    <select value={editForm.priorityLevel} onChange={(e) => setEditForm({ ...editForm, priorityLevel: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors">
                      <option value={0}>Low</option>
                      <option value={1}>Medium</option>
                      <option value={2}>High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] text-gray-400 mb-1">Project Status</label>
                  <select disabled value={editForm.projectStatus} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none opacity-50 cursor-not-allowed">
                    <option value={0}>Pending</option>
                    <option value={1}>Scheduled</option>
                    <option value={2}>Running</option>
                    <option value={3}>Completed</option>
                  </select>
                </div>

                {/* Project Level Skills Checklist */}
                <div className="pt-2 border-t border-gray-800">
                  <label className="block text-[12px] text-gray-400 mb-2">Project-Level Required Skills</label>
                  <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formOptions.skills.map((skill) => (
                        <label
                          key={skill.id}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={editForm.requiredSkillIds.includes(skill.id)}
                              onChange={(e) => {
                                setEditForm(prev => ({
                                  ...prev,
                                  requiredSkillIds: e.target.checked
                                    ? [...prev.requiredSkillIds, skill.id]
                                    : prev.requiredSkillIds.filter(id => id !== skill.id)
                                }));
                              }}
                              className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-700 checked:bg-blue-600 checked:border-blue-600 transition-all"
                            />
                            <Check className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none stroke-[3]" />
                          </div>
                          <span className="text-[12px] text-gray-400 group-hover:text-blue-400 transition-colors">
                            {skill.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Required Team Roles */}
                <div className="pt-2 border-t border-gray-800 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[12px] text-gray-400 font-medium">Required Team Roles</label>
                    <button
                      type="button"
                      onClick={() => {
                        const allRoles = allowedStaffRoles.length > 0
                          ? allowedStaffRoles.map((r) => r.name)
                          : ALLOWED_STAFF_ROLES;
                        const selectedRoles = editForm.requiredRoles.map(r => r.role);
                        const nextAvailableRole = allRoles.find(r => !selectedRoles.includes(r)) || allRoles[0];
                        setEditForm({
                          ...editForm,
                          requiredRoles: [...editForm.requiredRoles, {
                            id: Math.random().toString(36).substring(2, 9),
                            role: nextAvailableRole,
                            count: 1,
                            workingType: 'Dedicated'
                          }]
                        });
                      }}
                      disabled={editForm.requiredRoles.length >= (allowedStaffRoles.length > 0 ? allowedStaffRoles.length : ALLOWED_STAFF_ROLES.length)}
                      className="flex items-center gap-1 px-2 py-1 bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-[11px] font-bold transition-all"
                    >
                      <Plus size={14} /> Add Role
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editForm.requiredRoles.map((roleItem, index) => (
                      <div key={roleItem.id} className="p-3 bg-[#0f0f0f] border border-gray-800 rounded-xl space-y-3 relative group">
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, requiredRoles: editForm.requiredRoles.filter(r => r.id !== roleItem.id) })}
                          className="absolute right-3 top-3 p-1 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="grid grid-cols-2 gap-3 pr-6">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider font-bold">Role</label>
                            <select
                              className="w-full px-2 py-1.5 bg-[#161616] border border-gray-800 rounded-lg text-[12px] outline-none"
                              value={roleItem.role}
                              onChange={(e) => {
                                const newRoles = [...editForm.requiredRoles];
                                newRoles[index].role = e.target.value;
                                setEditForm({ ...editForm, requiredRoles: newRoles });
                              }}
                            >
                              {getAvailableRolesForEditRow(roleItem.role).map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider font-bold">Count</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1.5 bg-[#161616] border border-gray-800 rounded-lg text-[12px] outline-none text-center"
                              value={roleItem.count}
                              onChange={(e) => {
                                const newRoles = [...editForm.requiredRoles];
                                newRoles[index].count = parseInt(e.target.value) || 1;
                                setEditForm({ ...editForm, requiredRoles: newRoles });
                              }}
                              min={1}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pr-6">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider font-bold">Working Type</label>
                            <select
                              className="w-full px-2 py-1.5 bg-[#161616] border border-gray-800 rounded-lg text-[12px] outline-none"
                              value={roleItem.workingType}
                              onChange={(e) => {
                                const newRoles = [...editForm.requiredRoles];
                                newRoles[index].workingType = e.target.value;
                                setEditForm({ ...editForm, requiredRoles: newRoles });
                              }}
                            >
                              {ALLOWED_WORKING_TYPES.map((wt) => (
                                <option key={wt} value={wt}>{wt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-800">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-[#1f1f1f] border border-gray-800 rounded-lg text-[13px] font-semibold">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
