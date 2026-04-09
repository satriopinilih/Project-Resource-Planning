'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryRole, getSessionUser, SessionUser } from '@/lib/auth';
import GmHeader from './gm/components/Header';
import StatCards from './gm/components/StatCards';
import AlertBanner from './gm/components/AlertBanner';
import ProjectTimeline from './gm/components/ProjectTimeline';
import ResourcePipeline from './gm/components/ResourcePipeline';
import EmployeeContractTable from './gm/components/EmployeeContractTable';
import GmSidebar from './gm/components/Sidebar';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import HRDashboard from '@/components/dashboards/HRDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<ReturnType<typeof getPrimaryRole>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sessionUser = getSessionUser();
    const sessionRole = getPrimaryRole(sessionUser?.roles ?? []);

    setUser(sessionUser);
    setRole(sessionRole);
    setReady(true);

    if (!sessionUser || !sessionRole) {
      router.push('/login');
    }
  }, [router]);

  if (!ready || !user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (role === 'GM') {
    return (
      <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
        <GmSidebar />
        <main className="flex-1 ml-[290px] flex flex-col min-h-screen">
          <GmHeader title="Dashboard" />
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            <StatCards />
            <AlertBanner />
            <ProjectTimeline />
            <ResourcePipeline />
            <EmployeeContractTable />
          </div>
        </main>
      </div>
    );
  }

  if (role === 'HR') {
    return <HRDashboard />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{role} Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome, {user.userName}. This dashboard is scoped to your role.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
