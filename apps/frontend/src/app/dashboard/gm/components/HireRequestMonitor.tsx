"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getHireRequests, HireRequest } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusStyles = (status: string) => {
  const s = status.toLowerCase();
  if (s === "fulfilled") {
    return "text-[#22c55e] border-[#22c55e]/20 bg-[#22c55e]/10";
  }
  if (s === "inprogress" || s === "on boarding" || s === "in progress") {
    return "text-[#f59e0b] border-[#f59e0b]/20 bg-[#f59e0b]/10";
  }
  if (s === "declined") {
    return "text-[#ef4444] border-[#ef4444]/20 bg-[#ef4444]/10";
  }
  return "text-gray-400 border-gray-500/20 bg-gray-500/10";
};

const getStatusLabel = (status: string) => {
  if (status === "InProgress") return "On Boarding";
  return status;
};

export default function HireRequestMonitor() {
  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const user = getSessionUser();
    getHireRequests()
      .then((data) => {
        // Filter out timeline edit requests and optionally filter by requestedBy
        const filtered = data.filter(
          (req) => !["Timeline Edit Request", "Project Deletion Request", "Project Restoration Request", "Status Override Notification"].includes(req.roleNeeded)
        );
        // Sort by date descending
        filtered.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRequests(filtered);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)]">
          Hire Request Monitoring
        </h3>
        {!loading && !error && requests.length > itemsPerPage && (
          <div className="flex items-center gap-3">
            <p className="text-[12px] text-[var(--dash-text-faint)]">
              Page {currentPage} of {Math.ceil(requests.length / itemsPerPage)}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(requests.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(requests.length / itemsPerPage)}
                className="p-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--dash-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading requests...</span>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#ef4444] py-6 text-center">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--dash-border)]">
                <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] uppercase py-3 pr-4">
                  Request Date
                </th>
                <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] uppercase py-3 pr-4">
                  Role Needed
                </th>
                <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] uppercase py-3 pr-4">
                  Project Allocation
                </th>
                <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] uppercase py-3 pr-4">
                  Status
                </th>
                <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] uppercase py-3">
                  Decline Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {requests
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((req) => (
                  <tr
                    key={req.hireRequestId}
                    className="border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-colors duration-150"
                  >
                  <td className="py-4 pr-4">
                    <span className="text-[13px] text-[var(--dash-text-secondary)]">
                      {formatDate(req.createdAt)}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-[13px] font-semibold text-[var(--dash-text-heading)]">
                      {req.roleNeeded}
                    </p>
                    <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">
                      HR-{(req.createdAt ? new Date(req.createdAt).getFullYear() : new Date().getFullYear())}-{(req.hireRequestId || 0).toString().padStart(3, '0')}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
                      <span className="text-[13px] text-[var(--dash-text-secondary)]">
                        {req.projectName}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusStyles(
                        req.status
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {getStatusLabel(req.status)}
                    </span>
                  </td>
                  <td className="py-4">
                    {req.status === "Declined" && req.notes ? (
                      <span className="text-[13px] text-[#ef4444]">
                        {req.notes}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[var(--dash-text-faint)]">
                        &mdash;
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-[13px] text-[var(--dash-text-faint)]"
                  >
                    No hire requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
