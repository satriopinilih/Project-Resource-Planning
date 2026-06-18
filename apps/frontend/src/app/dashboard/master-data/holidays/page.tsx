"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit2,
  Search,
  Calendar,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  CalendarDays,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Check
} from "lucide-react";
import { getHolidays, createHoliday, bulkCreateHolidays, updateHoliday, deleteHoliday, BackendHoliday } from "@/lib/api";
import * as XLSX from "xlsx";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<BackendHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<BackendHoliday | null>(null);

  // Form states
  const [nameInput, setNameInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import states
  const [isDragging, setIsDragging] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [parsedHolidays, setParsedHolidays] = useState<{ name: string; date: string; isValid: boolean; error?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Toast notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchHolidaysList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHolidays();
      // Sort holidays chronologically
      const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setHolidays(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holidays from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidaysList();
  }, []);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [holidays, searchQuery]);

  const handleOpenAddModal = () => {
    setNameInput("");
    setDateInput("");
    setStartDateInput("");
    setEndDateInput("");
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (holiday: BackendHoliday) => {
    setSelectedHoliday(holiday);
    setNameInput(holiday.name);
    // Format Date string (YYYY-MM-DD) for HTML5 input
    const formattedDate = holiday.date.split("T")[0];
    setDateInput(formattedDate);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !startDateInput || !endDateInput) {
      setFormError("Holiday name, start date, and end date are required.");
      return;
    }
    const start = new Date(startDateInput);
    const end = new Date(endDateInput);
    if (start > end) {
      setFormError("Start Date must be less than or equal to End Date.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await createHoliday(nameInput.trim(), start.toISOString(), end.toISOString());
      setIsAddModalOpen(false);
      setNotification({ type: "success", message: `Successfully added holiday "${nameInput.trim()}"` });
      fetchHolidaysList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add holiday.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoliday) return;
    if (!nameInput.trim() || !dateInput) {
      setFormError("Holiday name and date are required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await updateHoliday(selectedHoliday.id, nameInput.trim(), new Date(dateInput).toISOString());
      setIsEditModalOpen(false);
      setNotification({ type: "success", message: `Successfully updated holiday to "${nameInput.trim()}"` });
      fetchHolidaysList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update holiday.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = (id: number, name: string) => {
    setHolidayToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    setIsDeleting(true);
    try {
      await deleteHoliday(holidayToDelete.id);
      setNotification({ type: "success", message: `Successfully deleted holiday "${holidayToDelete.name}"` });
      setIsDeleteModalOpen(false);
      setHolidayToDelete(null);
      fetchHolidaysList();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete holiday.");
    } finally {
      setIsDeleting(false);
    }
  };

  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;
    let dateObj: Date | null = null;
    if (val instanceof Date) {
      dateObj = isNaN(val.getTime()) ? null : val;
    } else if (typeof val === 'number') {
      // Excel serial date number
      dateObj = new Date((val - 25569) * 86400 * 1000);
      if (isNaN(dateObj.getTime())) dateObj = null;
    } else {
      const str = String(val).trim();
      // Match DD-MM-YYYY
      const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed month
        const year = parseInt(match[3], 10);
        dateObj = new Date(year, month, day);
        if (isNaN(dateObj.getTime())) dateObj = null;
      } else {
        // Fallback to standard date parse
        const fallback = new Date(str);
        dateObj = isNaN(fallback.getTime()) ? null : fallback;
      }
    }

    if (!dateObj) return null;
    // Format to YYYY-MM-DD local format
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setImportFileName(file.name);
    setFormError(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

          if (rows.length === 0) {
            setFormError("The selected file is empty.");
            return;
          }

          const items: { name: string; date: string; isValid: boolean; error?: string }[] = [];

          // Start from row 0, but if row 0 looks like headers, skip it
          let startRow = 0;
          const firstRow = rows[0];
          if (firstRow && firstRow.length > 0) {
            const colA = String(firstRow[0]).toLowerCase().trim();
            const colB = String(firstRow[1] || "").toLowerCase().trim();
            if (colA.includes("name") || colA.includes("holiday") || colB.includes("date") || colB.includes("time") || colB.includes("dd-mm")) {
              startRow = 1;
            }
          }

          for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const nameVal = row[0];
            const dateVal = row[1];

            // If both are empty, skip row
            if (!nameVal && !dateVal) continue;

            const holidayName = nameVal ? String(nameVal).trim() : "";
            const parsedDate = parseExcelDate(dateVal);

            let isValid = true;
            let rowError = "";

            if (!holidayName) {
              isValid = false;
              rowError = "Holiday name is empty";
            } else if (holidayName.length > 200) {
              isValid = false;
              rowError = "Holiday name exceeds 200 characters";
            } else if (!parsedDate) {
              isValid = false;
              rowError = `Invalid date format (expected DD-MM-YYYY or Date)`;
            }

            items.push({
              name: holidayName,
              date: parsedDate || (dateVal ? String(dateVal) : ""),
              isValid,
              error: rowError
            });
          }

          if (items.length === 0) {
            setFormError("No valid rows could be found in the Excel sheet.");
          }
          setParsedHolidays(items);
        } catch (err) {
          setFormError(err instanceof Error ? err.message : "Error parsing Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to read file.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
        setFormError("Only Excel files (.xlsx, .xls) or CSV files are supported.");
        return;
      }
      await processFile(file);
    }
  };

  const handleBulkImport = async () => {
    const validItems = parsedHolidays.filter(item => item.isValid);
    if (validItems.length === 0) {
      setFormError("There are no valid holidays to import.");
      return;
    }

    setIsImporting(true);
    setFormError(null);
    try {
      const payload = validItems.map(item => ({
        name: item.name,
        date: new Date(item.date).toISOString()
      }));

      await bulkCreateHolidays(payload);
      setIsImportModalOpen(false);
      setNotification({
        type: "success",
        message: `Successfully imported ${validItems.length} holidays.`
      });
      fetchHolidaysList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to import holidays.");
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      <div className="mb-6" />

      {/* Page Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#242427] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5 transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="text-blue-500 w-6 h-6" />
            <h2 className="text-[26px] font-bold text-gray-900 dark:text-white tracking-tight">Master Data Management</h2>
          </div>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">Configure and maintain company holidays catalog</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setImportFileName("");
              setParsedHolidays([]);
              setFormError(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <UploadCloud size={16} />
            Import Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            Add New Holiday
          </button>
        </div>
      </section>

      {/* Main Content Card */}
      <section className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm transition-all duration-300">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search holidays by name..."
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
            onClick={fetchHolidaysList}
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
              onClick={fetchHolidaysList}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h4 className="text-[16px] font-bold text-gray-700 dark:text-gray-300 mb-1">No Holidays Found</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {searchQuery ? `No results match "${searchQuery}"` : "The company holidays catalog is empty."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-200 dark:border-white/5 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1a1b1e] border-b border-gray-200 dark:border-white/5">
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">ID</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holiday Name</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredHolidays.map((holiday) => (
                    <tr
                      key={holiday.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4 text-[14px] text-gray-400 dark:text-gray-500 font-mono">
                        {holiday.id}
                      </td>
                      <td className="px-6 py-4 text-[15px] font-medium text-gray-900 dark:text-white">
                        {holiday.name}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-gray-600 dark:text-gray-300">
                        {formatDate(holiday.date)}
                      </td>
                      <td className="px-6 py-4 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(holiday)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Edit Holiday"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete Holiday"
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

      {/* Add Holiday Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[18px] font-bold">Add New Holiday</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHoliday}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[13px] flex items-start gap-2.5">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Independence Day"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={200}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                      disabled={isSubmitting}
                    />
                  </div>
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
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {isEditModalOpen && selectedHoliday && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[18px] font-bold">Edit Holiday</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditHoliday}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[13px] flex items-start gap-2.5">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. New Year"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={200}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[14px] outline-none focus:border-blue-500/50 transition-colors text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  />
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
                  Update Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Holidays Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsImportModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10 shrink-0">
              <h3 className="text-[18px] font-bold">Import Holidays</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[13px] flex items-start gap-2.5">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Upload Drop Zone */}
              {!importFileName ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-gray-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02]"
                  }`}
                  onClick={() => document.getElementById("excel-file-input")?.click()}
                >
                  <input
                    id="excel-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-gray-700 dark:text-gray-300">
                      Drag & drop your Excel file here, or click to browse
                    </p>
                    <p className="text-[12px] text-gray-400 mt-1">
                      Supports .xlsx, .xls, and .csv files
                    </p>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                    Column A: Holiday Name &nbsp;|&nbsp; Column B: Date (DD-MM-YYYY)
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold truncate max-w-[250px]">{importFileName}</p>
                        <p className="text-[12px] text-gray-400">{parsedHolidays.length} rows detected</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setImportFileName("");
                        setParsedHolidays([]);
                        setFormError(null);
                      }}
                      className="text-[12px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                      Remove File
                    </button>
                  </div>

                  {/* Preview Section */}
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2">Import Preview</h4>
                    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 font-bold text-gray-500 dark:text-gray-400">
                            <th className="px-4 py-2.5">Row</th>
                            <th className="px-4 py-2.5">Name (Col A)</th>
                            <th className="px-4 py-2.5">Date (Col B)</th>
                            <th className="px-4 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {parsedHolidays.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/[0.01]">
                              <td className="px-4 py-2 text-gray-400 font-mono">{index + 1}</td>
                              <td className="px-4 py-2 font-medium truncate max-w-[180px]">{item.name || <span className="text-red-500 italic">Empty</span>}</td>
                              <td className="px-4 py-2 font-mono text-gray-600 dark:text-gray-300">{item.date || <span className="text-red-500 italic">Invalid</span>}</td>
                              <td className="px-4 py-2 text-right">
                                {item.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    <Check size={10} /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md" title={item.error}>
                                    <AlertTriangle size={10} /> {item.error}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/[0.02] shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                className="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {importFileName && (
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isImporting || parsedHolidays.filter(h => h.isValid).length === 0}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isImporting && <Loader2 size={16} className="animate-spin" />}
                  Import {parsedHolidays.filter(h => h.isValid).length} Holidays
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && holidayToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center px-6 pt-10 pb-6">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-red-600/20">
                <Trash2 size={28} />
              </div>
              <h3 className="text-[20px] font-bold mb-2">Delete "{holidayToDelete.name}"</h3>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-1">
                Do you want to delete this holiday?
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
                  onClick={confirmDeleteHoliday}
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
