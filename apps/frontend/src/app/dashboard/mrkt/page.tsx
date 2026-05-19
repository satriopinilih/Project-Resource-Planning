"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Folder,
  Clock,
  TrendingUp,
  CheckCircle2,
  LayoutDashboard,
  Calendar,
  Loader2,
  Trash2,
  Bell,
  X,
  Check,
  Calendar as CalendarIcon,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import {
  getProjects,
  BackendProject,
  deleteProject,
  getHireRequests,
  HireRequest,
  updateProject,
  getProjectById
} from "@/lib/api";
import { declineHireRequest, fulfillHireRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function MarketingDashboard() {
  const router = useRouter();
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [timelineNotifications, setTimelineNotifications] = useState<HireRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingRequestId, setActingRequestId] = useState<number | null>(null);

  // Review Modal States
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<HireRequest | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshData = () => {
    setIsLoading(true);
    Promise.all([
      getProjects(),
      getHireRequests(),
    ])
      .then(([projectRows, hireRows]) => {
        setProjects(projectRows);
        setTimelineNotifications(
          hireRows.filter(
            (h) => h.roleNeeded === "Timeline Edit Request" && (h.status === "Open" || h.status === "InProgress")
          )
        );
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCancelProject = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to cancel and delete the project "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteProject(id);
      refreshData();
    } catch (e) {
      alert("Failed to cancel project: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const openReviewModal = (req: HireRequest) => {
    setSelectedReq(req);
    // Take the requested timeline from the GM request
    setEditStartDate(req.startDate.split('T')[0]);
    setEditEndDate(req.endDate.split('T')[0]);
    setReviewModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReq || !selectedReq.projectId) return;
    setIsSubmitting(true);
    try {
      // 1. Fetch current full project data to ensure we don't overwrite with nulls
      const currentProject = await getProjectById(selectedReq.projectId.toString());

      // 2. Prepare full payload (Matching Backend DTO exactly)
      const fullPayload = {
        projectName: currentProject.projectName,
        clientOrganization: currentProject.clientOrganization,
        projectDescription: currentProject.projectDescription,
        estimatedDuration: currentProject.estimatedDuration,
        priorityLevel: currentProject.priorityLevel,
        estimatedStartDate: new Date(editStartDate).toISOString(),
        estimatedEndDate: new Date(editEndDate).toISOString(),
        projectStatus: currentProject.projectStatus,
        requiredRoles: (currentProject as any).requiredRoles.map((r: any) => ({
          roleName: r.roleName,
          count: r.requiredCount || r.count || 1,
          workingType: r.workingType === 'Dedicated' ? 0 : 1
        })),
        requiredSkillIds: currentProject.requiredSkillIds || []
      };

      // 3. Update Project
      await updateProject(selectedReq.projectId, fullPayload);

      // 4. Fulfill the Hire Request (Timeline Edit Req)
      await fulfillHireRequest(selectedReq.hireRequestId, 'Timeline Updated by Marketing');

      setReviewModalOpen(false);
      refreshData();
    } catch (e) {
      alert("Failed to approve: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveTimelineRequest = async (item: HireRequest) => {
    try {
      setActingRequestId(item.hireRequestId);
      await fulfillHireRequest(item.hireRequestId, "Approved by Marketing");
      alert("Timeline request approved.");
      refreshData();
    } catch (e) {
      alert("Failed to approve request: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setActingRequestId(null);
    }
  };

  const handleDeclineTimelineRequest = async (item: HireRequest) => {
    try {
      setActingRequestId(item.hireRequestId);
      await declineHireRequest(item.hireRequestId, "Declined by Marketing");
      alert("Timeline request declined.");
      refreshData();
    } catch (e) {
      alert("Failed to decline request: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setActingRequestId(null);
    }
  };

  const totalProjects = projects.length;
  const pendingCount = projects.filter((p) => p.projectStatus === 0).length;
  const scheduledCount = projects.filter((p) => p.projectStatus === 1).length;
  const runningCount = projects.filter((p) => p.projectStatus === 2).length;
  const completedCount = projects.filter((p) => p.projectStatus === 3).length;

  const recentSubmissions = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return projects
      .filter((p) => {
        const dateStr = p.createdAt || p.estimatedStartDate;
        if (!dateStr) return false;
        const projectDate = new Date(dateStr);
        return projectDate.getMonth() === currentMonth && projectDate.getFullYear() === currentYear;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : a.projectId;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : b.projectId;
        return dateB - dateA;
      });
  }, [projects]);

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      <div className="mb-8" />

      <section className="mb-8 bg-white dark:bg-[#242427] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5 transition-colors duration-300">
        <h2 className="text-[26px] font-bold mb-2 text-gray-900 dark:text-white tracking-tight">Good Morning, Marketing Lead!</h2>
        <div className="flex items-center text-gray-500 dark:text-gray-400 gap-2 text-[13px]">
          <Calendar size={15} />
          <span>{currentDate}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCardCustom label="Total Project" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : totalProjects} icon={LayoutDashboard} iconBg="bg-blue-100 dark:bg-[#2A314A]" iconColor="text-blue-600 dark:text-[#88a4e6]" valueColor="text-gray-900 dark:text-white" onClick={() => router.push('/project?tab=All')} />
        <StatCardCustom label="Pending" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : pendingCount} icon={Clock} iconBg="bg-amber-100 dark:bg-[#3a3221]" iconColor="text-amber-600 dark:text-yellow-500" valueColor="text-amber-600 dark:text-yellow-500" onClick={() => router.push('/project?tab=Pending')} />
        <StatCardCustom label="Scheduled" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : scheduledCount} icon={TrendingUp} iconBg="bg-blue-100 dark:bg-[#262c4a]" iconColor="text-blue-600 dark:text-[#5c88f2]" valueColor="text-blue-600 dark:text-[#5c88f2]" onClick={() => router.push('/project?tab=Scheduled')} />
        <StatCardCustom label="Running" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : runningCount} icon={TrendingUp} iconBg="bg-emerald-100 dark:bg-[#1f362e]" iconColor="text-emerald-600 dark:text-emerald-500" valueColor="text-emerald-600 dark:text-emerald-500" onClick={() => router.push('/project?tab=Running')} />
        <StatCardCustom label="Completed" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : completedCount} icon={CheckCircle2} iconBg="bg-gray-100 dark:bg-[#34353a]" iconColor="text-gray-600 dark:text-gray-400" valueColor="text-gray-900 dark:text-white" onClick={() => router.push('/project?tab=Completed')} />
      </section>

      <section className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-white dark:bg-[#242427] rounded-2xl p-5 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-amber-600 dark:text-amber-400" />
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Reschedule Requests</h3>
          </div>
          {timelineNotifications.length === 0 ? (
            <p className="text-[13px] text-gray-500 dark:text-gray-400">No pending requests.</p>
          ) : (
            <div className="space-y-2.5">
              {timelineNotifications.slice(0, 4).map((item) => (
                <div
                  key={item.hireRequestId}
                  className="w-full text-left rounded-xl px-4 py-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1f2433] hover:bg-gray-100 dark:hover:bg-[#252b3d] transition-all cursor-pointer group"
                  onClick={() => openReviewModal(item)}
                >
                  <div className="w-full text-left">
                    <p className="text-[13px] text-gray-900 dark:text-white">
                      GM requested reschedule for <span className="font-semibold">{item.projectName}</span>
                    </p>
                    {item.notes && (
                      <p className="text-[12px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                        Note: {item.notes.replace("[TIMELINE EDIT REQUEST] ", "")}
                      </p>
                    )}
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Review requested timeline</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openReviewModal(item); }}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeclineTimelineRequest(item); }}
                      disabled={actingRequestId === item.hireRequestId}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link href="/dashboard/add-project" className="flex items-center gap-5 bg-[#255df5] hover:bg-[#1a4de0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
          <div className="bg-white/20 p-4 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center"><Plus size={26} className="text-white" /></div>
          <div>
            <h3 className="text-[19px] font-medium text-white mb-1">Create New Project</h3>
            <p className="text-white/80 text-[13px]">Submit a new project proposal with estimated timeline</p>
          </div>
        </Link>

        <Link href="/project" className="flex items-center gap-5 bg-[#8b3df6] hover:bg-[#7b2be0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
          <div className="bg-white/20 p-4 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center"><Folder size={26} className="text-white" /></div>
          <div>
            <h3 className="text-[19px] font-medium text-white mb-1">View All Projects</h3>
            <p className="text-white/80 text-[13px]">Track status of all submitted projects</p>
          </div>
        </Link>
      </section>

      <section className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">Recent Submissions (This Month)</h3>
          <Link
            href="/project"
            className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            View All Submissions
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>
          ) : recentSubmissions.length === 0 ? (
            <p className="text-gray-500 text-[14px]">No recent submissions found for this month.</p>
          ) : (
            recentSubmissions.map((project) => {
              let statusLabel = "Pending";
              let statusColor = "bg-amber-100 text-amber-700 dark:bg-[#3a3221] dark:text-[#eab308]";

              if (project.projectStatus === 1) {
                statusLabel = "Scheduled";
                statusColor = "bg-blue-100 text-blue-700 dark:bg-[#262c4a] dark:text-[#608bfa]";
              } else if (project.projectStatus === 2) {
                statusLabel = "Running";
                statusColor = "bg-emerald-100 text-emerald-700 dark:bg-[#1f362e] dark:text-emerald-500";
              } else if (project.projectStatus === 3) {
                statusLabel = "Completed";
                statusColor = "bg-gray-100 text-gray-700 dark:bg-[#34353a] dark:text-gray-400";
              }

              return (
                <SubmissionItem
                  key={project.projectId}
                  title={project.projectName}
                  client={project.clientOrganization || "In-House"}
                  date={`Start Date: ${project.estimatedStartDate ? new Date(project.estimatedStartDate).toLocaleDateString() : "TBD"}`}
                  status={statusLabel}
                  statusColor={statusColor}
                  canDelete={project.projectStatus === 0}
                  onDelete={() => handleCancelProject(project.projectId, project.projectName)}
                  onClick={() => router.push(`/project/${project.projectId}`)}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Review Timeline Modal */}
      {reviewModalOpen && selectedReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setReviewModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[17px] font-bold">Review Timeline Change</h3>
              <button onClick={() => setReviewModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Requested Changes for:</p>
                <p className="text-[15px] font-bold">{selectedReq.projectName}</p>
                <p className="text-[13px] text-gray-500 italic mt-2">"{selectedReq.notes.replace("[TIMELINE EDIT REQUEST] ", "")}"</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Requested Start Date</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Requested End Date</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/[0.02]">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Approve & Update Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCardCustom({ label, value, icon: Icon, iconBg, iconColor, valueColor, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#242427] p-5 rounded-2xl flex flex-col justify-between h-[115px] border border-gray-200 dark:border-white/5 shadow-sm transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-blue-500/50 hover:shadow-md hover:scale-[1.02]' : ''}`}
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} transition-colors duration-300`}><Icon size={18} /></div>
      </div>
      <div className={`text-[30px] font-medium flex items-center ${valueColor} leading-none mt-4 transition-colors duration-300`}>{value}</div>
    </div>
  );
}

function SubmissionItem({ title, client, date, status, statusColor, canDelete, onDelete, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-50 dark:bg-[#1f2433] p-5 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-white/[0.02] hover:bg-gray-100 dark:hover:bg-[#252b3d] transition-all cursor-pointer duration-300 group"
    >
      <div className="flex flex-col gap-1">
        <h4 className="font-medium text-[15px] text-gray-900 dark:text-white transition-colors duration-300">{title}</h4>
        <div className="text-[13px] text-gray-500 dark:text-[#717b96] transition-colors duration-300">{client}</div>
        <div className="text-[13px] text-gray-400 text-gray-400 transition-colors duration-300">{date}</div>
      </div>
      <div className="flex items-center gap-3">
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all shadow-md shadow-red-500/20"
            title="Cancel Submission"
          >
            <Trash2 size={14} />
            <span className="text-[11px] font-bold uppercase">Cancel</span>
          </button>
        )}
        <div className={`px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wide ${statusColor} transition-colors duration-300`}>
          {status}
        </div>
      </div>
    </div>
  );
}
