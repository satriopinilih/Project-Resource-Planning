"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Calendar,
  Users,
  Clock,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Star,
  Briefcase,
  Award
} from "lucide-react";
import {
  getProjectRecommendations,
  RecommendationResponse,
  RecommendationOption as OptionType,
  RecommendationCandidate,
  updateProject,
  assignMemberToProject,
  getEmployees
} from "@/lib/api";
import { Employee } from "@/lib/types";

interface SmartRecommendationPanelProps {
  projectId: number;
}

// ── Candidate Card ──
const CandidateCard: React.FC<{ candidate: RecommendationCandidate; rank: number }> = ({ candidate, rank }) => {
  const matchColor = candidate.skillMatchPercent >= 70
    ? "text-green-400"
    : candidate.skillMatchPercent >= 40
      ? "text-amber-400"
      : "text-red-400";

  const matchBg = candidate.skillMatchPercent >= 70
    ? "bg-green-500/10 border-green-500/20"
    : candidate.skillMatchPercent >= 40
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-red-500/10 border-red-500/20";

  return (
    <div className="flex items-start gap-4 p-4 bg-[#1a1f2e]/60 rounded-xl border border-[var(--dash-border)] hover:border-gray-600 transition-all group">
      {/* Rank Badge */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${rank === 1 ? "bg-amber-500/20 text-amber-400" : rank === 2 ? "bg-gray-500/20 text-gray-400" : "bg-gray-800 text-gray-500"
          }`}>
          #{rank}
        </div>
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[13px] font-bold text-white truncate">{candidate.userName}</p>
          {candidate.isAvailable && (
            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-bold rounded uppercase tracking-wider">Available</span>
          )}
        </div>
        <p className="text-[11px] text-[var(--dash-text-faint)] mb-2">
          {candidate.staffRole} · {candidate.experienceYears}yr experience · For: <span className="text-blue-400">{candidate.targetRole}</span>
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {candidate.matchedSkills.map((skill) => (
            <span key={skill} className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] font-semibold rounded-md border border-blue-500/20">
              {skill}
            </span>
          ))}
          {candidate.skills.filter(s => !candidate.matchedSkills.includes(s)).slice(0, 3).map((skill) => (
            <span key={skill} className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[10px] font-medium rounded-md">
              {skill}
            </span>
          ))}
        </div>

        {/* Availability Note */}
        {!candidate.isAvailable && (
          <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
            <Clock size={11} />
            {candidate.availabilityNote}
            {candidate.currentProjects.length > 0 && (
              <span className="text-[var(--dash-text-faint)]">
                ({candidate.currentProjects.join(", ")})
              </span>
            )}
          </p>
        )}
      </div>

      {/* Match Score */}
      <div className={`shrink-0 px-3 py-2 rounded-xl border flex flex-col items-center ${matchBg}`}>
        <span className={`text-[18px] font-black ${matchColor}`}>
          {candidate.skillMatchPercent.toFixed(0)}%
        </span>
        <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Match</span>
      </div>
    </div>
  );
};

// ── Option Card ──
const OptionCard: React.FC<{
  option: OptionType;
  isRecommended: boolean;
  label: string;
}> = ({ option, isRecommended, label }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`
      flex-1 bg-[#1a1f2e]/50 border rounded-2xl p-6 flex flex-col transition-all duration-300
      ${isRecommended ? "border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-[var(--dash-border)] hover:border-gray-700"}
    `}>
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-[15px] font-bold text-white">{option.title}</h4>
        {isRecommended && (
          <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Star size={10} fill="currentColor" /> Recommended
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-800 rounded-md text-gray-400"><Calendar size={14} /></div>
            <div>
              <p className="text-[10px] text-[var(--dash-text-faint)] uppercase font-bold tracking-tight">Timeline</p>
              <p className="text-[12px] text-gray-200 mt-0.5">{option.timeline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-800 rounded-md text-gray-400"><Users size={14} /></div>
            <div>
              <p className="text-[10px] text-[var(--dash-text-faint)] uppercase font-bold tracking-tight">Team Size</p>
              <p className="text-[12px] text-gray-200 mt-0.5">{option.teamSize} members ({option.availableNow} available now)</p>
            </div>
          </div>
        </div>

        {/* Match Score Bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[var(--dash-text-faint)] uppercase font-bold tracking-tight flex items-center gap-1.5">
              <Award size={12} /> Skill Match Score
            </span>
            <span className={`text-[13px] font-black ${option.matchScore >= 70 ? "text-green-400" : option.matchScore >= 40 ? "text-amber-400" : "text-red-400"
              }`}>
              {option.matchScore.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${option.matchScore >= 70 ? "bg-gradient-to-r from-green-600 to-green-400" :
                option.matchScore >= 40 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                  "bg-gradient-to-r from-red-600 to-red-400"
                }`}
              style={{ width: `${option.matchScore}%` }}
            />
          </div>
        </div>

        {/* Status Box */}
        <div className={`
          mt-3 p-3 rounded-xl border flex flex-col gap-1.5
          ${option.requiresHiring
            ? "bg-amber-500/5 border-amber-500/20 text-amber-500"
            : option.requiresReschedule
              ? "bg-[#8b5cf6]/5 border-[#8b5cf6]/20 text-[#a78bfa]"
              : "bg-green-500/5 border-green-500/20 text-green-500"}
        `}>
          <div className="flex items-center gap-2">
            {option.requiresHiring ? <UserPlus size={14} /> : option.requiresReschedule ? <Clock size={14} /> : <CheckCircle2 size={14} />}
            <span className="text-[12px] font-bold">
              {option.requiresHiring ? "Request Hiring / Replacement" : option.requiresReschedule ? "Action Needed: Delay Start Date" : "All resources available"}
            </span>
          </div>
          {option.requiresHiring && option.hiringDetail && (
            <p className="text-[11px] font-medium pl-5 opacity-90">• {option.hiringDetail}</p>
          )}
          {option.requiresReschedule && option.rescheduleDetail && (
            <p className="text-[11px] font-medium pl-5 opacity-90">• {option.rescheduleDetail}</p>
          )}
        </div>
      </div>

      {/* Expand Candidates */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-5 w-full py-2.5 bg-[#2a2f3e] hover:bg-[#32384a] text-gray-200 text-[12px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-700/50 cursor-pointer"
      >
        <Briefcase size={14} />
        {expanded ? "Hide" : "Show"} Team ({option.candidates.length})
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
          {option.candidates.map((c, idx) => (
            <CandidateCard key={c.userId} candidate={c} rank={idx + 1} />
          ))}
          {option.candidates.length === 0 && (
            <p className="text-center text-[12px] text-[var(--dash-text-faint)] py-4 italic">No candidates matched for this option.</p>
          )}
        </div>
      )}

      {/* Option Actions */}
      <div className="mt-6 flex gap-3">
        <button
          disabled={option.requiresHiring || option.requiresReschedule}
          onClick={() => window.dispatchEvent(new CustomEvent('startProject', { detail: option }))}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-[13px] rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/20 disabled:shadow-none"
        >
          {option.requiresHiring || option.requiresReschedule ? "Unavailable to Start" : "Start Project"}
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('customizeOption', { detail: option }))}
          className="px-5 py-2.5 bg-[#2a2f3e] hover:bg-[#32384a] text-gray-200 font-bold text-[13px] rounded-xl border border-gray-700/50 transition-all cursor-pointer"
        >
          Customize
        </button>
      </div>
    </div>
  );
};

// ── Customize Modal ──
const CustomizeModal: React.FC<{
  option: OptionType;
  requiredRoles: any[];
  employees: Employee[];
  allCandidates: RecommendationCandidate[];
  onClose: () => void;
  onSave: (assignments: { role: string; userId: string }[]) => void;
  isProcessing: boolean;
}> = ({ option, requiredRoles, employees, allCandidates, onClose, onSave, isProcessing }) => {

  // Transform needed roles into a flat list of slots
  const initialAssignments: { id: string; role: string; userId: string; originalUserId: string }[] = [];
  let slotIdx = 0;

  requiredRoles.forEach(rr => {
    for (let i = 0; i < rr.requiredCount; i++) {
      const existingRec = option.candidates.filter(c => c.targetRole === rr.roleName)[i];
      initialAssignments.push({
        id: `slot_${slotIdx++}`,
        role: rr.roleName,
        userId: existingRec ? existingRec.userId : "",
        originalUserId: existingRec ? existingRec.userId : ""
      });
    }
  });

  const [assignments, setAssignments] = useState(initialAssignments);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const updateAssignment = (id: string, userId: string) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, userId } : a));
    setExpandedSlot(null);
  };

  const handleSave = () => {
    const valid = assignments.filter(a => a.userId.trim() !== "");
    onSave(valid);
  };

  const filledCount = assignments.filter(a => a.userId.trim() !== "").length;
  const totalCount = assignments.length;
  const allFilled = filledCount === totalCount;

  // Helper: use backend isAvailable as source of truth, fallback to project-count check
  const isEmpAvailable = (empId: string): boolean => {
    const candidate = allCandidates.find(c => c.userId === empId);
    if (candidate !== undefined) return candidate.isAvailable;
    const emp = employees.find(e => e.id === empId);
    return !emp?.projects || emp.projects.length === 0;
  };

  // Block save if any assigned employee is not available
  const hasBusyAssignment = assignments.some(a => a.userId && !isEmpAvailable(a.userId));

  const canSave = !isProcessing && filledCount > 0 && !hasBusyAssignment;

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const avatarGradients = [
    "from-blue-600 to-blue-400",
    "from-purple-600 to-purple-400",
    "from-emerald-600 to-emerald-400",
    "from-amber-600 to-amber-400",
    "from-rose-600 to-rose-400",
    "from-cyan-600 to-cyan-400",
  ];
  const getAvatarGradient = (name: string) =>
    avatarGradients[name.charCodeAt(0) % avatarGradients.length];

  const sortedEmployees = [...employees].sort((a, b) => {
    const aFree = !a.projects || a.projects.length === 0;
    const bFree = !b.projects || b.projects.length === 0;
    if (aFree && !bFree) return -1;
    if (!aFree && bFree) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-gray-800/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.6)]">

        {/* ── Header ── */}
        <div className="px-7 pt-7 pb-5 border-b border-gray-800/60 sticky top-0 bg-[#0d1117]/95 backdrop-blur-md z-10 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-white">Customize Team</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Editing plan: <span className="text-purple-400 font-semibold">{option.title}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 hover:text-white transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assignment Progress</span>
              <span className={`text-[12px] font-bold ${allFilled ? "text-emerald-400" : "text-amber-400"}`}>
                {filledCount} / {totalCount} Roles Filled
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allFilled
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                  : "bg-gradient-to-r from-amber-500 to-amber-400"
                  }`}
                style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Slot Cards ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
          {assignments.map((slot, slotIndex) => {
            const selectedEmp = employees.find(e => e.id === slot.userId);
            const originalCandidate = option.candidates.find(c => c.userId === slot.originalUserId);
            const isModified = slot.userId !== slot.originalUserId;
            const isOpen = expandedSlot === slot.id;
            // Use backend isAvailable as source of truth for selected employee
            const selectedIsAvailable = slot.userId ? isEmpAvailable(slot.userId) : true;
            const isBusy = selectedEmp && !selectedIsAvailable;

            return (
              <div
                key={slot.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isModified
                  ? "border-purple-500/40 bg-[#130d1e]"
                  : slot.userId && selectedIsAvailable
                    ? "border-emerald-500/30 bg-[#0d1a12]"
                    : slot.userId && !selectedIsAvailable
                      ? "border-red-500/30 bg-[#1a0d0d]"
                      : "border-gray-700/60 bg-[#111620]"
                  }`}
              >
                {/* Slot Header Row */}
                <div className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${!slot.userId ? "bg-gray-800 text-gray-500"
                    : selectedIsAvailable ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                    }`}>
                    {slotIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-white">{slot.role}</span>
                      {isModified && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                          ✎ Modified
                        </span>
                      )}
                      {!slot.userId && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                          ⚠ Unassigned
                        </span>
                      )}
                    </div>
                    {originalCandidate ? (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        AI Suggested: <span className="text-blue-400 font-semibold">{originalCandidate.userName}</span>
                        <span className="text-gray-600 ml-1">· {originalCandidate.skillMatchPercent.toFixed(0)}% match</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-500/60 mt-0.5">No AI recommendation — manual assignment required</p>
                    )}
                  </div>
                  {isModified && slot.originalUserId && (
                    <button
                      onClick={() => updateAssignment(slot.id, slot.originalUserId)}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      ↺ Reset
                    </button>
                  )}
                </div>

                {/* Selected Employee Preview Card */}
                {selectedEmp ? (
                  <div className="mx-4 mb-3 p-3.5 bg-[#0d1117] rounded-xl border border-gray-800/60 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedEmp.name)} flex items-center justify-center font-bold text-[13px] text-white shrink-0 shadow-md`}>
                      {getInitials(selectedEmp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-white">{selectedEmp.name}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isBusy
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          }`}>
                          {isBusy ? "● Busy" : "● Available"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{selectedEmp.role}{selectedEmp.department ? ` · ${selectedEmp.department}` : ""}</p>
                      {selectedEmp.skills && selectedEmp.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selectedEmp.skills.slice(0, 5).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-semibold rounded border border-blue-500/15">
                              {s}
                            </span>
                          ))}
                          {selectedEmp.skills.length > 5 && (
                            <span className="text-[9px] text-gray-600 font-semibold self-center">+{selectedEmp.skills.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedEmp.experienceYears !== undefined && (
                      <div className="shrink-0 px-3 py-2 rounded-xl bg-gray-800/80 text-center border border-gray-700/40">
                        <p className="text-[17px] font-black text-white leading-none">{selectedEmp.experienceYears}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">yr exp</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mx-4 mb-3 p-3 bg-[#0d1117] rounded-xl border border-gray-700/30 border-dashed">
                    <p className="text-[12px] text-gray-600 text-center italic">No employee selected — choose one below</p>
                  </div>
                )}

                {/* Employee Picker Toggle */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setExpandedSlot(isOpen ? null : slot.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0d1117] border border-gray-700/60 rounded-xl text-[12px] text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-all cursor-pointer"
                  >
                    <span className="font-semibold flex items-center gap-1.5">
                      {isOpen ? "▲ Close picker" : "▼ Change Employee"}
                    </span>
                    <span className="text-[11px] text-gray-600">{employees.length} employees</span>
                  </button>

                  {isOpen && (
                    <div className="mt-2 bg-[#0d1117] border border-gray-700/50 rounded-xl overflow-hidden">
                      <div className="p-2 max-h-52 overflow-y-auto space-y-1">
                        {/* Unassign option */}
                        <button
                          onClick={() => updateAssignment(slot.id, "")}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-2.5 ${!slot.userId ? "bg-gray-700/50 text-gray-300 font-bold" : "text-gray-500 hover:bg-gray-800/60 hover:text-gray-300"}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 text-[10px] font-bold shrink-0">—</span>
                          <span>Leave Unassigned</span>
                        </button>
                        {/* Divider */}
                        <div className="border-t border-gray-800/60 my-1" />
                        {sortedEmployees.map(emp => {
                          const isSelected = slot.userId === emp.id;
                          // Use backend isAvailable as source of truth
                          const isFree = isEmpAvailable(emp.id);
                          const isAIRec = originalCandidate?.userId === emp.id;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => { if (isFree) updateAssignment(slot.id, emp.id); }}
                              disabled={!isFree}
                              title={!isFree ? `${emp.name} is currently busy on another project` : undefined}
                              className={`w-full text-left px-3 py-3 rounded-xl text-[12px] transition-all flex flex-col gap-2 border ${!isFree
                                ? "opacity-50 cursor-not-allowed border-red-900/20 bg-red-500/5"
                                : isSelected
                                  ? "bg-blue-600/20 border border-blue-500/40 text-white cursor-pointer"
                                  : "hover:bg-gray-800/60 text-gray-300 border-transparent hover:border-gray-700/50 cursor-pointer"
                                }`}
                            >
                              {/* Top row: avatar + name + badges + status */}
                              <div className="flex items-center gap-2.5 w-full">
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.name)} flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${!isFree ? "grayscale" : ""}`}>
                                  {getInitials(emp.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold truncate ${!isFree ? "text-gray-500" : ""}`}>{emp.name}</span>
                                    {isAIRec && (
                                      <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider shrink-0">
                                        AI Pick
                                      </span>
                                    )}
                                    {isSelected && isFree && <CheckCircle2 size={11} className="text-blue-400 shrink-0" />}
                                  </div>
                                  <span className="text-[10px] text-gray-500 block">{emp.role}{emp.department ? ` · ${emp.department}` : ""}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {emp.experienceYears !== undefined && (
                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                      {emp.experienceYears}yr
                                    </span>
                                  )}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isFree
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : "text-red-400 bg-red-500/10"
                                    }`}>
                                    {isFree ? "Free" : "Busy"}
                                  </span>
                                </div>
                              </div>
                              {/* Skills row */}
                              {emp.skills && emp.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 pl-[37px]">
                                  {emp.skills.slice(0, 4).map(s => (
                                    <span
                                      key={s}
                                      className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${!isFree
                                        ? "bg-gray-800/50 text-gray-600 border-gray-700/30"
                                        : isSelected
                                          ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
                                          : "bg-gray-800 text-gray-400 border-gray-700/50"
                                        }`}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                  {emp.skills.length > 4 && (
                                    <span className="text-[9px] text-gray-600 self-center">+{emp.skills.length - 4}</span>
                                  )}
                                </div>
                              )}
                              {/* Busy warning */}
                              {!isFree && (
                                <p className="text-[10px] text-red-400/70 pl-[37px] leading-tight">
                                  Currently assigned to {emp.projects?.length} project(s) — cannot be selected
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Summary Footer (DIKECILKAN UKURANNYA) ── */}
        <div className="px-6 py-4 border-t border-gray-800/60 bg-[#0d1117] rounded-b-3xl flex flex-col gap-3">
          {/* Chip Summary - Spasi diperkecil */}
          <div className="flex flex-wrap gap-1.5">
            {assignments.map(slot => {
              const emp = employees.find(e => e.id === slot.userId);
              const empIsAvailable = slot.userId ? isEmpAvailable(slot.userId) : true;
              const empIsBusy = emp && !empIsAvailable;
              return (
                <div
                  key={slot.id}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${empIsBusy
                    ? "bg-red-500/10 border-red-500/25 text-red-300"
                    : emp
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-500 italic"
                    }`}
                >
                  {empIsBusy && <span className="text-red-400 font-bold">⚠</span>}
                  <span className="text-gray-500 not-italic">{slot.role}:</span>
                  <span className="font-semibold">{emp ? emp.name : "Unassigned"}</span>
                  {empIsBusy && <span className="text-[8px] text-red-400/70 font-normal">busy</span>}
                </div>
              );
            })}
          </div>

          {/* Wrapper untuk Warning & Action Buttons agar sejajar/rapat */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Bagian Kiri: Status / Warning Banner */}
            <div className="flex-1">
              {hasBusyAssignment ? (
                <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 text-[12px] shrink-0 mt-0.5">⚠</span>
                  <p className="text-[11px] text-red-400 font-semibold leading-snug">
                    Busy employees detected.
                    <span className="block text-[10px] text-red-400/70 font-normal">
                      Replace them to start.
                    </span>
                  </p>
                </div>
              ) : (
                <p className={`text-[11px] font-semibold ${allFilled ? "text-emerald-400" : "text-amber-400"}`}>
                  {allFilled
                    ? "✓ All roles assigned. Ready."
                    : `⚠ ${totalCount - filledCount} role(s) unassigned (will skip).`}
                </p>
              )}
            </div>

            {/* Bagian Kanan: Action Buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700 text-[11px] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-4 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-1.5 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isProcessing ? "Saving..." : "Save Project"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Panel ──
export default function SmartRecommendationPanel({ projectId }: SmartRecommendationPanelProps) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customization and Batch actions state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customizingOption, setCustomizingOption] = useState<OptionType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");

  useEffect(() => {
    getEmployees().then(setEmployees).catch(err => console.error("Could not fetch employees:", err));
  }, []);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    getProjectRecommendations(projectId)
      .then(setData)
      .catch((err) => {
        console.error("Recommendation error:", err);
        setError(err.message || "Failed to load recommendations");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const handleStart = async (e: any) => {
      const option: OptionType = e.detail;
      await processStartProject(option.candidates.map(c => ({ role: c.targetRole, userId: c.userId })));
    };
    const handleCustomize = (e: any) => {
      setCustomizingOption(e.detail);
    };

    window.addEventListener('startProject', handleStart);
    window.addEventListener('customizeOption', handleCustomize);
    return () => {
      window.removeEventListener('startProject', handleStart);
      window.removeEventListener('customizeOption', handleCustomize);
    };
  }, [projectId]);

  const processStartProject = async (assignments: { role: string, userId: string }[]) => {
    setIsProcessing(true);
    try {
      setProcessStatus("Assigning members...");
      for (const assign of assignments) {
        await assignMemberToProject(projectId, {
          userId: assign.userId,
          roleInProject: assign.role
        });
      }
      setProcessStatus("Starting project...");
      await updateProject(projectId, { projectStatus: 1 }); // 1 = Running
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to start project.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-[2.5rem] blur opacity-75"></div>
        <div className="relative bg-[#111318]/80 backdrop-blur-xl border border-[var(--dash-border)] rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-[13px] text-[var(--dash-text-muted)] font-medium">Analyzing team availability and skill matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/10 to-amber-600/10 rounded-[2.5rem] blur opacity-75"></div>
        <div className="relative bg-[#111318]/80 backdrop-blur-xl border border-red-500/20 rounded-[2.5rem] p-8 transition-colors duration-300">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p className="text-[14px] font-semibold">{error}</p>
          </div>
          <p className="text-[12px] text-[var(--dash-text-faint)] mt-2 ml-8">
            Make sure the project has Required Roles defined. Marketing can set these when creating the project.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const bestLabel = data.bestOption === "A" ? data.optionA.title : data.optionB.title;

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>

      <div className="relative bg-[#111318]/80 backdrop-blur-xl border border-[var(--dash-border)] rounded-[2.5rem] p-8 overflow-hidden shadow-2xl transition-colors duration-300">

        {/* Purple accent border highlight */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
        <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 h-40 w-[1px] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent"></div>

        {/* Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-white tracking-tight">Smart Recommendation Panel</h3>
            <p className="text-[13px] text-[var(--dash-text-secondary)] mt-1 max-w-2xl">
              AI-driven team composition based on skill matching, experience levels, and current workload analysis.
            </p>
          </div>
        </div>

        {/* Required Roles Summary */}
        {data.requiredRoles.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="text-[11px] text-[var(--dash-text-faint)] uppercase font-bold tracking-wider self-center mr-2">Required:</span>
            {data.requiredRoles.map((role) => (
              <span key={role.staffRoleId} className="px-3 py-1.5 bg-[#1a1f2e] border border-[var(--dash-border)] rounded-lg text-[11px] font-semibold text-gray-300">
                {role.requiredCount}× {role.roleName}
                <span className="text-[var(--dash-text-faint)] ml-1">({role.workingType})</span>
              </span>
            ))}
          </div>
        )}

        {/* Best Plan Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center gap-4 group/banner">
          <div className="p-2 bg-green-500/20 rounded-lg text-green-400 group-hover/banner:scale-110 transition-transform">
            <Zap size={18} fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-green-400">Best Optimal Plan: {bestLabel}</p>
            <p className="text-[12px] text-green-400/70 font-medium">{data.bestOptionReason}</p>
          </div>
          <div className="pr-2">
            <ChevronRight className="text-green-500/40" size={18} />
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="flex flex-col md:flex-row gap-6 mb-4 relative">
          {/* Overlay loader when processing batch starts */}
          {isProcessing && (
            <div className="absolute inset-0 z-20 bg-[#111318]/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center border border-gray-800">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
              <p className="text-white font-bold">{processStatus}</p>
            </div>
          )}
          <OptionCard
            option={data.optionA}
            isRecommended={data.bestOption === "A"}
            label="A"
          />
          <OptionCard
            option={data.optionB}
            isRecommended={data.bestOption === "B"}
            label="B"
          />
        </div>
      </div>

      {customizingOption && data && (
        <CustomizeModal
          option={customizingOption}
          requiredRoles={data.requiredRoles}
          employees={employees}
          allCandidates={[
            ...data.optionA.candidates,
            ...data.optionB.candidates.filter(c => !data.optionA.candidates.some(a => a.userId === c.userId))
          ]}
          onClose={() => setCustomizingOption(null)}
          onSave={processStartProject}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}