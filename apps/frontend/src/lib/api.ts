import { ContractExtensionRequest, Employee, Project, RequestHistoryItem } from './types';

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
  mustChangePassword: boolean;
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
  employeeType: 'Contract' | 'Permanent' | string | number;
  experienceYears: number;
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

type BackendRequestHistoryItem = {
  requestType: 'Contract Extension' | 'Hire New Person';
  referenceId: string;
  employeeId: string;
  employeeName: string;
  staffRole: string;
  extension: string;
  requestedDate: string;
  status: string;
  reviewedDate: string | null;
};

export type BackendProjectMember = {
  userId: string;
  userName: string;
  role: string;
  staffRole: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export type BackendRequiredRole = {
  id: number;
  staffRoleId: number;
  roleName: string;
  requiredCount: number;
  workingType: string | number;
  filledCount?: number;
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
  members: BackendProjectMember[];
  requiredRoles: BackendRequiredRole[];
  requiredSkills: string[]; // Project-level skill requirements
  requiredSkillIds: number[];
  isUnread: boolean;
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
  experienceYears: number;
  contractStart: string;
  contractEnd: string;
  contractStatus: number; // 0=Active,1=Expired,2=ExpiringSoon
  daysRemaining: number;
  skills: string[];
  roles: string[];
  projects: BackendUserProject[];
};

export type LookupItem = {
  id: number;
  name: string;
};

export type EmployeeFormOptions = {
  departments: LookupItem[];
  skills: LookupItem[];
  roles: LookupItem[];
  staffRoles: LookupItem[];
};

export type HireRequest = {
  hireRequestId: number;
  requestedBy: string;
  projectId?: number;
  projectName: string;
  roleNeeded: string;
  quantity: number;
  startDate: string;
  endDate: string;
  notes: string;
  status: 'Open' | 'InProgress' | 'Fulfilled' | 'Declined';
  hiredEmployeeName?: string;
  createdAt: string;
  fulfilledAt?: string;
};

export type CreateHireRequestPayload = {
  projectId?: number;
  projectName: string;
  roleNeeded: string;
  quantity: number;
  startDate: string;
  endDate: string;
  notes: string;
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

const normalizeEmploymentType = (value: BackendUser['employeeType']): 'Contract' | 'Permanent' => {
  if (value === 1 || value === '1') return 'Permanent';
  if (value === 0 || value === '0') return 'Contract';
  const v = String(value).toLowerCase();
  if (v.includes('permanent')) return 'Permanent';
  return 'Contract';
};

const mapEmployee = (user: BackendUser): Employee => {
  const contractStatus = user.contractStatus === 'ExpiringSoon' ? 'Expiring Soon' : 'Active';
  return {
    id: user.userId,
    name: user.userName,
    email: user.email,
    role: user.role || user.roles[0] || 'Staff',
    department: user.departmentName,
    employmentType: normalizeEmploymentType(user.employeeType),
    contractStart: formatDate(user.contractStart),
    contractEnd: formatDate(user.contractEnd),
    contractStatus,
    daysRemaining: user.daysRemaining,
    experienceYears: user.experienceYears,
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

// For endpoints that return plain JSON (not wrapped in ApiResponse<T>)
async function fetchRaw<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
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

export async function createProject(projectData: any): Promise<BackendProject> {
  return fetchJson<BackendProject>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(projectData)
  });
}

export async function getProjectById(id: string): Promise<BackendProject> {
  return fetchJson<BackendProject>(`/api/projects/${id}`);
}

export async function updateProject(id: number, projectData: any): Promise<BackendProject> {
  return fetchJson<BackendProject>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(projectData)
  });
}

export type AssignMemberPayload = {
  userId: string;
  roleInProject: string;
  startDate?: string;
  endDate?: string;
};

export async function assignMemberToProject(projectId: number, payload: AssignMemberPayload): Promise<BackendProject> {
  return fetchJson<BackendProject>(`/api/projects/${projectId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function unassignMemberFromProject(projectId: number, userId: string): Promise<void> {
  await fetchJson(`/api/projects/${projectId}/assign/${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  });
}

export async function updateRoleCount(projectId: number, roleId: number, newCount: number): Promise<BackendProject> {
  return fetchJson<BackendProject>(`/api/projects/${projectId}/roles/${roleId}/count`, {
    method: 'PATCH',
    body: JSON.stringify({ newCount })
  });
}

export async function markProjectAsRead(projectId: number): Promise<void> {
  await fetchJson(`/api/projects/mark-read/${projectId}`, {
    method: 'POST'
  });
}

export async function getRawEmployees(): Promise<BackendEmployee[]> {
  return fetchJson<BackendEmployee[]>('/api/employees');
}

export async function getEmployeeFormOptions(): Promise<EmployeeFormOptions> {
  return fetchJson<EmployeeFormOptions>('/api/employees/form-options');
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

export type CreateEmployeeRequest = {
  userId: string;
  userName: string;
  email: string;
  password: string;
  departmentId: number;
  employeeType: number;
  experienceYears: number;
  contractStart: string;
  contractEnd: string;
  skillIds: number[];
  roleIds: number[];
  staffRoleIds: number[];
};

export type CreateEmployeeResult = {
  user: BackendUser;
  temporaryPassword: string;
  mustChangePassword: boolean;
};

export async function createEmployee(payload: CreateEmployeeRequest): Promise<CreateEmployeeResult> {
  return fetchJson<CreateEmployeeResult>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await fetchJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export async function forgotPassword(identifier: string): Promise<void> {
  await fetchJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier })
  });
}

export async function resetEmployeePassword(userId: string): Promise<{ temporaryPassword: string; mustChangePassword: boolean }> {
  return fetchJson<{ temporaryPassword: string; mustChangePassword: boolean }>(`/api/employees/${encodeURIComponent(userId)}/reset-password`, {
    method: 'POST'
  });
}

export async function getRequestHistory(scope = 'HR'): Promise<RequestHistoryItem[]> {
  const data = await fetchJson<BackendRequestHistoryItem[]>(`/api/requesthistory?scope=${encodeURIComponent(scope)}`);
  return data.map((item) => ({
    requestType: item.requestType,
    referenceId: item.referenceId,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    staffRole: item.staffRole,
    extension: item.extension,
    requestedDate: formatDate(item.requestedDate),
    status: item.status,
    reviewedDate: item.reviewedDate ? formatDate(item.reviewedDate) : undefined
  }));
}

export async function getHireRequests(status?: 'Open' | 'InProgress' | 'Fulfilled' | 'Declined', projectId?: number): Promise<HireRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (projectId !== undefined) params.set('projectId', String(projectId));
  const query = params.toString();
  return fetchJson<HireRequest[]>(`/api/hirerequests${query ? `?${query}` : ''}`);
}

export async function createHireRequest(payload: CreateHireRequestPayload): Promise<HireRequest> {
  return fetchJson<HireRequest>('/api/hirerequests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function createTimelineEditRequest(payload: {
  projectId: number;
  projectName: string;
  notes: string;
  currentStartDate: string;
  currentEndDate: string;
}): Promise<HireRequest> {
  return fetchJson<HireRequest>('/api/hirerequests', {
    method: 'POST',
    body: JSON.stringify({
      projectId: payload.projectId,
      projectName: payload.projectName,
      roleNeeded: 'Timeline Edit Request',
      quantity: 1,
      startDate: payload.currentStartDate,
      endDate: payload.currentEndDate,
      notes: `[TIMELINE EDIT REQUEST] ${payload.notes}`,
    } satisfies CreateHireRequestPayload)
  });
}



export async function startHireRequest(id: number): Promise<void> {
  await fetchJson(`/api/hirerequests/${id}/start`, { method: 'POST' });
}

export async function fulfillHireRequest(id: number, hiredEmployeeName?: string): Promise<void> {
  await fetchJson(`/api/hirerequests/${id}/fulfill`, {
    method: 'POST',
    body: JSON.stringify({ hiredEmployeeName })
  });
}

export async function declineHireRequest(id: number, notes?: string): Promise<void> {
  await fetchJson(`/api/hirerequests/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: identifier, password })
  });
}

export interface TimelineStats {
  total: number;
  onHold: number;
  scheduled: number;
  running: number;
  completed: number;
}

export interface TimelineItem {
  label: string;
  subLabel: string;
  id?: number;
  bars: {
    title: string;
    status: string;
    startDate: string;
    endDate: string;
    projectId?: number;
  }[];
}
export interface TimelineEditRequest {
  id: number;
  projectId: number;
  projectName: string;
  notes: string;
  currentStartDate: string;
  currentEndDate: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export async function getTimelineStats(): Promise<TimelineStats> {
  return fetchRaw<TimelineStats>('/api/timeline/stats');
}

export async function getProjectTimeline(): Promise<TimelineItem[]> {
  return fetchRaw<TimelineItem[]>('/api/timeline/projects');
}

export async function getResourceTimeline(): Promise<TimelineItem[]> {
  return fetchRaw<TimelineItem[]>('/api/timeline/resources');
}

export async function getHolidays(): Promise<BackendHoliday[]> {
  return fetchJson<BackendHoliday[]>('/api/holidays');
}

export async function getTimelineEditRequests(): Promise<TimelineEditRequest[]> {
  const allHireRequests = await getHireRequests();

  const timelineEditRequests = allHireRequests.filter(
    (req) =>
      req.roleNeeded === 'Timeline Edit Request' &&
      (req.status === 'Open' || req.status === 'InProgress')
  );

  return timelineEditRequests.map((req) => {
    let notes = req.notes;
    const prefix = '[TIMELINE EDIT REQUEST] ';
    if (notes.startsWith(prefix)) {
      notes = notes.substring(prefix.length);
    }

    return {
      id: req.hireRequestId,
      projectId: req.projectId ?? 0,
      projectName: req.projectName,
      notes: notes,
      currentStartDate: req.startDate,
      currentEndDate: req.endDate,
      status: 'pending', // ✅ always 'pending' for these filtered requests
    };
  });
}

// ── Smart Recommendation Panel Types ──

export type RecommendationCandidate = {
  userId: string;
  userName: string;
  staffRole: string;
  targetRole: string;
  experienceYears: number;
  skills: string[];
  matchedSkills: string[];
  skillMatchPercent: number;
  isAvailable: boolean;
  availabilityNote: string;
  currentProjects: string[];
};

export type RecommendationOption = {
  title: string;
  timeline: string;
  startDate: string;
  endDate: string;
  teamSize: number;
  availableNow: number;
  requiresHiring: boolean;
  hiringDetail: string;
  requiresReschedule: boolean;
  rescheduleDetail: string;
  matchScore: number;
  candidates: RecommendationCandidate[];
};

export type RecommendationRequiredRole = {
  staffRoleId: number;
  roleName: string;
  requiredCount: number;
  workingType: string;
};

export type RecommendationResponse = {
  projectId: number;
  projectName: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  requiredRoles: RecommendationRequiredRole[];
  optionA: RecommendationOption;
  optionB: RecommendationOption;
  bestOption: string;
  bestOptionReason: string;
};

export async function getProjectRecommendations(projectId: number): Promise<RecommendationResponse> {
  return fetchJson<RecommendationResponse>(`/api/recommendations/${projectId}`);
}
