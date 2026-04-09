"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  Trash2,
  Calendar,
  Loader2,
  Briefcase,
  UserPlus,
  Clock,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import { getProjectById, BackendProject } from "../../../../../lib/api";
import SmartRecommendationPanel from "../../components/SmartRecommendationPanel";

const mapStatus = (backendStatus: number) => {
  switch (backendStatus) {
    case 0: return { label: "Scheduled", class: "bg-[#1e3a8a]/30 text-[#60a5fa] border-transparent" };
    case 1: return { label: "Active", class: "bg-[#064e3b]/30 text-[#34d399] border-transparent" };
    case 2: return { label: "Completed", class: "bg-[#1e293b] text-gray-300 border-transparent" };
    default: return { label: "On Hold", class: "bg-gray-800 text-gray-400 border-transparent" };
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
  const router = useRouter();
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!idStr) return;

        let numericIdStr = idStr;
        if (idStr.startsWith("proj")) {
          const stripped = idStr.replace("proj", "");
          numericIdStr = parseInt(stripped, 10).toString();
        }

        const data = await getProjectById(numericIdStr);
        setProject(data);
      } catch (err) {
        console.error("Error fetching project details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [idStr]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#18181b]">
        <AppHeader title="Project Details" role="GM" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen bg-[#18181b]">
        <AppHeader title="Project Details" role="GM" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
            <Briefcase size={24} className="text-gray-500" />
          </div>
          <p className="text-[16px] text-gray-400 font-medium">Project not found.</p>
          <button onClick={() => router.back()} className="text-[#3b82f6] flex items-center gap-2 hover:underline">
            Go back to Projects
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus);

  return (
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
                <div className="flex items-center gap-2 text-[12px] font-bold text-gray-400">
                   Step 1 of 2: Assign Timeline & Team
                   <ChevronRight size={14} />
                </div>
             </div>
          )}

          {/* ── 1. Project Summary Banner ── */}
          <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-4 max-w-3xl">
                <div>
                  <h1 className="text-[26px] font-bold text-white tracking-tight">{project.projectName}</h1>
                  <p className="text-[14px] text-gray-400 font-medium mt-1">
                    {project.clientOrganization || 'RetailMax Ltd.'}
                  </p>
                </div>
                <p className="text-[14px] text-gray-300 leading-relaxed">
                  {project.projectDescription || "Build a new customer-facing portal with enhanced features"}
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

            {/* Stats Bar */}
            <div className="grid grid-cols-3 pt-6 border-t border-gray-700/50 gap-8">
              <div className="space-y-1">
                <p className="text-[12px] text-gray-500 font-medium">Estimated Duration</p>
                <p className="text-[14px] font-medium text-gray-200">{project.estimatedDuration || 8} weeks</p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-gray-500 font-medium">Priority</p>
                <p className="text-[14px] font-medium text-gray-200">{mapPriority(project.priorityLevel)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-gray-500 font-medium">Created</p>
                <p className="text-[14px] font-medium text-gray-200">Dec 20, 2025</p>
              </div>
            </div>
          </section>
          
          {project.projectStatus === 0 ? (
            /* ── PLANNING UI (For Upcoming Projects) ── */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-8">
                {/* Staffing Requirements */}
                <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[18px] font-bold text-white">Staffing Requirements</h2>
                    <span className="text-[12px] text-gray-400 font-medium italic">Based on Marketing's Input</span>
                  </div>

                  {(!project.members || project.members.length === 0) ? (
                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-700/50 rounded-xl bg-[#1a1c1e]/30">
                      <UserPlus size={40} className="text-gray-600 mb-4" />
                      <p className="text-gray-400 text-[15px] font-medium">No team members assigned yet.</p>
                      <p className="text-gray-500 text-[13px] mt-1">Select members from the recommendations below.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {project.members.map((member, idx) => {
                        const isDedicated = member.staffRole?.toLowerCase().includes("dedicated") || idx % 2 !== 0;
                        return (
                          <div key={idx} className="bg-[#202532] border border-gray-700/30 rounded-lg p-5 hover:border-gray-600 transition-colors">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="text-[15px] font-bold text-gray-100">{member.userName}</h3>
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${isDedicated
                                ? 'bg-[#4c1d95]/30 text-[#c084fc] border border-[#4c1d95]/50'
                                : 'bg-[#064e3b]/30 text-[#34d399] border border-[#064e3b]/50'
                                }`}>
                                {isDedicated ? 'Dedicated' : 'Non-Dedicated'}
                              </span>
                            </div>
                            <p className="text-[13px] text-gray-400 mb-2">{member.role}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#3b82f6] w-[70%]" />
                              </div>
                              <span className="text-[11px] text-gray-500 font-bold">70% Match</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Recommendations */}
                <SmartRecommendationPanel />
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
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[13px] text-gray-400">Project Duration</p>
                        <p className="text-[14px] font-bold text-white">{project.estimatedDuration || 8} Weeks</p>
                      </div>
                      <button className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl text-[14px] font-bold transition-all shadow-lg shadow-[#3b82f6]/20">
                        Confirm Assignment
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
                <h2 className="text-[18px] font-bold text-white mb-6">Assigned Team</h2>
                {(!project.members || project.members.length === 0) ? (
                  <div className="py-8 text-center border border-dashed border-gray-700 rounded-xl">
                    <p className="text-gray-500 text-[14px]">No team members assigned.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {project.members.map((member, idx) => (
                      <div key={idx} className="bg-[#202532] border border-gray-700/30 rounded-lg p-5">
                        <h3 className="text-[15px] font-bold text-gray-100">{member.userName}</h3>
                        <p className="text-[13px] text-gray-400 mt-1">{member.role}</p>
                        <p className="text-[12px] text-gray-500 mt-2">{member.staffRole || 'Member'}</p>
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
  );
}