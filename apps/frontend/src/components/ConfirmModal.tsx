"use client";

import React from "react";
import ReactDOM from "react-dom";
import { Loader2, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;

  // Appearance
  icon: React.ReactNode;
  iconBg: string; // e.g. "bg-purple-600" or "from-purple-600 to-indigo-600"
  title: string;
  message: string;
  warningText?: string; // Red sub-text (e.g. "This action cannot be undone.")

  // Buttons
  cancelText?: string;
  confirmText: string;
  confirmLoadingText?: string;
  confirmClass: string; // e.g. "bg-red-600 hover:bg-red-500" or "bg-gradient-to-r from-purple-600 to-indigo-600 ..."
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  icon,
  iconBg,
  title,
  message,
  warningText,
  cancelText = "Cancel",
  confirmText,
  confirmLoadingText,
  confirmClass,
}) => {
  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-[#13151a] border border-[#2a2d36] rounded-2xl w-full max-w-sm shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "confirmModalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all z-10 cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Body */}
        <div className="px-7 pt-8 pb-7 flex flex-col items-center text-center">
          {/* Icon circle */}
          <div
            className={`w-[64px] h-[64px] rounded-full flex items-center justify-center mb-5 shadow-lg ${iconBg}`}
          >
            {icon}
          </div>

          <h3 className="text-[18px] font-bold text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-1">{message}</p>
          {warningText && (
            <p className="text-[13px] font-semibold text-red-400 mt-1">{warningText}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-[#1e2028] hover:bg-[#252830] text-[13px] font-bold text-gray-200 border border-[#2a2d36] transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer ${confirmClass}`}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {confirmLoadingText ?? "Processing..."}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes confirmModalIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );

  // Portal ke document.body untuk escape dari backdrop-filter stacking context
  return typeof document !== "undefined"
    ? ReactDOM.createPortal(modal, document.body)
    : null;
};
