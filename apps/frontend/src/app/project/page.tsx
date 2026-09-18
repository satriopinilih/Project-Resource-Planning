'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryRole, getSessionUser, SessionUser } from '@/lib/auth';
import GMProjectsPage from '../dashboard/gm/projects/page';
import PMProjectsPage from '../dashboard/pm/projects/page';
import MarketingProjectsPage from '../dashboard/mrkt/projects/page';
import AppSidebar from '@/components/AppSidebar';

export default function ProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<ReturnType<typeof getPrimaryRole>>(null);
  const [ready, setReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const sessionUser = getSessionUser();
    const sessionRole = getPrimaryRole(sessionUser?.roles ?? []);
    setUser(sessionUser);
    setRole(sessionRole);
    setReady(true);

    if (!sessionUser || !sessionRole) {
      router.push('/login');
      return;
    }
    if (sessionRole !== 'GM' && sessionRole !== 'PM' && sessionRole !== 'Marketing') {
      router.push('/dashboard');
    }
  }, [router]);

  if (!ready || !user || !role) return null;

  return (
    <div className="flex min-h-screen w-full bg-[var(--dash-bg-page)] transition-colors duration-300 overflow-x-hidden">
      <AppSidebar
        role={role}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen lg:pl-64 w-full">
        {role === 'GM' && <GMProjectsPage onMenuClick={() => setIsMobileSidebarOpen(true)} />}
        {role === 'PM' && <PMProjectsPage onMenuClick={() => setIsMobileSidebarOpen(true)} />}
        {role === 'Marketing' && <MarketingProjectsPage onMenuClick={() => setIsMobileSidebarOpen(true)} />}
      </main>
    </div>
  );
}
