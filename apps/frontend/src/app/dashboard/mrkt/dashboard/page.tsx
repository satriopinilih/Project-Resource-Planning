"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Folder,
  Clock,
  TrendingUp,
  CheckCircle2,
  LayoutDashboard,
  Calendar,
  Sun,
  Moon,
  User,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { getProjects, BackendProject } from "@/lib/api";

export default function MarketingDashboard() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [theme, setTheme] = useState("dark");
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize theme based on document class
    if (document.documentElement.classList.contains('light')) {
      setTheme('light');
    }

    // Fetch live projects from backend
    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setIsLoading(false));
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

  // Compute stats
  const totalSubmitted = projects.length;
  // Based on Backend enum: 0 = Pending, 1 = Scheduled, 2 = Running, 3 = Completed
  const awaitingApproval = projects.filter(p => p.projectStatus === 0).length;
  const scheduled = projects.filter(p => p.projectStatus === 1).length;
  const running = projects.filter(p => p.projectStatus === 2).length;
  const completed = projects.filter(p => p.projectStatus === 3).length;

  return (
    <div className="min-h-screen bg-[var(--dash-bg-page)] text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      {/* Header Section */}
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">Dashboard</h1>

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

      {/* Greeting Banner */}
      <section className="mb-8 bg-white dark:bg-[#242427] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5 transition-colors duration-300">
        <h2 className="text-[26px] font-bold mb-2 text-gray-900 dark:text-white tracking-tight">Good Morning, Marketing Lead!</h2>
        <div className="flex items-center text-gray-500 dark:text-gray-400 gap-2 text-[13px]">
          <Calendar size={15} />
          <span>{currentDate}</span>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCardCustom
          label="Total Submitted"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : totalSubmitted}
          icon={LayoutDashboard}
          iconBg="bg-blue-100 dark:bg-[#2A314A]"
          iconColor="text-blue-600 dark:text-[#88a4e6]"
          valueColor="text-gray-900 dark:text-white"
        />
        <StatCardCustom
          label="Awaiting Approval"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : awaitingApproval}
          icon={Clock}
          iconBg="bg-amber-100 dark:bg-[#3a3221]"
          iconColor="text-amber-600 dark:text-yellow-500"
          valueColor="text-amber-600 dark:text-yellow-500"
        />
        <StatCardCustom
          label="Scheduled"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : scheduled}
          icon={TrendingUp}
          iconBg="bg-blue-100 dark:bg-[#262c4a]"
          iconColor="text-blue-600 dark:text-[#5c88f2]"
          valueColor="text-blue-600 dark:text-[#5c88f2]"
        />
        <StatCardCustom
          label="Running"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : running}
          icon={TrendingUp}
          iconBg="bg-emerald-100 dark:bg-[#1f362e]"
          iconColor="text-emerald-600 dark:text-emerald-500"
          valueColor="text-emerald-600 dark:text-emerald-500"
        />
        <StatCardCustom
          label="Completed"
          value={isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : completed}
          icon={CheckCircle2}
          iconBg="bg-gray-100 dark:bg-[#34353a]"
          iconColor="text-gray-600 dark:text-gray-400"
          valueColor="text-gray-900 dark:text-white"
        />
      </section>

      {/* Main Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link href="/dashboard/mrkt/add-project" className="flex items-center gap-5 bg-[#255df5] hover:bg-[#1a4de0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
          <div className="bg-white/20 p-4 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center">
            <Plus size={26} className="text-white" />
          </div>
          <div>
            <h3 className="text-[19px] font-medium text-white mb-1">Create New Project</h3>
            <p className="text-white/80 text-[13px]">Submit a new project proposal with estimated timeline</p>
          </div>
        </Link>

        <Link href="/project" className="flex items-center gap-5 bg-[#8b3df6] hover:bg-[#7b2be0] transition-colors p-7 rounded-2xl text-left group shadow-sm">
          <div className="bg-white/20 p-4 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center">
            <Folder size={26} className="text-white" />
          </div>
          <div>
            <h3 className="text-[19px] font-medium text-white mb-1">View All Projects</h3>
            <p className="text-white/80 text-[13px]">Track status of all submitted projects</p>
          </div>
        </Link>
      </section>

      {/* Recent Submissions List */}
      <section className="bg-white dark:bg-[#242427] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
        <h3 className="text-[17px] font-semibold mb-5 text-gray-900 dark:text-white">Recent Submissions</h3>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-gray-500 text-[14px]">No recent submissions found.</p>
          ) : (
            // Show the top 3 most recently created/returned projects
            projects.slice(-3).reverse().map((project) => {
              let statusLabel = "Pending";
              let statusColor = "bg-amber-100 text-amber-700 dark:bg-[#3a3221] dark:text-[#eab308]";

              if (project.projectStatus === 1) {
                statusLabel = "Scheduled";
                statusColor = "bg-blue-100 text-blue-700 dark:bg-[#262c4a] dark:text-[#608bfa]";
              } else if (project.projectStatus === 2) {
                statusLabel = "Running";
                statusColor = "bg-emerald-100 text-emerald-700 dark:bg-[#1f362e] dark:text-emerald-500";
              } else if (project.projectStatus === 3) {
                statusLabel = "Completed";
                statusColor = "bg-gray-100 text-gray-700 dark:bg-[#34353a] dark:text-gray-400";
              }

              return (
                <SubmissionItem
                  key={project.projectId}
                  title={project.projectName}
                  client={project.clientOrganization || 'In-House'}
                  date={`Start Date: ${project.estimatedStartDate ? new Date(project.estimatedStartDate).toLocaleDateString() : 'TBD'}`}
                  status={statusLabel}
                  statusColor={statusColor}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function StatCardCustom({ label, value, icon: Icon, iconBg, iconColor, valueColor }: any) {
  return (
    <div className="bg-white dark:bg-[#242427] p-5 rounded-2xl flex flex-col justify-between h-[115px] border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-start w-full">
        <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} transition-colors duration-300`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-[30px] font-medium flex items-center ${valueColor} leading-none mt-4 transition-colors duration-300`}>
        {value}
      </div>
    </div>
  );
}

function SubmissionItem({ title, client, date, status, statusColor }: any) {
  return (
    <div className="bg-gray-50 dark:bg-[#1f2433] p-5 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-white/[0.02] hover:bg-gray-100 dark:hover:bg-[#252b3d] transition-colors cursor-pointer duration-300">
      <div className="flex flex-col gap-1">
        <h4 className="font-medium text-[15px] text-gray-900 dark:text-white transition-colors duration-300">{title}</h4>
        <div className="text-[13px] text-gray-500 dark:text-[#717b96] transition-colors duration-300">{client}</div>
        <div className="text-[13px] text-gray-400 dark:text-[#55607a] transition-colors duration-300">{date}</div>
      </div>
      <div className={`px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wide ${statusColor} transition-colors duration-300`}>
        {status}
      </div>
    </div>
  );
}
