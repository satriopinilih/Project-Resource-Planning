"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getProjects, getRawEmployees, BackendProject, BackendEmployee } from "@/lib/api";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface EmployeeAllocation {
  projectId: string;
  projectName: string;
  startMonth: number;
  endMonth: number;
  color: "green" | "blue";
}

interface Employee {
  id: string;
  name: string;
  role: string;
  allocations: EmployeeAllocation[];
}

const COLORS: Array<"green" | "blue"> = ["blue", "green"];

const allocationColors = {
  green: "bg-[#22c55e]/90 hover:bg-[#22c55e] border-[#22c55e]/30",
  blue: "bg-[#3b82f6]/90 hover:bg-[#3b82f6] border-[#3b82f6]/30",
};

const SYSTEM_USER_IDS = ["GM001", "HR123"];

function buildEmployees(
  apiProjects: BackendProject[],
  apiEmployees: BackendEmployee[]
): Employee[] {
  // Build project date lookup
  const projectMap = new Map<number, { name: string; start: Date; end: Date }>();
  apiProjects.forEach((p) => {
    projectMap.set(p.projectId, {
      name: p.projectName,
      start: new Date(p.estimatedStartDate),
      end: new Date(p.estimatedEndDate),
    });
  });

  return apiEmployees
    .filter((e) => !SYSTEM_USER_IDS.includes(e.userId))
    .map((emp) => {
      const allocations: EmployeeAllocation[] = emp.projects
        .map((p, idx) => {
          const proj = projectMap.get(p.projectId);
          if (!proj) return null;
          return {
            projectId: String(p.projectId),
            projectName: proj.name,
            startMonth: proj.start.getMonth(),
            endMonth: proj.end.getMonth(),
            color: COLORS[idx % COLORS.length],
          } as EmployeeAllocation;
        })
        .filter((a): a is EmployeeAllocation => a !== null);

      return { id: emp.userId, name: emp.userName, role: emp.role, allocations };
    });
}

export default function ResourcePipeline() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProjects(), getRawEmployees()])
      .then(([projects, emps]) => setEmployees(buildEmployees(projects, emps)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">
            Resource Pipeline View
          </h3>
          <p className="text-[12px] text-[var(--dash-text-muted)] mt-0.5">
            Employee allocation timeline for 2026
          </p>
        </div>
        {!loading && !error && (
          <span className="px-3 py-1.5 text-[12px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-lg">
            Total Employees: {employees.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--dash-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading pipeline...</span>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#ef4444] py-6 text-center">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Month headers */}
            <div className="grid grid-cols-[180px_repeat(12,1fr)] gap-0 mb-3">
              <div />
              {months.map((month) => (
                <div
                  key={month}
                  className="text-center text-[11px] text-[var(--dash-text-muted)] font-medium pb-3"
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Employee rows */}
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-[180px_repeat(12,1fr)] gap-0 items-center py-2 group"
              >
                <div className="pr-4">
                  <p className="text-[13px] font-semibold text-[var(--dash-text-heading)] leading-tight">
                    {employee.name}
                  </p>
                  <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">
                    {employee.role}
                  </p>
                </div>

                {months.map((_, monthIdx) => {
                  const startingAllocation = employee.allocations.find(
                    (a) => a.startMonth === monthIdx
                  );
                  const isInAllocation = employee.allocations.some(
                    (a) => monthIdx > a.startMonth && monthIdx <= a.endMonth
                  );

                  if (startingAllocation) {
                    const spanCols = Math.max(
                      1,
                      startingAllocation.endMonth - startingAllocation.startMonth + 1
                    );
                    return (
                      <div
                        key={monthIdx}
                        className="relative px-0.5"
                        style={{ gridColumn: `span ${spanCols}` }}
                      >
                        <Link
                          href={`/project/${startingAllocation.projectId}`}
                          className={`
                            block w-full py-1.5 px-2 rounded text-[10px] font-semibold text-white
                            truncate transition-all duration-200 cursor-pointer border
                            ${allocationColors[startingAllocation.color]}
                          `}
                        >
                          {startingAllocation.projectName}
                        </Link>
                      </div>
                    );
                  }

                  if (isInAllocation) return null;

                  const isEmpty = employee.allocations.length === 0;
                  return (
                    <div
                      key={monthIdx}
                      className="h-8 border-l border-[var(--dash-border-subtle)] flex items-center justify-center"
                    >
                      {isEmpty && monthIdx === 5 && (
                        <span className="text-[11px] text-[var(--dash-text-faint)] italic">
                          Available
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {employees.length === 0 && (
              <p className="text-center text-[13px] text-[var(--dash-text-faint)] py-8">
                No employees found. Make sure the backend is seeded.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
