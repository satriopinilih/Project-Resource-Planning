"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProjectById, getRawEmployees, BackendProject, BackendEmployee } from "@/lib/api";
import { Loader2, Trash2, Calendar, FileText } from "lucide-react";
import Header from "../../components/Header";

function mapPriority(level: number): string {
  if (level === 2) return "High";
  if (level === 1) return "Medium";
  return "Low";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status: number) {
  if (status === 2)
    return <span className="px-3 py-1 bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] text-[12px] font-semibold rounded-lg">Completed</span>;
  if (status === 1)
    return <span className="px-3 py-1 bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] text-[12px] font-semibold rounded-lg">Running</span>;
  return <span className="px-3 py-1 bg-[#4b5563]/30 border border-[#4b5563]/50 text-gray-300 text-[12px] font-semibold rounded-lg">Scheduled</span>;
}

export default function ProjectDetail() {
  const { id } = useParams() as { id: string };
  const [project, setProject] = useState<BackendProject | null>(null);
  const [employees, setEmployees] = useState<BackendEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProjectById(id), getRawEmployees()])
      .then(([projData, empData]) => {
        setProject(projData);
        setEmployees(empData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--dash-text-muted)]" size={24} />
      </div>
    );
  }

  if (error || !project) {
    return <div className="text-red-500 p-6">{error || "Project not found"}</div>;
  }

  return (
    <>
      <Header title="Project Details" />
      <div className="flex-1 p-6 flex flex-col space-y-6 overflow-y-auto">
      {/* Top Card: Overview */}
      <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[22px] font-bold text-white mb-1">{project.projectName}</h2>
            <p className="text-[13px] text-gray-400">{project.clientOrganization}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(project.projectStatus)}
            <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors duration-200">
              Edit Project
            </button>
            <button className="p-1.5 border border-red-500/50 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <p className="text-[14px] text-gray-300 mb-8 w-full">
          {project.projectDescription || "No description provided."}
        </p>

        <div className="grid grid-cols-3 gap-8 pb-2">
          <div>
            <div className="text-[11px] text-gray-500 mb-1">Estimated Duration</div>
            <div className="text-[14px] font-semibold text-white">{project.estimatedDuration} weeks</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-1">Priority</div>
            <div className="text-[14px] font-semibold text-white">{mapPriority(project.priorityLevel)}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-1">Created</div>
            <div className="text-[14px] font-semibold text-white">-</div> {/* No createdAt provided in API */}
          </div>
        </div>
      </div>

      {/* Middle Card: Assigned Team */}
      <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 flex-1 flex flex-col">
        <h3 className="text-[16px] font-bold text-white mb-5">Assigned Team</h3>
        
        {project.members && project.members.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {project.members.map((member) => {
              const fullEmp = employees.find((e) => e.userId === member.userId);
              const dedicated = fullEmp && fullEmp.projects.length === 1;
              const expLevel = fullEmp ? fullEmp.experienceLevel : "-";

              return (
                <div key={member.userId} className="bg-[#1e2532] border border-[#2c3648] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[14px] font-bold text-white">{member.userName}</span>
                    {dedicated ? (
                      <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 text-[10px] font-bold outline outline-1 outline-purple-500/30 rounded">Dedicated</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] font-bold outline outline-1 outline-green-500/30 rounded">Non-Dedicated</span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-400 mb-2">{member.staffRole}</div>
                  <div className="text-[11px] text-gray-500">
                    Experience Level: {expLevel}/10
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-gray-500 py-6 text-center">No team members assigned.</p>
        )}
      </div>

      {/* Bottom Card: GM's Project Timeline */}
      <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6">
        <h3 className="text-[16px] font-bold text-white mb-5">GM's Project Timeline</h3>
        
        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="text-[11px] text-gray-500 mb-2">Start Date</div>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <Calendar size={15} className="text-gray-400" />
              {formatDate(project.estimatedStartDate)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-2">End Date</div>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <Calendar size={15} className="text-gray-400" />
              {formatDate(project.estimatedEndDate)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-2">Duration</div>
            <div className="text-[14px] font-semibold text-white pl-1">
              {project.estimatedDuration} weeks
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
