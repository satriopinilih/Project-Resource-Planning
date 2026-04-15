"use client";

import { Suspense, useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useSearchParams } from "next/navigation";
import {
    CheckCircle2,
    AlertCircle,
    Moon,
    Sun,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { changePassword } from "@/lib/api";

interface UserProfile {
    userId: string;
    userName: string;
    email: string;
    roles: string[];
}

function GMSettingsContent() {
    const searchParams = useSearchParams();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
    const [savingPassword, setSavingPassword] = useState(false);
    const forceChange = searchParams.get("forcePasswordChange") === "1";

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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Please fill all password fields");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New password and confirmation do not match");
            return;
        }

        setSavingPassword(true);
        try {
            await changePassword(currentPassword, newPassword);
            const auth = localStorage.getItem("auth_user");
            if (auth) {
                const parsed = JSON.parse(auth);
                parsed.mustChangePassword = false;
                localStorage.setItem("auth_user", JSON.stringify(parsed));
            }
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordSuccess("Password updated successfully");
        } catch (e) {
            setPasswordError(e instanceof Error ? e.message : "Failed to change password");
        } finally {
            setSavingPassword(false);
        }
    };

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

                <div className="grid grid-cols-1 xl:grid-cols-[7fr_3fr] gap-6 mb-6">
                    {/* Appearance */}
                    <div className="bg-white dark:bg-[#292B2F] rounded-2xl shadow-sm dark:border-gray-700/50 p-6 h-full">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Appearance</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <div className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1">Theme</div>
                                <div className="text-[13px] text-gray-500 dark:text-gray-400">Switch between light and dark mode</div>
                            </div>

                            <button
                                onClick={toggleDarkMode}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-[#2c3444] hover:bg-gray-200 dark:hover:bg-[#343d4f] text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-[13px] font-semibold"
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

                        <div className="border border-gray-200 dark:border-gray-700/70 rounded-xl p-4">
                            <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-3">Current Theme Colors:</div>
                            <div className="space-y-2">
                                <ThemeColorRow label="Background" className={isDarkMode ? 'bg-[#18181b] border-gray-700' : 'bg-[#E9EEF6] border-gray-200'} />
                                <ThemeColorRow label="Card" className={isDarkMode ? 'bg-[#22252e] border-gray-700' : 'bg-white border-gray-200'} />
                                <ThemeColorRow label="Sidebar" className={isDarkMode ? 'bg-[#111318] border-gray-700' : 'bg-[#f8fafc] border-gray-200'} />
                                <ThemeColorRow label="Text" className={isDarkMode ? 'bg-[#f3f4f6] border-gray-700' : 'bg-[#111827] border-gray-200'} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#292B2F] rounded-2xl shadow-sm dark:border-gray-700/50 p-6 h-full">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Change Password</h2>
                        {forceChange && (
                            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                You must change your temporary password before using other pages.
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4 w-full">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1e2532] px-4 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1e2532] px-4 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1e2532] px-4 py-2.5 text-sm" />
                            </div>
                            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
                            {passwordSuccess && <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>}
                            <div className="flex justify-center">
                                <button type="submit" disabled={savingPassword} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                    {savingPassword ? "Saving..." : "Update Password"}
                                </button>
                            </div>
                        </form>
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

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        }>
            <GMSettingsContent />
        </Suspense>
    );
}

function ThemeColorRow({ label, className }: { label: string; className: string }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
            <span className="text-[12px] text-gray-600 dark:text-gray-300">{label}</span>
            <span className={`h-7 w-1/2 min-w-[220px] rounded-md border ${className}`} />
        </div>
    );
}
