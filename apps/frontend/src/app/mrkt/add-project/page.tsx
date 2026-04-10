"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  User,
  Plus,
  Calendar as CalendarIcon,
  AlertCircle,
  Trash2
} from "lucide-react";
import { getHolidays, BackendHoliday, createProject } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AddProjectPage() {
  const [theme, setTheme] = useState("dark");
  const [holidays, setHolidays] = useState<BackendHoliday[]>([]);
  const [durationWeeks, setDurationWeeks] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>("2026-04-10");
  const [endDateDetails, setEndDateDetails] = useState<{
    date: Date | null;
    skippedHolidays: BackendHoliday[];
    totalWorkingDays: number;
  }>({ date: null, skippedHolidays: [], totalWorkingDays: 0 });

  const [projectName, setProjectName] = useState("");
  const [clientOrganization, setClientOrganization] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("Medium");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const [teamRoles, setTeamRoles] = useState([
    { id: '1', role: 'Project Manager', count: 1, workingType: 'Dedicated' }
  ]);

  const handleAddRole = () => {
    setTeamRoles([...teamRoles, {
      id: Math.random().toString(36).substring(2, 9),
      role: 'Senior BA',
      count: 1,
      workingType: 'Dedicated'
    }]);
  };

  const handleRemoveRole = (idToRemove: string) => {
    setTeamRoles(teamRoles.filter(r => r.id !== idToRemove));
  };

  const updateRole = (id: string, field: string, value: any) => {
    setTeamRoles(teamRoles.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  useEffect(() => {
    if (document.documentElement.classList.contains('light')) {
      setTheme('light');
    }

    // Fetch holidays
    getHolidays().then(setHolidays).catch(console.error);
  }, []);

  useEffect(() => {
    if (!startDate || durationWeeks <= 0) {
      setEndDateDetails({ date: null, skippedHolidays: [], totalWorkingDays: 0 });
      return;
    }

    const totalTargetWorkingDays = durationWeeks * 5;
    let current = new Date(startDate);

    // Check if start date is valid
    if (isNaN(current.getTime())) return;

    let workingDaysCount = 0;
    const skippedHolidays: BackendHoliday[] = [];

    while (workingDaysCount < totalTargetWorkingDays) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dateString = current.toISOString().split('T')[0];
      const holidayFound = holidays.find(h => {
        const hDate = new Date(h.date).toISOString().split('T')[0];
        return hDate === dateString;
      });

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

  }, [startDate, durationWeeks, holidays]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endDateDetails.date) return;

    setIsSubmitting(true);
    setError(null);

    const priorityMap: Record<string, number> = { "Low": 0, "Medium": 1, "High": 2 };
    const workingTypeMap: Record<string, number> = { "Dedicated": 0, "Part-time": 1, "Ad-hoc": 1 };

    const payload = {
      projectName,
      clientOrganization,
      projectDescription: projectDescription + (additionalNotes ? "\n\nNotes: " + additionalNotes : ""),
      estimatedDuration: durationWeeks,
      priorityLevel: priorityMap[priorityLevel] ?? 1,
      estimatedStartDate: new Date(startDate).toISOString(),
      estimatedEndDate: endDateDetails.date.toISOString(),
      requiredRoles: teamRoles.map(r => ({
        roleName: r.role,
        count: r.count,
        workingType: workingTypeMap[r.workingType] ?? 1
      }))
    };

    try {
      await createProject(payload);
      alert("Project created successfully!");
      router.push("/mrkt/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create project. Please ensure all roles are valid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-gray-50 dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClasses = "block text-[13px] font-medium text-gray-700 dark:text-gray-100 mb-2 mt-1 ml-0.5";

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      {/* Header Section */}
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">Add New Project</h1>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 cursor-pointer" /> : <Moon className="w-5 h-5 cursor-pointer" />}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Marketing Lead</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Marketing</span>
          </div>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
            <User className="text-white w-5 h-5" />
          </div>
          <div className="px-3 py-1 bg-blue-100 dark:bg-[#252c41] text-blue-700 dark:text-[#93a5e8] text-[12px] font-medium rounded-full cursor-pointer">
            Marketing
          </div>
        </div>
      </header>

      {/* Form Card */}
      <div className="bg-white dark:bg-[#242427] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300 max-w-4xl">
        <h2 className="text-[22px] font-bold text-gray-900 dark:text-white mb-8">Create New Project</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label className={labelClasses}>
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Digital Transformation Initiative"
              className={inputClasses}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          {/* Client Organization */}
          <div>
            <label className={labelClasses}>
              Client Organization <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., TechCorp Inc."
              className={inputClasses}
              value={clientOrganization}
              onChange={(e) => setClientOrganization(e.target.value)}
              required
            />
          </div>

          {/* Project Description */}
          <div>
            <label className={labelClasses}>
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Describe the project objectives and scope..."
              className={`${inputClasses} min-h-[100px] resize-y`}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              required
            />
          </div>

          {/* Duration & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>
                Estimated Duration (Weeks) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 0)}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>
                Priority Level
              </label>
              <select
                className={inputClasses}
                value={priorityLevel}
                onChange={(e) => setPriorityLevel(e.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className={labelClasses}>
              Estimated Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative max-w-md">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClasses} [&::-webkit-calendar-picker-indicator]:opacity-0`}
                required
              />
              <CalendarIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 ml-1">
              End date will be calculated based on working days and holidays
            </p>

            {/* Auto-calculated End Date Box */}
            {endDateDetails.date && (
              <div className="bg-[#f0f4ff] dark:bg-[#1a2138] border border-[#d6e4ff] dark:border-[#2f3b5e] rounded-xl p-4 mt-4 flex flex-col text-gray-900 dark:text-white transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="text-blue-600 dark:text-blue-400" />
                  <div className="text-[16px]">
                    Estimated End Date: <span className="font-semibold ml-1">
                      {endDateDetails.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="text-[13px] text-gray-600 dark:text-gray-400 ml-9 mt-1">
                  Based on {endDateDetails.totalWorkingDays} working days ({durationWeeks} weeks)
                </div>

                {endDateDetails.skippedHolidays.length > 0 && (
                  <>
                    <div className="w-full h-px bg-gray-200 dark:bg-white/10 my-3"></div>
                    <div className="ml-9">
                      <div className="flex items-center gap-2 text-[14px] font-medium text-gray-800 dark:text-gray-200">
                        <AlertCircle size={15} className="text-gray-500 dark:text-gray-400" />
                        Holidays within project timeline:
                      </div>
                      <ul className="text-[13px] text-gray-600 dark:text-gray-400 mt-2 space-y-1 ml-6 list-disc list-outside">
                        {endDateDetails.skippedHolidays.map(h => (
                          <li key={h.id}>{h.name}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Required Team Roles */}
          <div>
            <div className="flex justify-between items-center mb-4 mt-2">
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-100">
                Required Team Roles <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddRole}
                className="flex items-center gap-1.5 text-blue-600 dark:text-[#769dfa] hover:text-blue-700 dark:hover:text-[#8cb0ff] text-[13px] font-medium transition-colors bg-blue-50 dark:bg-[#202844] px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-500/20"
              >
                <Plus size={16} /> Add Role
              </button>
            </div>

            <div className="space-y-4">
              {teamRoles.map((roleItem, index) => (
                <div key={roleItem.id} className="flex items-end gap-4 relative">
                  <div className="flex-[2]">
                    {index === 0 && <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Role</div>}
                    <select
                      className={inputClasses}
                      value={roleItem.role}
                      onChange={(e) => updateRole(roleItem.id, 'role', e.target.value)}
                      disabled={index === 0} // First role always Project Manager
                    >
                      <option value="Project Manager">Project Manager</option>
                      {index !== 0 && (
                        <>
                          <option value="Senior BA">Senior BA</option>
                          <option value="Software Engineer">Software Engineer</option>
                          <option value="QA Tester">QA Tester</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="w-[100px]">
                    {index === 0 && <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 ml-1 flex justify-center">Count</div>}
                    <input
                      type="number"
                      value={roleItem.count}
                      onChange={(e) => updateRole(roleItem.id, 'count', parseInt(e.target.value) || 1)}
                      min={1}
                      className={`${inputClasses} text-center`}
                    />
                  </div>
                  <div className="flex-[2]">
                    {index === 0 && <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Working Type</div>}
                    <select
                      className={inputClasses}
                      value={roleItem.workingType}
                      onChange={(e) => updateRole(roleItem.id, 'workingType', e.target.value)}
                    >
                      <option value="Dedicated">Dedicated</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Ad-hoc">Ad-hoc</option>
                    </select>
                  </div>

                  {index !== 0 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(roleItem.id)}
                      className="h-[46px] w-[46px] flex items-center justify-center text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <div className="h-[46px] w-[46px] shrink-0 pointer-events-none opacity-0"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className={`${labelClasses} mt-4`}>
              Additional Notes
            </label>
            <textarea
              placeholder="Any additional information..."
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

          {/* Footer Actions */}
          <div className="flex gap-4 pt-6 pb-2 border-t border-gray-200 dark:border-white/5 mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#255df5] hover:bg-[#1a4de0] text-white px-6 py-2.5 rounded-xl font-medium text-[14px] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Project"
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-white dark:bg-[#343845] border border-gray-200 dark:border-transparent text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-medium text-[14px] hover:bg-gray-50 dark:hover:bg-[#3f4352] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
