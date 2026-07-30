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
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { getSkills, createSkill, updateSkill, deleteSkill, SkillDto } from "@/lib/api";

export default function MasterDataPage() {
  const [skills, setSkills] = useState<SkillDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting & Pagination
  const [sortField, setSortField] = useState<"id" | "name">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Reset pagination on search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortOrder]);

  const filteredSkills = useMemo(() => {
    let result = skills.filter((skill) =>
      skill.skillName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "id") {
        comparison = a.skillID - b.skillID;
      } else {
        comparison = a.skillName.localeCompare(b.skillName);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [skills, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredSkills.length / itemsPerPage) || 1;
  const paginatedSkills = filteredSkills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // If we delete items and land on an empty page, go back
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  const handleDeleteSkill = (id: number, name: string) => {
    setSkillToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSkill = async () => {
    if (!skillToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSkill(skillToDelete.id);
      setNotification({ type: "success", message: `Successfully deleted skill "${skillToDelete.name}"` });
      setIsDeleteModalOpen(false);
      setSkillToDelete(null);
      fetchSkillsList();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete skill.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      <div className="mb-6" />

      {/* Page Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--dash-bg-card)] rounded-2xl p-6 shadow-sm border border-[var(--dash-border)] transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="text-[#3b82f6] w-6 h-6" />
            <h2 className="text-[26px] font-bold text-[var(--dash-text-heading)] tracking-tight">Master Data Management</h2>
          </div>
          <p className="text-[14px] text-[var(--dash-text-secondary)] font-medium">Configure and maintain internal technical skills catalog</p>
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
      <section className="bg-[var(--dash-bg-card)] rounded-3xl p-6 border border-[var(--dash-border)] shadow-sm transition-all duration-300">

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md w-full">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)]" />
              <input
                type="text"
                placeholder="Search skills by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl text-[14px] outline-none focus:border-[#3b82f6]/50 transition-colors text-[var(--dash-text-heading)] placeholder:text-[var(--dash-text-faint)]"
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

            {/* Sorting Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center bg-[var(--dash-bg-input)] border border-[var(--dash-border)] rounded-xl p-1">
                <button
                  onClick={() => setSortField("name")}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${sortField === "name" ? "bg-[var(--dash-bg-card)] text-[#3b82f6] shadow-sm border border-[var(--dash-border)]" : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"}`}
                >
                  Name
                </button>
                <button
                  onClick={() => setSortField("id")}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${sortField === "id" ? "bg-[var(--dash-bg-card)] text-[#3b82f6] shadow-sm border border-[var(--dash-border)]" : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"}`}
                >
                  ID
                </button>
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="p-2.5 bg-[var(--dash-bg-input)] hover:bg-[var(--dash-bg-page)] border border-[var(--dash-border)] text-[var(--dash-text-secondary)] rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>
            </div>
          </div>
          
          <button
            onClick={fetchSkillsList}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--dash-bg-input)] hover:bg-[var(--dash-bg-page)] border border-[var(--dash-border)] text-[var(--dash-text-secondary)] text-[13px] font-semibold rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
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
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedSkills.map((skill) => (
                <div
                  key={skill.skillID}
                  className="bg-[var(--dash-bg-page)] border border-[var(--dash-border)] rounded-2xl p-5 hover:border-[#3b82f6]/50 hover:shadow-lg hover:shadow-[#3b82f6]/10 transition-all group flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] font-mono text-[var(--dash-text-faint)] bg-[var(--dash-bg-input)] border border-[var(--dash-border)] px-2 py-0.5 rounded-md">ID: {skill.skillID}</span>
                      <Tag size={14} className="text-[#3b82f6] opacity-70" />
                    </div>
                    <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] line-clamp-2">
                      {skill.skillName}
                    </h3>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--dash-border)]">
                    <button
                      onClick={() => handleOpenEditModal(skill)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white text-[12px] font-semibold transition-all cursor-pointer"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(skill.skillID, skill.skillName)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white transition-all cursor-pointer"
                      title="Delete Skill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--dash-border)] mt-2">
                <div className="text-[13px] text-[var(--dash-text-secondary)]">
                  Showing <span className="font-semibold text-[var(--dash-text-heading)]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-[var(--dash-text-heading)]">{Math.min(currentPage * itemsPerPage, filteredSkills.length)}</span> of <span className="font-semibold text-[var(--dash-text-heading)]">{filteredSkills.length}</span> skills
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-[var(--dash-border)] hover:bg-[var(--dash-bg-input)] text-[var(--dash-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-[13px] font-semibold text-[var(--dash-text-heading)] px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-[var(--dash-border)] hover:bg-[var(--dash-bg-input)] text-[var(--dash-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && skillToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center px-6 pt-10 pb-6">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-red-600/20">
                <Trash2 size={28} />
              </div>
              <h3 className="text-[20px] font-bold mb-2">Delete "{skillToDelete.name}"</h3>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-1">
                Do you want to delete this skill?
              </p>
              <p className="text-[12px] text-amber-500 font-semibold mb-3 px-4 leading-snug">
                This action will remove all employee and project references to this skill.
              </p>
              <p className="text-[14px] text-red-500 font-semibold mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-5 text-[14px] font-semibold text-gray-500 hover:text-gray-750 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSkill}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-5 bg-red-600 hover:bg-red-700 text-white text-[14px] font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
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
