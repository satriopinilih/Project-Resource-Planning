'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import EmployeeDetailsModal from '@/components/EmployeeDetailsModal';
import {
  approveContractExtension,
  declineContractExtension,
  getContractExtensionRequests,
  getEmployees,
  getExpiringEmployees,
  seedBackendData
} from '@/lib/api';
import { ContractExtensionRequest, Employee } from '@/lib/types';

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contractExtensionRequests, setContractExtensionRequests] = useState<ContractExtensionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isEmployeeDetailsOpen, setIsEmployeeDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ContractExtensionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await seedBackendData();

      const [allEmployees, expiring, requests] = await Promise.all([
        getEmployees(),
        getExpiringEmployees(60),
        getContractExtensionRequests()
      ]);

      setEmployees(allEmployees);
      setContractExtensionRequests(requests);

      if (expiring.length > 0) {
        const expiringIds = new Set(expiring.map((e) => e.id));
        setEmployees((prev) =>
          prev.map((e) => (expiringIds.has(e.id) ? { ...e, contractStatus: 'Expiring Soon' } : e))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const expiringEmployees = useMemo(
    () => employees.filter((e) => e.daysRemaining !== undefined && e.daysRemaining <= 60),
    [employees]
  );

  const stats = useMemo(() => {
    const pending = contractExtensionRequests.filter((r) => r.status === 'Pending').length;
    const approvedThisMonth = contractExtensionRequests.filter((r) => r.status === 'Approved').length;
    return {
      totalEmployees: employees.length,
      contractsExpiring: expiringEmployees.length,
      pendingRequests: pending,
      openHireRequests: 0,
      approvedThisMonth
    };
  }, [employees, expiringEmployees, contractExtensionRequests]);

  const handleViewDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeDetailsOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await approveContractExtension(Number(selectedRequest.id));
    setIsApprovalModalOpen(false);
    setReviewNotes('');
    setSelectedRequest(null);
    await loadData();
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    await declineContractExtension(Number(selectedRequest.id), reviewNotes || 'Declined by reviewer');
    setIsDeclineModalOpen(false);
    setReviewNotes('');
    setSelectedRequest(null);
    await loadData();
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-8">
          {isLoading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading data from backend...
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error} Use `http://localhost:5103` for backend and set `NEXT_PUBLIC_API_BASE_URL` if different.
            </div>
          )}
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HR Management Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage employee contracts and extension requests</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <StatCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              value={stats.totalEmployees}
              label="Total Employees"
            />
            
            <StatCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              value={stats.contractsExpiring}
              label="Contracts Expiring"
              variant="warning"
            />
            
            <StatCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={stats.pendingRequests}
              label="Pending Requests"
              variant="danger"
            />
            
            <StatCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              }
              value={stats.openHireRequests}
              label="Open Hire Requests"
            />
            
            <StatCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={stats.approvedThisMonth}
              label="Approved This Month"
              variant="success"
            />
          </div>

          {/* Hire Requests Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hire Requests</h2>
            </div>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No hire requests
            </div>
          </div>

          {/* Pending Contract Extension Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Contract Extension Requests</h2>
            </div>

            {contractExtensionRequests.filter((r) => r.status === 'Pending').map((request) => (
              <div key={request.id} className="border-2 border-yellow-300 dark:border-yellow-600 rounded-lg p-6 bg-yellow-50/30 dark:bg-yellow-900/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{request.employeeName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.role}</p>
                  </div>
                  <StatusBadge status="Pending" />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Current End Date</div>
                    <div className="text-sm text-gray-900 dark:text-white">{request.currentEndDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Requested New End Date</div>
                    <div className="text-sm text-green-600 dark:text-green-500 font-medium">{request.requestedNewEndDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Extension Duration</div>
                    <div className="text-sm text-gray-900 dark:text-white">{request.extensionDuration}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Requested On</div>
                    <div className="text-sm text-gray-900 dark:text-white">{request.requestedOn}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason:</div>
                  <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">{request.reason}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setIsApprovalModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setIsDeclineModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Employees with Expiring Contracts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employees with Expiring Contracts</h2>
            </div>

            {expiringEmployees.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Contract End Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">{employee.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{employee.role}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.department}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.contractEnd}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status="Expiring Soon" size="sm" />
                      </td>
                      <td className="py-3 px-4 text-sm text-yellow-600 dark:text-yellow-500 font-medium">{employee.daysRemaining} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No contracts expiring within 2 months
              </div>
            )}
          </div>

          {/* All Employees Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Employees</h2>
            
            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Roles</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Status</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Showing 7 of 7 employees</div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employment Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Contract Start</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Contract End</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Contract Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{employee.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.role}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={employee.employmentType} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.contractStart}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900 dark:text-white">{employee.contractEnd}</div>
                      {employee.daysRemaining && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{employee.daysRemaining} days remaining</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={employee.contractStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewDetail(employee)}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Request History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request History</h2>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Extension</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Requested Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reviewed Date</th>
                </tr>
              </thead>
              <tbody>
                {contractExtensionRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{request.employeeName}</div>
                       <div className="text-sm text-gray-500 dark:text-gray-400">{request.role}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{request.extensionDuration}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{request.requestedOn}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={request.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{request.reviewedDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Approve Contract Extension"
      >
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee</div>
            <div className="text-gray-900 dark:text-white">{selectedRequest?.employeeName ?? '-'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Extension Duration</div>
            <div className="text-gray-900 dark:text-white">{selectedRequest?.extensionDuration ?? '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Review Notes</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setIsApprovalModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Confirm Approval
            </button>
          </div>
        </div>
      </Modal>

      {/* Decline Modal */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Decline Contract Extension"
      >
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee</div>
            <div className="text-gray-900 dark:text-white">{selectedRequest?.employeeName ?? '-'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Extension Duration</div>
            <div className="text-gray-900 dark:text-white">{selectedRequest?.extensionDuration ?? '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Decline</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Provide a reason for declining this request..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setIsDeclineModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDecline}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      </Modal>

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        isOpen={isEmployeeDetailsOpen}
        onClose={() => {
          setIsEmployeeDetailsOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />
    </div>
  );
}
