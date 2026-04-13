'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryRole, getSessionUser, SessionUser } from '@/lib/auth';
import AddProjectMarketing from '../mrkt/add-project/page';

export default function AddProjectDispatcher() {
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
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Right now only Marketing has a specific Add Project page refactored
  if (role === 'Marketing' || role === 'GM' || role === 'PM') {
    return <AddProjectMarketing />;
  }

  return (
    <div className="p-8 text-center text-gray-500">
      You do not have permission to add projects or this feature is not available for your role ({role}).
    </div>
  );
}
