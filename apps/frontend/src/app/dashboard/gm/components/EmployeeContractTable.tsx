"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  FileText,
  UserPlus,
  Filter,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { getRawEmployees, createContractExtension, BackendEmployee, createHireRequest } from "@/lib/api";

interface EmployeeContract {
  id: string;
  name: string;
  email: string;
  role: string;
  employmentType: "Permanent" | "Contract";
  contractStart: string;
  contractEnd: string;
  contractEndRaw: string; // original ISO for date calculation
  daysRemaining: number;
  status: "Active" | "Expiring Soon" | "Expired";
  department: string;
  experienceYears: number;
  skills: string[];
  projects: { name: string; start: string; end: string; status: number }[];
}

const SYSTEM_USER_IDS = ["GM001", "HR123"];

// Backend EmployeeType: 0=Contract, 1=Permanent
function mapEmploymentType(t: number): "Permanent" | "Contract" {
  return t === 0 ? "Contract" : "Permanent";
}

// Backend ContractStatus: 0=Active, 1=Expired, 2=ExpiringSoon
function mapContractStatus(s: number): "Active" | "Expiring Soon" | "Expired" {
  if (s === 2) return "Expiring Soon";
  if (s === 1) return "Expired";
  return "Active";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapToContract(u: BackendEmployee): EmployeeContract {
  const type = mapEmploymentType(u.employeeType);
  return {
    id: u.userId,
    name: u.userName,
    email: u.email,
    role: u.role,
    employmentType: type,
    contractStart: formatDate(u.contractStart),
    contractEnd: type === "Permanent" ? "-" : formatDate(u.contractEnd),
    contractEndRaw: u.contractEnd,
    daysRemaining: u.daysRemaining,
    status: type === "Permanent" ? "Active" : mapContractStatus(u.contractStatus),
    department: u.departmentName,
    experienceYears: u.experienceYears,
    skills: u.skills,
    projects: u.projects.map(p => ({
      name: p.projectName,
      start: formatDate(p.startDate),
      end: p.endDate ? formatDate(p.endDate) : "Ongoing",
      status: 0 // Defaulting to scheduled to match screenshot "Scheduled" badge
    }))
  };
}

const statusColor: Record<string, string> = {
  Active: "text-[#22c55e]",
  "Expiring Soon": "text-[#f59e0b]",
  Expired: "text-[#ef4444]",
};

const typeStyles: Record<string, string> = {
  Permanent: "bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/25",
  Contract:
    "bg-[var(--dash-badge-contract-bg)] text-[var(--dash-badge-contract-text)] border border-[var(--dash-badge-contract-border)]",
};

interface EmployeeContractTableProps {
  showExtensionAction?: boolean;
}

export default function EmployeeContractTable({ showExtensionAction = true }: EmployeeContractTableProps) {
  const [employeesData, setEmployeesData] = useState<EmployeeContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [detailModal, setDetailModal] = useState<EmployeeContract | null>(null);
  const [extensionModal, setExtensionModal] = useState<EmployeeContract | null>(null);
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionDuration, setExtensionDuration] = useState("12");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [hireSuccess, setHireSuccess] = useState(false);
  const [canRequestHire, setCanRequestHire] = useState(false);
  const [hireForm, setHireForm] = useState({
    roleNeeded: "",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    getRawEmployees()
      .then((data) => {
        const staff = data.filter((u) => !SYSTEM_USER_IDS.includes(u.userId));
        setEmployeesData(staff.map(mapToContract));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const parsed = JSON.parse(raw) as { roles?: string[] };
        setCanRequestHire(Boolean(parsed.roles?.includes("GM")));
      }
    } catch {
      setCanRequestHire(false);
    }
  }, []);

  const filteredEmployees = employeesData.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All Roles" || emp.role === roleFilter;
    const matchesStatus =
      statusFilter === "All Status" || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = [
    "All Roles",
    ...Array.from(new Set(employeesData.map((e) => e.role))),
  ];
  const uniqueStatuses = ["All Status", "Active", "Expiring Soon", "Expired"];

  async function handleSubmitExtension() {
    if (!extensionModal || !extensionDuration || !extensionReason) return;
    setSubmitting(true);
    try {
      await createContractExtension(
        extensionModal.id,
        Math.max(1, parseInt(extensionDuration, 10) || 12),
        extensionReason
      );
      setSubmitSuccess(true);
      setTimeout(() => {
        setExtensionModal(null);
        setExtensionReason("");
        setExtensionDuration("12");
        setSubmitSuccess(false);
      }, 1500);
    } catch {
      alert("Failed to submit extension request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitHireRequest() {
    if (!hireForm.roleNeeded) return;
    setHireSubmitting(true);
    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 6);

      await createHireRequest({
        projectName: "General Hiring Request",
        roleNeeded: hireForm.roleNeeded,
        quantity: Math.max(1, hireForm.quantity),
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        notes: hireForm.notes,
      });
      setHireSuccess(true);
      setTimeout(() => {
        setHireModalOpen(false);
        setHireSuccess(false);
        setHireForm({ roleNeeded: "", quantity: 1, notes: "" });
      }, 1200);
    } catch {
      alert("Failed to submit hire request");
    } finally {
      setHireSubmitting(false);
    }
  }

  return (
    <>
      <div className="bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-xl p-6 transition-colors duration-300">
        <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] mb-5">
          Employee Contract Management
        </h3>

        <p className="text-[14px] font-semibold text-[var(--dash-text-secondary)] mb-4">
          All Employees
        </p>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]"
              strokeWidth={1.8}
            />
            <input
              type="text"
              placeholder="Search by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-[13px] text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none placeholder:text-[var(--dash-text-faint)] focus:border-[#3b82f6]/50 transition-colors duration-200"
            />
          </div>

          <div className="flex-1" />

          {/* Role filter */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--dash-text-muted)]" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 px-3 pr-8 text-[13px] text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none appearance-none cursor-pointer focus:border-[#3b82f6]/50 transition-colors duration-200"
              >
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)] pointer-events-none"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--dash-text-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 pr-8 text-[13px] text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none appearance-none cursor-pointer focus:border-[#3b82f6]/50 transition-colors duration-200"
              >
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)] pointer-events-none"
              />
            </div>
          </div>

          {showExtensionAction && canRequestHire && (
            <button
              onClick={() => setHireModalOpen(true)}
              className="h-9 inline-flex items-center gap-2 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] border border-[#3b82f6] text-white text-[12px] font-bold shadow-[0_0_0_1px_rgba(37,99,235,0.25)] whitespace-nowrap"
            >
              <UserPlus size={14} /> Request New Hire
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-[var(--dash-text-muted)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[13px]">Loading employees...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-[13px] text-[#ef4444] py-6 text-center">{error}</p>
        )}

        {/* Table */}
        {!loading && !error && (
          <>
            <p className="text-[12px] text-[var(--dash-text-faint)] mb-4">
              Showing {filteredEmployees.length} of {employeesData.length} employees
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dash-border)]">
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3 pr-4">
                      Employee Name
                    </th>
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3 pr-4">
                      Role
                    </th>
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3 pr-4">
                      Employment Type
                    </th>
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3 pr-4">
                      Start Date
                    </th>
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3 pr-4">
                      End Date
                    </th>
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3 pr-4">
                      Contract Status
                    </th>
                    <th className="text-left text-[12px] font-semibold text-[var(--dash-text-muted)] py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-colors duration-150"
                    >
                      <td className="py-4 pr-4">
                        <p className="text-[13px] font-semibold text-[var(--dash-text-heading)]">
                          {emp.name}
                        </p>
                        <p className="text-[11px] text-[var(--dash-text-faint)]">
                          {emp.email}
                        </p>
                      </td>
                      <td className="py-4 pr-4 text-[13px] text-[var(--dash-text-secondary)]">
                        {emp.role}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-md ${typeStyles[emp.employmentType]}`}
                        >
                          {emp.employmentType}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-[13px] text-[var(--dash-text-secondary)]">
                        {emp.contractStart}
                      </td>
                      <td className="py-4 pr-4">
                        <p className={`text-[13px] text-[var(--dash-text-secondary)] ${emp.contractEnd === "-" ? "w-[85px] text-center" : ""}`}>
                          {emp.employmentType === "Permanent" ? "-" : emp.contractEnd}
                        </p>
                        {emp.employmentType !== "Permanent" && (
                          <p className="text-[10px] text-[var(--dash-text-faint)]">
                            {emp.daysRemaining >= 0
                              ? `${emp.daysRemaining} days remaining`
                              : `Expired ${Math.abs(emp.daysRemaining)} days ago`}
                          </p>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`text-[13px] font-medium ${statusColor[emp.status]}`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setDetailModal(emp)}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--dash-text-muted)] hover:text-[#3b82f6] transition-colors duration-200 cursor-pointer"
                          >
                            <Eye size={14} strokeWidth={1.8} />
                            View Detail
                          </button>
                          {showExtensionAction && emp.status === "Expiring Soon" && (
                            <button
                              onClick={() => {
                                setExtensionModal(emp);
                                setExtensionReason("");
                                setExtensionDuration("12");
                                setSubmitSuccess(false);
                              }}
                              className="flex items-center gap-1.5 text-[12px] font-medium text-[#ef4444] hover:text-[#f87171] transition-colors duration-200 cursor-pointer"
                            >
                              <FileText size={14} strokeWidth={1.8} />
                              Request Extension
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-[13px] text-[var(--dash-text-faint)]"
                      >
                        No employees match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* View Detail Modal */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-7 w-full max-w-lg shadow-2xl animate-[fadeIn_0.2s_ease-out] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold">Employee Details</h3>
              <button
                onClick={() => setDetailModal(null)}
                className="p-1 rounded-md bg-[#1f1f1f] text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5 mb-6">
              <div>
                <Label>Name</Label>
                <Value>{detailModal.name}</Value>
              </div>
              <div>
                <Label>Role</Label>
                <Value>{detailModal.role}</Value>
              </div>
              <div>
                <Label>Department</Label>
                <Value>{detailModal.department}</Value>
              </div>
              <div>
                <Label>Email</Label>
                <div className="text-[13px] text-gray-300 break-all">{detailModal.email}</div>
              </div>
              <div>
                <Label>Employment Type</Label>
                <div className="mt-1">
                  <span className="px-3 py-1 bg-[#1a2333] text-[#4f86f7] text-[11px] font-semibold rounded-md border border-[#1e2d4d]">
                    {detailModal.employmentType}
                  </span>
                </div>
              </div>
              <div>
                <Label>Experience Years</Label>
                <Value>{detailModal.experienceYears}yr Experience</Value>
              </div>
            </div>

            <div className="mb-6">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {detailModal.skills.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-[#0f0f0f] border border-[#1f1f1f] text-gray-200 text-[11px] font-medium rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <Label>Contract Information</Label>
              <div className="mt-2 bg-[#161d29] border border-[#1e2636] rounded-xl p-4 space-y-3">
                <InfoRow label="Start Date:" value={detailModal.contractStart} />
                <InfoRow label="End Date:" value={detailModal.contractEnd} />
                {detailModal.employmentType !== "Permanent" && (
                  <InfoRow label="Duration:" value="24 months" />
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-300">Status:</span>
                  <span className={`text-[12px] font-bold ${statusColor[detailModal.status]}`}>
                    {detailModal.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>Project Assignments</Label>
              <div className="mt-2 space-y-3 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {detailModal.projects.map((proj, idx) => (
                  <div key={idx} className="bg-[#161d29] border border-[#1e2636] rounded-xl p-4">
                    <div className="text-[15px] font-bold text-gray-100">{proj.name}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5">{proj.start} - {proj.end}</div>
                    <div className="mt-3">
                      <span className="px-3 py-1 bg-[#0f0f0f] border border-[#1f1f1f] text-gray-300 text-[11px] font-semibold rounded-md">
                        Scheduled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Extension Modal */}
      {showExtensionAction && extensionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setExtensionModal(null)}
        >
          <div
            className="bg-[var(--dash-bg-modal)] border border-[var(--dash-border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">
                Request Contract Extension
              </h3>
              <button
                onClick={() => setExtensionModal(null)}
                className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-[var(--dash-text-heading)]">Request Submitted</p>
                <p className="text-[12px] text-[var(--dash-text-muted)] mt-1">The extension request has been sent.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="text-[12px] font-semibold text-[var(--dash-text-muted)] mb-1">Employee</div>
                  <div className="text-[15px] font-semibold text-[var(--dash-text-heading)]">
                    {extensionModal.name}
                  </div>
                  <div className="text-[13px] text-[var(--dash-text-faint)]">
                    {extensionModal.role}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[12px] font-semibold text-[var(--dash-text-muted)] mb-1.5">
                    Extension Duration (months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={extensionDuration}
                    onChange={(e) => setExtensionDuration(e.target.value)}
                    className="w-full h-10 px-3 text-[14px] text-[var(--dash-text-secondary)] bg-[#0f0f0f] border border-[var(--dash-border)] rounded-lg outline-none focus:border-[#ea580c] transition-colors"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[12px] font-semibold text-[var(--dash-text-muted)] mb-1.5">
                    Reason (Required)
                  </label>
                  <textarea
                    rows={3}
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    placeholder="Provide detailed reason for contract extension..."
                    className="w-full px-3 py-2 text-[14px] text-[var(--dash-text-secondary)] bg-[#0f0f0f] border border-[var(--dash-border)] rounded-lg outline-none placeholder:text-[var(--dash-text-faint)] resize-none focus:border-[#ea580c] transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setExtensionModal(null)}
                    className="px-5 py-2 text-[13px] font-semibold text-white bg-transparent border border-[var(--dash-border)] hover:bg-[#1a1a1a] rounded-lg transition-colors duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitExtension}
                    disabled={submitting || !extensionDuration || !extensionReason}
                    className="px-6 py-2.5 inline-flex items-center justify-center gap-2 font-semibold text-sm text-white bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200 cursor-pointer"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showExtensionAction && canRequestHire && hireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setHireModalOpen(false)}>
          <div className="bg-[var(--dash-bg-modal)] border border-[var(--dash-border)] rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-[var(--dash-text-heading)]">Request New Hire</h3>
              <button onClick={() => setHireModalOpen(false)} className="p-1.5 rounded-lg text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)]"><X size={18} /></button>
            </div>

            {hireSuccess ? (
              <p className="text-center py-8 text-[14px] font-semibold text-emerald-400">Hire request sent to HR</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-[12px] font-semibold text-[var(--dash-text-muted)]">Role needed</label>
                  <input value={hireForm.roleNeeded} onChange={(e) => setHireForm((p) => ({ ...p, roleNeeded: e.target.value }))} placeholder="e.g. Senior Dev" className="w-full h-10 px-3 text-[14px] text-[var(--dash-text-heading)] placeholder:text-[var(--dash-text-faint)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-[12px] font-semibold text-[var(--dash-text-muted)]">Amount of user needed</label>
                  <input type="number" min={1} value={hireForm.quantity} onChange={(e) => setHireForm((p) => ({ ...p, quantity: Number(e.target.value) || 1 }))} className="h-10 w-full px-3 text-[14px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-[12px] font-semibold text-[var(--dash-text-muted)]">Notes for HR</label>
                  <textarea rows={3} value={hireForm.notes} onChange={(e) => setHireForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Add context for HR" className="w-full px-3 py-2 text-[14px] text-[var(--dash-text-heading)] placeholder:text-[var(--dash-text-faint)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setHireModalOpen(false)} className="px-4 py-2 text-[13px] border border-[var(--dash-border)] rounded-lg transition-all duration-200 hover:bg-[var(--dash-bg-hover)]">Cancel</button>
                  <button onClick={handleSubmitHireRequest} disabled={hireSubmitting} className="px-4 py-2 text-[13px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_8px_20px_rgba(37,99,235,0.35)] disabled:opacity-50">
                    {hireSubmitting ? "Submitting..." : "Send Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-medium text-gray-500 mb-1">{children}</div>;
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="text-[15px] font-bold text-white">{children}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-gray-300">{label}</span>
      <span className="text-[14px] font-medium text-white">{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--dash-border-subtle)]">
      <span className="text-[12px] text-[var(--dash-text-muted)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--dash-text-heading)]">
        {value}
      </span>
    </div>
  );
}
