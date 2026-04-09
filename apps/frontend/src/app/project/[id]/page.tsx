'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryRole, getSessionUser, SessionUser } from '@/lib/auth';
import GMProjectDetailPage from '../../dashboard/gm/projects/[id]/page';
import GmSidebar from '../../dashboard/gm/components/Sidebar';

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
    if (sessionRole !== 'GM') {
      router.push('/dashboard');
    }
  }, [router]);

  if (!ready || !user || role !== 'GM') return null;

  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <GmSidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <GMProjectDetailPage />
      </main>
    </div>
  );
}
