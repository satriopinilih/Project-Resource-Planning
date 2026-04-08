'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(authUser);
      if (user.roles?.includes('GM')) {
        router.push('/dashboard/gm');
      } else if (user.roles?.includes('HR')) {
        router.push('/dashboard/hr');
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
