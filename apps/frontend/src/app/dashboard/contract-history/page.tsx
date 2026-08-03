"use client";

import { useState, useEffect } from "react";
import { getSessionUser } from "@/lib/auth";
import { getMyContracts, getEmployeeById } from "@/lib/api";
import { ContractHistoryItem, RoleHistoryItem } from "@/lib/types";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Loader2, FileText, Clock
} from "lucide-react";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
};

const fmtShortDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
};

// ── Current Contract Card ─────────────────────────────────────────────────────
function CurrentContractCard({ item }: { item: ContractHistoryItem }) {
  const daysLeft = item.daysUntilExpiry;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 60 && daysLeft >= 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-6 shadow-sm">
      <h2 className="text-[14px] font-bold text-[var(--dash-text-heading)] mb-4">Current Contract</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Role */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)] mb-1.5">Role</p>
          <p className="text-[14px] font-bold text-[var(--dash-text-heading)]">{item.role}</p>
        </div>

        {/* Current Period & Duration */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)] mb-1.5">
            Current Period &amp; Duration
          </p>
          <p className="text-[13px] font-semibold text-[var(--dash-text-primary)]">
            {fmtDate(item.startDate)} – {item.endDate ? fmtDate(item.endDate) : "No End Date"}
          </p>
          {item.duration && (
            <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">({item.duration})</p>
          )}
        </div>

        {/* Days Until Expiry */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)] mb-1.5">
            Days Until Expiry
          </p>
          {daysLeft !== null ? (
            <div className={`flex items-center gap-1.5 ${
              isExpired ? "text-red-400" : isExpiringSoon ? "text-amber-400" : "text-[var(--dash-text-primary)]"
            }`}>
              {(isExpiringSoon || isExpired) && (
                <AlertTriangle size={14} className="shrink-0" />
              )}
              <div>
                <p className="text-[14px] font-bold">
                  {isExpired ? "Expired" : `${daysLeft} days left`}
                </p>
                {!isExpired && item.endDate && (
                  <p className="text-[10px] text-[var(--dash-text-faint)] mt-0.5">
                    Contract will expire on {fmtDate(item.endDate)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] font-semibold text-[var(--dash-text-primary)]">—</p>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)] mb-1.5">Status</p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </div>
  );
}

// ── All Contract History Timeline ─────────────────────────────────────────────
function ContractHistoryTimeline({ history }: { history: ContractHistoryItem[] }) {
  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-6 shadow-sm overflow-hidden">
      <h2 className="text-[14px] font-bold text-[var(--dash-text-heading)] mb-6">All Contract History</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--dash-border)]">
              <th className="pb-4 w-12 relative"></th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Contract Period</th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Duration</th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Extended On</th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Extended By</th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)] text-right pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => (
              <tr key={idx} className="group hover:bg-[var(--dash-bg-hover)] transition-colors">
                <td className="py-4 relative w-12">
                  {/* Vertical line segment */}
                  <div className={`absolute left-1/2 -translate-x-1/2 w-[2px] bg-[var(--dash-border)] ${
                    idx === 0 ? "top-1/2 bottom-0" : idx === history.length - 1 ? "top-0 bottom-1/2" : "top-0 bottom-0"
                  } ${history.length === 1 ? "hidden" : ""}`} />
                  
                  {/* Timeline node */}
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10 ${
                    item.isActive
                      ? "bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      : "bg-[var(--dash-bg-card)] border-[var(--dash-border)] group-hover:bg-[var(--dash-bg-hover)] transition-colors"
                  }`} />
                </td>
                <td className="py-4 pr-6">
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)]">
                    {fmtShortDate(item.startDate)} – {item.endDate ? fmtShortDate(item.endDate) : "Ongoing"}
                  </p>
                  <p className="text-[11px] text-[var(--dash-text-faint)] mt-0.5">{item.role}</p>
                </td>
                <td className="py-4 pr-6 text-[13px] text-[var(--dash-text-muted)]">
                  {item.duration || "—"}
                </td>
                <td className="py-4 pr-6 text-[13px] text-[var(--dash-text-muted)]">
                  {item.extendedOn ? fmtShortDate(item.extendedOn) : "—"}
                </td>
                <td className="py-4 pr-6 text-[13px] text-[var(--dash-text-muted)]">
                  {item.extendedBy || "—"}
                </td>
                <td className="py-4 text-right pr-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    item.isActive
                      ? "bg-green-500/15 text-green-400 border border-green-500/25"
                      : "bg-[var(--dash-bg-input)] text-[var(--dash-text-faint)] border border-[var(--dash-border)]"
                  }`}>
                    {item.isActive ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Active
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--dash-text-faint)]" />
                        Completed
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {history.length === 0 && (
        <div className="py-16 text-center">
          <FileText size={32} className="mx-auto text-[var(--dash-text-faint)] mb-3 opacity-40" />
          <p className="text-[14px] text-[var(--dash-text-faint)]">No contract history found.</p>
        </div>
      )}
    </div>
  );
}

// ── Role History Timeline ─────────────────────────────────────────────────────
function RoleHistoryTimeline({ history }: { history: RoleHistoryItem[] }) {
  return (
    <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-6 shadow-sm overflow-hidden">
      <h2 className="text-[14px] font-bold text-[var(--dash-text-heading)] mb-6">Role History</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--dash-border)]">
              <th className="pb-4 w-12 relative"></th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Role Period</th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Duration</th>
              <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-text-faint)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => (
              <tr key={idx} className="group hover:bg-[var(--dash-bg-hover)] transition-colors">
                <td className="py-4 relative w-12">
                  {/* Vertical line segment */}
                  <div className={`absolute left-1/2 -translate-x-1/2 w-[2px] bg-[var(--dash-border)] ${
                    idx === 0 ? "top-1/2 bottom-0" : idx === history.length - 1 ? "top-0 bottom-1/2" : "top-0 bottom-0"
                  } ${history.length === 1 ? "hidden" : ""}`} />
                  
                  {/* Timeline node */}
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10 ${
                    item.isCurrentRole
                      ? "bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      : "bg-[var(--dash-bg-card)] border-[var(--dash-border)] group-hover:bg-[var(--dash-bg-hover)] transition-colors"
                  }`} />
                </td>
                <td className="py-4 pr-6">
                  <p className="text-[13px] font-semibold text-[var(--dash-text-primary)]">
                    {fmtShortDate(item.startDate)} – {item.endDate ? fmtShortDate(item.endDate) : "Present"}
                  </p>
                  <p className="text-[12px] font-bold text-[var(--dash-text-heading)] mt-0.5">{item.roleName}</p>
                </td>
                <td className="py-4 pr-6 text-[13px] text-[var(--dash-text-muted)]">
                  {item.duration || "—"}
                </td>
                <td className="py-4 pr-6">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    item.isCurrentRole
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                      : "bg-[var(--dash-bg-input)] text-[var(--dash-text-faint)] border border-[var(--dash-border)]"
                  }`}>
                    {item.isCurrentRole ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Current Role
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--dash-text-faint)]" />
                        Past Role
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {history.length === 0 && (
        <div className="py-16 text-center">
          <FileText size={32} className="mx-auto text-[var(--dash-text-faint)] mb-3 opacity-40" />
          <p className="text-[14px] text-[var(--dash-text-faint)]">No role history found.</p>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ContractHistoryPage() {
  const [history, setHistory] = useState<ContractHistoryItem[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getSessionUser();
  const activeContract = history.find((h) => h.isActive);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const contractData = await getMyContracts();
        setHistory(contractData);

        if (user?.userId) {
          const emp = await getEmployeeById(user.userId);
          if (emp.roleHistories) {
            setRoleHistory(emp.roleHistories);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load contract history");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAll();
  }, [user?.userId]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors font-medium"
      >
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--dash-text-heading)] tracking-tight">
          Contract History
        </h1>
        <p className="text-[13px] text-[var(--dash-text-muted)] mt-1">
          Complete history of your contract periods and extensions.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-[var(--dash-text-muted)]">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-[14px]">Loading contract history...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertTriangle size={16} className="shrink-0" />
          <p className="text-[13px]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Current Contract Summary */}
          {activeContract && (
            <CurrentContractCard item={activeContract} />
          )}

          {/* Full History Timeline */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ContractHistoryTimeline history={history} />
            <RoleHistoryTimeline history={roleHistory} />
          </div>
        </>
      )}
    </div>
  );
}
