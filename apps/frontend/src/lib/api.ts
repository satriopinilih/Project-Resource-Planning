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
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      },
      cache: 'no-store'
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API_BASE_URL}. Ensure API is running.`);
  }

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
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

export async function getContractExtensionRequests(): Promise<ContractExtensionRequest[]> {
  const data = await fetchJson<BackendContractExtension[]>('/api/contractextensions');
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

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: identifier, password })
  });
}
