"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  AlertCircle,
  Trash2,
  Check,
  ArrowLeft,
  Loader2
} from "lucide-react";
import {
  getHolidays,
  BackendHoliday,
  createProject,
  getEmployeeFormOptions,
  EmployeeFormOptions,
} from "@/lib/api";
import { useRouter } from "next/navigation";

interface SkillOption {
  id: number;
  name: string;
}

export default function AddProjectPage() {
  const ALLOWED_STAFF_ROLES = ["PM", "Senior Dev", "Junior Dev", "Senior BA", "Junior BA", "Architect"];
  const ALLOWED_WORKING_TYPES = ["Dedicated", "Non-Dedicated"];

  const [holidays, setHolidays] = useState<BackendHoliday[]>([]);
  const [durationWeeks, setDurationWeeks] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDateDetails, setEndDateDetails] = useState<{
    date: Date | null;
    skippedHolidays: BackendHoliday[];
    totalWorkingDays: number;
  }>({ date: null, skippedHolidays: [], totalWorkingDays: 0 });

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

  const router = useRouter();

  const [teamRoles, setTeamRoles] = useState([
    { id: '1', role: 'PM', count: 1, workingType: 'Dedicated' }
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
    getEmployeeFormOptions().then(setFormOptions).catch(console.error);
  }, []);

  const allowedStaffRoles = useMemo(
    () => formOptions.staffRoles.filter((r) => ALLOWED_STAFF_ROLES.includes(r.name)),
    [formOptions.staffRoles]
  );

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

    setError(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!endDateDetails.date) return;

    setIsSubmitting(true);
    setError(null);

    const priorityMap: Record<string, number> = { "Low": 0, "Medium": 1, "High": 2 };
    const workingTypeMap: Record<string, number> = { "Dedicated": 0, "Non-Dedicated": 1 };

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

              <div>
                <label className={labelClasses}>Client Organization <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., TechCorp Inc."
                  className={inputClasses}
                  value={clientOrganization}
                  onChange={(e) => setClientOrganization(e.target.value)}
                  required
                />
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

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-[15px] font-bold text-gray-900 dark:text-white">Required Team Roles</label>
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline text-[13px] font-semibold"
                >
                  <Plus size={16} /> Add Another Role
                </button>
              </div>

              <div className="space-y-3">
                {teamRoles.map((roleItem, index) => (
                  <div key={roleItem.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-gray-50 dark:bg-[#1b202e] rounded-2xl border border-gray-200 dark:border-white/5">
                    <div className="md:col-span-5">
                      <label className="text-[11px] text-gray-400 font-bold uppercase mb-1.5 block">Role</label>
                      <select
                        className={inputClasses}
                        value={roleItem.role}
                        onChange={(e) => updateRole(roleItem.id, 'role', e.target.value)}
                        disabled={index === 0}
                      >
                        {index === 0 ? <option value="PM">Project Manager</option> : (
                          (allowedStaffRoles.length > 0 ? allowedStaffRoles.map(r => r.name) : ALLOWED_STAFF_ROLES)
                            .filter(r => r !== "PM")
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

            {/* Smart Warnings */}
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
                  <span className={`px-4 py-1 rounded-full text-[12px] font-bold border ${
                    priorityLevel === 'High' 
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
