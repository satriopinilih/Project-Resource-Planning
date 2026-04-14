"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { getProjects, BackendProject, deleteProject, getHireRequests, HireRequest } from "@/lib/api";
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

  const totalSubmitted = projects.length;
  const awaitingApproval = projects.filter((p) => p.projectStatus === 0).length;
  const scheduled = projects.filter((p) => p.projectStatus === 1).length;
  const running = projects.filter((p) => p.projectStatus === 2).length;
  const completed = projects.filter((p) => p.projectStatus === 3).length;

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
        <StatCardCustom label="Total Submitted" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : totalSubmitted} icon={LayoutDashboard} iconBg="bg-blue-100 dark:bg-[#2A314A]" iconColor="text-blue-600 dark:text-[#88a4e6]" valueColor="text-gray-900 dark:text-white" />
        <StatCardCustom label="Awaiting Approval" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : awaitingApproval} icon={Clock} iconBg="bg-amber-100 dark:bg-[#3a3221]" iconColor="text-amber-600 dark:text-yellow-500" valueColor="text-amber-600 dark:text-yellow-500" />
        <StatCardCustom label="Scheduled" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : scheduled} icon={TrendingUp} iconBg="bg-blue-100 dark:bg-[#262c4a]" iconColor="text-blue-600 dark:text-[#5c88f2]" valueColor="text-blue-600 dark:text-[#5c88f2]" />
        <StatCardCustom label="Running" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : running} icon={TrendingUp} iconBg="bg-emerald-100 dark:bg-[#1f362e]" iconColor="text-emerald-600 dark:text-emerald-500" valueColor="text-emerald-600 dark:text-emerald-500" />
        <StatCardCustom label="Completed" value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : completed} icon={CheckCircle2} iconBg="bg-gray-100 dark:bg-[#34353a]" iconColor="text-gray-600 dark:text-gray-400" valueColor="text-gray-900 dark:text-white" />
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
                  className="w-full text-left rounded-xl px-4 py-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1f2433] transition-colors"
                >
                  <button
                    onClick={() => {
                      if (item.projectId) router.push(`/project/${item.projectId}`);
                      else router.push('/project');
                    }}
                    className="w-full text-left"
                  >
                    <p className="text-[13px] text-gray-900 dark:text-white">
                      GM requested reschedule for <span className="font-semibold">{item.projectName}</span>
                    </p>
                    {item.notes && (
                      <p className="text-[12px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                        Note: {item.notes.replace("[TIMELINE EDIT REQUEST] ", "")}
                      </p>
                    )}
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Open project detail</p>
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApproveTimelineRequest(item)}
                      disabled={actingRequestId === item.hireRequestId}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[12px] font-semibold rounded-lg disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeclineTimelineRequest(item)}
                      disabled={actingRequestId === item.hireRequestId}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold rounded-lg disabled:opacity-50"
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
        <Link href="/dashboard/mrkt/add-project" className="flex items-center gap-5 bg-[#255df5] hover:bg-[#1a4de0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
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
        <h3 className="text-[17px] font-semibold mb-5 text-gray-900 dark:text-white">Recent Submissions</h3>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>
          ) : projects.length === 0 ? (
            <p className="text-gray-500 text-[14px]">No recent submissions found.</p>
          ) : (
            projects.slice(-3).reverse().map((project) => {
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
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function StatCardCustom({ label, value, icon: Icon, iconBg, iconColor, valueColor }: any) {
  return (
    <div className="bg-white dark:bg-[#242427] p-5 rounded-2xl flex flex-col justify-between h-[115px] border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-start w-full">
        <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} transition-colors duration-300`}><Icon size={18} /></div>
      </div>
      <div className={`text-[30px] font-medium flex items-center ${valueColor} leading-none mt-4 transition-colors duration-300`}>{value}</div>
    </div>
  );
}

function SubmissionItem({ title, client, date, status, statusColor, canDelete, onDelete }: any) {
  return (
    <div className="bg-gray-50 dark:bg-[#1f2433] p-5 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-white/[0.02] hover:bg-gray-100 dark:hover:bg-[#252b3d] transition-all cursor-pointer duration-300 group">
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
