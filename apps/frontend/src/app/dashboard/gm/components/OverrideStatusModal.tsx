"use client";

import { useState } from "react";
import { X, Loader2, ShieldAlert } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "Running", label: "Running" },
  { value: "Hold", label: "Hold" },
  { value: "Completed", label: "Completed" },
];

const CURRENT_STATUS_STYLE: Record<string, string> = {
  Pending:   "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  Scheduled: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  Running:   "bg-green-500/20 text-green-400 border border-green-500/30",
  Hold:      "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  Completed: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  Deleted:   "bg-red-900/20 text-red-500 border border-red-900/30",
};

// Converts numeric projectStatus from backend to string label
const STATUS_NUM_MAP: Record<number, string> = {
  0: "Pending",
  1: "Scheduled",
  2: "Running",
  3: "Completed",
  4: "Deleted",
  5: "Hold",
};

interface OverrideStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newStatus: string, notifyPm: boolean) => Promise<void>;
  currentStatusNum: number;
  projectName: string;
}

export default function OverrideStatusModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatusNum,
  projectName,
}: OverrideStatusModalProps) {
  const currentStatusLabel = STATUS_NUM_MAP[currentStatusNum] ?? "Unknown";
  const [newStatus, setNewStatus] = useState("Running");
  const [notifyPm, setNotifyPm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setNewStatus("Running");
    setNotifyPm(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    try {
      await onConfirm(newStatus, notifyPm);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (e: any) {
      setError(e?.message ?? "Failed to override status.");
    } finally {
      setLoading(false);
    }
  };

  const currentStyle = CURRENT_STATUS_STYLE[currentStatusLabel] ?? "bg-gray-500/20 text-gray-400 border border-gray-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[440px] bg-[#1a1b23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-500/15 rounded-lg">
              <ShieldAlert size={16} className="text-violet-400" />
            </div>
            <h2 className="text-[15px] font-bold text-white">Override Project Status</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Current Status */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              Current Status
            </label>
            <div className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wide ${currentStyle}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {currentStatusLabel}
              </span>
            </div>
          </div>

          {/* New Status */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              New Status
            </label>
            <div className="relative">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={loading}
                className="w-full appearance-none px-4 py-3 rounded-xl bg-white/5 border border-violet-500/50 text-white text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1a1b23] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* Custom chevron */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Notify PM checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={notifyPm}
                onChange={(e) => setNotifyPm(e.target.checked)}
                disabled={loading}
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border border-white/20 bg-white/5 peer-checked:bg-violet-500 peer-checked:border-violet-500 transition-all flex items-center justify-center">
                {notifyPm && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-[13px] text-gray-300 group-hover:text-white transition-colors select-none">
              Notify assigned PM
            </span>
          </label>

          {/* Error / Success */}
          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-[12px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              Status successfully updated!
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || success}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Overriding..." : "Confirm Override"}
          </button>
        </div>
      </div>
    </div>
  );
}
