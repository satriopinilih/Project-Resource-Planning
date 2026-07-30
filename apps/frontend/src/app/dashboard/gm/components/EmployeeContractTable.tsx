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
  Info,
  Calendar,
} from "lucide-react";
import {
  getRawEmployees,
  createContractExtension,
  BackendEmployee,
  createHireRequest,
  getContractExtensionRecommendation,
  ContractExtensionRecommendation,
} from "@/lib/api";

interface EmployeeContract {
  id: string;
  name: string;
  email: string;
  role: string;
  employmentType: "Permanent" | "Professional Services";
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

// Backend EmployeeType: 0=ProfessionalServices, 1=Permanent
function mapEmploymentType(t: number | string): "Permanent" | "Professional Services" {
  if (t === 1 || t === "1" || (typeof t === "string" && t.toLowerCase() === "permanent")) {
    return "Permanent";
  }
  return "Professional Services";
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
  "Professional Services":
    "bg-[var(--dash-badge-contract-bg)] text-[var(--dash-badge-contract-text)] border border-[var(--dash-badge-contract-border)]",
};

interface EmployeeContractTableProps {
  showExtensionAction?: boolean;
}

export default function EmployeeContractTable({ showExtensionAction = true }: EmployeeContractTableProps) {
  const [employeesData, setEmployeesData] = useState<EmployeeContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  const [hireExpectEndDate, setHireExpectEndDate] = useState("");
  const [hireForm, setHireForm] = useState({
    roleNeeded: "",
    quantity: 1,
    minExperience: 1,
    maxExperience: 3,
    notes: "",
  });

  // Extension modal recommendation state
  const [recommendation, setRecommendation] = useState<ContractExtensionRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [useAutoRec, setUseAutoRec] = useState(false);

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

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const currentEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const uniqueRoles = [
    "All Roles",
    ...Array.from(new Set(employeesData.map((e) => e.role))),
  ];
  const uniqueStatuses = ["All Status", "Active", "Expiring Soon", "Expired"];

  async function openExtensionModal(emp: EmployeeContract) {
    setExtensionModal(emp);
    setExtensionReason("");
    setExtensionDuration("12");
    setSubmitSuccess(false);
    setUseAutoRec(false);
    setRecommendation(null);
    setRecLoading(true);
    try {
      const rec = await getContractExtensionRecommendation(emp.id);
      setRecommendation(rec);
      if (rec.hasRecommendation) {
        setUseAutoRec(true);
        setExtensionDuration(String(rec.recommendedDurationMonths ?? 12));
        setExtensionReason(rec.justificationText ?? "");
      }
    } catch {
      // silently fail – user can still fill manually
    } finally {
      setRecLoading(false);
    }
  }

  async function handleSubmitExtension() {
    if (!extensionModal || !extensionDuration || !extensionReason) return;
    setSubmitting(true);
    try {
      // Auto-rec mode: pass the exact project end date so backend uses it directly.
      // Manual mode: expectedEndDate is null → backend uses contractEnd + months.
      const expectedEndDate =
        useAutoRec && recommendation?.hasRecommendation && recommendation.recommendedEndDate
          ? recommendation.recommendedEndDate
          : null;

      await createContractExtension(
        extensionModal.id,
        Math.max(1, parseInt(extensionDuration, 10) || 12),
        extensionReason,
        expectedEndDate
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
    if (!hireForm.roleNeeded || !hireForm.notes.trim() || !hireExpectEndDate) return;
    setHireSubmitting(true);
    try {
      await createHireRequest({
        projectName: "General Hiring Request",
        roleNeeded: hireForm.roleNeeded,
        quantity: Math.max(1, hireForm.quantity),
        experienceYearsRange: `${hireForm.minExperience}-${hireForm.maxExperience} years`,
        startDate: new Date().toISOString().split("T")[0],
        endDate: hireExpectEndDate,
        notes: hireForm.notes || "Requested from general HR pipeline",
      });
      setHireSuccess(true);
      setTimeout(() => {
        setHireModalOpen(false);
        setHireSuccess(false);
        setHireForm({ roleNeeded: "", quantity: 1, minExperience: 1, maxExperience: 3, notes: "" });
        setHireExpectEndDate("");
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <p className="text-[12px] text-[var(--dash-text-faint)]">
                  Showing {currentEmployees.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[var(--dash-text-faint)]">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-md hover:text-[var(--dash-text-heading)] transition-colors focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <p className="text-[12px] text-[var(--dash-text-faint)]">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-md hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-[12px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-md hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                  {currentEmployees.map((emp) => (
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
                              onClick={() => openExtensionModal(emp)}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setExtensionModal(null)}
        >
          <div
            className="bg-[#0d1117] border border-[#1e2433] rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#1e2433]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#3b82f6] mb-1">Human Resources</p>
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-bold text-white">Request Contract Extension</h3>
                <div className="w-8 h-8 rounded-full bg-[#1e2433] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#3b82f6]">HR</span>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[80vh]">
              {submitSuccess ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-bold text-white">Request Submitted</p>
                  <p className="text-[12px] text-gray-400 mt-1">The extension request has been sent to HR.</p>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-5">

                  {/* Employee Information */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b82f6] mb-3">Employee Information</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Employee Name</p>
                        <p className="text-[14px] font-bold text-white">{extensionModal.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Department</p>
                        <p className="text-[14px] font-bold text-white">{extensionModal.department}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Position</p>
                      <p className="text-[14px] font-bold text-white">{extensionModal.role}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Current Contract End Date</p>
                      <p className="text-[14px] font-bold text-[#3b82f6]">{extensionModal.contractEnd}</p>
                    </div>
                  </div>

                  {/* Active Projects */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b82f6] mb-3">Active Projects</p>
                    {recLoading ? (
                      <div className="flex items-center justify-center py-5 gap-2 text-gray-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-[12px]">Loading project data...</span>
                      </div>
                    ) : recommendation && recommendation.activeProjects.length > 0 ? (
                      <div className="rounded-xl overflow-hidden border border-[#1e2433]">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-[#141922]">
                              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 px-4 py-2.5">Project Name</th>
                              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-500 px-4 py-2.5">Est. End Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e2433]">
                            {recommendation.activeProjects.map((proj, idx) => (
                              <tr key={idx} className="bg-[#0d1117]">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${proj.isLatest ? "bg-[#ef4444]" : "bg-[#3b82f6]"}`} />
                                    <span className="text-[13px] text-gray-200">{proj.projectName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className={`text-[13px] font-medium ${proj.isLatest ? "text-[#ef4444]" : "text-gray-400"}`}>
                                      {proj.estEndDate ? new Date(proj.estEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                    </span>
                                    {proj.isLatest && (
                                      <span className="px-1.5 py-0.5 bg-[#ef4444] text-white text-[9px] font-bold rounded uppercase tracking-wider">latest</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : !recLoading ? (
                      <p className="text-[12px] text-gray-500 italic py-2">No active projects found for this employee.</p>
                    ) : null}
                  </div>

                  {/* System Recommendation Alert */}
                  {recommendation?.hasRecommendation && (
                    <div className="flex gap-3 p-3.5 rounded-xl bg-[#0f1827] border border-[#1e2d4d]">
                      <Info size={15} className="text-[#3b82f6] flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-gray-300 leading-relaxed">
                        <span className="font-semibold text-gray-100">System Recommendation: </span>
                        {" Extend by "}
                        <span className="font-bold text-[#3b82f6]">{recommendation.recommendedDurationMonths} months</span>
                        {" to align with the latest project milestone (exact end date: "}
                        <span className="font-semibold text-[#3b82f6]">
                          {recommendation.recommendedEndDate
                            ? new Date(recommendation.recommendedEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                        {")."}
                      </p>
                    </div>
                  )}

                  {/* Toggle Switch */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-bold text-white">Use System Recommendation</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {recommendation?.hasRecommendation
                            ? useAutoRec
                              ? "Auto-fills duration and reason fields"
                              : "Manual override mode active"
                            : "No recommendation available — manual mode"}
                        </p>
                      </div>
                      <button
                        disabled={!recommendation?.hasRecommendation}
                        onClick={() => {
                          const next = !useAutoRec;
                          setUseAutoRec(next);
                          if (next && recommendation) {
                            setExtensionDuration(String(recommendation.recommendedDurationMonths ?? 12));
                            setExtensionReason(recommendation.justificationText ?? "");
                          } else {
                            setExtensionDuration("");
                            setExtensionReason("");
                          }
                        }}
                        className="relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: useAutoRec && recommendation?.hasRecommendation ? "#3b82f6" : "#374151" }}
                        title={recommendation?.hasRecommendation ? "Toggle recommendation" : "No recommendation available"}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: useAutoRec && recommendation?.hasRecommendation ? "translateX(24px)" : "translateX(0)" }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Duration + End Date */}
                  <div className={useAutoRec ? "grid grid-cols-2 gap-3" : "block"}>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Extension Duration (Months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        readOnly={useAutoRec && !!recommendation?.hasRecommendation}
                        value={extensionDuration}
                        onChange={(e) => !useAutoRec && setExtensionDuration(e.target.value)}
                        placeholder="Enter number of months"
                        className={`w-full h-10 px-3 text-[14px] bg-[#141922] border border-[#1e2433] rounded-lg outline-none transition-colors text-white
                          ${useAutoRec && recommendation?.hasRecommendation ? "cursor-not-allowed text-[#3b82f6] font-bold" : "focus:border-[#3b82f6] placeholder:text-gray-600"}`}
                      />
                    </div>
                    {useAutoRec && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                          Expected Contract End Date
                        </label>
                        <div className={`w-full h-10 px-3 flex items-center text-[14px] bg-[#141922] border border-[#1e2433] rounded-lg
                          ${recommendation?.recommendedEndDate ? "text-[#3b82f6] font-bold" : "text-gray-500"}`}>
                          {recommendation?.hasRecommendation && recommendation.recommendedEndDate
                            // Auto mode → show exact project deadline (backend will use this directly)
                            ? new Date(recommendation.recommendedEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : (() => {
                                // Fallback: compute contractEnd + months if no exact date
                                const months = parseInt(extensionDuration, 10);
                                const rawEnd = extensionModal?.contractEndRaw;
                                if (!isNaN(months) && months > 0 && rawEnd) {
                                  const base = new Date(rawEnd);
                                  base.setMonth(base.getMonth() + months);
                                  return base.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                }
                                return "—";
                              })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Reason for Extension
                        {!useAutoRec && <span className="text-[#ef4444] ml-1">*</span>}
                      </label>
                      {useAutoRec && recommendation?.hasRecommendation && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded">Auto-generated</span>
                      )}
                    </div>
                    <textarea
                      rows={useAutoRec ? 4 : 4}
                      readOnly={useAutoRec && !!recommendation?.hasRecommendation}
                      value={extensionReason}
                      onChange={(e) => !useAutoRec && setExtensionReason(e.target.value)}
                      placeholder={useAutoRec ? "" : "Provide a detailed justification for the custom extension duration..."}
                      className={`w-full px-3 py-2.5 text-[13px] bg-[#141922] border border-[#1e2433] rounded-xl outline-none resize-none transition-colors leading-relaxed
                        ${useAutoRec && recommendation?.hasRecommendation
                          ? "text-gray-400 italic cursor-not-allowed"
                          : "text-gray-200 placeholder:text-gray-600 focus:border-[#3b82f6]"}`}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-1 pb-1">
                    <button
                      onClick={() => setExtensionModal(null)}
                      className="px-5 py-2.5 text-[13px] font-bold text-white bg-transparent border border-[#374151] hover:border-[#4b5563] rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitExtension}
                      disabled={submitting || !extensionDuration || (!useAutoRec && !extensionReason.trim())}
                      className="px-6 py-2.5 inline-flex items-center gap-2 text-[13px] font-bold text-white bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                    >
                      {submitting && <Loader2 size={14} className="animate-spin" />}
                      Submit Request
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                  <select
                    value={hireForm.roleNeeded}
                    onChange={(e) => setHireForm((p) => ({ ...p, roleNeeded: e.target.value }))}
                    className="w-full h-10 px-3 text-[14px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg"
                  >
                    <option value="" disabled>Select a role...</option>
                    <option value="Senior Dev">Senior Dev</option>
                    <option value="Junior Dev">Junior Dev</option>
                    <option value="Senior BA">Senior BA</option>
                    <option value="Junior BA">Junior BA</option>
                    <option value="Architect">Architect</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[12px] font-semibold text-[var(--dash-text-muted)]">Amount of user needed</label>
                  <input type="number" min={1} max={1} value={1} disabled className="h-10 w-full px-3 text-[14px] text-[var(--dash-text-muted)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg cursor-not-allowed opacity-70" />
                </div>
                <div>
                  <label className="block mb-1 text-[12px] font-semibold text-[var(--dash-text-muted)]">
                    Expect End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)] pointer-events-none" />
                    <input
                      type="date"
                      value={hireExpectEndDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setHireExpectEndDate(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-[14px] text-[var(--dash-text-heading)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg outline-none focus:border-[#3b82f6]/60 transition-colors cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-[12px] font-semibold text-[var(--dash-text-muted)]">
                    Notes for HR <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={3} value={hireForm.notes} onChange={(e) => setHireForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Add context for HR" className="w-full px-3 py-2 text-[14px] text-[var(--dash-text-heading)] placeholder:text-[var(--dash-text-faint)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-lg" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setHireModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200">Cancel</button>
                  <button
                    onClick={handleSubmitHireRequest}
                    disabled={hireSubmitting || !hireForm.notes.trim() || !hireForm.roleNeeded || !hireExpectEndDate}
                    className="px-4 py-2 text-[13px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_8px_20px_rgba(37,99,235,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
