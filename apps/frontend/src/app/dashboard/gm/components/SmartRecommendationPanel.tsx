"use client";

import React from "react";
import { 
  Sparkles, 
  Zap, 
  Calendar, 
  Users, 
  Clock, 
  UserPlus, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Settings
} from "lucide-react";

interface OptionCardProps {
  title: string;
  timeline: string;
  teamSize: number;
  idleResources: number;
  isRecommended?: boolean;
  requiresHiring?: string;
  onOpenDetail: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  title,
  timeline,
  teamSize,
  idleResources,
  isRecommended,
  requiresHiring,
  onOpenDetail
}) => {
  return (
    <div className={`
      flex-1 bg-[#1a1f2e]/50 border rounded-2xl p-6 flex flex-col transition-all duration-300
      ${isRecommended ? "border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-[var(--dash-border)] hover:border-gray-700"}
    `}>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-[15px] font-bold text-white">{title}</h4>
        {isRecommended && (
          <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider">
            Recommended
          </span>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {/* Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-800 rounded-md text-gray-400">
              <Calendar size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--dash-text-faint)] uppercase font-bold tracking-tight">Timeline</p>
              <p className="text-[12px] text-gray-200 mt-0.5">{timeline}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-800 rounded-md text-gray-400">
              <Users size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--dash-text-faint)] uppercase font-bold tracking-tight">Available Team</p>
              <p className="text-[12px] text-gray-200 mt-0.5">{teamSize} members</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-800 rounded-md text-gray-400">
              <Clock size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--dash-text-faint)] uppercase font-bold tracking-tight">Idle Resources</p>
              <p className="text-[12px] text-gray-200 mt-0.5">{idleResources} employees</p>
            </div>
          </div>
        </div>

        {/* Status Box */}
        <div className={`
          mt-4 p-3 rounded-xl border flex flex-col gap-1.5
          ${requiresHiring 
            ? "bg-amber-500/5 border-amber-500/20 text-amber-500" 
            : "bg-green-500/5 border-green-500/20 text-green-500"}
        `}>
          <div className="flex items-center gap-2">
            {requiresHiring ? <UserPlus size={14} /> : <CheckCircle2 size={14} />}
            <span className="text-[12px] font-bold">{requiresHiring ? "Requires Hiring" : "All resources available"}</span>
          </div>
          {requiresHiring && (
            <p className="text-[11px] text-amber-500/70 font-medium pl-5">• {requiresHiring}</p>
          )}
        </div>
      </div>

      <button
        onClick={onOpenDetail}
        className="mt-6 w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
      >
        <ExternalLink size={14} />
        Open Detail {title.split(":")[0]}
      </button>
    </div>
  );
};

export default function SmartRecommendationPanel() {
  return (
    <div className="relative group">
      {/* Glow effect back */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
      
      <div className="relative bg-[#111318]/80 backdrop-blur-xl border border-[var(--dash-border)] rounded-[2.5rem] p-8 overflow-hidden shadow-2xl transition-colors duration-300">
        
        {/* Purple accent border highlight */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
        <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 h-40 w-[1px] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent"></div>

        <div className="flex items-start gap-5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-white tracking-tight">Smart Recommendation Panel</h3>
            <p className="text-[13px] text-[var(--dash-text-secondary)] mt-1 max-w-2xl">
              AI-driven decision support system to optimize resource allocation and project timeline based on current availability.
            </p>
          </div>
        </div>

        {/* Best Plan Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center gap-4 group/banner">
          <div className="p-2 bg-green-500/20 rounded-lg text-green-400 group-hover/banner:scale-110 transition-transform">
            <Zap size={18} fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-green-400">Best Optimal Plan: Option B</p>
            <p className="text-[12px] text-green-400/70 font-medium">No hiring required, all resources available within the requested period.</p>
          </div>
          <div className="pr-2">
             <ChevronRight className="text-green-500/40" size={18} />
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <OptionCard 
            title="Option A: Original Estimate"
            timeline="Apr 8, 2026 — Jun 23, 2026"
            teamSize={3}
            idleResources={3}
            requiresHiring="1x Senior Dev (Dedicated)"
            onOpenDetail={() => console.log("Detail A")}
          />
          <OptionCard 
            title="Option B: Optimized Start"
            timeline="May 28, 2026 — Aug 10, 2026"
            teamSize={4}
            idleResources={7}
            isRecommended
            onOpenDetail={() => console.log("Detail B")}
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-center">
          <button className="flex items-center gap-2 px-6 py-3.5 bg-[#2a2f3e] hover:bg-[#32384a] text-gray-200 text-[13px] font-bold rounded-xl border border-gray-700/50 transition-all shadow-lg active:scale-95">
            <Settings size={18} className="text-gray-400" />
            Customize Manually
          </button>
        </div>
      </div>
    </div>
  );
}
