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
  tracks: EmployeeAllocation[][];
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
  const projectMap = new Map<number, { name: string; start: Date; end: Date }>();

  // Pastikan apiProjects adalah array sebelum di-loop
  (apiProjects || []).forEach((p) => {
    if (p && p.projectId) {
      projectMap.set(p.projectId, {
        name: p.projectName,
        start: new Date(p.estimatedStartDate),
        end: new Date(p.estimatedEndDate),
      });
    }
  });

  return (apiEmployees || [])
    .filter((e) => e && !SYSTEM_USER_IDS.includes(e.userId))
    .map((emp) => {
      // 1. Ambil dan bersihkan data alokasi (tambahkan fallback || [] jika emp.projects undefined)
      const allocations: EmployeeAllocation[] = (emp.projects || [])
        .map((p, idx) => {
          if (!p) return null;
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

      // Urutkan berdasarkan bulan mulai
      allocations.sort((a, b) => a.startMonth - b.startMonth);

      // 2. Logika Track Allocator: Memisahkan proyek yang tumpang tindih ke baris baru
      const tracks: EmployeeAllocation[][] = [];
      allocations.forEach((alloc) => {
        let placed = false;
        for (const track of tracks) {
          // Cek apakah proyek ini bertabrakan dengan proyek lain di track ini
          const overlaps = track.some(
            (a) =>
              Math.max(alloc.startMonth, a.startMonth) <=
              Math.min(alloc.endMonth, a.endMonth)
          );
          if (!overlaps) {
            track.push(alloc);
            placed = true;
            break;
          }
        }
        if (!placed) {
          tracks.push([alloc]); // Jika bertabrakan semua, buat track (baris) baru
        }
      });

      return {
        id: emp.userId,
        name: emp.userName || "Unknown",
        role: emp.role || "-",
        tracks
      };
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

            {/* Header Bulan */}
            <div className="flex mb-3">
              <div className="w-[180px] shrink-0" />
              <div className="flex-1 grid grid-cols-12">
                {months.map((month) => (
                  <div
                    key={month}
                    className="text-center text-[11px] text-[var(--dash-text-muted)] font-medium pb-3"
                  >
                    {month}
                  </div>
                ))}
              </div>
            </div>

            {/* List Karyawan */}
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center py-3 border-t border-[var(--dash-border-subtle)] group hover:bg-[#1a1f2e]/30 transition-colors"
              >
                {/* Info Karyawan */}
                <div className="w-[180px] shrink-0 pr-4">
                  <p className="text-[13px] font-semibold text-[var(--dash-text-heading)] leading-tight">
                    {employee.name}
                  </p>
                  <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">
                    {employee.role}
                  </p>
                </div>

                {/* Container Timeline Bar */}
                <div className="flex-1 relative min-h-[32px] flex flex-col justify-center gap-2 py-1">

                  {/* Garis Vertikal Background */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    {months.map((_, i) => (
                      <div
                        key={i}
                        className="border-l border-[var(--dash-border-subtle)] h-full"
                      />
                    ))}
                  </div>

                  {/* Render Tracks (Proyek) - Menggunakan fallback (employee.tracks || []) */}
                  {(employee.tracks || []).map((track, tIdx) => (
                    <div key={tIdx} className="relative h-[28px] w-full">
                      {(track || []).map((alloc, aIdx) => {
                        const startPercent = (alloc.startMonth / 12) * 100;
                        const widthPercent = ((alloc.endMonth - alloc.startMonth + 1) / 12) * 100;

                        return (
                          <Link
                            key={aIdx}
                            href={`/project/${alloc.projectId}`}
                            style={{
                              left: `calc(${startPercent}% + 4px)`,
                              width: `calc(${widthPercent}% - 8px)`,
                            }}
                            className={`
                              absolute top-0 h-full px-3 rounded-md text-[11px] font-semibold text-white
                              truncate flex items-center transition-all duration-200 cursor-pointer border shadow-sm
                              ${allocationColors[alloc.color]}
                            `}
                          >
                            {alloc.projectName}
                          </Link>
                        );
                      })}
                    </div>
                  ))}

                  {/* Jika Karyawan Kosong (Available) */}
                  {(!employee.tracks || employee.tracks.length === 0) && (
                    <div className="relative h-[28px] w-full flex items-center">
                      <span className="absolute left-[45%] text-[11px] text-[var(--dash-text-faint)] italic">
                        Available
                      </span>
                    </div>
                  )}
                </div>
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