"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  FileText,
  ShieldAlert,
  LayoutGrid,
} from "lucide-react";
import { getProjectById, BackendProject } from "@/lib/api";
import ProjectGanttChart from "@/app/dashboard/gm/components/ProjectGanttChart";

const mapStatus = (backendStatus: number, startDateStr?: string) => {
  switch (backendStatus) {
    case 1:
      return {
        label: "Scheduled",
        class: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      };
    case 2: {
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (startDate > today) {
          return {
            label: "Scheduled",
            class: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          };
        }
      }
      return {
        label: "Running",
        class: "bg-green-500/10 text-green-400 border-green-500/20",
      };
    }
    case 3:
      return {
        label: "Completed",
        class: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      };
    default:
      return {
        label: "Scheduled",
        class: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      };
  }
};

const mapPriority = (p: number) => {
  switch (p) {
    case 0:
      return "Low";
    case 1:
      return "Medium";
    case 2:
      return "High";
    default:
      return "Normal";
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export default function PMProjectDetailsPage() {
  const params = useParams();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);

  const numericId = useMemo(() => {
    if (!idStr) return null;
    let id = idStr;
    if (id.startsWith("proj")) {
      id = id.replace("proj", "");
    }
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? null : parsed;
  }, [idStr]);

  useEffect(() => {
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
    fetchProject();
  }, [numericId]);

  if (loading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
        ) : (
          <p className="text-[var(--dash-text-muted)]">Project not found.</p>
        )}
      </div>
    );
  }

  const statusInfo = mapStatus(
    project.projectStatus,
    project.estimatedStartDate,
  );
  const totalNeeded = (project.requiredRoles || []).reduce(
    (s, r) => s + (r.requiredCount ?? 0),
    0,
  );
  const totalFilled = (project.requiredRoles || []).reduce(
    (s, r) => s + (r.filledCount ?? 0),
    0,
  );
  const staffingPct =
    totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : 0;

  return (
    <>
      {/* Back button */}
      <div className="px-8 pt-6">
        <button
          onClick={() => router.push("/project")}
          className="text-[#3b82f6] flex items-center gap-2 hover:underline text-[14px] font-medium transition-all"
        >
          &larr; Back to Project List
        </button>
      </div>

      <div className="p-8 w-full bg-[var(--dash-bg-page)] text-[var(--dash-text-primary)]">
        <div className="max-w-[1360px] mx-auto space-y-6 pb-12">
          {/* 1. Project Summary Banner */}
          <section className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 pb-5 flex flex-col md:flex-row items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[#2B7FFC]/10 text-[#2B7FFC] text-[11px] font-bold uppercase tracking-widest rounded-md">
                    {project.clientOrganization}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border ${statusInfo.class}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <h1 className="text-[34px] font-bold text-[var(--dash-text-heading)] tracking-tight">
                  {project.projectName}
                </h1>
                <p className="text-[14px] text-[var(--dash-text-secondary)] leading-relaxed max-w-4xl">
                  {project.projectDescription}
                </p>
              </div>
            </div>

            {/* Combined Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 border-t border-[var(--dash-border)] bg-[var(--dash-bg-input)]">
              <div className="p-4 flex items-center gap-3 border-r border-[var(--dash-border)]">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">
                    Timeline
                  </p>
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">
                    {formatDate(project.estimatedStartDate)} -{" "}
                    {formatDate(project.estimatedEndDate)}
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3 border-r border-[var(--dash-border)]">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <TrendingUp size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">
                    Duration
                  </p>
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">
                    {project.estimatedDuration} weeks
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3 border-r border-[var(--dash-border)]">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FileText size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">
                    Priority
                  </p>
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)] mt-0.5">
                    {mapPriority(project.priorityLevel)}
                  </p>
                </div>
              </div>
              {/* Staffing Progress merged into stats */}
              <div className="p-4 lg:col-span-2 flex flex-col justify-center gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[var(--dash-text-faint)] font-bold uppercase tracking-wider">
                    Staffing Progress
                  </span>
                  <span className="text-[12px] text-[var(--dash-text-primary)] font-semibold">
                    {totalFilled} / {totalNeeded} roles
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--dash-bg-page)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${staffingPct === 100 ? "bg-green-500" : "bg-[#2B7FFC]"}`}
                    style={{ width: `${staffingPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Required Skills Row */}
            {(project.requiredSkills?.length ?? 0) > 0 && (
              <div className="p-3 px-5 border-t border-[var(--dash-border)] flex flex-wrap items-center gap-2.5 bg-[var(--dash-bg-input)]">
                <LayoutGrid
                  size={14}
                  className="text-[var(--dash-text-faint)]"
                />
                <span className="text-[12px] font-medium text-[var(--dash-text-muted)]">
                  Required Skills:
                </span>
                {project.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-md bg-[var(--dash-bg-card)] text-[var(--dash-text-primary)] text-[11px] border border-[var(--dash-border)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 2. Role Management & Team */}
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">
                Role Management & Team
              </h2>
            </div>

            {!project.requiredRoles || project.requiredRoles.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-[var(--dash-border)] rounded-2xl">
                <Briefcase
                  size={32}
                  className="mx-auto text-[var(--dash-text-faint)] mb-3"
                />
                <p className="text-[var(--dash-text-muted)] text-[14px]">
                  No specific roles required.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {project.requiredRoles.map((role) => {
                  const membersInRole =
                    project.members?.filter(
                      (m) =>
                        m.role.toLowerCase() === role.roleName.toLowerCase() &&
                        m.status === "Assigned",
                    ) || [];
                  const isFilled =
                    membersInRole.length >= (role.requiredCount ?? 0);

                  return (
                    <div
                      key={role.id}
                      className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl overflow-hidden flex flex-col shadow-sm"
                    >
                      {/* Role Header */}
                      <div className="p-5 border-b border-[var(--dash-border)] bg-[var(--dash-bg-input)]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] flex items-center gap-2">
                              {role.roleName}
                              {isFilled && (
                                <CheckCircle2
                                  size={16}
                                  className="text-green-400"
                                />
                              )}
                            </h3>
                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-[var(--dash-bg-card)] text-[var(--dash-text-muted)] text-[10px] uppercase font-bold tracking-wider rounded border border-[var(--dash-border)]">
                              {role.workingType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[var(--dash-text-muted)]">
                              {role.requiredCount ?? 1} needed
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="flex items-center justify-between text-[11px] font-medium text-[var(--dash-text-muted)] mb-1.5">
                          <span>Progress</span>
                          <span>
                            {membersInRole.length} / {role.requiredCount} Filled
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--dash-bg-page)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFilled ? "bg-green-500" : "bg-amber-500"}`}
                            style={{
                              width: `${Math.min(100, (membersInRole.length / (role.requiredCount ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Assigned Members List */}
                      <div className="p-3 flex-1 flex flex-col gap-2 min-h-[120px]">
                        {membersInRole.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                            <ShieldAlert
                              size={20}
                              className="text-amber-500/50 mb-2"
                            />
                            <p className="text-[12px] text-[var(--dash-text-faint)]">
                              No members assigned.
                            </p>
                          </div>
                        ) : (
                          membersInRole.map((member) => (
                            <div
                              key={member.userId}
                              className="p-3 bg-[var(--dash-bg-input)] rounded-xl border border-[var(--dash-border)] flex items-center justify-between group hover:border-[var(--dash-border-hover,#555)] transition-colors"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {member.userName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-[var(--dash-text-primary)] truncate">
                                    {member.userName}
                                  </p>
                                  <p className="text-[11px] text-[var(--dash-text-faint)] truncate">
                                    {formatDate(
                                      member.startDate ||
                                        project.estimatedStartDate,
                                    )}{" "}
                                    -{" "}
                                    {formatDate(
                                      member.endDate ||
                                        project.estimatedEndDate,
                                    )}
                                  </p>
                                </div>
                              </div>
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

          {/* Team Timeline (Gantt Chart) */}
          {(project.members || []).length > 0 && (
            <section className="space-y-6">
              <ProjectGanttChart
                project={project}
                isEditMode={false}
                onReplaceClick={() => {}}
              />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
