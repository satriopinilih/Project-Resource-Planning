"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Search, Filter, Loader2, ArrowRight, Users } from "lucide-react";
import { getProjects } from "../../../../lib/api";

interface Project {
  id: string;
  name: string;
  client: string;
  status: "Active" | "Scheduled" | "Pending" | "Completed";
  timeline: string;
  pm: string;
  team: number;
  budget: string;
}

const mapStatus = (backendStatus: number, startDateStr?: string): Project["status"] => {
  // Backend enum: 0=Pending, 1=Scheduled, 2=Running, 3=Completed
  switch (backendStatus) {
    case 0: return "Pending";    // Belum di-assign
    case 1: return "Scheduled";  // Sudah assign, belum mulai
    case 2: {                    // Running
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (startDate > today) return "Scheduled";
      }
      return "Active";
    }
    case 3: return "Completed";
    default: return "Pending";
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "TBD";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const tabs = ["All", "Pending", "Scheduled", "Active", "Completed"];

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState(tabs.includes(tabQuery || "") ? tabQuery! : "All");
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Jika URL berubah, update tab-nya secara dinamis
  useEffect(() => {
    if (tabQuery && tabs.includes(tabQuery)) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
          const mappedData: Project[] = data.map((p) => {
          const pmMember = p.members?.find((m) => 
            m.role?.toLowerCase().includes("manager") || m.role?.toLowerCase().includes("lead")
          );
          return {
            id: `proj${String(p.projectId).padStart(3, "0")}`,
            name: p.projectName,
            client: p.clientOrganization || "Internal",
            status: mapStatus(p.projectStatus, p.estimatedStartDate),
            timeline: `${formatDate(p.estimatedStartDate)} — ${formatDate(p.estimatedEndDate)}`,
            pm: pmMember ? pmMember.userName : "TBD",
            team: p.members?.length || 0,
            budget: "N/A",
          };
        });
        setProjectsData(mappedData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projectsData.filter((project) => {
    const matchesTab = activeTab === "All" || project.status === activeTab;
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  return (
    <>
      <AppHeader title="Projects" role="GM" />

      <div className="p-6">
        <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl transition-colors duration-300">
          {/* Top Actions: Search and Filter */}
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="relative w-[300px]">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]"
                strokeWidth={1.8}
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-[13px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none placeholder:text-[var(--dash-text-faint)] focus:border-[#3b82f6]/50 transition-colors duration-200"
              />
            </div>
            <button className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] transition-colors cursor-pointer">
              <Filter size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 px-5 mt-6 border-b border-[var(--dash-border-subtle)]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[13px] font-semibold transition-all relative ${
                  activeTab === tab
                    ? "text-[var(--dash-text-heading)]"
                    : "text-[var(--dash-text-faint)] hover:text-[var(--dash-text-muted)]"
                } cursor-pointer`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-t-sm" />
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--dash-border-subtle)] text-[11px] font-semibold text-[var(--dash-text-muted)]">
                  <th className="font-semibold py-4 pl-6 pr-4">Project Name</th>
                  <th className="font-semibold py-4 px-4">Client</th>
                  <th className="font-semibold py-4 px-4">Status</th>
                  <th className="font-semibold py-4 px-4">Timeline</th>
                  <th className="font-semibold py-4 px-4">PM</th>
                  <th className="font-semibold py-4 px-4">Team</th>
                  <th className="font-semibold py-4 pr-6 pl-4">Budget</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--dash-text-muted)]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
                        <span className="text-[13px]">Loading projects...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--dash-text-muted)]">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/dashboard/gm/projects/${project.id}`)}
                      className="border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer group"
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div>
                            <p className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors">
                              {project.name}
                            </p>
                            <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5 font-medium">
                              {project.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[13px] font-medium text-[var(--dash-text-primary)]">
                        {project.client}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 text-[11px] font-bold rounded-lg border ${
                            project.status === "Pending"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : project.status === "Scheduled"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : project.status === "Active"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : project.status === "Completed"
                              ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                              : "bg-[var(--dash-bg-input)] text-[var(--dash-text-muted)] border-[var(--dash-border)]"
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[12px] font-medium text-[var(--dash-text-secondary)]">
                        {project.timeline}
                      </td>
                      <td className="py-4 px-4 text-[13px] font-medium text-[var(--dash-text-secondary)]">
                        {project.pm}
                      </td>
                      <td className="py-4 px-4 text-[13px] font-medium text-[var(--dash-text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-gray-500" />
                          {project.team}
                        </div>
                      </td>
                      <td className="py-4 pr-6 pl-4">
                         <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-[var(--dash-text-primary)]">{project.budget}</span>
                            <ArrowRight size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
