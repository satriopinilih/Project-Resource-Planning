"use client";

import { useState, useEffect } from "react";
import Header from "../components/Header";
import {
  Users,
  AlertTriangle,
  Briefcase,
  Mail,
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
  Star,
  Building2,
} from "lucide-react";
import { getRawEmployees, BackendEmployee } from "../../../../lib/api";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getContractLabel = (
  status: number
): { label: string; color: string; bg: string } => {
  switch (status) {
    case 0:
      return {
        label: "Active",
        color: "text-[#34d399]",
        bg: "bg-[#064e3b]",
      };
    case 1:
      return {
        label: "Expired",
        color: "text-[#f87171]",
        bg: "bg-[#7f1d1d]",
      };
    case 2:
      return {
        label: "Expiring Soon",
        color: "text-[#fbbf24]",
        bg: "bg-[#78350f]",
      };
    default:
      return {
        label: "Unknown",
        color: "text-gray-400",
        bg: "bg-gray-800",
      };
  }
};

const getEmployeeTypeLabel = (type: number) =>
  type === 1 ? "Permanent" : "Contract";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const avatarColors = [
  "bg-[#2563eb]",
  "bg-[#7c3aed]",
  "bg-[#0891b2]",
  "bg-[#059669]",
  "bg-[#d97706]",
  "bg-[#dc2626]",
  "bg-[#9333ea]",
  "bg-[#0284c7]",
];

const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

// ─── component ───────────────────────────────────────────────────────────────
export default function TeamMembersPage() {
  const [members, setMembers] = useState<BackendEmployee[]>([]);
  const [selected, setSelected] = useState<BackendEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getRawEmployees()
      .then((data) => setMembers(data))
      .catch((e) => console.error("Failed to fetch team members:", e))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <Header title="Team Members" />

      <div className="p-6 flex gap-6 min-h-0 flex-1">
        {/* ── Left Panel: Member List ── */}
        <div className="w-[340px] flex-shrink-0 flex flex-col overflow-hidden">
          {/* List Header */}
          <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="text-[16px] font-bold text-white">
              Team Members
            </h3>
            {!isLoading && (
              <span className="text-[12px] font-semibold bg-[#1e2e4a] text-[#60a5fa] px-3 py-1 rounded-md">
                {members.length} Total
              </span>
            )}
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
                <span className="text-[13px]">Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-500">
                <Users size={28} strokeWidth={1.5} />
                <span className="text-[13px]">No members found.</span>
              </div>
            ) : (
              members.map((member) => {
                const contractInfo = getContractLabel(member.contractStatus);
                const isActive = selected?.userId === member.userId;

                return (
                  <button
                    key={member.userId}
                    onClick={() => setSelected(member)}
                    className={`w-full text-left p-5 rounded-xl transition-all duration-150 cursor-pointer flex flex-col gap-1
                      ${isActive
                        ? "bg-[#252d3d] border border-[#3b82f6]/50 shadow-sm"
                        : "bg-[#1e2532] hover:bg-[#252d3d] border border-transparent"
                      }`}
                  >
                    {/* Info */}
                    <div className="flex-1">
                      <p className="text-[15px] font-semibold text-gray-100">
                        {member.userName}
                      </p>
                      <p className="text-[13px] text-gray-400 mt-0.5">
                        {member.role}
                      </p>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        Exp: {member.experienceLevel || "N/A"}
                      </p>

                      <div className="mt-3 flex flex-col items-start gap-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[11px] font-medium rounded ${contractInfo.bg} ${contractInfo.color}`}
                        >
                          {contractInfo.label}
                        </span>
                        {/* Expiring Soon warning */}
                        {member.contractStatus === 2 && member.daysRemaining > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#fbbf24] font-medium mt-1">
                            <AlertTriangle size={12} />
                            {member.daysRemaining} days left
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Detail View ── */}
        <div className="flex-1 bg-[#22252e] rounded-xl overflow-y-auto transition-colors duration-300">
          {selected === null ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-[#6b7280]">
              <Users size={80} strokeWidth={1.2} className="text-[#4b5563]" />
              <p className="text-[15px]">Select a team member to view their details</p>
            </div>
          ) : (
            /* Member Detail */
            <MemberDetail member={selected} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────
function MemberDetail({ member }: { member: BackendEmployee }) {
  const contractInfo = getContractLabel(member.contractStatus);
  const typeLabel = getEmployeeTypeLabel(member.employeeType);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-6 pb-8 border-b border-gray-700/50">
        <div
          className={`flex items-center justify-center w-20 h-20 rounded-2xl text-[26px] font-bold text-white shadow-lg ${getAvatarColor(
            member.userName
          )}`}
        >
          {getInitials(member.userName)}
        </div>
        <div className="flex-1">
          <h2 className="text-[24px] font-bold text-white leading-tight">
            {member.userName}
          </h2>
          <p className="text-[15px] text-gray-400 mt-1">
            {member.role}
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span
              className={`inline-block px-3 py-1 text-[12px] font-semibold rounded-md ${contractInfo.bg} ${contractInfo.color}`}
            >
              {contractInfo.label}
            </span>
            <span className="inline-block px-3 py-1 text-[12px] font-semibold rounded-md bg-[#1e3a8a]/30 text-[#93c5fd]">
              {typeLabel}
            </span>
            {member.experienceLevel && (
              <span className="inline-block px-3 py-1 text-[12px] font-semibold rounded-md bg-gray-800 text-gray-300">
                {member.experienceLevel}
              </span>
            )}
          </div>
        </div>

        {/* Days remaining if expiring */}
        {member.contractStatus === 2 && member.daysRemaining > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#78350f]/30 border border-[#78350f]/50">
            <AlertTriangle size={16} className="text-[#fbbf24]" />
            <span className="text-[13px] font-semibold text-[#fbbf24]">
              {member.daysRemaining} days left
            </span>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-5 mt-8">
        <InfoCard
          icon={<Mail size={16} className="text-[#60a5fa]" strokeWidth={1.8} />}
          label="Email"
          value={member.email}
        />
        <InfoCard
          icon={<Building2 size={16} className="text-[#a78bfa]" strokeWidth={1.8} />}
          label="Department"
          value={member.departmentName || "—"}
        />
        <InfoCard
          icon={<Calendar size={16} className="text-[#34d399]" strokeWidth={1.8} />}
          label="Contract Start"
          value={fmtDate(member.contractStart)}
        />
        <InfoCard
          icon={<Clock size={16} className="text-[#fbbf24]" strokeWidth={1.8} />}
          label="Contract End"
          value={fmtDate(member.contractEnd)}
        />
      </div>

      {/* Skills */}
      {member.skills && member.skills.length > 0 && (
        <section className="mt-8">
          <SectionTitle icon={<Star size={16} strokeWidth={2} />} title="Skills" />
          <div className="flex flex-wrap gap-2 mt-4">
            {member.skills.map((skill) => (
              <span
                key={skill}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-[#1e2532] text-gray-200 border border-gray-700/50 hover:border-[#3b82f6]/40 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Assigned Projects */}
      {member.projects && member.projects.length > 0 && (
        <section className="mt-8">
          <SectionTitle
            icon={<Briefcase size={16} strokeWidth={2} />}
            title="Assigned Projects"
          />
          <div className="mt-4 flex flex-col gap-3">
            {member.projects.map((proj) => (
              <div
                key={proj.projectId}
                className="flex items-center justify-between px-5 py-4 rounded-xl bg-[#1e2532] border border-gray-700/50 hover:border-[#3b82f6]/30 transition-colors"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#60a5fa]">
                    {proj.projectName}
                  </p>
                  <p className="text-[13px] text-gray-400 mt-1">
                    {proj.roleInProject}
                  </p>
                </div>
                <span className="text-[12px] text-gray-500">
                  {proj.startDate
                    ? new Date(proj.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-xl bg-[#1e2532] border border-gray-700/30">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-[14px] font-medium text-gray-200 mt-1 break-all">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500">{icon}</span>
      <h4 className="text-[14px] font-bold text-gray-300 uppercase tracking-wider">
        {title}
      </h4>
    </div>
  );
}