'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryRole, getSessionUser, SessionUser } from '@/lib/auth';
import GMProjectDetailPage from '../../dashboard/gm/projects/[id]/page';
import PMProjectDetailsPage from '../../pm/projects/[id]/page';
import MarketingProjectDetailsPage from '../../mrkt/projects/[id]/page';
import GmSidebar from '../../dashboard/gm/components/Sidebar';
import AppSidebar from '@/components/AppSidebar';

export default function ProjectDetailAliasPage() {
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
      return;
    }
    if (sessionRole !== 'GM' && sessionRole !== 'PM' && sessionRole !== 'Marketing') {
      router.push('/dashboard');
    }
  }, [router]);

  if (!ready || !user || !role) return null;

  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      {role === 'GM' ? <GmSidebar /> : <AppSidebar role={role} />}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {role === 'GM' && <GMProjectDetailPage />}
        {role === 'PM' && <PMProjectDetailsPage />}
        {role === 'Marketing' && <MarketingProjectDetailsPage />}
      </main>
    </div>
  );
}
