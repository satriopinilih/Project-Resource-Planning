"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Briefcase,
  UserPlus,
  Clock,
  LayoutGrid,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { getProjectById, BackendProject } from "@/lib/api";

const mapStatus = (backendStatus: number) => {
  switch (backendStatus) {
    case 0: return { label: "On Hold", class: "bg-gray-800 text-gray-400 border-transparent" };
    case 1: return { label: "Scheduled", class: "bg-[#1e3a8a]/30 text-[#60a5fa] border-transparent" };
    case 2: return { label: "Active", class: "bg-[#064e3b]/30 text-[#34d399] border-transparent" };
    case 3: return { label: "Completed", class: "bg-[#1e293b] text-gray-300 border-transparent" };
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#18181b]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-screen bg-[#18181b]">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
          <Briefcase size={24} className="text-gray-500" />
        </div>
        <p className="text-[16px] text-gray-400 font-medium">Project not found.</p>
        <button onClick={() => router.push('/pm/projects')} className="text-[#3b82f6] flex items-center gap-2 hover:underline">
          Go back to Projects
        </button>
      </div>
    );
  }

  const statusInfo = mapStatus(project.projectStatus);

  return (
    <div className="flex-1 overflow-y-auto h-full p-8 bg-[#202020]">
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
                <p className="text-[12px] text-[#60a5fa]">This project is currently being initialized. Timeline and staff details are visible below.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-bold text-gray-400">
              Restricted Access (PM)
              <AlertCircle size={14} />
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
              {/* PM cannot Edit or Delete */}
              <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium bg-gray-800/40 px-3 py-1.5 rounded-lg border border-gray-700/50">
                <AlertCircle size={14} />
                Editing restricted to GM
              </div>
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

          <button
            onClick={() => router.push('/pm/projects')}
            className="mt-4 text-[#3b82f6] flex items-center gap-2 hover:underline text-[14px] font-medium transition-all"
          >
            &larr; Back to Project List
          </button>
        </div>
      </div>
    </div>
  );
}
