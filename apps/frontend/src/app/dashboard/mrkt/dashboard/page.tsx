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
  Sun,
  Moon,
  User,
  Loader2,
  Bell,
  X,
  Check,
  Calendar as CalendarIcon,
  Trash2,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getProjects,
  BackendProject,
  getTimelineEditRequests,
  TimelineEditRequest,
  updateProject,
  fulfillHireRequest,
  declineHireRequest,
  deleteProject,
  getProjectById
} from "@/lib/api";


export default function MarketingDashboard() {
  const router = useRouter();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [theme, setTheme] = useState("dark");
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<TimelineEditRequest[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);

  // Review Modal States
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<TimelineEditRequest | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize theme based on document class
    if (document.documentElement.classList.contains('light')) {
      setTheme('light');
    }

    // Fetch live projects from backend
    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    // Fetch timeline edit requests (notifications)
    getTimelineEditRequests()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setIsNotificationsLoading(false));
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  // Compute stats
  const totalProjects = projects.length;
  // Based on Backend enum: 0 = Pending, 1 = Scheduled, 2 = Running, 3 = Completed
  const pendingCount = projects.filter(p => p.projectStatus === 0).length;
  const scheduledCount = projects.filter(p => p.projectStatus === 1).length;
  const runningCount = projects.filter(p => p.projectStatus === 2).length;
  const completedCount = projects.filter(p => p.projectStatus === 3).length;

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

  const refreshData = () => {
    setIsLoading(true);
    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    setIsNotificationsLoading(true);
    getTimelineEditRequests()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setIsNotificationsLoading(false));
  };

  const openReviewModal = (req: TimelineEditRequest) => {
    setSelectedReq(req);
    setEditStartDate(req.currentStartDate.split('T')[0]);
    setEditEndDate(req.currentEndDate.split('T')[0]);
    setReviewModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReq) return;
    setIsSubmitting(true);
    try {
      // 1. Fetch current full project data to ensure we don't overwrite with nulls
      const currentProject = await getProjectById(selectedReq.projectId.toString());

      // 2. Prepare full payload (Matching Backend DTO exactly)
      const fullPayload = {
        ProjectName: currentProject.projectName,
        ClientOrganization: currentProject.clientOrganization,
        ProjectDescription: currentProject.projectDescription,
        EstimatedDuration: currentProject.priorityLevel,
        PriorityLevel: currentProject.priorityLevel,
        EstimatedStartDate: new Date(editStartDate).toISOString(),
        EstimatedEndDate: new Date(editEndDate).toISOString(),
        ProjectStatus: currentProject.projectStatus,
        // Map to exact DTO field names: RoleName, Count, WorkingType
        RequiredRoles: (currentProject as any).requiredRoles.map((r: any) => ({
          RoleName: r.roleName,
          Count: r.requiredCount || r.count || 1,
          WorkingType: r.workingType
        })),
        RequiredSkillIds: currentProject.requiredSkillIds || []
      };

      // 3. Update Project
      await updateProject(selectedReq.projectId, fullPayload);

      // 4. Fulfill the Hire Request (Timeline Edit Req)
      await fulfillHireRequest(selectedReq.id, 'Timeline Updated by Marketing');

      setReviewModalOpen(false);
      refreshData();
    } catch (e) {
      alert("Failed to approve: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedReq) return;
    if (!confirm("Are you sure you want to decline this timeline edit request?")) return;
    setIsSubmitting(true);
    try {
      await declineHireRequest(selectedReq.id, 'Declined by Marketing');
      setReviewModalOpen(false);
      refreshData();
    } catch (e) {
      alert("Failed to decline: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelProject = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to cancel and delete the project "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteProject(id);
      refreshData();
    } catch (e) {
      alert("Failed to cancel project: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      {/* Header Section */}
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">Dashboard</h1>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 cursor-pointer" /> : <Moon className="w-5 h-5 cursor-pointer" />}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Marketing Lead</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Marketing</span>
          </div>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
            <User className="text-white w-5 h-5" />
          </div>
          <div className="px-3 py-1 bg-blue-100 dark:bg-[#252c41] text-blue-700 dark:text-[#93a5e8] text-[12px] font-medium rounded-full cursor-pointer">
            Marketing
          </div>
        </div>
      </header>

      {/* Greeting Banner */}
      <section className="mb-8 bg-white dark:bg-[#242427] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5 transition-colors duration-300">
        <h2 className="text-[26px] font-bold mb-2 text-gray-900 dark:text-white tracking-tight">Good Morning, Marketing Lead!</h2>
        <div className="flex items-center text-gray-500 dark:text-gray-400 gap-2 text-[13px]">
          <Calendar size={15} />
          <span>{currentDate}</span>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCardCustom
          label="Total Project"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : totalProjects}
          icon={LayoutDashboard}
          iconBg="bg-blue-100 dark:bg-[#2A314A]"
          iconColor="text-blue-600 dark:text-[#88a4e6]"
          valueColor="text-gray-900 dark:text-white"
          onClick={() => router.push('/project?tab=All')}
        />
        <StatCardCustom
          label="Pending"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : pendingCount}
          icon={Clock}
          iconBg="bg-amber-100 dark:bg-[#3a3221]"
          iconColor="text-amber-600 dark:text-yellow-500"
          valueColor="text-amber-600 dark:text-yellow-500"
          onClick={() => router.push('/project?tab=Pending')}
        />
        <StatCardCustom
          label="Scheduled"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : scheduledCount}
          icon={TrendingUp}
          iconBg="bg-blue-100 dark:bg-[#262c4a]"
          iconColor="text-blue-600 dark:text-[#5c88f2]"
          valueColor="text-blue-600 dark:text-[#5c88f2]"
          onClick={() => router.push('/project?tab=Scheduled')}
        />
        <StatCardCustom
          label="Running"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : runningCount}
          icon={TrendingUp}
          iconBg="bg-emerald-100 dark:bg-[#1f362e]"
          iconColor="text-emerald-600 dark:text-emerald-500"
          valueColor="text-emerald-600 dark:text-emerald-500"
          onClick={() => router.push('/project?tab=Running')}
        />
        <StatCardCustom
          label="Completed"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : completedCount}
          icon={CheckCircle2}
          iconBg="bg-gray-100 dark:bg-[#34353a]"
          iconColor="text-gray-600 dark:text-gray-400"
          valueColor="text-gray-900 dark:text-white"
          onClick={() => router.push('/project?tab=Completed')}
        />
      </section>

      {/* Main Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link href="/dashboard/mrkt/add-project" className="flex items-center gap-5 bg-[#255df5] hover:bg-[#1a4de0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
          <div className="bg-white/20 p-4 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center">
            <Plus size={26} className="text-white" />
          </div>
          <div>
            <h3 className="text-[19px] font-medium text-white mb-1">Create New Project</h3>
            <p className="text-white/80 text-[13px]">Submit a new project proposal with estimated timeline</p>
          </div>
        </Link>

        <Link href="/project" className="flex items-center gap-5 bg-[#8b3df6] hover:bg-[#7b2be0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
          <div className="bg-white/20 p-4 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center">
            <Folder size={26} className="text-white" />
          </div>
          <div>
            <h3 className="text-[19px] font-medium text-white mb-1">View All Projects</h3>
            <p className="text-white/80 text-[13px]">Track status of all submitted projects</p>
          </div>
        </Link>
      </section>

      {/* Two-column layout for Recent Submissions and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
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
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
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
                    client={project.clientOrganization || 'In-House'}
                    date={`Start Date: ${project.estimatedStartDate ? new Date(project.estimatedStartDate).toLocaleDateString() : 'TBD'}`}
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

        {/* Notifications Card - Timeline Edit Requests */}
        <section id="timeline-edit-requests-section" className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300 scroll-mt-24">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">Timeline Edit Requests</h3>
          </div>
          <div className="space-y-4">
            {isNotificationsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-gray-500 text-[14px]">No pending edit requests.</p>
            ) : (
              notifications.map((req) => (
                <div key={req.id} className="bg-gray-50 dark:bg-[#1f2433] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.02] transition-colors duration-300">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-[15px] text-gray-900 dark:text-white">{req.projectName}</h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Pending
                      </span>
                    </div>
                    {req.notes && (
                      <p className="text-[13px] text-gray-600 dark:text-gray-300 italic">“{req.notes}”</p>
                    )}
                    <div className="text-[12px] text-gray-500 dark:text-[#717b96] mt-1 space-y-1">
                      <p>Current: {new Date(req.currentStartDate).toLocaleDateString()} → {new Date(req.currentEndDate).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openReviewModal(req)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Review & Approve
                      </button>
                      <button
                        onClick={() => { setSelectedReq(req); handleDecline(); }}
                        className="px-4 py-2 bg-gray-200 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-600 dark:text-gray-400 text-[12px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Review Timeline Modal */}
      {reviewModalOpen && selectedReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setReviewModalOpen(false)}>
          <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-[var(--dash-text-primary)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
              <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Review Timeline Change</h3>
              <button onClick={() => setReviewModalOpen(false)} className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Requested Changes for:</p>
                <p className="text-[15px] font-bold text-[var(--dash-text-heading)]">{selectedReq.projectName}</p>
                <p className="text-[13px] text-[var(--dash-text-muted)] italic mt-2">"{selectedReq.notes}"</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">New Start Date</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl text-[13px] outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--dash-text-faint)] uppercase tracking-wider">New End Date</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl text-[13px] outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[var(--dash-border)] flex justify-end gap-3 bg-[var(--dash-bg-input)]/30">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="px-5 py-2 text-[13px] font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors cursor-pointer"
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
        <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} transition-colors duration-300`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-[30px] font-medium flex items-center ${valueColor} leading-none mt-4 transition-colors duration-300`}>
        {value}
      </div>
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
        <div className="text-[13px] text-gray-400 dark:text-[#55607a] transition-colors duration-300">{date}</div>
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

// New component for displaying a single notification (timeline edit request)
function NotificationItem({ projectName, notes, currentStartDate, currentEndDate }: any) {
  return (
    <div className="bg-gray-50 dark:bg-[#1f2433] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.02] transition-colors duration-300">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <h4 className="font-medium text-[15px] text-gray-900 dark:text-white">{projectName}</h4>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Pending Review
          </span>
        </div>
        {notes && (
          <p className="text-[13px] text-gray-600 dark:text-gray-300 italic">“{notes}”</p>
        )}
        <div className="text-[12px] text-gray-500 dark:text-[#717b96] mt-1">
          Current timeline: {new Date(currentStartDate).toLocaleDateString()} → {new Date(currentEndDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
