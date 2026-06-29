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
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building,
  Info
} from "lucide-react";
import {
  getHolidays,
  createHoliday,
  bulkCreateHolidays,
  updateHoliday,
  deleteHoliday,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  BackendHoliday,
  BackendClient
} from "@/lib/api";
import * as XLSX from "xlsx";

export default function HolidaysPage() {
  const [clients, setClients] = useState<BackendClient[]>([]);
  const [holidays, setHolidays] = useState<BackendHoliday[]>([]);
  const [selectedClient, setSelectedClient] = useState<BackendClient | null>(null);

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchClientQuery, setSearchClientQuery] = useState("");

  // Modals
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<BackendClient | null>(null);

  const [isAddHolidayModalOpen, setIsAddHolidayModalOpen] = useState(false);
  const [isEditHolidayModalOpen, setIsEditHolidayModalOpen] = useState(false);
  const [isDeleteHolidayModalOpen, setIsDeleteHolidayModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{ id: number; name: string; dateStart: string; dateEnd: string; clientId: number | null } | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<BackendHoliday | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states - Client
  const [clientNameInput, setClientNameInput] = useState("");
  const [clientDescInput, setClientDescInput] = useState("");

  // Form states - Holiday
  const [holidayNameInput, setHolidayNameInput] = useState("");
  const [holidayStartDateInput, setHolidayStartDateInput] = useState("");
  const [holidayEndDateInput, setHolidayEndDateInput] = useState("");
  const [holidayClientIdInput, setHolidayClientIdInput] = useState<string>(""); // "" = National

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import states
  const [isDragging, setIsDragging] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importClientId, setImportClientId] = useState<string>(""); // default to National or current client
  const [parsedHolidays, setParsedHolidays] = useState<{ name: string; date: string; isValid: boolean; error?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Calendar states
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(2026, 5, 1)); // Default to June 2026 as in screenshot

  // Toast notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch initial data
  const loadData = async () => {
    setIsLoadingClients(true);
    setIsLoadingHolidays(true);
    setError(null);
    try {
      const clientData = await getClients();
      const holidayData = await getHolidays();

      setClients(clientData);
      setHolidays(holidayData);

      // Preserve active client selection if possible, otherwise default to first client
      if (clientData.length > 0) {
        setSelectedClient(prev => {
          if (prev) {
            const found = clientData.find(c => c.id === prev.id);
            if (found) return found;
          }
          return clientData[0];
        });
      } else {
        setSelectedClient(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holiday master data.");
    } finally {
      setIsLoadingClients(false);
      setIsLoadingHolidays(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      c.name.toLowerCase().includes(searchClientQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchClientQuery.toLowerCase())
    );
  }, [clients, searchClientQuery]);

  // Selected client's holidays (National holidays + specific client holidays), sorted chronologically ASC
  const clientHolidays = useMemo(() => {
    if (!selectedClient) return [];
    return holidays.filter(
      (h) => h.clientId === null || h.clientId === selectedClient.id
    ).sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
  }, [holidays, selectedClient]);

  // Group consecutive same-name holidays into a single display row
  interface GroupedHoliday {
    id: number; // first record's ID (for edit/delete)
    name: string;
    clientId: number | null;
    dateStart: string; // ISO string of group start
    dateEnd: string;   // ISO string of group end
    dayCount: number;  // total days in group
  }

  const groupedHolidays = useMemo((): GroupedHoliday[] => {
    if (clientHolidays.length === 0) return [];

    const result: GroupedHoliday[] = [];
    let current: GroupedHoliday | null = null;

    for (const h of clientHolidays) {
      const hStart = h.dateStart.split('T')[0];
      const hEnd = h.dateEnd.split('T')[0];

      if (!current) {
        current = {
          id: h.id,
          name: h.name,
          clientId: h.clientId,
          dateStart: h.dateStart,
          dateEnd: h.dateEnd,
          dayCount: Math.round((new Date(hEnd).getTime() - new Date(hStart).getTime()) / 86400000) + 1,
        };
        continue;
      }

      const isSameName = h.name === current.name && h.clientId === current.clientId;
      if (isSameName) {
        // Merge: extend the group's end date and accumulate days
        const newEndStr = hEnd;
        const newDays = Math.round((new Date(hEnd).getTime() - new Date(hStart).getTime()) / 86400000) + 1;
        current.dateEnd = h.dateEnd;
        current.dayCount += newDays;
      } else {
        result.push(current);
        current = {
          id: h.id,
          name: h.name,
          clientId: h.clientId,
          dateStart: h.dateStart,
          dateEnd: h.dateEnd,
          dayCount: Math.round((new Date(hEnd).getTime() - new Date(hStart).getTime()) / 86400000) + 1,
        };
      }
    }

    if (current) result.push(current);

    // Final chronological sort ASC (should already be sorted, but ensure after grouping)
    result.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());

    return result;
  }, [clientHolidays]);

  // Date Formatting Helper
  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDateReadable = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Month-timeline presence indicator checker (for J F M A M J J A S O N D)
  const getMonthTimeline = (clientId: number) => {
    const timeline = Array(12).fill(false);
    const year = calendarDate.getFullYear();

    const relevantHolidays = holidays.filter(
      (h) => h.clientId === null || h.clientId === clientId
    );

    relevantHolidays.forEach((h) => {
      const start = new Date(h.dateStart);
      const end = new Date(h.dateEnd);

      const startYear = start.getFullYear();
      const endYear = end.getFullYear();

      if (startYear <= year && endYear >= year) {
        const startMonth = startYear < year ? 0 : start.getMonth();
        const endMonth = endYear > year ? 11 : end.getMonth();

        for (let m = startMonth; m <= endMonth; m++) {
          timeline[m] = true;
        }
      }
    });
    return timeline;
  };

  // Client CRUD Handlers
  const handleOpenAddClient = () => {
    setClientNameInput("");
    setClientDescInput("");
    setFormError(null);
    setIsAddClientModalOpen(true);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNameInput.trim()) {
      setFormError("Client name is required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const newClient = await createClient(clientNameInput.trim(), clientDescInput.trim());
      setIsAddClientModalOpen(false);
      setNotification({ type: "success", message: `Client "${newClient.name}" created successfully` });
      await loadData();
      // Select the new client
      const refreshedClients = await getClients();
      const created = refreshedClients.find(c => c.name === newClient.name);
      if (created) setSelectedClient(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditClient = () => {
    if (!selectedClient) return;
    setClientNameInput(selectedClient.name);
    setClientDescInput(selectedClient.description);
    setFormError(null);
    setIsEditClientModalOpen(true);
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!clientNameInput.trim()) {
      setFormError("Client name is required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const updated = await updateClient(selectedClient.id, clientNameInput.trim(), clientDescInput.trim());
      setIsEditClientModalOpen(false);
      setNotification({ type: "success", message: `Client "${updated.name}" updated successfully` });
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteClient = () => {
    if (!selectedClient) return;
    setClientToDelete(selectedClient);
    setIsDeleteClientModalOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteClient(clientToDelete.id);
      setIsDeleteClientModalOpen(false);
      setClientToDelete(null);
      setNotification({ type: "success", message: `Client "${clientToDelete.name}" deleted successfully` });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Holiday CRUD Handlers
  const handleOpenAddHoliday = () => {
    setHolidayNameInput("");
    setHolidayStartDateInput("");
    setHolidayEndDateInput("");
    setHolidayClientIdInput(selectedClient ? String(selectedClient.id) : "");
    setFormError(null);
    setIsAddHolidayModalOpen(true);
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayNameInput.trim() || !holidayStartDateInput || !holidayEndDateInput) {
      setFormError("All holiday fields are required.");
      return;
    }
    const start = new Date(holidayStartDateInput);
    const end = new Date(holidayEndDateInput);
    if (start > end) {
      setFormError("Start Date must be less than or equal to End Date.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const cId = holidayClientIdInput ? Number(holidayClientIdInput) : null;
      await createHoliday(holidayNameInput.trim(), start.toISOString(), end.toISOString(), cId);
      setIsAddHolidayModalOpen(false);
      setNotification({ type: "success", message: `Holiday "${holidayNameInput.trim()}" added successfully` });
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add holiday.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bug #4 fix: accept a GroupedHoliday so startDate and endDate reflect the full range,
  // not just the first raw record's dates (which only span a single day for each DB row).
  const handleOpenEditHoliday = (holiday: { id: number; name: string; dateStart: string; dateEnd: string; clientId: number | null }) => {
    // We still need a BackendHoliday reference for the update call (which uses .id).
    // Build a minimal one from the grouped data.
    setSelectedHoliday({ id: holiday.id, name: holiday.name, dateStart: holiday.dateStart, dateEnd: holiday.dateEnd, clientId: holiday.clientId, clientName: null });
    setHolidayNameInput(holiday.name);
    setHolidayStartDateInput(holiday.dateStart.split("T")[0]);
    setHolidayEndDateInput(holiday.dateEnd.split("T")[0]);
    setHolidayClientIdInput(holiday.clientId ? String(holiday.clientId) : "");
    setFormError(null);
    setIsEditHolidayModalOpen(true);
  };

  const handleEditHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoliday) return;
    if (!holidayNameInput.trim() || !holidayStartDateInput || !holidayEndDateInput) {
      setFormError("All holiday fields are required.");
      return;
    }
    const start = new Date(holidayStartDateInput);
    const end = new Date(holidayEndDateInput);
    if (start > end) {
      setFormError("Start Date must be less than or equal to End Date.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const cId = holidayClientIdInput ? Number(holidayClientIdInput) : null;
      await updateHoliday(selectedHoliday.id, holidayNameInput.trim(), start.toISOString(), end.toISOString(), cId);
      setIsEditHolidayModalOpen(false);
      setNotification({ type: "success", message: `Holiday "${holidayNameInput.trim()}" updated successfully` });
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update holiday.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bug #5 fix: store full group info (name + date range + clientId) for group delete
  const handleOpenDeleteHoliday = (group: { id: number; name: string; dateStart: string; dateEnd: string; clientId: number | null }) => {
    setHolidayToDelete({ id: group.id, name: group.name, dateStart: group.dateStart, dateEnd: group.dateEnd, clientId: group.clientId });
    setIsDeleteHolidayModalOpen(true);
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    setIsSubmitting(true);
    try {
      // Bug #5 fix: identify all raw DB records belonging to this group and delete them all.
      // A group is defined by matching name + clientId with dateStart falling within the group range.
      const groupStart = holidayToDelete.dateStart.split('T')[0];
      const groupEnd = holidayToDelete.dateEnd.split('T')[0];
      const matchingIds = clientHolidays
        .filter(r =>
          r.name === holidayToDelete.name &&
          r.clientId === holidayToDelete.clientId &&
          r.dateStart.split('T')[0] >= groupStart &&
          r.dateStart.split('T')[0] <= groupEnd
        )
        .map(r => r.id);

      // Delete all matching records sequentially
      for (const rid of matchingIds) {
        await deleteHoliday(rid);
      }

      setIsDeleteHolidayModalOpen(false);
      setHolidayToDelete(null);
      setNotification({ type: "success", message: `Holiday "${holidayToDelete.name}" deleted successfully` });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete holiday.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar Logic
  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon, ...

    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Total days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month filler days (dimmed)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month filler days (dimmed)
    const remaining = cells.length % 7;
    if (remaining > 0) {
      const nextDays = 7 - remaining;
      for (let i = 1; i <= nextDays; i++) {
        cells.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false
        });
      }
    }

    // Keep standard 6 rows to prevent height shifts
    while (cells.length < 42) {
      const nextMonthStart = cells.length - totalDays - startDayOfWeek + 1;
      cells.push({
        date: new Date(year, month + 1, nextMonthStart),
        isCurrentMonth: false
      });
    }

    return cells;
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Helper check if a cell date is a holiday
  const checkHolidayForCell = (date: Date) => {
    const formatted = formatLocalDate(date);
    return clientHolidays.find(h => {
      const startStr = h.dateStart.split("T")[0];
      const endStr = h.dateEnd.split("T")[0];
      return formatted >= startStr && formatted <= endStr;
    });
  };

  const checkIsToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const checkIsWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sun = 0, Sat = 6
  };

  // Excel parsing and bulk upload
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
      const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        dateObj = new Date(year, month, day);
        if (isNaN(dateObj.getTime())) dateObj = null;
      } else {
        const fallback = new Date(str);
        dateObj = isNaN(fallback.getTime()) ? null : fallback;
      }
    }

    if (!dateObj) return null;
    return formatLocalDate(dateObj);
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

          // Skip header row if necessary
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

            if (!nameVal && !dateVal) continue;

            const holidayName = nameVal ? String(nameVal).trim() : "";
            const isRange = typeof dateVal === 'string' && dateVal.includes(' - ');

            const datesToProcess: { val: any, parsed: string | null }[] = [];

            if (isRange) {
              const parts = String(dateVal).split(' - ');
              if (parts.length === 2) {
                const parsedStart = parseExcelDate(parts[0].trim());
                const parsedEnd = parseExcelDate(parts[1].trim());

                if (parsedStart && parsedEnd) {
                  const [sYear, sMonth, sDay] = parsedStart.split('-').map(Number);
                  const [eYear, eMonth, eDay] = parsedEnd.split('-').map(Number);

                  const start = new Date(sYear, sMonth - 1, sDay);
                  const end = new Date(eYear, eMonth - 1, eDay);

                  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
                    let current = new Date(start);
                    while (current <= end) {
                      datesToProcess.push({ val: current, parsed: formatLocalDate(current) });
                      current.setDate(current.getDate() + 1);
                    }
                  } else {
                    datesToProcess.push({ val: dateVal, parsed: null });
                  }
                } else {
                  datesToProcess.push({ val: dateVal, parsed: null });
                }
              } else {
                datesToProcess.push({ val: dateVal, parsed: null });
              }
            } else {
              datesToProcess.push({ val: dateVal, parsed: parseExcelDate(dateVal) });
            }

            datesToProcess.forEach(dateItem => {
              let isValid = true;
              let rowError = "";

              if (!holidayName) {
                isValid = false;
                rowError = "Holiday name is empty";
              } else if (holidayName.length > 200) {
                isValid = false;
                rowError = "Holiday name exceeds 200 characters";
              } else if (!dateItem.parsed) {
                isValid = false;
                rowError = `Invalid date format (expected DD-MM-YYYY or Date or Range)`;
              }

              items.push({
                name: holidayName,
                date: dateItem.parsed || (dateItem.val ? String(dateItem.val) : ""),
                isValid,
                error: rowError
              });
            });
          }

          if (items.length === 0) {
            setFormError("No valid rows found in Excel sheet.");
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
      setFormError("No valid holidays to import.");
      return;
    }

    setIsImporting(true);
    setFormError(null);
    try {
      const cId = importClientId ? Number(importClientId) : null;
      const payload = validItems.map(item => ({
        name: item.name,
        dateStart: new Date(item.date).toISOString(),
        dateEnd: new Date(item.date).toISOString(),
        clientId: cId
      }));

      await bulkCreateHolidays(payload);
      setIsImportModalOpen(false);
      setNotification({
        type: "success",
        message: `Successfully imported ${validItems.length} holidays.`
      });
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to import holidays.");
    } finally {
      setIsImporting(false);
    }
  };

  // Generate dynamic client avatar background
  const getAvatarStyle = (name: string) => {
    const firstChar = name.replace("PT. ", "").trim().charAt(0).toUpperCase();
    const code = firstChar.charCodeAt(0);

    // Curated aesthetic gradients/colors matching modern systems
    const palettes = [
      "from-indigo-500 to-indigo-600 shadow-indigo-500/10 text-white",
      "from-emerald-500 to-emerald-600 shadow-emerald-500/10 text-white",
      "from-sky-500 to-sky-600 shadow-sky-500/10 text-white",
      "from-rose-500 to-rose-600 shadow-rose-500/10 text-white",
      "from-amber-500 to-amber-600 shadow-amber-500/10 text-white",
      "from-purple-500 to-purple-600 shadow-purple-500/10 text-white"
    ];

    return palettes[code % palettes.length];
  };

  const getClientInitials = (name: string) => {
    const cleaned = name.replace("PT. ", "").trim();
    if (cleaned.length <= 2) return cleaned.toUpperCase();
    const parts = cleaned.split(" ");
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return cleaned.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-6 font-sans transition-colors duration-300">

      {/* Top Header Block */}
      <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#242427] rounded-3xl p-6 shadow-sm border border-gray-250/30 dark:border-white/5 transition-all duration-300">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white tracking-tight">Client Holiday Calendar</h2>
          </div>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">Manage holiday schedules and compliance catalogs for each client</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setImportFileName("");
              setParsedHolidays([]);
              setImportClientId(selectedClient ? String(selectedClient.id) : "");
              setFormError(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-[13px] font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
          >
            <UploadCloud size={16} />
            Import Excel
          </button>
          <button
            onClick={handleOpenAddClient}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </section>

      {/* Main Two-Section Panel */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-180px)]">

        {/* SECTION 1: Client List (Left) */}
        <aside className="w-full lg:w-80 xl:w-96 shrink-0 bg-white dark:bg-[#242427] border border-gray-200 dark:border-white/5 rounded-3xl p-5 flex flex-col shadow-sm">

          {/* Search bar */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search Client..."
              value={searchClientQuery}
              onChange={(e) => setSearchClientQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
            />
            {searchClientQuery && (
              <button
                onClick={() => setSearchClientQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Client Scroll List */}
          <div className="flex-1 overflow-y-auto max-h-[600px] lg:max-h-[750px] space-y-2.5 pr-1.5">
            {isLoadingClients ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-[12px] text-gray-400">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                <p className="text-[13px] text-gray-400 font-medium">No clients found</p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const initials = getClientInitials(client.name);
                const avatarStyle = getAvatarStyle(client.name);
                const timeline = getMonthTimeline(client.id);

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative group ${isSelected
                      ? "bg-indigo-500/5 border-indigo-500 shadow-sm shadow-indigo-500/5"
                      : "bg-transparent border-gray-150/60 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.01]"
                      }`}
                  >
                    {/* Client Main Row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${avatarStyle} flex items-center justify-center font-bold text-[13px] tracking-wider shadow-sm`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                            {client.name}
                          </h4>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate">
                            {client.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                        {client.totalHolidayDays} days
                      </span>
                    </div>

                    {/* Upcoming Info */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${client.upcomingHoliday === "No upcoming holiday" ? "bg-gray-400" : "bg-rose-500"}`} />
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate">
                        {client.upcomingHoliday === "No upcoming holiday" ? "No upcoming holiday" : `Next: ${client.upcomingHoliday}`}
                      </p>
                    </div>

                    {/* J F M A M J J A S O N D Timeline */}
                    <div className="border-t border-gray-100 dark:border-white/5 pt-2.5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 dark:text-gray-500">
                        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, idx) => (
                          <div key={idx} className="flex flex-col items-center flex-1">
                            <span>{m}</span>
                            <div className={`w-1.5 h-1.5 rounded-full mt-1 ${timeline[idx] ? "bg-rose-500 shadow shadow-rose-500/50" : "bg-gray-200 dark:bg-gray-800"}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/5 pt-3.5 mt-3 flex items-center justify-between font-semibold">
            <span>Showing {filteredClients.length} of {clients.length} clients</span>
            <button
              onClick={loadData}
              className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-all cursor-pointer"
            >
              <RefreshCw size={10} />
              Refresh list
            </button>
          </div>
        </aside>

        {/* SECTION 2: Selected Client Dashboard (Right) */}
        <main className="flex-1 flex flex-col gap-6">

          {selectedClient ? (
            <>
              {/* Selected Client Card Header */}
              <div className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-250/30 dark:border-white/5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarStyle(selectedClient.name)} flex items-center justify-center font-bold text-[15px] tracking-wider`}>
                    {getClientInitials(selectedClient.name)}
                  </div>
                  <div>
                    <h3 className="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedClient.name}
                    </h3>
                    <p className="text-[13px] text-gray-400 dark:text-gray-500 font-medium">
                      {selectedClient.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenEditClient}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[12px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Edit2 size={13} />
                    Edit Client Info
                  </button>
                  <button
                    onClick={handleOpenDeleteClient}
                    className="flex items-center justify-center w-9 h-9 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Delete Client"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Stat 1: Total Holiday */}
                <div className="bg-white dark:bg-[#242427] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <span className="inline-flex items-center px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full mb-3">
                    Total Holiday
                  </span>
                  <h4 className="text-[20px] font-bold text-gray-900 dark:text-white leading-none">
                    {selectedClient.totalHolidayDays} days
                  </h4>
                </div>

                {/* Stat 2: Upcoming Holiday */}
                <div className="bg-white dark:bg-[#242427] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <span className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full mb-3">
                    Upcoming Holiday
                  </span>
                  <h4 className="text-[15px] font-bold text-gray-900 dark:text-white leading-none truncate" title={selectedClient.upcomingHoliday}>
                    {selectedClient.upcomingHoliday}
                  </h4>
                </div>

                {/* Stat 3: Longest Holiday */}
                <div className="bg-white dark:bg-[#242427] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <span className="inline-flex items-center px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-full mb-3">
                    Longest Holiday
                  </span>
                  <h4 className="text-[20px] font-bold text-gray-900 dark:text-white leading-none">
                    {selectedClient.longestHolidayDays} days
                  </h4>
                </div>

                {/* Stat 4: Last Updated */}
                <div className="bg-white dark:bg-[#242427] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <span className="inline-flex items-center px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full mb-3">
                    Last Updated
                  </span>
                  <h4 className="text-[15px] font-bold text-gray-900 dark:text-white leading-none truncate">
                    {new Date(selectedClient.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </h4>
                </div>

              </div>

              {/* Holiday Calendar Component */}
              <div className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-250/30 dark:border-white/5 shadow-sm flex flex-col gap-6">

                {/* Calendar Navigation and Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-4">
                  <div>
                    <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">Holiday Calendar</h4>
                    <p className="text-[12px] text-gray-400">View and audit dates for this month</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                      <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-4 text-[13px] font-bold text-gray-800 dark:text-gray-200 select-none min-w-[110px] text-center">
                        {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                      <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <button
                      onClick={handleOpenAddHoliday}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 active:scale-95"
                    >
                      <Plus size={14} />
                      Add Holiday
                    </button>
                  </div>
                </div>

                {/* Calendar View Container */}
                <div className="flex flex-col xl:flex-row gap-6">

                  {/* Calendar Grid */}
                  <div className="flex-1">
                    <div className="grid grid-cols-7 text-center gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                        <div key={idx} className="text-[12px] font-bold text-gray-400 dark:text-gray-500 py-2 uppercase tracking-wide">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarCells.map((cell, idx) => {
                        const holiday = checkHolidayForCell(cell.date);
                        const isCurrentMonth = cell.isCurrentMonth;
                        const weekend = checkIsWeekend(cell.date);
                        const today = checkIsToday(cell.date);

                        let cellClass = "bg-transparent text-gray-800 dark:text-gray-200";
                        if (!isCurrentMonth) {
                          cellClass = "text-gray-300 dark:text-gray-700 pointer-events-none opacity-40";
                        }

                        // Determine cell style based on states
                        let borderStyle = "border-transparent";
                        if (today) {
                          borderStyle = "border-indigo-500 ring-2 ring-indigo-500/25";
                        }

                        let bgStyle = "hover:bg-gray-100 dark:hover:bg-white/5";
                        if (holiday) {
                          // Premium soft coral-rose background for holiday
                          bgStyle = "bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/25";
                        } else if (weekend && isCurrentMonth) {
                          // Dimmed style for weekend
                          bgStyle = "bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 dark:text-gray-500";
                        }

                        return (
                          <div
                            key={idx}
                            className={`min-h-[52px] flex flex-col justify-between p-1.5 rounded-xl border ${borderStyle} ${bgStyle} ${cellClass} transition-all relative group`}
                          >
                            <span className="text-[12px] font-semibold self-end">
                              {cell.date.getDate()}
                            </span>

                            {/* Hover tooltip for holiday names */}
                            {holiday && isCurrentMonth && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-auto self-start" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 bg-gray-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                  {holiday.name}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend Panel */}
                  <div className="w-full xl:w-56 shrink-0 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-center gap-4">
                    <h5 className="text-[12px] font-bold uppercase tracking-wider text-gray-400">Calendar Legend</h5>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-[13px] font-semibold">
                        <div className="w-4 h-4 rounded-md bg-rose-500/20 border border-rose-500/20" />
                        <span>Holiday</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                        <div className="w-4 h-4 rounded-md bg-gray-100 dark:bg-white/5" />
                        <span>Weekend</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[13px] font-semibold">
                        <div className="w-4 h-4 rounded-md border border-indigo-500 bg-transparent ring-2 ring-indigo-500/10" />
                        <span>Today</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] font-medium text-gray-400 flex items-start gap-1.5 border-t border-gray-200/50 dark:border-white/5 pt-3">
                      <Info size={12} className="shrink-0 mt-0.5 text-indigo-500" />
                      <span>Hover over holiday cells to view their catalog titles.</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Holiday List Grid Component */}
              <div className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-250/30 dark:border-white/5 shadow-sm flex flex-col gap-4">
                <div>
                  <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">Holiday List</h4>
                  <p className="text-[12px] text-gray-400">Catalog of scheduled holiday dates</p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {isLoadingHolidays ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <p className="text-[12px] text-gray-400">Loading catalog...</p>
                    </div>
                  ) : clientHolidays.length === 0 ? (
                    <div className="text-center py-8 text-[13px] text-gray-400">
                      No holidays scheduled for this client.
                    </div>
                  ) : (
                    groupedHolidays.map((h) => {
                      const isNational = h.clientId === null;
                      const dateStartStr = h.dateStart.split('T')[0];
                      const dateEndStr = h.dateEnd.split('T')[0];
                      const isRange = dateStartStr !== dateEndStr;

                      // Format: DD-MM-YYYY for display
                      const fmtShort = (iso: string) => {
                        const d = new Date(iso);
                        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                      };

                      const dateLabel = isRange
                        ? `${fmtShort(h.dateStart)} – ${fmtShort(h.dateEnd)}`
                        : formatDateReadable(h.dateStart);

                      return (
                        <div key={`${h.name}-${dateStartStr}`} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0 group">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl shrink-0 ${isNational ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
                              <Calendar size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-[14px] font-bold text-gray-900 dark:text-white truncate">
                                  {h.name}
                                </h5>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isNational
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                  }`}>
                                  {isNational ? "NATIONAL" : "CLIENT"}
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
                                {dateLabel}
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1.5">({h.dayCount} days)</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                // Bug #4 fix: pass the GroupedHoliday directly so dateEnd covers the full range
                                handleOpenEditHoliday(h);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all cursor-pointer"
                              title="Edit Holiday"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteHoliday(h)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer"
                              title="Delete Holiday"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white dark:bg-[#242427] rounded-3xl border border-gray-200 dark:border-white/5 p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <Building size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-[16px] font-bold text-gray-700 dark:text-gray-300 mb-1">No Client Selected</h4>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-sm">
                Create or select a client from the left pane to manage holiday schedules, calendars, and compliance stats.
              </p>
            </div>
          )}

        </main>

      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* Modal: Add Client */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsAddClientModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[17px] font-bold">Add Client</h3>
              <button onClick={() => setIsAddClientModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddClient}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client Name</label>
                  <input
                    type="text"
                    required
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder="e.g. PT. BGA"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={100}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea
                    value={clientDescInput}
                    onChange={(e) => setClientDescInput(e.target.value)}
                    placeholder="e.g. Binus Graduate Attributes"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white min-h-[80px] resize-none"
                    maxLength={500}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Client */}
      {isEditClientModalOpen && selectedClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsEditClientModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[17px] font-bold">Edit Client</h3>
              <button onClick={() => setIsEditClientModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditClient}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client Name</label>
                  <input
                    type="text"
                    required
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder="e.g. PT. BGA"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={100}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea
                    value={clientDescInput}
                    onChange={(e) => setClientDescInput(e.target.value)}
                    placeholder="e.g. Binus Graduate Attributes"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white min-h-[80px] resize-none"
                    maxLength={500}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Client Confirmation */}
      {isDeleteClientModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsDeleteClientModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsDeleteClientModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center p-6 pt-10">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[17px] font-bold mb-1.5">Delete "{clientToDelete.name}"?</h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
                This will delete the client and all associated client holidays. This action cannot be undone.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setIsDeleteClientModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 text-[12px] font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent dark:border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteClient}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-red-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Holiday */}
      {isAddHolidayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsAddHolidayModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[17px] font-bold">Add Holiday</h3>
              <button onClick={() => setIsAddHolidayModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHoliday}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={holidayNameInput}
                    onChange={(e) => setHolidayNameInput(e.target.value)}
                    placeholder="e.g. Christmas Day"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={200}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Belongs to Client</label>
                  <select
                    value={holidayClientIdInput}
                    onChange={(e) => setHolidayClientIdInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  >
                    <option value="">National (All Clients)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={holidayStartDateInput}
                      onChange={(e) => setHolidayStartDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-950 dark:text-white"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={holidayEndDateInput}
                      onChange={(e) => setHolidayEndDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-955 dark:text-white"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsAddHolidayModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Holiday */}
      {isEditHolidayModalOpen && selectedHoliday && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsEditHolidayModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-[17px] font-bold">Edit Holiday</h3>
              <button onClick={() => setIsEditHolidayModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditHoliday}>
              <div className="px-6 py-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={holidayNameInput}
                    onChange={(e) => setHolidayNameInput(e.target.value)}
                    placeholder="e.g. Independence Day"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
                    maxLength={200}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Belongs to Client</label>
                  <select
                    value={holidayClientIdInput}
                    onChange={(e) => setHolidayClientIdInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  >
                    <option value="">National (All Clients)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={holidayStartDateInput}
                      onChange={(e) => setHolidayStartDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-950 dark:text-white"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={holidayEndDateInput}
                      onChange={(e) => setHolidayEndDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-955 dark:text-white"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsEditHolidayModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Holiday Confirmation */}
      {isDeleteHolidayModalOpen && holidayToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsDeleteHolidayModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsDeleteHolidayModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center p-6 pt-10">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[17px] font-bold mb-1.5">Delete "{holidayToDelete.name}"?</h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
                Are you sure you want to delete this holiday? This action cannot be undone.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setIsDeleteHolidayModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 text-[12px] font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent dark:border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteHoliday}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-red-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsImportModalOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl text-gray-900 dark:text-white transition-all scale-100 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10 shrink-0">
              <h3 className="text-[17px] font-bold">Import Holidays</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Client assignment for imported holidays */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assign Imported Holidays to Client</label>
                <select
                  value={importClientId}
                  onChange={(e) => setImportClientId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 transition-colors text-gray-900 dark:text-white font-medium"
                >
                  <option value="">National (All Clients)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Drop Zone */}
              {!importFileName ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${isDragging
                    ? "border-indigo-500 bg-indigo-500/5"
                    : "border-gray-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]"
                    }`}
                  onClick={() => document.getElementById("excel-import-input")?.click()}
                >
                  <input
                    id="excel-import-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-750 dark:text-gray-300">
                      Drag & drop your Excel file here, or click to browse
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Supports .xlsx, .xls, and .csv files
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                    Column A: Holiday Name &nbsp;|&nbsp; Column B: Date (DD-MM-YYYY)
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold truncate max-w-[200px]">{importFileName}</p>
                        <p className="text-[11px] text-gray-400">{parsedHolidays.length} rows detected</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setImportFileName("");
                        setParsedHolidays([]);
                        setFormError(null);
                      }}
                      className="text-[11px] font-bold text-red-500 hover:text-white flex items-center gap-1 cursor-pointer bg-red-500/10 hover:bg-red-500 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>

                  {/* Preview Section */}
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Import Preview</h4>
                    <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[12px]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 font-bold text-gray-500 dark:text-gray-400">
                            <th className="px-4 py-2">Row</th>
                            <th className="px-4 py-2">Name (Col A)</th>
                            <th className="px-4 py-2">Date (Col B)</th>
                            <th className="px-4 py-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {parsedHolidays.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/[0.01]">
                              <td className="px-4 py-2 text-gray-400 font-mono">{index + 1}</td>
                              <td className="px-4 py-2 font-medium truncate max-w-[150px]">{item.name || <span className="text-red-500 italic">Empty</span>}</td>
                              <td className="px-4 py-2 font-mono text-gray-500">{item.date || <span className="text-red-500 italic">Invalid</span>}</td>
                              <td className="px-4 py-2 text-right">
                                {item.isValid ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    <Check size={10} /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md" title={item.error}>
                                    <AlertTriangle size={10} /> Err
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

            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2 bg-gray-50 dark:bg-white/[0.02] shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {importFileName && (
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isImporting || parsedHolidays.filter(h => h.isValid).length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isImporting && <Loader2 size={14} className="animate-spin" />}
                  Import {parsedHolidays.filter(h => h.isValid).length} Holidays
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20 border border-indigo-500/30 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-[13px] font-bold">{notification.message}</span>
        </div>
      )}

    </div>
  );
}
