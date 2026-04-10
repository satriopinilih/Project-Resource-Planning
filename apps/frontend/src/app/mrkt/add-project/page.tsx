"use client";

import React, { useState, useEffect } from "react";
import { 
  Sun,
  Moon,
  User,
  Plus,
  Calendar as CalendarIcon
} from "lucide-react";

export default function AddProjectPage() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (document.documentElement.classList.contains('light')) {
      setTheme('light');
    }
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Proceed with submission logic or navigation
    alert("Project submitted successfully!");
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
                defaultValue={4}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>
                Priority Level
              </label>
              <select className={inputClasses}>
                <option>High</option>
                <option selected>Medium</option>
                <option>Low</option>
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
                className={`${inputClasses} [&::-webkit-calendar-picker-indicator]:opacity-0`}
                required
              />
              <CalendarIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 ml-1">
              End date will be calculated based on working days and holidays
            </p>
          </div>

          {/* Required Team Roles */}
          <div>
            <div className="flex justify-between items-center mb-4 mt-2">
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-100">
                Required Team Roles <span className="text-red-500">*</span>
              </label>
              <button 
                type="button" 
                className="flex items-center gap-1.5 text-blue-600 dark:text-[#769dfa] hover:text-blue-700 dark:hover:text-[#8cb0ff] text-[13px] font-medium transition-colors bg-blue-50 dark:bg-[#202844] px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-500/20"
              >
                <Plus size={16} /> Add Role
              </button>
            </div>
            
            <div className="flex items-end gap-4">
              <div className="flex-[2]">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Role</div>
                <select className={inputClasses}>
                  <option>Senior BA</option>
                  <option>Project Manager</option>
                  <option>Software Engineer</option>
                  <option>QA Tester</option>
                </select>
              </div>
              <div className="w-[100px]">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 ml-1 flex justify-center">Count</div>
                <input 
                  type="number" 
                  defaultValue={1} 
                  min={1}
                  className={`${inputClasses} text-center`} 
                />
              </div>
              <div className="flex-[2]">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Working Type</div>
                <select className={inputClasses}>
                  <option>Dedicated</option>
                  <option>Part-time</option>
                  <option>Ad-hoc</option>
                </select>
              </div>
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
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-4 pt-6 pb-2 border-t border-gray-200 dark:border-white/5 mt-8">
             <button 
                type="submit" 
                className="bg-[#255df5] hover:bg-[#1a4de0] text-white px-6 py-2.5 rounded-xl font-medium text-[14px] transition-colors shadow-sm"
             >
                Submit Project
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
