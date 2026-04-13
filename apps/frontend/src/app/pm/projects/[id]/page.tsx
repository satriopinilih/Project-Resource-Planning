"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Briefcase,
  LayoutGrid,
  Target,
  TrendingUp,
  CheckCircle2,
  Users2,
  Building2,
  FileText,
  ShieldAlert,
  Clock,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { getProjectById, BackendProject } from "@/lib/api";

const mapStatus = (backendStatus: number, startDateStr?: string) => {
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

export default function PMProjectDetailsPage() {
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

  if (loading || !project) {
    return (
      <div className="flex flex-col min-h-screen bg-[#18181b]">
        <div className="flex-1 flex items-center justify-center">
          {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" /> : <p className="text-gray-400">Project not found.</p>}
        </div>
        <p className="text-[16px] text-gray-400 font-medium">Project not found.</p>
        <button onClick={() => router.push('/project')} className="text-[#3b82f6] flex items-center gap-2 hover:underline">
          Go back to Projects
        </button>
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus, project.estimatedStartDate);
  const totalNeeded = project.requiredRoles?.reduce((s, r) => s + r.requiredCount, 0) || 0;
  const totalFilled = project.requiredRoles?.reduce((s, r) => s + r.filledCount, 0) || 0;
  const staffingPct = totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : 0;

  return (
    <div className="p-8 w-full">
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
                    <div className="px-3 py-2 bg-gray-700/50 text-gray-400 border border-gray-600/30 rounded-lg text-[12px] font-semibold">
                      Read Only (PM View)
                    </div>
                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-400">
                      Step 1 of 2: Assign Timeline &amp; Team
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

              {/* Required Roles Section */}
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
                                  isFilled ? "bg-green-500" : isPartial ? "bg-amber-500" : "bg-gray-700"
                                }`}
                                style={{ width: `${Math.min(100, (role.filledCount / role.requiredCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Staffing progress summary */}
                  {totalNeeded > 0 && (
                    <div className="mt-4 p-3 bg-[#202532] rounded-xl border border-gray-700/40 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[12px] text-gray-400 font-medium">Overall Staffing Progress</span>
                          <span className={`text-[12px] font-bold ${
                            staffingPct === 100 ? "text-green-400" : staffingPct > 0 ? "text-amber-400" : "text-gray-500"
                          }`}>{staffingPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              staffingPct === 100
                                ? "bg-gradient-to-r from-green-600 to-green-400"
                                : "bg-gradient-to-r from-amber-600 to-amber-400"
                            }`}
                            style={{ width: `${staffingPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-gray-300 shrink-0">
                        {totalFilled} / {totalNeeded} roles filled
                      </span>
                    </div>
                  )}
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
            
            {/* ── 2. Assigned Team + Timeline (GM Layout) ── */}
            <div className="space-y-6">
              {/* Assigned Team */}
              <section className="bg-[#292B2F] border border-gray-700/50 rounded-xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[18px] font-bold text-white">Assigned Team</h2>
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
                          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#064e3b]/30 text-[#34d399] border border-[#064e3b]/50">
                            {member.status || "Assigned"}
                          </span>
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
          </section>

          <button
            onClick={() => router.push('/project')}
            className="mt-4 text-[#3b82f6] flex items-center gap-2 hover:underline text-[14px] font-medium transition-all"
          >
            &larr; Back to Project List
          </button>
        </div>
      </div>
    </div>
  );
}
