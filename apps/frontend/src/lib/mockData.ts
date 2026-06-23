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
  employmentType: 'Permanent' | 'Professional Services';
  contractStart: string;
  contractEnd: string;
  contractStatus: 'Active' | 'Expiring Soon';
  daysRemaining?: number;
  experience?: string;
  experienceYears?: number;
  level?: number;
  skills?: string[];
  projects?: Project[];
}

export interface ContractExtensionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  currentEndDate: string;
  requestedNewEndDate: string;
  extensionDuration: string;
  requestedOn: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined';
  reviewedDate?: string;
}

export interface HireRequest {
  id: string;
  position: string;
  department: string;
  requestedBy: string;
  requestedOn: string;
  status: 'Open' | 'In Progress' | 'Closed';
}

export const employees: Employee[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'Senior BA',
    department: 'Business Analysis',
    employmentType: 'Permanent',
    contractStart: 'Jan 15, 2025',
    contractEnd: 'Jan 14, 2027',
    contractStatus: 'Active',
    daysRemaining: 281,
    experience: '8/10',
    experienceYears: 8,
    level: 3,
    skills: ['Business Analysis', 'Requirements Gathering', 'Stakeholder Management'],
    projects: [
      {
        id: 'p1',
        name: 'Digital Transformation Initiative',
        client: 'TechCorp Inc.',
        startDate: 'Jan 6, 2026',
        endDate: 'Mar 30, 2026',
        status: 'Completed',
        startWeek: 'Week 1',
        endWeek: 'Week 13'
      }
    ]
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'Junior BA',
    department: 'Business Analysis',
    employmentType: 'Professional Services',
    contractStart: 'Mar 1, 2025',
    contractEnd: 'Aug 31, 2026',
    contractStatus: 'Active',
    daysRemaining: 145,
    experience: '3/10',
    experienceYears: 3,
    level: 3,
    skills: ['Business Analysis', 'Documentation', 'Testing'],
    projects: [
      {
        id: 'p2',
        name: 'Digital Transformation Initiative',
        client: 'TechCorp Inc.',
        startDate: 'Jan 6, 2026',
        endDate: 'Mar 30, 2026',
        status: 'Completed',
        startWeek: 'Week 1',
        endWeek: 'Week 13'
      },
      {
        id: 'p3',
        name: 'Customer Portal Development',
        client: 'RetailMax Ltd.',
        startDate: 'Apr 1, 2026',
        endDate: 'May 27, 2026',
        status: 'Active',
        startWeek: 'Week 13',
        endWeek: 'Week 21'
      }
    ]
  },
  {
    id: '3',
    name: 'Jessica Brown',
    email: 'jessica.brown@company.com',
    role: 'Senior Dev',
    department: 'Engineering',
    employmentType: 'Permanent',
    contractStart: 'Jul 1, 2024',
    contractEnd: 'Jun 30, 2026',
    contractStatus: 'Active',
    daysRemaining: 83,
    experience: '6/10',
    experienceYears: 6,
    level: 2,
    skills: ['React', 'Node.js', 'TypeScript', 'System Design'],
    projects: [
      {
        id: 'p4',
        name: 'E-commerce Platform Rebuild',
        client: 'ShopHub Co.',
        startDate: 'Feb 1, 2026',
        endDate: 'Jun 30, 2026',
        status: 'Active',
        startWeek: 'Week 5',
        endWeek: 'Week 26'
      }
    ]
  },
  {
    id: '4',
    name: 'Alex Turner',
    email: 'alex.turner@company.com',
    role: 'Architect',
    department: 'Engineering',
    employmentType: 'Permanent',
    contractStart: 'Feb 1, 2025',
    contractEnd: 'Jan 31, 2027',
    contractStatus: 'Active',
    daysRemaining: 298,
    experience: '9/10',
    experienceYears: 9,
    level: 4,
    skills: ['Solution Architecture', 'Cloud Design', 'Microservices', 'System Integration'],
    projects: [
      {
        id: 'p5',
        name: 'Cloud Migration Project',
        client: 'FinanceFirst Bank',
        startDate: 'Mar 1, 2026',
        endDate: 'Aug 31, 2026',
        status: 'Active',
        startWeek: 'Week 9',
        endWeek: 'Week 35'
      }
    ]
  },
  {
    id: '5',
    name: 'Rachel Lee',
    email: 'rachel.lee@company.com',
    role: 'Senior Dev',
    department: 'Engineering',
    employmentType: 'Professional Services',
    contractStart: 'Aug 1, 2024',
    contractEnd: 'May 6, 2026',
    contractStatus: 'Expiring Soon',
    daysRemaining: 28,
    experience: '5/10',
    experienceYears: 5,
    level: 2,
    skills: ['Python', 'Django', 'PostgreSQL', 'API Design'],
    projects: [
      {
        id: 'p6',
        name: 'Analytics Dashboard',
        client: 'DataInsights Corp.',
        startDate: 'Jan 15, 2026',
        endDate: 'Apr 30, 2026',
        status: 'Completed',
        startWeek: 'Week 3',
        endWeek: 'Week 17'
      }
    ]
  },
  {
    id: '6',
    name: 'Linda Martinez',
    email: 'linda.martinez@company.com',
    role: 'Junior Dev',
    department: 'Engineering',
    employmentType: 'Professional Services',
    contractStart: 'Oct 1, 2024',
    contractEnd: 'Sep 30, 2026',
    contractStatus: 'Active',
    daysRemaining: 175,
    experience: '2/10',
    experienceYears: 2,
    level: 1,
    skills: ['JavaScript', 'React', 'CSS', 'Git'],
    projects: [
      {
        id: 'p7',
        name: 'Internal Tools Dashboard',
        client: 'Internal',
        startDate: 'Mar 15, 2026',
        endDate: 'Jun 15, 2026',
        status: 'Active',
        startWeek: 'Week 11',
        endWeek: 'Week 24'
      }
    ]
  },
  {
    id: '7',
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'Senior BA',
    department: 'Business Analysis',
    employmentType: 'Permanent',
    contractStart: 'Sep 15, 2024',
    contractEnd: 'Sep 14, 2026',
    contractStatus: 'Active',
    daysRemaining: 159,
    experience: '7/10',
    experienceYears: 7,
    level: 3,
    skills: ['Business Analysis', 'Agile', 'Scrum', 'Product Management'],
    projects: [
      {
        id: 'p8',
        name: 'Mobile App Launch',
        client: 'TravelEase Inc.',
        startDate: 'Feb 10, 2026',
        endDate: 'May 20, 2026',
        status: 'Active',
        startWeek: 'Week 6',
        endWeek: 'Week 20'
      }
    ]
  }
];

export const contractExtensionRequests: ContractExtensionRequest[] = [
  {
    id: '1',
    employeeId: '2',
    employeeName: 'Michael Chen',
    role: 'Junior BA • Business Analysis',
    currentEndDate: 'May 31, 2026',
    requestedNewEndDate: 'May 31, 2028',
    extensionDuration: '24 months',
    requestedOn: 'Mar 15, 2026',
    reason: 'Michael Chen has been an exceptional performer and is currently assigned to critical projects. His expertise in Business Analysis and Process Modeling is vital for our upcoming Data Analytics Platform project. We strongly recommend extending his contract to ensure project continuity and maintain our high delivery standards.',
    status: 'Pending'
  }
];

export const hireRequests: HireRequest[] = [];

// Helper function to check if contract is expiring within 2 months (60 days)
export const isContractExpiringWithin2Months = (daysRemaining?: number) => {
  return daysRemaining !== undefined && daysRemaining <= 60;
};

// Calculate stats dynamically
export const calculateStats = () => {
  const contractsExpiring = employees.filter(e => isContractExpiringWithin2Months(e.daysRemaining)).length;
  const pendingRequests = contractExtensionRequests.filter(r => r.status === 'Pending').length;
  
  return {
    totalEmployees: employees.length,
    contractsExpiring,
    pendingRequests,
    openHireRequests: hireRequests.length,
    approvedThisMonth: contractExtensionRequests.filter(r => r.status === 'Approved').length
  };
};

export const stats = calculateStats();
