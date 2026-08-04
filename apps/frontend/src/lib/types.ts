export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  status: 'Completed' | 'Running' | 'Scheduled' | 'Upcoming' | 'Hold' | 'Babysitting' | 'Warranty' | 'Deleted';
  startWeek?: string;
  endWeek?: string;
  roleInProject?: string;
  isUnread?: boolean;
  swapReason?: string;
  userProjectId?: number;
}

export interface ContractHistoryItem {
  startDate: string;
  endDate: string | null;
  role: string;
  isActive: boolean;
  duration: string;
  extendedOn: string | null;
  extendedBy: string | null;
  daysUntilExpiry: number | null;
}

export interface RoleHistoryItem {
  roleName: string;
  startDate: string;
  endDate: string | null;
  isCurrentRole: boolean;
  duration: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  employmentType: 'Permanent' | 'Professional Services';
  contractStart: string;
  contractEnd: string;
  contractStatus: 'Active' | 'Expiring Soon';
  daysRemaining?: number;
  experienceYears: number;
  isIntern?: boolean;
  isNotAvailableWfo?: boolean;
  skills?: string[];
  projects?: Project[];
  contractHistory?: ContractHistoryItem[];
  roleHistories?: RoleHistoryItem[];
}

export interface ContractExtensionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  requestedBy?: string;
  requestedByName?: string;
  role: string;
  currentEndDate: string;
  requestedNewEndDate: string;
  extensionDuration: string;
  requestedOn: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined';
  reviewedDate?: string;
}

export interface RequestHistoryItem {
  requestType: 'Contract Extension' | 'Hire New Person';
  referenceId: string;
  employeeId: string;
  employeeName: string;
  staffRole: string;
  extension: string;
  projectName?: string;
  reason?: string;
  reviewNote?: string;
  requestedDate: string;
  status: string;
  reviewedDate?: string;
}
