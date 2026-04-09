'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

type RoleDashboardProps = {
  roleTitle: string;
  userName?: string;
};

export default function RoleDashboard({ roleTitle, userName }: RoleDashboardProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{roleTitle} Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome{userName ? `, ${userName}` : ''}. This dashboard is scoped to your role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div className="text-sm text-gray-500 dark:text-gray-400">Role</div>
              <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{roleTitle}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div className="text-sm text-gray-500 dark:text-gray-400">Access Level</div>
              <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Restricted</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div className="text-sm text-gray-500 dark:text-gray-400">Session</div>
              <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Active</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
