import { ContractExtensionRequest, Employee, Project } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5103';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
};

export type LoginResponse = {
  token: string;
  userId: string;
  userName: string;
  email: string;
  roles: string[];
};

type BackendUserProject = {
  projectId: number;
  projectName: string;
  roleInProject: string;
  startDate: string;
  endDate: string | null;
};

type BackendUser = {
  userId: string;
  userName: string;
  email: string;
  role: string;
  departmentId: number;
  departmentName: string;
  employeeType: 'Contract' | 'Permanent';
  experienceLevel: string;
  contractStart: string;
  contractEnd: string;
  contractStatus: 'Active' | 'Expired' | 'ExpiringSoon';
  daysRemaining: number;
  skills: string[];
  roles: string[];
  projects: BackendUserProject[];
};

type BackendContractExtension = {
  contractExtensionRequestID: number;
  requestedBy: string;
  requestedByName: string;
  userId: string;
  userName: string;
  extensionDuration: number;
  reasonForExtension: string;
  createdAt: string;
  status: 'Pending' | 'Approved' | 'Declined';
};

export type BackendProject = {
  projectId: number;
  projectName: string;
  clientOrganization: string;
  projectDescription: string;
  estimatedDuration: number;
  priorityLevel: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  projectStatus: number; // 0=Pending,1=Running,2=Completed
  members: { userId: string; userName: string; role: string; staffRole: string }[];
};

export type BackendHoliday = {
  id: number;
  name: string;
  date: string;
};

export type BackendEmployee = {
  userId: string;
  userName: string;
  email: string;
  role: string;
  departmentId: number;
  departmentName: string;
  employeeType: number; // 0=Contract,1=Permanent
  experienceLevel: string;
  contractStart: string;
  contractEnd: string;
  contractStatus: number; // 0=Active,1=Expired,2=ExpiringSoon
  daysRemaining: number;
  skills: string[];
  roles: string[];
  projects: BackendUserProject[];
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const mapProject = (project: BackendUserProject): Project => ({
  id: String(project.projectId),
  name: project.projectName,
  client: 'Client',
  startDate: formatDate(project.startDate),
  endDate: project.endDate ? formatDate(project.endDate) : 'Ongoing',
  status: 'Active'
});

const mapEmployee = (user: BackendUser): Employee => {
  const contractStatus = user.contractStatus === 'ExpiringSoon' ? 'Expiring Soon' : 'Active';
  return {
    id: user.userId,
    name: user.userName,
    email: user.email,
    role: user.role || user.roles[0] || 'Staff',
    department: user.departmentName,
    employmentType: user.employeeType,
    contractStart: formatDate(user.contractStart),
    contractEnd: formatDate(user.contractEnd),
    contractStatus,
    daysRemaining: user.daysRemaining,
    experience: user.experienceLevel,
    skills: user.skills,
    projects: user.projects.map(mapProject)
  };
};

const mapContractExtension = (item: BackendContractExtension): ContractExtensionRequest => {
  const createdAt = new Date(item.createdAt);
  const requestedNewEndDate = new Date(createdAt);
  requestedNewEndDate.setMonth(requestedNewEndDate.getMonth() + item.extensionDuration);

  return {
    id: String(item.contractExtensionRequestID),
    employeeId: item.userId,
    employeeName: item.userName,
    requestedBy: item.requestedBy,
    requestedByName: item.requestedByName,
    role: 'Staff',
    currentEndDate: '-',
    requestedNewEndDate: formatDate(requestedNewEndDate.toISOString()),
    extensionDuration: `${item.extensionDuration} months`,
    requestedOn: formatDate(item.createdAt),
    reason: item.reasonForExtension,
    status: item.status,
    reviewedDate: item.status === 'Pending' ? undefined : formatDate(item.createdAt)
  };
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      },
      cache: 'no-store'
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API_BASE_URL}. Ensure API is running.`);
  }

  const contentType = res.headers.get('content-type');
  let data: any;

  if (contentType && contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || `API request failed: ${res.status}`);
    }
    data = json.data;
  } else {
    const text = await res.text();
    if (!res.ok) {
      // If it's a long error page, just show the first line or a summary
      const summary = text.split('\n')[0].substring(0, 200);
      throw new Error(summary || `API request failed: ${res.status}`);
    }
    data = text;
  }

  return data;
}

export async function seedBackendData(): Promise<void> {
  await fetchJson<string>('/api/seed', { method: 'POST' });
}

export async function getEmployees(): Promise<Employee[]> {
  const data = await fetchJson<BackendUser[]>('/api/employees');
  return data.map(mapEmployee);
}

export async function getExpiringEmployees(days = 60): Promise<Employee[]> {
  const data = await fetchJson<BackendUser[]>(`/api/employees/expiring?days=${days}`);
  return data.map(mapEmployee);
}

export async function getContractExtensionRequests(status?: 'Pending' | 'Approved' | 'Declined'): Promise<ContractExtensionRequest[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const data = await fetchJson<BackendContractExtension[]>(`/api/contractextensions${query}`);
  return data.map(mapContractExtension);
}

export async function approveContractExtension(contractExtensionRequestID: number): Promise<void> {
  await fetchJson('/api/contractextensions/approve', {
    method: 'POST',
    body: JSON.stringify({ contractExtensionRequestID })
  });
}

export async function declineContractExtension(contractExtensionRequestID: number, declineReason: string): Promise<void> {
  await fetchJson('/api/contractextensions/decline', {
    method: 'POST',
    body: JSON.stringify({ contractExtensionRequestID, declineReason })
  });
}

export async function getProjects(): Promise<BackendProject[]> {
  return fetchJson<BackendProject[]>('/api/projects');
}

export async function getPendingProjects(): Promise<BackendProject[]> {
  return fetchJson<BackendProject[]>('/api/projects?status=Pending');
}

export async function getProjectById(id: string): Promise<BackendProject> {
  return fetchJson<BackendProject>(`/api/projects/${id}`);
}

export async function getRawEmployees(): Promise<BackendEmployee[]> {
  return fetchJson<BackendEmployee[]>('/api/employees');
}

export async function createContractExtension(
  userId: string,
  extensionDuration: number,
  reasonForExtension: string
): Promise<void> {
  await fetchJson('/api/contractextensions', {
    method: 'POST',
    body: JSON.stringify({ userId, extensionDuration, reasonForExtension })
  });
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: identifier, password })
  });
}

export async function getHolidays(): Promise<BackendHoliday[]> {
  return fetchJson<BackendHoliday[]>('/api/holidays');
}
