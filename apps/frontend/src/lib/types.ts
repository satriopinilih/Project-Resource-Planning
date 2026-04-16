export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  status: 'Completed' | 'Active' | 'Scheduled' | 'Upcoming';
  startWeek?: string;
  endWeek?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  employmentType: 'Permanent' | 'Contract';
  contractStart: string;
  contractEnd: string;
  contractStatus: 'Active' | 'Expiring Soon';
  daysRemaining?: number;
  experienceYears: number;
  skills?: string[];
  projects?: Project[];
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
  requestedDate: string;
  status: string;
  reviewedDate?: string;
  reason?: string;
  declineReason?: string;
}
