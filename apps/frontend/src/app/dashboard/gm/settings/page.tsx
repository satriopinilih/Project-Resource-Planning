"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import {
    CheckCircle2,
    AlertCircle,
    Moon,
    Sun,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface UserProfile {
    userId: string;
    userName: string;
    email: string;
    roles: string[];
}

export default function SettingsPage() {
    const { isDarkMode, toggleDarkMode } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const auth = localStorage.getItem("auth_user");
        if (auth) {
            try {
                setProfile(JSON.parse(auth));
            } catch (e) {
                console.error("Failed to parse auth user", e);
            }
        }
    }, []);

    return (
        <div className="flex flex-col min-h-screen">
        <AppHeader title="Settings" role="GM" />

            <div className="p-8 w-full space-y-8 pb-16">
                {/* Profile Information */}
                <div className="bg-white dark:bg-[#292B2F] rounded-2xl shadow-sm dark:border-gray-700 px-10 py-8 mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Profile Information</h2>

                    <div className="flex items-start gap-8">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-[#2B7FFC] flex items-center justify-center text-white flex-shrink-0 mt-1">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>

                        {/* Profile Details */}
                        <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2">Name</div>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2532] text-[14px] text-gray-900 dark:text-gray-100 rounded-lg">
                                    {profile?.userName || "General Manager"}
                                </div>
                            </div>

                            <div>
                                <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2">User ID</div>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2532] text-[14px] text-gray-900 dark:text-gray-100 rounded-lg">
                                    {profile?.userId || "GM123"}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2">Role</div>
                                <div className="inline-flex items-center justify-center px-4 py-2 bg-purple-100 dark:bg-[#3b1d5c] text-purple-700 dark:text-[#d8b4fe] text-[13px] font-medium rounded-lg">
                                    {profile?.roles?.[0] || "GM"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="bg-white dark:bg-[#292B2F] rounded-2xl shadow-sm  dark:border-gray-700/50 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Appearance</h2>

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1">Theme</div>
                            <div className="text-[13px] text-gray-500 dark:text-gray-400">Switch between light and dark mode</div>
                        </div>

                        <button
                            onClick={toggleDarkMode}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-[#2c3444] hover:bg-gray-200 dark:hover:bg-[#343d4f] text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-[13px] font-semibold"
                        >
                            {isDarkMode ? (
                                <>
                                    <Sun size={16} strokeWidth={2} />
                                    Light Mode
                                </>
                            ) : (
                                <>
                                    <Moon size={16} strokeWidth={2} />
                                    Dark Mode
                                </>
                            )}
                        </button>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700/70 rounded-xl p-6">
                        <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-4">Current Theme Colors:</div>

                        <div className="grid grid-cols-4 gap-4">
                            {/* Background Color */}
                            <div>
                                <div className={`h-12 border rounded-lg mb-3 ${isDarkMode ? 'bg-[#18181b] border-gray-700' : 'bg-[#E9EEF6] border-gray-200'
                                    }`}></div>
                                <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center">Background</div>
                            </div>

                            {/* Card Color */}
                            <div>
                                <div className={`h-12 border rounded-lg mb-3 ${isDarkMode ? 'bg-[#22252e] border-gray-700' : 'bg-white border-gray-200'
                                    }`}></div>
                                <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center">Card</div>
                            </div>

                            {/* Sidebar Color */}
                            <div>
                                <div className={`h-12 border rounded-lg mb-3 ${isDarkMode ? 'bg-[#111318] border-gray-700' : 'bg-[#f8fafc] border-gray-200'
                                    }`}></div>
                                <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center">Sidebar</div>
                            </div>

                            {/* Text Color */}
                            <div>
                                <div className={`h-12 border rounded-lg mb-3 ${isDarkMode ? 'bg-[#f3f4f6] border-gray-700' : 'bg-[#111827] border-gray-200'
                                    }`}></div>
                                <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center">Text</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Information */}
                <div className="bg-white dark:bg-[#292B2F] rounded-2xl shadow-sm  dark:border-gray-700/50 p-8">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">System Information</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2532] rounded-lg">
                            <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">Version</div>
                            <div className="text-[14px] text-gray-900 dark:text-gray-100">1.0.0</div>
                        </div>

                        <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2532] rounded-lg">
                            <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">Environment</div>
                            <div className="text-[14px] text-gray-900 dark:text-gray-100">Production</div>
                        </div>

                        <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2532] rounded-lg">
                            <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">Current Year</div>
                            <div className="text-[14px] text-gray-900 dark:text-gray-100">2026</div>
                        </div>

                        <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2532] rounded-lg">
                            <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">Storage</div>
                            <div className="text-[14px] text-gray-900 dark:text-gray-100">Local Browser</div>
                        </div>
                    </div>
                </div>
            </div >
        </div>
    );
}
