"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  AlertCircle,
  Trash2
} from "lucide-react";
import { getHolidays, BackendHoliday, createProject } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AddProjectPage() {
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleCancel = () => {
    window.history.back();
  };

  const handleFormSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate completeness, data format, and consistency
    if (!projectName.trim() || !clientOrganization.trim() || !projectDescription.trim()) {
      setError("Please fill in all required text fields.");
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
    
    setError(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
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

  const inputClasses = "w-full bg-gray-50 dark:bg-[#1b202e] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClasses = "block text-[13px] font-medium text-gray-700 dark:text-gray-100 mb-2 mt-1 ml-0.5";

  return (
      <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      <div className="mt-2" />

      {/* Form Card */}
      <div className="bg-white dark:bg-[#242427] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300 max-w-4xl">
        <h2 className="text-[22px] font-bold text-gray-900 dark:text-white mb-8">Create New Project</h2>

        <form onSubmit={handleFormSubmitRequest} className="space-y-6">
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

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md transition-opacity">
          <div className="bg-white dark:bg-[#242427] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-[22px] font-bold text-gray-900 dark:text-white mb-2">Confirm Project Details</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">Please double-check the information below before creating the project.</p>

            <div className="space-y-4 text-[14px]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
                <span className="text-gray-500 dark:text-gray-400">Project Name</span>
                <span className="col-span-1 sm:col-span-2 font-medium text-gray-900 dark:text-white">{projectName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
                <span className="text-gray-500 dark:text-gray-400">Client Org.</span>
                <span className="col-span-1 sm:col-span-2 font-medium text-gray-900 dark:text-white">{clientOrganization}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
                <span className="text-gray-500 dark:text-gray-400">Description</span>
                <span className="col-span-1 sm:col-span-2 text-gray-900 dark:text-white whitespace-pre-wrap">{projectDescription}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
                <span className="text-gray-500 dark:text-gray-400">Timeline</span>
                <span className="col-span-1 sm:col-span-2 font-medium text-gray-900 dark:text-white">
                  {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                  {' - '} 
                  {endDateDetails.date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <div className="text-[12px] font-normal text-gray-500 mt-0.5">({durationWeeks} weeks estimation)</div>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
                <span className="text-gray-500 dark:text-gray-400">Priority</span>
                <span className="col-span-1 sm:col-span-2 text-gray-900 dark:text-white">
                  <span className={`px-2 py-1 rounded text-[12px] font-medium inline-block ${priorityLevel === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : priorityLevel === 'Medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {priorityLevel}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 pb-4">
                <span className="text-gray-500 dark:text-gray-400 mt-1">Team Roles</span>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  {teamRoles.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 p-2 px-3 rounded-lg border border-gray-100 dark:border-white/5">
                      <span className="font-medium">{r.role} <span className="text-gray-400 mx-1">x</span> {r.count}</span>
                      <span className="text-[12px] text-gray-500 dark:text-gray-400">{r.workingType}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="bg-[#255df5] hover:bg-[#1a4de0] text-white px-6 py-2.5 rounded-xl font-medium text-[14px] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-1 justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Project...
                  </>
                ) : (
                  "Confirm & Create Project"
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="bg-white dark:bg-[#343845] border border-gray-200 dark:border-transparent text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-medium text-[14px] hover:bg-gray-50 dark:hover:bg-[#3f4352] transition-colors flex-1 justify-center"
              >
                Go Back & Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#242427] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-2xl flex flex-col items-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex mx-auto items-center justify-center mb-5 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Project Created Successfully!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">Your new project has been saved to the system.</p>
            <div className="flex items-center text-[13px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-full">
              <div className="w-4 h-4 border-2 border-blue-600/30 dark:border-blue-400/30 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mr-2" />
              Redirecting to Dashboard...
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
