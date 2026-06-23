"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { getRawEmployees, BackendEmployee } from "@/lib/api";

export default function ExpiringContractsAlert() {
  const [expiringMembers, setExpiringMembers] = useState<BackendEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRawEmployees()
      .then((employees) => {
        const expiring = employees.filter((e) => {
          // Must be assigned to at least one active project
          if (!e.projects || e.projects.length === 0) return false;
          const hasActiveProject = e.projects.some(p => p.status !== 1);
          if (!hasActiveProject) return false;
          
          // Must be a contract employee
          const isPermanent = e.employeeType === 1 || String(e.employeeType) === '1' || String(e.employeeType).toLowerCase() === 'permanent';
          if (isPermanent) return false;

          // Must be expiring within 30 days
          return e.daysRemaining !== undefined && e.daysRemaining <= 30;
        });
        setExpiringMembers(expiring);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (expiringMembers.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 overflow-hidden">
      <div className="p-4 border-b border-orange-500/20 flex items-start gap-3">
        <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-[14px] font-bold text-orange-400 mb-1">Employees with Expiring Contracts</h4>
          <p className="text-[13px] text-orange-300/80">
            The following project members have contracts expiring within 30 days. Please consider requesting an extension or a replacement.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-orange-500/5">
              <th className="py-3 px-4 text-[12px] font-semibold text-orange-400">Employee</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-orange-400">Project</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-orange-400">Contract End</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-orange-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {expiringMembers.map((emp) => {
              let status: "Active" | "Expiring Soon" | "Urgent" = "Active";
              if (emp.daysRemaining !== undefined) {
                if (emp.daysRemaining < 15) status = "Urgent";
                else if (emp.daysRemaining <= 30) status = "Expiring Soon";
              }

              // format contract end
              const dateString = emp.contractEnd ? new Date(emp.contractEnd).toISOString().split('T')[0] : 'TBD';

              // get active projects
              const activeProjects = emp.projects?.filter(p => p.status !== 1).map(p => p.projectName).join(", ") || "-";

              return (
                <tr key={emp.userId} className="border-t border-orange-500/10 hover:bg-orange-500/5 transition-colors">
                  <td className="py-3 px-4 text-[13px] font-medium text-orange-200">{emp.userName}</td>
                  <td className="py-3 px-4 text-[13px] text-orange-300/80">{activeProjects}</td>
                  <td className="py-3 px-4 text-[13px] text-orange-300/80">{dateString}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={status} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
