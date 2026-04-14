'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryRole, getSessionUser, SessionUser } from '@/lib/auth';
import StatCards from './gm/components/StatCards';
import AlertBanner from './gm/components/AlertBanner';
import ProjectTimeline from './gm/components/ProjectTimeline';
import ResourcePipeline from './gm/components/ResourcePipeline';
import EmployeeContractTable from './gm/components/EmployeeContractTable';
import HRDashboard from './hr/components/HRDashboard';
import PMDashboard from './pm/page';
import MarketingDashboard from './mrkt/page';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<ReturnType<typeof getPrimaryRole>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sessionUser = getSessionUser();
    const sessionRole = getPrimaryRole(sessionUser?.roles ?? []);

    if (!sessionUser || !sessionRole) {
      router.push('/login');
      return;
    }
    setUser(sessionUser);
    setRole(sessionRole);
    setReady(true);
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
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        <StatCards />
        <AlertBanner />
        <ProjectTimeline />
        <ResourcePipeline />
        <EmployeeContractTable />
      </div>
    );
  }

  if (role === 'HR') {
    return <HRDashboard />;
  }

  if (role === 'PM') {
    return <PMDashboard />;
  }

  if (role === 'Marketing') {
    return <MarketingDashboard />;
  }

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--dash-text-heading)]">{role} Dashboard</h1>
        <p className="text-[var(--dash-text-secondary)] mt-1">Welcome, {user.userName}. This dashboard is scoped to your role.</p>
      </div>
    </main>
  );
}
