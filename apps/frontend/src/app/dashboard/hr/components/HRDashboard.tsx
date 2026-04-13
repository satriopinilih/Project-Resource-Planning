'use client';

import React, { useEffect, useMemo, useState } from 'react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import EmployeeContractTable from '@/app/dashboard/gm/components/EmployeeContractTable';
import {
  approveContractExtension,
  HireRequest,
  createEmployee,
  declineHireRequest,
  declineContractExtension,
  fulfillHireRequest,
  getContractExtensionRequests,
  getEmployeeFormOptions,
  getHireRequests,
  getRawEmployees,
  getRequestHistory,
  startHireRequest,
  EmployeeFormOptions,
  BackendEmployee
} from '@/lib/api';
import { ContractExtensionRequest, RequestHistoryItem } from '@/lib/types';

export default function HRDashboard() {
  const [employees, setEmployees] = useState<BackendEmployee[]>([]);
  const [contractExtensionRequests, setContractExtensionRequests] = useState<ContractExtensionRequest[]>([]);
  const [hireRequests, setHireRequests] = useState<HireRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ContractExtensionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [hireEmployeeModalOpen, setHireEmployeeModalOpen] = useState(false);
  const [selectedHireRequestId, setSelectedHireRequestId] = useState<number | null>(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [hireFormError, setHireFormError] = useState<string | null>(null);
  const [showTempPassword, setShowTempPassword] = useState<string | null>(null);
  const [employeeFormOptions, setEmployeeFormOptions] = useState<EmployeeFormOptions>({ departments: [], skills: [], roles: [], staffRoles: [] });
  const [hireForm, setHireForm] = useState({
    name: '',
    role: 'Senior Dev',
    staffRoleId: 0,
    experienceLevel: '5',
    employmentType: 'Contract' as 'Contract' | 'Permanent',
    contractStart: '2026-04-10',
    contractEnd: '2026-06-25',
    skills: '',
    skillIds: [] as number[],
    email: '',
    departmentId: 0,
    roleId: 0
  });

  const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

      const [allEmployees, requests, hires, history, formOptions] = await Promise.all([
        getRawEmployees(),
        getContractExtensionRequests('Pending'),
        getHireRequests(),
        getRequestHistory('HR'),
        getEmployeeFormOptions()
      ]);

      setEmployees(allEmployees);
      setContractExtensionRequests(requests);
      setHireRequests(hires);
      setRequestHistory(history);
      setEmployeeFormOptions(formOptions);

      if (formOptions.departments.length > 0) {
        const staffRoleId = formOptions.staffRoles[0]?.id ?? 0;
        const defaultRoleId = formOptions.roles.find((r) => r.name === 'Staff')?.id ?? formOptions.roles[0]?.id ?? 0;

        setHireForm((prev) => ({
          ...prev,
          departmentId: prev.departmentId || formOptions.departments[0].id,
          staffRoleId: prev.staffRoleId || staffRoleId,
          roleId: defaultRoleId
        }));
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
    const openHire = hireRequests.filter((r) => r.status === 'Open' || r.status === 'InProgress').length;
    const pending = contractExtensionRequests.filter((r) => r.status === 'Pending').length;
    const now = new Date();
    const approvedThisMonth = requestHistory.filter((r) => {
      const approvedLike = r.status === 'Approved' || r.status === 'Completed' || r.status === 'Fulfilled';
      if (!approvedLike) return false;
      const dateToCheck = new Date(r.reviewedDate ?? r.requestedDate);
      if (Number.isNaN(dateToCheck.getTime())) return false;
      return dateToCheck.getMonth() === now.getMonth() && dateToCheck.getFullYear() === now.getFullYear();
    }).length;
    return {
      totalEmployees: employees.length,
      contractsExpiring: expiringEmployees.length,
      pendingRequests: pending,
      openHireRequests: openHire,
      approvedThisMonth
    };
  }, [employees, expiringEmployees, contractExtensionRequests, hireRequests, requestHistory]);

  const activeHireRequests = useMemo(
    () => hireRequests.filter((r) => r.status !== 'Fulfilled'),
    [hireRequests]
  );

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

  const formatDateLabel = (value?: string) => {
    if (!value || value === '-') return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const selectedHireRequest = useMemo(
    () => hireRequests.find((r) => r.hireRequestId === selectedHireRequestId) ?? null,
    [hireRequests, selectedHireRequestId]
  );

  const handleStartHireRequest = async (id: number) => {
    await startHireRequest(id);
    await loadData();
  };

  const handleFulfillHireRequest = async (id: number, hiredEmployeeName?: string) => {
    await fulfillHireRequest(id, hiredEmployeeName);
    await loadData();
  };

  const openAddEmployeeModal = (requestId: number) => {
    setSelectedHireRequestId(requestId);
    setHireEmployeeModalOpen(true);

    const selectedRequest = hireRequests.find((request) => request.hireRequestId === requestId);
    if (!selectedRequest) return;
    const matchingStaffRole = employeeFormOptions.staffRoles.find((role) => role.name === selectedRequest.roleNeeded);
    if (matchingStaffRole) {
      setHireForm((prev) => ({ ...prev, staffRoleId: matchingStaffRole.id, role: matchingStaffRole.name }));
    }
  };

  const handleAddEmployee = async () => {
    if (!hireForm.name.trim() || !hireForm.email.trim()) {
      setHireFormError('Name and email are required');
      return;
    }
    if (!hireForm.departmentId || !hireForm.roleId || !hireForm.staffRoleId) {
      setHireFormError('Role and department are required');
      return;
    }

    const start = new Date(hireForm.contractStart);
    const end = new Date(hireForm.contractEnd);
    const minContractMs = 1000 * 60 * 60 * 24 * 30 * 6;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() - start.getTime() < minContractMs) {
      setHireFormError('Contract duration must be at least 6 months');
      return;
    }

    const existingNumericIds = employees
      .map((e) => e.userId)
      .filter((id) => /^EMP\d+$/.test(id))
      .map((id) => Number(id.slice(3)));
    const nextNumber = (existingNumericIds.length ? Math.max(...existingNumericIds) : 199) + 1;
    const nextId = `EMP${String(nextNumber).padStart(3, '0')}`;

    setIsAddingEmployee(true);
    setHireFormError(null);
    try {
      const created = await createEmployee({
        userId: nextId,
        userName: hireForm.name,
        email: hireForm.email.trim().toLowerCase(),
        password: '',
        departmentId: hireForm.departmentId,
        employeeType: hireForm.employmentType === 'Contract' ? 0 : 1,
        experienceLevel: `${hireForm.experienceLevel} years`,
        contractStart: hireForm.contractStart,
        contractEnd: hireForm.contractEnd,
        skillIds: hireForm.skillIds,
        roleIds: [hireForm.roleId],
        staffRoleIds: hireForm.staffRoleId ? [hireForm.staffRoleId] : []
      });

      setShowTempPassword(created.temporaryPassword);

      if (selectedHireRequest) {
        await handleFulfillHireRequest(selectedHireRequest.hireRequestId, hireForm.name);
      }
      setHireEmployeeModalOpen(false);
      setSelectedHireRequestId(null);
      setHireForm((prev) => ({ ...prev, name: '', email: '', skills: '', skillIds: [] }));
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add employee';
      setHireFormError(msg);
      setError(msg);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const openDirectHireModal = () => {
    setSelectedHireRequestId(null);
    setHireFormError(null);
    setHireEmployeeModalOpen(true);
  };

  return (
      <div className="flex-1 flex flex-col min-h-screen">
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

          <div id="hire-requests-section" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hire Requests</h2>
              <button
                onClick={openDirectHireModal}
                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                Add New Hire
              </button>
            </div>
            {activeHireRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No hire requests</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Role Needed</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">End Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeHireRequests.map((item) => {
                      const state = item.status;
                      const statusClass =
                        state === 'Open'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : state === 'InProgress'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : state === 'Declined'
                              ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                              : 'bg-green-500/15 text-green-600 dark:text-green-400';

                      return (
                        <tr key={item.hireRequestId} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-4 px-4">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.roleNeeded}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.notes || 'No additional notes'}</p>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{item.projectName}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{formatDateLabel(item.startDate)}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{formatDateLabel(item.endDate)}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{state === 'InProgress' ? 'In Progress' : state}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {state === 'Open' && (
                                <>
                                  <button onClick={() => handleStartHireRequest(item.hireRequestId)} className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700">Start</button>
                                  <button onClick={async () => {
                                    await declineHireRequest(item.hireRequestId, 'Declined by HR');
                                    await loadData();
                                  }} className="px-3 py-1.5 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700">Decline</button>
                                </>
                              )}
                              {state === 'InProgress' && (
                                <>
                                  <button onClick={() => openAddEmployeeModal(item.hireRequestId)} className="px-3 py-1.5 text-xs font-semibold rounded bg-purple-600 text-white hover:bg-purple-700">Add Employee</button>
                                  <button onClick={async () => {
                                    await declineHireRequest(item.hireRequestId, 'Declined by HR');
                                    await loadData();
                                  }} className="px-3 py-1.5 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700">Decline</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div id="pending-contract-extension-section" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Contract Extension Requests</h2>
            {contractExtensionRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No pending extension requests</div>
            ) : contractExtensionRequests.map((request) => (
              <div key={request.id} className="border-2 border-amber-300 dark:border-yellow-600 rounded-lg p-6 bg-amber-50/70 dark:bg-yellow-900/10 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{request.employeeName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{employees.find((e) => e.userId === request.employeeId)?.role || request.role}</p>
                  </div>
                  <StatusBadge status="Pending" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current End Date</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDateLabel(employees.find((e) => e.userId === request.employeeId)?.contractEnd) || request.currentEndDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Extension Duration</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.extensionDuration}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Requested New End Date</p>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{request.requestedNewEndDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Requested On</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.requestedOn}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded-md bg-gray-100 dark:bg-slate-700/40 border border-gray-200 dark:border-slate-600/40 px-3 py-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Reason:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-100">{request.reason}</p>
                </div>

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
                    <tr key={employee.userId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.userName}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.departmentName}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{employee.contractEnd}</td>
                      <td className="py-3 px-4"><StatusBadge status="Expiring Soon" size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <EmployeeContractTable showExtensionAction={false} />

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request History</h2>
            {requestHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No request history yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Extension</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Requested Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reviewed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestHistory.map((item) => (
                      <tr key={item.referenceId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{item.requestType}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900 dark:text-white">{item.employeeName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.staffRole}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{item.extension}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{item.requestedDate}</td>
                        <td className="py-3 px-4">
                          {item.status === 'Pending' ? (
                            <StatusBadge status="Pending" size="sm" />
                          ) : item.status === 'Approved' || item.status === 'Completed' ? (
                            <StatusBadge status="Approved" size="sm" />
                          ) : (
                            <StatusBadge status="Declined" size="sm" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{item.reviewedDate ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

      <Modal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} title="Approve Contract Extension">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Employee</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedRequest?.employeeName ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Extension Duration</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedRequest?.extensionDuration ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Review Notes (Required)</p>
            <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes about your decision..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm min-h-[100px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setIsApprovalModalOpen(false); setReviewNotes(''); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button onClick={handleApprove} disabled={!reviewNotes.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Confirm Approval</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeclineModalOpen} onClose={() => setIsDeclineModalOpen(false)} title="Decline Contract Extension">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Employee</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedRequest?.employeeName ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Extension Duration</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedRequest?.extensionDuration ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Review Notes (Required)</p>
            <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes about your decision..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm min-h-[100px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setIsDeclineModalOpen(false); setReviewNotes(''); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button onClick={handleDecline} disabled={!reviewNotes.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Confirm Decline</button>
          </div>
        </div>
      </Modal>

      {hireEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-primary)] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dash-border)]">
              <h3 className="text-xl font-semibold text-[var(--dash-text-heading)]">{selectedHireRequest ? 'Add Employee from Hire Request' : 'Add New Employee'}</h3>
              <button onClick={() => setHireEmployeeModalOpen(false)} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)]">×</button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto px-6 py-4 space-y-3">
              {selectedHireRequest && (
                <>
                  <div>
                    <p className="text-sm text-[var(--dash-text-muted)]">Role Needed</p>
                    <p className="text-2xl font-semibold">{selectedHireRequest.roleNeeded}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--dash-text-muted)]">Project</p>
                    <p className="text-2xl font-semibold">{selectedHireRequest.projectName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-[var(--dash-text-muted)]">Start Date</p>
                      <p className="text-xl">{formatDateLabel(selectedHireRequest.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--dash-text-muted)]">End Date</p>
                      <p className="text-xl">{formatDateLabel(selectedHireRequest.endDate)}</p>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Name</label>
                <input value={hireForm.name} onChange={(e) => setHireForm((prev) => ({ ...prev, name: e.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm" placeholder="Enter employee name" />
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Email</label>
                <input value={hireForm.email} onChange={(e) => setHireForm((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm" placeholder="Enter employee email" />
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Role</label>
                <select
                  value={hireForm.staffRoleId}
                  onChange={(e) => {
                    const nextStaffRoleId = Number(e.target.value);
                    const selected = employeeFormOptions.staffRoles.find((r) => r.id === nextStaffRoleId);
                    setHireForm((prev) => ({ ...prev, staffRoleId: nextStaffRoleId, role: selected?.name ?? prev.role }));
                  }}
                  className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm"
                >
                  {employeeFormOptions.staffRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Experience Level</label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" min={0} step={1} value={hireForm.experienceLevel} onChange={(e) => setHireForm((prev) => ({ ...prev, experienceLevel: e.target.value }))} className="h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm" />
                  <span className="text-sm text-[var(--dash-text-secondary)]">years</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Employment Type</label>
                <select value={hireForm.employmentType} onChange={(e) => setHireForm((prev) => ({ ...prev, employmentType: e.target.value as 'Contract' | 'Permanent' }))} className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm">
                  <option value="Contract">Contract</option>
                  <option value="Permanent">Permanent</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Contract Start Date</label>
                <input type="date" value={hireForm.contractStart} onChange={(e) => setHireForm((prev) => ({ ...prev, contractStart: e.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm" />
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Contract End Date</label>
                <input type="date" value={hireForm.contractEnd} onChange={(e) => setHireForm((prev) => ({ ...prev, contractEnd: e.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm" />
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Skills</label>
                <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 py-2">
                  <div className="grid grid-cols-1 gap-1">
                    {employeeFormOptions.skills.map((skill) => (
                      <label key={skill.id} className="flex items-center gap-2 text-sm text-[var(--dash-text-primary)]">
                        <input
                          type="checkbox"
                          checked={hireForm.skillIds.includes(skill.id)}
                          onChange={(e) => {
                            setHireForm((prev) => ({
                              ...prev,
                              skillIds: e.target.checked
                                ? [...prev.skillIds, skill.id]
                                : prev.skillIds.filter((id) => id !== skill.id)
                            }));
                          }}
                        />
                        <span>{skill.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--dash-text-secondary)]">Department</label>
                <select
                  value={hireForm.departmentId}
                  onChange={(e) => setHireForm((prev) => ({ ...prev, departmentId: Number(e.target.value) }))}
                  className="mt-1 h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-input)] px-3 text-sm"
                >
                  {employeeFormOptions.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--dash-border)]">
              {hireFormError && <p className="mr-auto self-center text-xs text-red-400">{hireFormError}</p>}
              <button onClick={() => setHireEmployeeModalOpen(false)} className="h-10 rounded-lg border border-[var(--dash-border)] px-4 text-sm font-semibold">Cancel</button>
              <button onClick={handleAddEmployee} disabled={isAddingEmployee} className="h-10 rounded-lg bg-[#00b84f] px-4 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed">{isAddingEmployee ? 'Adding...' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}

      {showTempPassword && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6 text-[var(--dash-text-primary)]">
            <h3 className="text-lg font-semibold mb-2 text-[var(--dash-text-heading)]">Temporary Password Generated</h3>
            <p className="text-sm text-[var(--dash-text-secondary)] mb-3">Share this password with the new user. They must change it on first login.</p>
            <div className="rounded-lg bg-[var(--dash-bg-input)] border border-[var(--dash-border)] px-4 py-3 text-center text-xl font-bold tracking-wide">
              {showTempPassword}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowTempPassword(null)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
