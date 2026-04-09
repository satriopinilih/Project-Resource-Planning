'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';
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

export default function HRDashboard() {
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
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <AppSidebar role="HR" />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <AppHeader title="HR Dashboard" role="HR" />
        <main className="flex-1 p-8">
          {isLoading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading data from backend...
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HR Management Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage employee contracts and extension requests</p>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-8">
            <StatCard value={stats.totalEmployees} label="Total Employees" icon={<span className="text-2xl">👥</span>} />
            <StatCard value={stats.contractsExpiring} label="Contracts Expiring" variant="warning" icon={<span className="text-2xl">⚠️</span>} />
            <StatCard value={stats.pendingRequests} label="Pending Requests" variant="danger" icon={<span className="text-2xl">⏳</span>} />
            <StatCard value={stats.openHireRequests} label="Open Hire Requests" icon={<span className="text-2xl">➕</span>} />
            <StatCard value={stats.approvedThisMonth} label="Approved This Month" variant="success" icon={<span className="text-2xl">✅</span>} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Contract Extension Requests</h2>
            {contractExtensionRequests.filter((r) => r.status === 'Pending').map((request) => (
              <div key={request.id} className="border-2 border-yellow-300 dark:border-yellow-600 rounded-lg p-6 bg-yellow-50/30 dark:bg-yellow-900/10 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{request.employeeName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.role}</p>
                  </div>
                  <StatusBadge status="Pending" />
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-300 mb-4">{request.reason}</p>
                <div className="flex gap-3">
                  <button onClick={() => { setSelectedRequest(request); setIsApprovalModalOpen(true); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Approve</button>
                  <button onClick={() => { setSelectedRequest(request); setIsDeclineModalOpen(true); }} className="px-4 py-2 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium">Decline</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employees with Expiring Contracts</h2>
            {expiringEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No contracts expiring within 2 months</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Contract End</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.department}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.contractEnd}</td>
                      <td className="py-3 px-4"><StatusBadge status="Expiring Soon" size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Employees</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.role}</td>
                    <td className="py-3 px-4"><StatusBadge status={employee.employmentType} size="sm" /></td>
                    <td className="py-3 px-4"><StatusBadge status={employee.contractStatus} size="sm" /></td>
                    <td className="py-3 px-4"><button onClick={() => handleViewDetail(employee)} className="text-sm text-blue-600 dark:text-blue-400">View Detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <Modal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} title="Approve Contract Extension">
        <div className="space-y-4">
          <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm min-h-[100px]" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setIsApprovalModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white rounded-lg">Confirm Approval</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeclineModalOpen} onClose={() => setIsDeclineModalOpen(false)} title="Decline Contract Extension">
        <div className="space-y-4">
          <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Reason for decline..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm min-h-[100px]" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setIsDeclineModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button onClick={handleDecline} className="px-4 py-2 bg-red-600 text-white rounded-lg">Confirm Decline</button>
          </div>
        </div>
      </Modal>

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
