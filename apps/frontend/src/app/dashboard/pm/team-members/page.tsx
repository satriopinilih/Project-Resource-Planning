"use client";

import React, { useEffect, useState } from "react";
import { getEmployees } from "@/lib/api";
import { Employee } from "@/lib/types";
import { getPrimaryRole, getSessionUser } from "@/lib/auth";
import { AlertCircle } from "lucide-react";

export default function TeamMembersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const user = getSessionUser();
        const currentRole = getPrimaryRole(user?.roles ?? []);
        setRole(currentRole);

        setError(null);
        const data = await getEmployees();
        setEmployees(data);
        if (data.length > 0) {
          setSelectedMember(data[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load team members");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selectedEmployee = selectedMember
    ? employees.find((e) => e.id === selectedMember)
    : null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col h-full w-full">
      {isLoading && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Loading team members from backend...
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-6 h-full min-h-0">
        {/* ── Left Panel: Team Members List ── */}
        <div className="w-[340px] flex-shrink-0 bg-[#22252e] rounded-xl border border-gray-700/50 flex flex-col overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
            <h2 className="text-[16px] font-semibold text-white">
              Team Members
            </h2>
            <span className="text-[12px] font-semibold bg-[#1e3a8a]/40 border border-[#1e3a8a] text-[#60a5fa] px-3 py-1 rounded-md">
              {employees.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-[calc(100vh-250px)]">
            {employees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedMember(employee.id)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${selectedMember === employee.id
                    ? "border-[#3b82f6] bg-[#1e293b]/50 shadow-sm"
                    : "border-transparent bg-[#1e2532] hover:bg-[#252d3d]"
                  }`}
              >
                <div className="font-semibold text-[15px] text-gray-100 truncate">
                  {employee.name}
                </div>
                <div className="text-[13px] text-gray-400 mt-0.5 truncate">
                  {employee.role}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 text-[11px] font-medium rounded ${employee.contractStatus === "Active"
                        ? "bg-[#064e3b]/50 text-[#34d399]"
                        : employee.contractStatus === "Expiring Soon"
                          ? "bg-[#78350f]/50 text-[#fbbf24]"
                          : "bg-gray-800 text-gray-400"
                      }`}
                  >
                    {employee.contractStatus}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Panel: Member Details ── */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-2 pb-8 max-h-[calc(100vh-180px)]">
          {selectedEmployee ? (
            <>
              {/* Card 1: Header & Skills */}
              <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg">
                      {getInitials(selectedEmployee.name)}
                    </div>
                    <div>
                      <h2 className="text-[22px] font-bold text-white">
                        {selectedEmployee.name}
                      </h2>
                      <p className="text-[14px] text-gray-400 mt-1">
                        {selectedEmployee.role}
                      </p>
                    </div>
                  </div>
                  {selectedEmployee.level && (
                    <div className="px-3 py-1.5 bg-[#78350f]/30 border border-[#78350f]/50 text-[#fbbf24] text-[13px] font-semibold rounded-lg flex items-center gap-1.5">
                      Level {selectedEmployee.level}
                    </div>
                  )}
                </div>

                {selectedEmployee.skills &&
                  selectedEmployee.skills.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-400 mb-3">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-[#1e3a8a]/30 border border-[#1e3a8a]/50 text-[#93c5fd] text-[13px] rounded-lg"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Card 2: Contract Information */}
              <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[16px] font-bold text-white">
                    Contract Information
                  </h3>
                  <span
                    className={`inline-block px-3 py-1 text-[12px] font-medium rounded-lg ${selectedEmployee.contractStatus === "Active"
                        ? "bg-[#064e3b]/30 text-[#34d399] border border-[#064e3b]/50"
                        : selectedEmployee.contractStatus === "Expiring Soon"
                          ? "bg-[#78350f]/30 text-[#fbbf24] border border-[#78350f]/50"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}
                  >
                    {selectedEmployee.contractStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-2">
                      Start Date
                    </div>
                    <div className="text-[15px] text-white font-medium">
                      {selectedEmployee.contractStart || "Jan 15, 2025"}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-2">
                      End Date
                    </div>
                    <div className="text-[15px] text-white font-medium">
                      {selectedEmployee.employmentType === "Permanent" ? "-" : (selectedEmployee.contractEnd || "Jan 14, 2027")}
                    </div>
                  </div>
                </div>

                {selectedEmployee.employmentType === 'Permanent' ? (
                  <div className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-center text-[13px] font-medium text-[#34d399]">
                    Permanent Employee
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-center text-[13px] font-medium text-gray-300">
                    Contact GM to request contract extension
                  </div>
                )}
              </div>

              {/* Card 3: Resource Pipeline */}
              {selectedEmployee.projects &&
                selectedEmployee.projects.length > 0 && (
                  <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-[16px] font-bold text-white mb-4">
                      Resource Pipeline
                    </h3>
                    <div className="space-y-4">
                      {selectedEmployee.projects.map((project) => (
                        <div
                          key={project.id}
                          className="bg-[#1e2532] border border-gray-700/50 rounded-xl p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-semibold text-[15px] text-white">
                                {project.name}
                              </div>
                              <div className="text-[13px] text-gray-400 mt-0.5">
                                {project.client}
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 text-[12px] font-medium rounded-lg ${project.status === "Completed"
                                  ? "bg-gray-800 text-gray-300"
                                  : project.status === "Active"
                                    ? "bg-[#064e3b]/30 text-[#34d399]"
                                    : "bg-[#1e3a8a]/30 text-[#60a5fa]"
                                }`}
                            >
                              {project.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[13px] text-gray-400 mt-4">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {project.startDate} &rarr; {project.endDate}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Card 4: Availability Summary */}
              {selectedEmployee.projects &&
                selectedEmployee.projects.length > 0 && (
                  <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-[16px] font-bold text-white mb-4">
                      Availability Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#1e2532] border border-gray-700/30 rounded-xl p-5 text-center">
                        <div className="text-2xl font-bold text-white">
                          {selectedEmployee.projects.length}
                        </div>
                        <div className="text-[12px] text-gray-400 mt-1">
                          Total Projects
                        </div>
                      </div>

                      <div className="bg-[#064e3b]/20 border border-[#064e3b]/30 rounded-xl p-5 text-center">
                        <div className="text-2xl font-bold text-[#34d399]">
                          {
                            selectedEmployee.projects.filter(
                              (p) => p.status === "Active",
                            ).length
                          }
                        </div>
                        <div className="text-[12px] text-[#34d399]/70 mt-1">
                          Active
                        </div>
                      </div>

                      <div className="bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-xl p-5 text-center">
                        <div className="text-2xl font-bold text-[#60a5fa]">
                          {
                            selectedEmployee.projects.filter(
                              (p) =>
                                p.status === "Upcoming" ||
                                p.status === "Scheduled",
                            ).length
                          }
                        </div>
                        <div className="text-[12px] text-[#60a5fa]/70 mt-1">
                          Upcoming
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-12 flex flex-col items-center justify-center text-center h-full">
              <h3 className="text-lg font-medium text-white mb-2">
                No Team Member Selected
              </h3>
              <p className="text-[14px] text-gray-400">
                Select a team member to view their details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
