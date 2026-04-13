"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
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
} from "lucide-react";
import {
  getProjectById,
  createHireRequest,
  BackendProject,
  updateProject,
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
      return { label: "Active", class: "bg-green-500/10 text-green-400 border-green-500/20" };
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

export default function ProjectDetailsPage() {
  const params = useParams();
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setEditSubmitting(true);
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
      <div className="flex flex-col min-h-screen bg-[#18181b]">
        <AppHeader title="Project Details" role="Marketing" />
        <div className="flex-1 flex items-center justify-center">
          {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" /> : <p className="text-gray-400">Project not found.</p>}
        </div>
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus, project.estimatedStartDate);

  return (
    <>
      <div className="flex-1 overflow-auto min-h-screen bg-[#202020] transition-colors duration-300">
        <AppHeader title="Project Details" role="Marketing" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="w-full space-y-8 pb-12">

            {/* ── 1. Project Summary Banner ── */}
            <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl overflow-hidden shadow-sm">
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
                      });
                      setEditModalOpen(true);
                    }}
                      className="px-5 py-2 bg-[#2B7FFC] hover:bg-[#2563eb] text-white rounded-lg text-[13px] font-semibold transition-all">
                      Edit Project
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
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority badge */}
              <div className="border-t border-gray-700/50 px-6 py-3 flex items-center gap-2">
                <FileText size={13} className="text-gray-600" />
                <span className="text-[12px] text-gray-500">Priority:</span>
                <span className={`text-[12px] font-bold ${project.priorityLevel === 2 ? "text-red-400" :
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
                  <select value={editForm.projectStatus} onChange={(e) => setEditForm({ ...editForm, projectStatus: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-[13px] outline-none focus:border-[#3b82f6]/50 transition-colors">
                    <option value={0}>Pending</option>
                    <option value={1}>Scheduled</option>
                    <option value={2}>Running</option>
                    <option value={3}>Completed</option>
                  </select>
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
