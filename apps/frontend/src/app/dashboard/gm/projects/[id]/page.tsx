"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  BarChart3, 
  ChevronLeft,
  Loader2
} from "lucide-react";
import { getProjects, BackendProject } from "../../../../../lib/api";
import SmartRecommendationPanel from "../../components/SmartRecommendationPanel";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projects = await getProjects();
        // ID in projects page is mapped as projXXX, but API uses numericprojectId
        const found = projects.find(p => `proj${String(p.projectId).padStart(3, "0")}` === id || String(p.projectId) === id);
        if (found) {
          setProject(found);
        }
      } catch (err) {
        console.error("Error fetching project details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--dash-bg-page)]">
        <Header title="Project Details" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--dash-bg-page)]">
        <Header title="Project Details" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400">Project not found.</p>
          <button onClick={() => router.back()} className="text-blue-500 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <Header title="Project Details" />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Project Summary Card */}
        <section className="bg-[#1a1f2e]/60 border border-[var(--dash-border)] rounded-[2rem] p-8 shadow-xl">
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-4">
              <div>
                <h1 className="text-[28px] font-bold text-white tracking-tight">{project.projectName}</h1>
                <p className="text-[15px] text-[var(--dash-text-muted)] font-medium mt-1">{project.clientOrganization}</p>
              </div>
              <p className="text-[14px] text-[var(--dash-text-secondary)] leading-relaxed max-w-2xl">
                {project.projectDescription || "No description available for this project. This is a high-impact initiative focused on delivering strategic value and operational excellence across the organization."}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[12px] font-bold">
                Pending
              </span>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-blue-600/20 transition-all">
                <Edit3 size={16} />
                Edit Project
              </button>
              <button className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 pt-8 border-t border-[var(--dash-border-subtle)] gap-8">
            <div className="space-y-1.5">
              <p className="text-[11px] text-[var(--dash-text-faint)] uppercase font-bold tracking-widest">Estimated Duration</p>
              <p className="text-[15px] font-semibold text-white">10 weeks</p>
            </div>
            <div className="space-y-1.5 border-l border-[var(--dash-border-subtle)] pl-8">
              <p className="text-[11px] text-[var(--dash-text-faint)] uppercase font-bold tracking-widest">Priority</p>
              <p className="text-[15px] font-semibold text-white">High</p>
            </div>
            <div className="space-y-1.5 border-l border-[var(--dash-border-subtle)] pl-8">
              <p className="text-[11px] text-[var(--dash-text-faint)] uppercase font-bold tracking-widest">Created</p>
              <p className="text-[15px] font-semibold text-white">Jan 5, 2026</p>
            </div>
          </div>
        </section>

        {/* Smart Recommendation Panel */}
        <SmartRecommendationPanel />
      </main>
    </div>
  );
}
