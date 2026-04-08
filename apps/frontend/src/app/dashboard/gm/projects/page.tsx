"use client";

import { useState } from "react";
import Header from "../components/Header";
import { Search, Filter } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client: string;
  status: "Active" | "Upcoming" | "Completed" | "On Hold";
  timeline: string;
  pm: string;
  team: number;
  budget: string;
}

const projectsData: Project[] = [
  {
    id: "proj001",
    name: "Digital Transformation Initiative",
    client: "TechCorp Inc.",
    status: "Upcoming",
    timeline: "2026-01-06 — 2026-03-30",
    pm: "TBD",
    team: 6,
    budget: "$120,000",
  },
  {
    id: "proj002",
    name: "Customer Portal Development",
    client: "RetailMax Ltd.",
    status: "Upcoming",
    timeline: "2026-04-01 — 2026-05-27",
    pm: "TBD",
    team: 4,
    budget: "$95,000",
  },
  {
    id: "proj003",
    name: "Data Analytics Platform",
    client: "FinServe Corp.",
    status: "On Hold",
    timeline: "—",
    pm: "TBD",
    team: 0,
    budget: "$180,000",
  },
];

const tabs = ["All", "Active", "Upcoming", "Completed", "On Hold"];

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("All");

  return (
    <>
      <Header title="Projects" />

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
                {projectsData.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-colors duration-150"
                  >
                    <td className="py-4 pl-6 pr-4">
                      <p className="text-[13px] font-semibold text-[#60a5fa]">
                        {project.name}
                      </p>
                      <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">
                        {project.id}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-[13px] font-medium text-[var(--dash-text-primary)]">
                      {project.client}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-3 py-1 text-[11px] font-semibold rounded-full border ${
                          project.status === "Upcoming"
                            ? "bg-[#1e3a8a]/30 text-[#93c5fd] border-[#1e3a8a]/50"
                            : project.status === "On Hold"
                            ? "bg-[#78350f]/30 text-[#fcd34d] border-[#78350f]/50"
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
                      {project.team}
                    </td>
                    <td className="py-4 pr-6 pl-4 text-[13px] font-medium text-[var(--dash-text-primary)]">
                      {project.budget}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
