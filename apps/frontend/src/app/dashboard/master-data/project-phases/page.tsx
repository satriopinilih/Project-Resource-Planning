"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  createProjectPhase,
  deleteProjectPhase,
  getProjectPhases,
  updateProjectPhase,
} from "@/lib/api";
import { ProjectPhase } from "@/lib/types";

// ── Phase color palette for visual variety ────────────────────────────────────
const phaseColors = [
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700/40",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-700/40",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700/40",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700/40",
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700/40",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700/40",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700/40",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/40",
];

function phaseColor(idx: number) {
  return phaseColors[idx % phaseColors.length];
}

export default function ProjectPhasesPage() {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPhases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectPhases();
      setPhases(data);
    } catch {
      showToast("error", "Failed to load project phases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhases();
  }, [loadPhases]);

  // ── Add ──────────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      await createProjectPhase(addName.trim());
      setAddName("");
      setShowAdd(false);
      showToast("success", "Project phase added.");
      await loadPhases();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add phase.");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEditSave = async (id: number) => {
    setEditError(null);
    setEditLoading(true);
    try {
      await updateProjectPhase(id, editName.trim());
      setEditId(null);
      showToast("success", "Project phase updated.");
      await loadPhases();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update phase.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteProjectPhase(deleteId);
      setDeleteId(null);
      showToast("success", "Project phase deleted.");
      await loadPhases();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete phase.");
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const deletingPhase = phases.find((p) => p.id === deleteId);

  return (
    <div className="min-h-screen bg-[var(--dash-bg-main)] text-[var(--dash-text-primary)]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-[13px] font-semibold transition-all duration-300 ${
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-300"
            : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <div className="border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-main)]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--dash-text-heading)] tracking-tight">Project Phases</h1>
            <p className="text-[13px] text-[var(--dash-text-muted)] mt-0.5">
              Manage the master list of project phases used in activity logs
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setAddName(""); setAddError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-colors cursor-pointer"
          >
            <Plus size={15} />
            Add Phase
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* ── Add Form ── */}
        {showAdd && (
          <div className="bg-[var(--dash-bg-card)] border border-indigo-500/40 rounded-2xl p-5 shadow-lg">
            <h3 className="text-[14px] font-bold text-[var(--dash-text-heading)] mb-3">Add New Phase</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              {addError && (
                <div className="flex items-center gap-2 text-[12px] text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 border border-red-200 dark:border-red-700/40">
                  <AlertCircle size={13} />
                  {addError}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. User Acceptance Testing"
                  required
                  minLength={2}
                  maxLength={100}
                  autoFocus
                  className="flex-1 px-3 py-2.5 text-[13px] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl outline-none focus:border-indigo-500/60 text-[var(--dash-text-heading)] transition-colors"
                />
                <button type="button" onClick={() => setShowAdd(false)} className="p-2.5 rounded-xl border border-[var(--dash-border)] hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-muted)] transition-colors cursor-pointer">
                  <X size={16} />
                </button>
                <button type="submit" disabled={addLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer">
                  {addLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Add
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Phase List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
        ) : phases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dash-bg-card)] border border-[var(--dash-border)] flex items-center justify-center mb-4">
              <Tag size={28} className="text-[var(--dash-text-faint)]" />
            </div>
            <p className="text-[15px] font-semibold text-[var(--dash-text-secondary)]">No project phases yet</p>
            <p className="text-[13px] text-[var(--dash-text-faint)] mt-1">Add your first phase using the button above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {phases.map((phase, idx) => (
              <div
                key={phase.id}
                className="group bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl px-5 py-4 hover:border-indigo-500/30 transition-all duration-200 flex items-center gap-4"
              >
                {/* Color badge */}
                <div className={`w-2.5 h-8 rounded-full flex-shrink-0 ${phaseColors[idx % phaseColors.length].split(" ")[0]}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editId === phase.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        minLength={2}
                        maxLength={100}
                        className="flex-1 px-3 py-1.5 text-[13px] bg-[var(--dash-bg-input)] border border-indigo-500/50 rounded-xl outline-none text-[var(--dash-text-heading)]"
                      />
                      {editError && (
                        <span className="text-[11px] text-red-500">{editError}</span>
                      )}
                      <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-muted)] cursor-pointer">
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleEditSave(phase.id)}
                        disabled={editLoading || !editName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {editLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold border ${phaseColor(idx)}`}>
                        {phase.name}
                      </span>
                      <span className="text-[11px] text-[var(--dash-text-faint)]">Phase #{phase.id}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {editId !== phase.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditId(phase.id); setEditName(phase.name); setEditError(null); }}
                      className="p-2 rounded-lg hover:bg-[var(--dash-bg-hover)] text-[var(--dash-text-muted)] hover:text-indigo-500 transition-colors cursor-pointer"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteId(phase.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--dash-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[12px] text-[var(--dash-text-faint)] text-center pt-2">
          {phases.length} phase{phases.length !== 1 ? "s" : ""} in total · Phases in use cannot be deleted
        </p>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--dash-bg-card)] border border-[var(--dash-border)] rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] mb-1">Delete Phase?</h3>
            <p className="text-[13px] text-[var(--dash-text-muted)] mb-1">
              Are you sure you want to delete{" "}
              <strong className="text-[var(--dash-text-secondary)]">{deletingPhase?.name}</strong>?
            </p>
            <p className="text-[12px] text-amber-600 dark:text-amber-400 mb-5">
              ⚠️ This will fail if the phase is referenced by existing activity logs.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--dash-border)] text-[13px] font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
