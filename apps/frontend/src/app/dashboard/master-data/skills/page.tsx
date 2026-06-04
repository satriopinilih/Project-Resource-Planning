"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit2,
  Search,
  Database,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Tag,
  Trash2
} from "lucide-react";
import { getSkills, createSkill, updateSkill, deleteSkill, SkillDto } from "@/lib/api";

export default function MasterDataPage() {
  const [skills, setSkills] = useState<SkillDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillDto | null>(null);

  // Form states
  const [skillNameInput, setSkillNameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSkillsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSkills();
      setSkills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkillsList();
  }, []);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) =>
      skill.skillName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [skills, searchQuery]);

  const handleOpenAddModal = () => {
    setSkillNameInput("");
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (skill: SkillDto) => {
    setSelectedSkill(skill);
    setSkillNameInput(skill.skillName);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillNameInput.trim()) {
      setFormError("Skill name is required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await createSkill(skillNameInput.trim());
      setIsAddModalOpen(false);
      setNotification({ type: "success", message: `Successfully added skill "${skillNameInput.trim()}"` });
      fetchSkillsList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkill) return;
    if (!skillNameInput.trim()) {
      setFormError("Skill name is required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await updateSkill(selectedSkill.skillID, skillNameInput.trim());
      setIsEditModalOpen(false);
      setNotification({ type: "success", message: `Successfully updated skill to "${skillNameInput.trim()}"` });
      fetchSkillsList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSkill = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${name}"? This action will remove all employee and project references to this skill.`)) return;
    try {
      await deleteSkill(id);
      setNotification({ type: "success", message: `Successfully deleted skill "${name}"` });
      fetchSkillsList();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete skill.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      <div className="mb-6" />

      {/* Page Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#242427] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5 transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="text-blue-500 w-6 h-6" />
            <h2 className="text-[26px] font-bold text-gray-900 dark:text-white tracking-tight">Master Data Management</h2>
          </div>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">Configure and maintain internal technical skills catalog</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          Add New Skill
        </button>
      </section>

      {/* Main Content Card */}
      <section className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm transition-all duration-300">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search skills by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-[#1f2433] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={fetchSkillsList}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-[13px] font-semibold rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table/List Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading catalog...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
            <AlertCircle className="w-12 h-12" />
            <p className="text-[14px] font-medium text-center">{error}</p>
            <button
              onClick={fetchSkillsList}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
            <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h4 className="text-[16px] font-bold text-gray-700 dark:text-gray-300 mb-1">No Skills Found</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {searchQuery ? `No results match "${searchQuery}"` : "The internal skills catalog is empty."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-200 dark:border-white/5 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1a1b1e] border-b border-gray-200 dark:border-white/5">
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">ID</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Skill Name</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredSkills.map((skill) => (
                    <tr
                      key={skill.skillID}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4 text-[14px] text-gray-400 dark:text-gray-500 font-mono">
                        {skill.skillID}
                      </td>
                      <td className="px-6 py-4 text-[15px] font-medium text-gray-900 dark:text-white">
                        {skill.skillName}
                      </td>
                      <td className="px-6 py-4 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(skill)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Edit Skill"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.skillID, skill.skillName)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete Skill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Add Skill Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[18px] font-bold">Add New Skill</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSkill}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[13px] flex items-start gap-2.5">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Skill Name</label>
                  <input
                    type="text"
                    required
                    value={skillNameInput}
                    onChange={(e) => setSkillNameInput(e.target.value)}
                    placeholder="e.g. Kotlin, Docker, AWS"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={100}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 py-5 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {isEditModalOpen && selectedSkill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[18px] font-bold">Edit Skill</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSkill}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[13px] flex items-start gap-2.5">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Skill Name</label>
                  <input
                    type="text"
                    required
                    value={skillNameInput}
                    onChange={(e) => setSkillNameInput(e.target.value)}
                    placeholder="e.g. React Native"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={100}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Modifying this will affect recommendations and employee profiles that reference this skill.</p>
                </div>
              </div>

              <div className="px-6 py-5 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Update Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[120] flex items-center gap-2.5 px-5 py-4 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-[13px] font-bold">{notification.message}</span>
        </div>
      )}
    </div>
  );
}
