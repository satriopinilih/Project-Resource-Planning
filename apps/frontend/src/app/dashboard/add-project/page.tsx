"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  AlertCircle,
  Trash2,
  Check,
  ArrowLeft,
  Loader2,
  Users,
  ShieldAlert,
  Search,
  Sparkles,
  X,
  ChevronDown,
  Building2
} from "lucide-react";
import {
  getHolidays,
  BackendHoliday,
  createProject,
  getEmployeeFormOptions,
  EmployeeFormOptions,
  getProjects,
  BackendProject,
  getClients,
  BackendClient,
} from "@/lib/api";
import { useRouter } from "next/navigation";

interface SkillOption {
  id: number;
  name: string;
}

const isDateHoliday = (h: BackendHoliday, dateStr: string) => {
  const start = h.dateStart.split("T")[0];
  const end = h.dateEnd.split("T")[0];
  return dateStr >= start && dateStr <= end;
};

export default function AddProjectPage() {
  const ALLOWED_STAFF_ROLES = ["PM", "Senior Dev", "Junior Dev", "Senior BA", "Junior BA", "Architect"];
  const TECHNICAL_ROLES = ["Senior Dev", "Junior Dev", "Senior BA", "Junior BA", "Architect"];
  const MAX_TECHNICAL_ROLES = 5;
  const ALLOWED_WORKING_TYPES = ["Dedicated", "Non-Dedicated"];

  // --- Client dropdown state ---
  const [clients, setClients] = useState<BackendClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // --- Holiday state ---
  const [holidays, setHolidays] = useState<BackendHoliday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [customHolidays, setCustomHolidays] = useState<BackendHoliday[]>([]);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const [durationWeeks, setDurationWeeks] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDateDetails, setEndDateDetails] = useState<{
    date: Date | null;
    skippedHolidays: BackendHoliday[];
    totalWorkingDays: number;
  }>({ date: null, skippedHolidays: [], totalWorkingDays: 0 });

  const handleAddCustomHoliday = () => {
    if (!newHolidayName.trim()) {
      setError("Please provide a name for the custom holiday.");
      return;
    }
    if (!newHolidayDate) {
      setError("Please select a date for the custom holiday.");
      return;
    }

    const dateString = new Date(newHolidayDate).toISOString().split('T')[0];

    const isDbHoliday = holidays.some(h => isDateHoliday(h, dateString));
    const isCustomHoliday = customHolidays.some(h => isDateHoliday(h, dateString));

    if (isDbHoliday || isCustomHoliday) {
      setError("A holiday on this date already exists.");
      return;
    }

    const newHoliday: BackendHoliday = {
      id: -Math.floor(Math.random() * 1000000) - 1,
      name: `${newHolidayName.trim()} (Custom)`,
      dateStart: newHolidayDate,
      dateEnd: newHolidayDate,
      clientId: null,
      clientName: "Custom"
    };

    setCustomHolidays(prev => [...prev, newHoliday]);
    setNewHolidayName("");
    setNewHolidayDate("");
    setError(null);
  };

  const handleRemoveCustomHoliday = (idToRemove: number) => {
    setCustomHolidays(prev => prev.filter(h => h.id !== idToRemove));
  };

  const [projectName, setProjectName] = useState("");
  const [clientOrganization, setClientOrganization] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formOptions, setFormOptions] = useState<EmployeeFormOptions>({ departments: [], skills: [], roles: [], staffRoles: [] });
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  const [historicalProjects, setHistoricalProjects] = useState<BackendProject[]>([]);
  const [selectedHistoryProjectId, setSelectedHistoryProjectId] = useState<string>("");
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);

  const router = useRouter();

  const [teamRoles, setTeamRoles] = useState([
    { id: '1', role: 'PM', count: 1, workingType: 'Dedicated' }
  ]);

  // --- Initial data fetch ---
  useEffect(() => {
    getClients().then(setClients).catch(console.error);
    getEmployeeFormOptions().then(setFormOptions).catch(console.error);
    getProjects()
      .then((allProjects) => {
        const filtered = allProjects.filter(
          (p) => p.projectStatus === 1 || p.projectStatus === 2 || p.projectStatus === 3
        );
        setHistoricalProjects(filtered);
      })
      .catch(console.error);
  }, []);

  // --- Fetch holidays when client changes ---
  useEffect(() => {
    if (selectedClientId === null) {
      setHolidays([]);
      return;
    }
    setIsLoadingHolidays(true);
    getHolidays(selectedClientId)
      .then(setHolidays)
      .catch(console.error)
      .finally(() => setIsLoadingHolidays(false));
  }, [selectedClientId]);

  // --- Close client dropdown when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
        setClientSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );
  }, [clients, clientSearchQuery]);

  const filteredHistoryProjects = useMemo(() => {
    if (!searchHistoryQuery.trim()) return historicalProjects;
    const query = searchHistoryQuery.toLowerCase();
    return historicalProjects.filter(
      (p) =>
        p.projectName.toLowerCase().includes(query) ||
        (p.clientOrganization && p.clientOrganization.toLowerCase().includes(query))
    );
  }, [historicalProjects, searchHistoryQuery]);

  const allowedStaffRoles = useMemo(
    () => formOptions.staffRoles.filter((r) => ALLOWED_STAFF_ROLES.includes(r.name)),
    [formOptions.staffRoles]
  );

  const technicalRolesCount = useMemo(
    () => teamRoles.filter(r => r.role !== 'PM').length,
    [teamRoles]
  );
  const isTechRoleLimitReached = technicalRolesCount >= MAX_TECHNICAL_ROLES;

  const selectedTechnicalRoles = useMemo(
    () => teamRoles.filter(r => r.role !== 'PM').map(r => r.role),
    [teamRoles]
  );

  const availableRolesForNew = useMemo(() => {
    const sourceRoles = allowedStaffRoles.length > 0
      ? allowedStaffRoles.map(r => r.name)
      : TECHNICAL_ROLES;
    return sourceRoles.filter(r => r !== 'PM' && !selectedTechnicalRoles.includes(r));
  }, [allowedStaffRoles, selectedTechnicalRoles]);

  const getAvailableRolesForRow = useCallback(
    (currentRole: string) => {
      const sourceRoles = allowedStaffRoles.length > 0
        ? allowedStaffRoles.map(r => r.name)
        : TECHNICAL_ROLES;
      return sourceRoles.filter(
        r => r !== 'PM' && (r === currentRole || !selectedTechnicalRoles.includes(r))
      );
    },
    [allowedStaffRoles, selectedTechnicalRoles]
  );

  const handleAddRole = (workingType: 'Dedicated' | 'Non-Dedicated' = 'Dedicated') => {
    if (isTechRoleLimitReached || availableRolesForNew.length === 0) return;
    setTeamRoles(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      role: availableRolesForNew[0],
      count: 1,
      workingType
    }]);
  };

  const handleRemoveRole = (idToRemove: string) => {
    setTeamRoles(prev => prev.filter(r => r.id !== idToRemove));
  };

  const updateRole = (id: string, field: string, value: any) => {
    setTeamRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const missingRoles = useMemo(() => {
    const roles = teamRoles.map(r => r.role.toLowerCase());
    const hasPM = roles.some(r => r.includes("pm"));
    const hasBA = roles.some(r => r.includes("ba"));
    const hasDev = roles.some(r => r.includes("dev"));

    const missing = [];
    if (!hasPM) missing.push("Project Manager (PM)");
    if (!hasBA) missing.push("Business Analyst (BA)");
    if (!hasDev) missing.push("Developer (Dev)");
    return missing;
  }, [teamRoles]);

  // --- End date calculation ---
  useEffect(() => {
    if (!startDate || durationWeeks <= 0) {
      setEndDateDetails({ date: null, skippedHolidays: [], totalWorkingDays: 0 });
      return;
    }

    const totalTargetWorkingDays = durationWeeks * 5;
    let current = new Date(startDate);

    if (isNaN(current.getTime())) return;

    let workingDaysCount = 0;
    const skippedHolidays: BackendHoliday[] = [];

    while (workingDaysCount < totalTargetWorkingDays) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dateString = current.toISOString().split('T')[0];
      const holidayFound = holidays.find(h => isDateHoliday(h, dateString)) || customHolidays.find(h => isDateHoliday(h, dateString));

      if (!isWeekend && !holidayFound) {
        workingDaysCount++;
      } else if (holidayFound && !isWeekend) {
        if (!skippedHolidays.some(sh => sh.id === holidayFound.id)) {
          skippedHolidays.push(holidayFound);
        }
      }

      if (workingDaysCount < totalTargetWorkingDays) {
        current.setDate(current.getDate() + 1);
      }
    }

    setEndDateDetails({
      date: current,
      skippedHolidays,
      totalWorkingDays: totalTargetWorkingDays
    });

  }, [startDate, durationWeeks, holidays, customHolidays]);

  const handleFormSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim() || !clientOrganization.trim() || !projectDescription.trim() || !priorityLevel || !startDate) {
      setError("Please fill in all required fields, including Priority and Start Date.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (durationWeeks <= 0) {
      setError("Estimated duration must be greater than 0.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!endDateDetails.date) {
      setError("End date calculation failed. Please check the start date.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (teamRoles.length === 0) {
      setError("At least one team role is required.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const techRoleNames = teamRoles.filter(r => r.role !== 'PM').map(r => r.role);
    const uniqueRoles = new Set(techRoleNames);
    if (uniqueRoles.size !== techRoleNames.length) {
      setError("Duplicate technical roles detected. Each role must be unique.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (techRoleNames.length > MAX_TECHNICAL_ROLES) {
      setError(`Maximum ${MAX_TECHNICAL_ROLES} technical roles allowed (excluding PM).`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!endDateDetails.date) return;

    setIsSubmitting(true);
    setError(null);

    const priorityMap: Record<string, number> = { "Low": 0, "Medium": 1, "High": 2 };
    const workingTypeMap: Record<string, number> = { "Dedicated": 0, "Non-Dedicated": 1 };

    let finalDescription = projectDescription;
    if (customHolidays.length > 0) {
      const customHolidayList = customHolidays
        .map(h => `- ${h.name.replace(" (Custom)", "")} (${new Date(h.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`)
        .join("\n");
      finalDescription += `\n\n[Custom Project Holidays]\n${customHolidayList}`;
    }

    const payload = {
      projectName,
      clientOrganization,
      projectDescription: finalDescription + (additionalNotes ? "\n\nNotes: " + additionalNotes : ""),
      estimatedDuration: durationWeeks,
      priorityLevel: priorityMap[priorityLevel] ?? 1,
      estimatedStartDate: new Date(startDate).toISOString(),
      estimatedEndDate: endDateDetails.date.toISOString(),
      requiredRoles: teamRoles.map(r => ({
        roleName: r.role,
        count: r.count,
        workingType: workingTypeMap[r.workingType] ?? 1
      })),
      requiredSkillIds: selectedSkillIds
    };

    try {
      await createProject(payload);
      setIsConfirmModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create project. Please ensure all data is valid.");
      setIsConfirmModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-gray-50 dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-pointer";
  const labelClasses = "block text-[13px] font-medium text-gray-700 dark:text-gray-100 mb-2 mt-1 ml-0.5";

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null;

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white">Create New Project</h2>
            <p className="text-[14px] text-gray-500 dark:text-gray-400">Fill in the details to propose a new project initiative</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#242427] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
          <form onSubmit={handleFormSubmitRequest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClasses}>Project Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Digital Transformation Initiative"
                  className={inputClasses}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              {/* Client Organization — Radix-style custom Popover dropdown */}
              <div ref={clientDropdownRef} className="relative">
                <label className={labelClasses}>Client Organization <span className="text-red-500">*</span></label>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsClientDropdownOpen(prev => !prev);
                    setClientSearchQuery("");
                  }}
                  className={`w-full flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#1b202e] border ${isClientDropdownOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-white/10'} text-gray-900 dark:text-white rounded-xl px-4 py-3 text-[14px] transition-colors`}
                >
                  <span className={`flex items-center gap-2 truncate ${!selectedClient ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                    {selectedClient ? (
                      <>
                        <Building2 size={14} className="shrink-0 text-blue-500" />
                        {selectedClient.name}
                      </>
                    ) : (
                      "Select client..."
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Panel */}
                {isClientDropdownOpen && (
                  <div className="absolute z-30 mt-1.5 w-full bg-white dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
                    {/* Search inside dropdown */}
                    <div className="p-2 border-b border-gray-100 dark:border-white/5">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 text-[13px] bg-gray-50 dark:bg-[#242427] border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Client list */}
                    <div className="max-h-52 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[13px] text-gray-400 dark:text-gray-500">
                          No clients found.
                        </div>
                      ) : (
                        filteredClients.map((client) => {
                          const isSelected = client.id === selectedClientId;
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setClientOrganization(client.name);
                                setIsClientDropdownOpen(false);
                                setClientSearchQuery("");
                              }}
                              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-white/[0.04] last:border-b-0 ${isSelected
                                ? 'bg-blue-50 dark:bg-blue-500/10'
                                : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                                  {client.name.replace("PT. ", "").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[13px] font-semibold truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {client.name}
                                  </p>
                                  {client.totalHolidayDays > 0 && (
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                      {client.totalHolidayDays} holiday day{client.totalHolidayDays !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <Check size={14} className="shrink-0 text-blue-500" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClasses}>Priority Level</label>
                <select
                  className={inputClasses}
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Project Description <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Describe the project objectives and scope..."
                className={`${inputClasses} min-h-[100px] resize-y`}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>Estimated Duration (Weeks) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 0)}
                  className={inputClasses}
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Estimated Start Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`${inputClasses} [&::-webkit-calendar-picker-indicator]:opacity-0`}
                    required
                  />
                  <CalendarIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Client holiday info panel */}
            {selectedClient && (
              <div className="bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3 transition-all duration-300">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg shrink-0">
                  <CalendarIcon className="text-indigo-600 dark:text-indigo-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                    Holiday calendar loaded for <span className="text-indigo-600 dark:text-indigo-400">{selectedClient.name}</span>
                  </p>
                  {isLoadingHolidays ? (
                    <p className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> Fetching holidays...
                    </p>
                  ) : (
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {holidays.length > 0
                        ? `${holidays.length} holiday(s) will be factored into the end date calculation.`
                        : "No holidays registered for this client yet."}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setClientOrganization("");
                    setHolidays([]);
                  }}
                  className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                  title="Clear client selection"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Custom Project Holidays Widget */}
            <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-4 transition-colors">
              <div>
                <label className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon size={18} className="text-blue-500" />
                  Custom Project Holidays
                </label>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
                  Add local holidays for this project proposal only (will not be added to the global database).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g., Company Outing)"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="w-full bg-white dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
                <div className="w-full sm:w-48 relative">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 pr-10 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <CalendarIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomHoliday}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] px-5 py-3 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 h-[46px]"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {customHolidays.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {customHolidays.map((ch) => (
                    <span
                      key={ch.id}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20"
                    >
                      <span>
                        {ch.name.replace(" (Custom)", "")} ({new Date(ch.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomHoliday(ch.id)}
                        className="text-blue-400 hover:text-blue-600 dark:hover:text-white transition-colors"
                        title="Remove custom holiday"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {endDateDetails.date && (
              <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5 flex flex-col transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                    <CalendarIcon className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <div className="text-[13px] text-gray-500 dark:text-gray-400">Calculated End Date</div>
                    <div className="text-[16px] font-bold text-gray-900 dark:text-white">
                      {endDateDetails.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {endDateDetails.skippedHolidays.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-500/10">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      <AlertCircle size={14} className="text-blue-500" />
                      Adjusted for {endDateDetails.skippedHolidays.length} holiday(s)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {endDateDetails.skippedHolidays.map(h => (
                        <span key={h.id} className="text-[11px] bg-white dark:bg-white/5 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-500/10 text-gray-600 dark:text-gray-400">
                          {h.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Smart Recommendation */}
            <div className="space-y-4 pt-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[14px]">
                  <Sparkles size={16} className="animate-pulse" />
                  Smart Recommendation: Have experience on a past project?
                </span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Type to search past or ongoing projects..."
                  value={searchHistoryQuery}
                  onChange={(e) => {
                    setSearchHistoryQuery(e.target.value);
                    setIsHistoryDropdownOpen(true);
                  }}
                  onFocus={() => setIsHistoryDropdownOpen(true)}
                  className={`${inputClasses} pl-11 pr-10`}
                />
                {searchHistoryQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchHistoryQuery("");
                      setSelectedHistoryProjectId("");
                      setIsHistoryDropdownOpen(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}

                {isHistoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsHistoryDropdownOpen(false)}
                    />
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredHistoryProjects.length === 0 ? (
                        <div className="p-4 text-[13px] text-gray-500 dark:text-gray-400 text-center">
                          No matching projects found.
                        </div>
                      ) : (
                        filteredHistoryProjects.map((p) => {
                          const statusText = p.projectStatus === 1 ? "Scheduled" : p.projectStatus === 2 ? "Running" : "Completed";
                          const statusColor = p.projectStatus === 3
                            ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border-gray-500/20"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20";
                          return (
                            <button
                              key={p.projectId}
                              type="button"
                              onClick={() => {
                                setSelectedSkillIds(p.requiredSkillIds || []);
                                setSelectedHistoryProjectId(String(p.projectId));
                                setSearchHistoryQuery(p.projectName);
                                setIsHistoryDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/[0.05] last:border-b-0 flex justify-between items-center transition-colors duration-150"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[13px] font-bold text-gray-900 dark:text-white">{p.projectName}</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">{p.clientOrganization || "In-House"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                                  {statusText}
                                </span>
                                <span className="text-[11px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">
                                  {(p.requiredSkillIds || []).length} skills
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {selectedHistoryProjectId && (
                <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15 p-4 rounded-2xl flex justify-between items-center gap-4 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                        Loaded tech stack from <span className="font-bold">"{searchHistoryQuery}"</span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Auto-populated {selectedSkillIds.length} skill(s) as a template. You can still modify individual checkboxes below!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryProjectId("");
                      setSearchHistoryQuery("");
                      setSelectedSkillIds([]);
                    }}
                    className="text-[12px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    Clear Template
                  </button>
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <label className={labelClasses}>Project-Level Required Skills</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {formOptions.skills.map((skill: SkillOption) => (
                  <label
                    key={skill.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedSkillIds.includes(skill.id)
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400"
                      : "bg-gray-50 dark:bg-[#1b202e] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-500/30"
                      }`}
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={(e) => {
                          setSelectedSkillIds(prev =>
                            e.target.checked ? [...prev, skill.id] : prev.filter(id => id !== skill.id)
                          );
                        }}
                        className="peer h-4 w-4 appearance-none rounded border border-current checked:bg-current transition-all"
                      />
                      <Check className="absolute h-3 w-3 text-white dark:text-[#1c1c1f] opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none stroke-[4]" />
                    </div>
                    <span className="text-[13px] font-medium">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Team Roles */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                        <Users size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <label className="text-[15px] font-bold text-gray-900 dark:text-white">
                        Required Team Roles <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${isTechRoleLimitReached
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/25'
                      }`}>
                      {technicalRolesCount}/{MAX_TECHNICAL_ROLES} Technical Roles
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddRole('Non-Dedicated')}
                      disabled={isTechRoleLimitReached || availableRolesForNew.length === 0}
                      className={`flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-xl border transition-all ${isTechRoleLimitReached || availableRolesForNew.length === 0
                        ? 'text-gray-400 dark:text-gray-600 border-gray-200 dark:border-white/5 cursor-not-allowed opacity-50'
                        : 'text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 hover:bg-violet-50 dark:hover:bg-violet-500/10'
                        }`}
                    >
                      <Plus size={15} /> Non-Dedicated
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddRole('Dedicated')}
                      disabled={isTechRoleLimitReached || availableRolesForNew.length === 0}
                      className={`flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-xl border transition-all ${isTechRoleLimitReached || availableRolesForNew.length === 0
                        ? 'text-gray-400 dark:text-gray-600 border-gray-200 dark:border-white/5 cursor-not-allowed opacity-50'
                        : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                        }`}
                    >
                      <Plus size={15} /> Add Role
                    </button>
                  </div>
                </div>

                {isTechRoleLimitReached && (
                  <div className="flex items-center gap-2 text-[12px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 px-3 py-2 rounded-xl">
                    <ShieldAlert size={14} />
                    Maximum {MAX_TECHNICAL_ROLES} technical roles reached. Remove an existing role to add a new one.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {teamRoles.map((roleItem, index) => (
                  <div
                    key={roleItem.id}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-2xl border transition-all ${index === 0
                      ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10'
                      : roleItem.workingType === 'Non-Dedicated'
                        ? 'bg-violet-50/50 dark:bg-violet-500/5 border-violet-100 dark:border-violet-500/10'
                        : 'bg-gray-50/50 dark:bg-gray-500/5 border-gray-100 dark:border-gray-500/10'
                      }`}
                  >
                    <div className="md:col-span-5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className="text-[11px] text-gray-400 font-bold uppercase block">Role</label>
                        {index === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">FIXED</span>
                        )}
                        {roleItem.workingType === 'Non-Dedicated' && index !== 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">SHARED</span>
                        )}
                      </div>
                      <select
                        className={inputClasses}
                        value={roleItem.role}
                        onChange={(e) => updateRole(roleItem.id, 'role', e.target.value)}
                        disabled={index === 0}
                      >
                        {index === 0 ? <option value="PM">Project Manager</option> : (
                          getAvailableRolesForRow(roleItem.role)
                            .map(role => <option key={role} value={role}>{role}</option>)
                        )}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] text-gray-400 font-bold uppercase mb-1.5 block text-center">Count</label>
                      <input
                        type="number"
                        value={roleItem.count}
                        onChange={(e) => updateRole(roleItem.id, 'count', parseInt(e.target.value) || 1)}
                        min={1}
                        className={`${inputClasses} text-center`}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="text-[11px] text-gray-400 font-bold uppercase mb-1.5 block">Type</label>
                      <select
                        className={inputClasses}
                        value={roleItem.workingType}
                        onChange={(e) => updateRole(roleItem.id, 'workingType', e.target.value)}
                      >
                        {ALLOWED_WORKING_TYPES.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-1 flex justify-center pb-0.5">
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(roleItem.id)}
                          className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Remove this role"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <label className={labelClasses}>Additional Notes</label>
              <textarea
                placeholder="Any special requirements or notes for HR..."
                className={`${inputClasses} min-h-[80px] resize-y`}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-white/5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-[15px] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Submit Project Proposal
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-8 py-3 rounded-xl font-bold text-[15px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setIsConfirmModalOpen(false)}>
          <div className="bg-white dark:bg-[#1a1c24] rounded-[2rem] p-10 border border-gray-200 dark:border-white/10 shadow-2xl max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400">
                <Check size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-[26px] font-bold text-gray-900 dark:text-white leading-tight">Confirm Proposal</h3>
            </div>

            <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              Please double-check the project scope and team requirements before sending it for approval.
            </p>

            {missingRoles.length > 0 && (
              <div className="mb-8 p-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-bold text-[14px] mb-2 px-1">
                  <AlertCircle size={18} />
                  Role Warnings
                </div>
                <p className="text-[13px] text-amber-600/80 dark:text-amber-400/70 leading-relaxed px-1">
                  Your project currently lacks the following core roles. This may slow down the approval process:
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                  {missingRoles.map(role => (
                    <span key={role} className="px-3 py-1 bg-white dark:bg-amber-500/20 rounded-lg text-[12px] font-semibold text-amber-700 dark:text-amber-400 shadow-sm border border-amber-100 dark:border-transparent">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-5 mb-10">
              <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest pt-1">General Info</div>
                <div className="text-right max-w-[240px]">
                  <div className="text-[16px] font-bold text-gray-900 dark:text-white break-words">{projectName}</div>
                  <div className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{clientOrganization}</div>
                </div>
              </div>

              <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest pt-1">Timeline</div>
                <div className="text-right">
                  <div className="text-[15px] font-bold text-gray-900 dark:text-white">
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="mx-2 text-gray-300">→</span>
                    {endDateDetails.date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">approx. {durationWeeks} weeks</div>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest pt-1">Priority</div>
                <div>
                  <span className={`px-4 py-1 rounded-full text-[12px] font-bold border ${priorityLevel === 'High'
                    ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                    : priorityLevel === 'Medium'
                      ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    }`}>
                    {priorityLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-4 rounded-2xl font-bold text-[15px] transition-all shadow-xl shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                Confirm Proposal
              </button>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 py-4 rounded-2xl font-bold text-[15px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1c1c1f] rounded-3xl p-10 border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col items-center max-w-sm w-full">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Check size={40} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Project Proposal Sent!</h3>
            <p className="text-gray-500 text-center text-[14px] mb-8">Your request has been submitted to the General Manager for review.</p>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-[13px] bg-blue-50 dark:bg-blue-500/10 px-6 py-2.5 rounded-full">
              <Loader2 size={16} className="animate-spin" />
              Returning to Dashboard
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
