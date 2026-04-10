"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  User,
  Search,
  Filter,
  Loader2
} from "lucide-react";
import { getProjects, BackendProject } from "@/lib/api";

type TabOption = "All" | "Active" | "Upcoming" | "Completed" | "On Hold";

export default function MarketingProjects() {
  const [theme, setTheme] = useState("dark");
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabOption>("All");

  useEffect(() => {
    if (document.documentElement.classList.contains('light')) {
      setTheme('light');
    }

    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setIsLoading(false));
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

  // Status mapping
  // 0 = Pending/On Hold, 1 = Scheduled/Upcoming, 2 = Running/Active, 3 = Completed
  const getStatusLabelText = (status: number) => {
    if (status === 0) return "On Hold";
    if (status === 1) return "Upcoming";
    if (status === 2) return "Active";
    if (status === 3) return "Completed";
    return "Unknown";
  };

  const filteredProjects = projects.filter(p => {
    // Search match
    const searchMatch = p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientOrganization.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab match
    const sLabel = getStatusLabelText(p.projectStatus);
    const tabMatch = activeTab === "All" || sLabel === activeTab;

    return searchMatch && tabMatch;
  });

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      {/* Header Section */}
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">Projects</h1>

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

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#242427] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300 min-h-[500px]">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 w-[300px] bg-gray-50 dark:bg-[#1f2433] border border-gray-200 dark:border-white/5 rounded-xl text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="text-[14px] text-gray-500 dark:text-gray-400">
              Showing <strong className="text-gray-900 dark:text-white">{filteredProjects.length}</strong> of <strong className="text-gray-900 dark:text-white">{projects.length}</strong> projects
            </div>
          </div>
          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 dark:border-white/5 mb-6 px-2">
          {(["All", "Active", "Upcoming", "Completed", "On Hold"] as TabOption[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[14px] font-medium transition-colors relative ${activeTab === tab
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-600 dark:bg-white rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/5 text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                  <th className="pb-4 pt-2 font-medium w-[25%] px-4">Project Name</th>
                  <th className="pb-4 pt-2 font-medium w-[20%] px-4">Client</th>
                  <th className="pb-4 pt-2 font-medium w-[12%] px-4">Status</th>
                  <th className="pb-4 pt-2 font-medium w-[20%] px-4">Timeline</th>
                  <th className="pb-4 pt-2 font-medium w-[8%] px-4">PM</th>
                  <th className="pb-4 pt-2 font-medium w-[7%] px-4">Team</th>
                  <th className="pb-4 pt-2 font-medium w-[8%] px-4">Budget</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No projects found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => {
                    const statusLabel = getStatusLabelText(project.projectStatus);
                    let statusColor = "bg-amber-100 text-amber-700 dark:bg-[#3a3221] dark:text-[#eab308]";
                    if (statusLabel === "Upcoming") {
                      statusColor = "bg-blue-100 text-blue-700 dark:bg-[#262c4a] dark:text-[#608bfa]";
                    } else if (statusLabel === "Active") {
                      statusColor = "bg-emerald-100 text-emerald-700 dark:bg-[#1f362e] dark:text-emerald-500";
                    } else if (statusLabel === "Completed") {
                      statusColor = "bg-gray-100 text-gray-700 dark:bg-[#34353a] dark:text-gray-400";
                    }

                    const pmMember = project.members?.find(m => m.role === "PM" || m.staffRole === "Project Manager");
                    const pmName = pmMember ? pmMember.userName : "TBD";
                    const teamCount = project.members ? project.members.length : 0;

                    // Format dates safely
                    const startDate = project.estimatedStartDate
                      ? new Date(project.estimatedStartDate).toISOString().split('T')[0]
                      : '—';
                    const endDate = project.estimatedEndDate
                      ? new Date(project.estimatedEndDate).toISOString().split('T')[0]
                      : '';
                    const timeline = endDate ? `${startDate} — ${endDate}` : startDate;

                    // Mock budget based on projectId to keep it stable
                    const mockedBudget = `$${(100 + ((project.projectId * 17) % 150))},000`;

                    return (
                      <tr key={project.projectId} className="border-b border-gray-100 dark:border-white/[0.02] hover:bg-gray-50 dark:hover:bg-[#252b3d]/50 transition-colors">
                        <td className="py-5 px-4 align-top">
                          <div className="text-[14px] font-medium text-blue-600 dark:text-blue-400 leading-snug">{project.projectName}</div>
                          <div className="text-[12px] text-gray-500 dark:text-gray-500 mt-1">proj00{project.projectId}</div>
                        </td>
                        <td className="py-5 px-4 align-top text-[14px] text-gray-900 dark:text-white">
                          {project.clientOrganization || 'Internal'}
                        </td>
                        <td className="py-5 px-4 align-top">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium tracking-wide ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-5 px-4 align-top text-[13px] text-gray-500 dark:text-gray-400">
                          {timeline}
                        </td>
                        <td className="py-5 px-4 align-top text-[14px] text-gray-900 dark:text-white">
                          {pmName}
                        </td>
                        <td className="py-5 px-4 align-top text-[14px] text-gray-900 dark:text-white">
                          {teamCount}
                        </td>
                        <td className="py-5 px-4 align-top text-[14px] text-gray-900 dark:text-white">
                          {mockedBudget}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
