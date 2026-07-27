"use client";

import { AlertTriangle, Calendar, X, ChevronRight, Info } from "lucide-react";

export type DateConflict = {
  dateLabel: "Start Date" | "End Date";
  date: string;           // ISO date string
  displayDate: string;    // Human-readable
  reason: "Weekend" | "Holiday";
  holidayName?: string;
};

interface HolidayWarningModalProps {
  conflicts: DateConflict[];
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function HolidayWarningModal({
  conflicts,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: HolidayWarningModalProps) {
  const weekendConflicts = conflicts.filter((c) => c.reason === "Weekend");
  const holidayConflicts = conflicts.filter((c) => c.reason === "Holiday");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1a1a] border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-gray-800">
          <div className="shrink-0 p-2.5 bg-amber-500/15 rounded-xl">
            <AlertTriangle size={22} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-white">Timeline Conflict Detected</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">
              One or more dates fall on a non-working day. Do you want to proceed anyway?
            </p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conflict List */}
        <div className="px-6 py-5 space-y-3">
          {conflicts.map((conflict, i) => {
            const d = new Date(conflict.date);
            const dayName = DAY_NAMES[d.getDay()];
            const isWeekend = conflict.reason === "Weekend";

            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  isWeekend
                    ? "bg-orange-500/8 border-orange-500/20"
                    : "bg-amber-500/8 border-amber-500/20"
                }`}
              >
                <div
                  className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${
                    isWeekend ? "bg-orange-500/15" : "bg-amber-500/15"
                  }`}
                >
                  <Calendar
                    size={14}
                    className={isWeekend ? "text-orange-400" : "text-amber-400"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        conflict.dateLabel === "Start Date"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-purple-500/15 text-purple-400"
                      }`}
                    >
                      {conflict.dateLabel}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isWeekend
                          ? "bg-orange-500/15 text-orange-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {conflict.reason}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-white">
                    {conflict.displayDate}
                    <span className="text-[12px] font-normal text-gray-400 ml-1.5">
                      ({dayName})
                    </span>
                  </p>
                  {conflict.holidayName && (
                    <p className="text-[11px] text-amber-300 mt-0.5 flex items-center gap-1">
                      <Info size={11} />
                      {conflict.holidayName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary note */}
        <div className="mx-6 mb-5 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            <span className="text-amber-400 font-semibold">Note:</span> Starting or ending a project
            on a weekend or public holiday may impact team availability and project delivery.
            Consider adjusting the timeline to the next working day.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#1f1f1f] border border-gray-700 rounded-lg text-[13px] font-semibold text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Adjust Date
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Proceed Anyway"}
            {!isSubmitting && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Utility: check if a date string (YYYY-MM-DD) is a weekend */
export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00"); // use noon to avoid TZ edge cases
  const day = d.getDay();
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

/** Utility: find if a date falls within any holiday range */
export function findHolidayConflict(
  dateStr: string,
  holidays: { name: string; dateStart: string; dateEnd: string }[]
): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00").getTime();
  for (const h of holidays) {
    const start = new Date(h.dateStart + "T00:00:00").getTime();
    const end = new Date(h.dateEnd + "T23:59:59").getTime();
    if (target >= start && target <= end) {
      return h.name;
    }
  }
  return null;
}

/** Utility: full date conflict check */
export function checkDateConflicts(
  startDateStr: string,
  endDateStr: string,
  holidays: { name: string; dateStart: string; dateEnd: string }[],
  formatDate: (d: string) => string
): DateConflict[] {
  const results: DateConflict[] = [];

  const dates: { label: "Start Date" | "End Date"; value: string }[] = [
    { label: "Start Date", value: startDateStr },
    { label: "End Date", value: endDateStr },
  ];

  for (const { label, value } of dates) {
    if (!value) continue;

    // Check holiday first (takes precedence for specificity)
    const holidayName = findHolidayConflict(value, holidays);
    if (holidayName) {
      results.push({
        dateLabel: label,
        date: value,
        displayDate: formatDate(value),
        reason: "Holiday",
        holidayName,
      });
      continue; // don't double-report as weekend
    }

    if (isWeekend(value)) {
      results.push({
        dateLabel: label,
        date: value,
        displayDate: formatDate(value),
        reason: "Weekend",
      });
    }
  }

  return results;
}
