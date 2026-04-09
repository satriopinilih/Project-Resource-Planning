'use client';

import React, { useEffect, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { getPrimaryRole, getSessionUser } from '@/lib/auth';
import GmSettingsPage from '@/app/dashboard/gm/settings/page';

type Role = 'GM' | 'HR' | 'PM' | 'Marketing' | 'Staff' | null;

export default function SettingsPage() {
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    const user = getSessionUser();
    setRole(getPrimaryRole(user?.roles ?? []));
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <AppSidebar role={role} />
      <div className="flex-1 ml-64">
        {/* All roles get the same settings page for now */}
        <GmSettingsPage />
      </div>
    </div>
  );
}
