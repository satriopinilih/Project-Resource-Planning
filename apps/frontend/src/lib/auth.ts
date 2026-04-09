export type SessionUser = {
  userId: string;
  userName: string;
  email: string;
  roles: string[];
};

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getDashboardPathByRoles(roles: string[] = []): string {
  if (roles.includes('GM')) return '/dashboard';
  if (roles.includes('HR')) return '/dashboard';
  if (roles.includes('PM')) return '/pm/dashboard';
  if (roles.includes('Marketing')) return '/dashboard';
  if (roles.includes('Staff')) return '/dashboard';
  return '/login';
}

export function getPrimaryRole(roles: string[] = []): 'GM' | 'HR' | 'PM' | 'Marketing' | 'Staff' | null {
  if (roles.includes('GM')) return 'GM';
  if (roles.includes('HR')) return 'HR';
  if (roles.includes('PM')) return 'PM';
  if (roles.includes('Marketing')) return 'Marketing';
  if (roles.includes('Staff')) return 'Staff';
  return null;
}
