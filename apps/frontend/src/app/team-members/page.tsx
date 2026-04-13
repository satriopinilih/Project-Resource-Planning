'use client';

import React, { useEffect, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';
import { getEmployees, createContractExtension, getContractExtensionRequests, resetEmployeePassword } from '@/lib/api';
import { Employee } from '@/lib/types';
import { getPrimaryRole, getSessionUser } from '@/lib/auth';
import { Loader2, X } from 'lucide-react';

export default function TeamMembersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'GM' | 'HR' | 'PM' | 'Marketing' | 'Staff' | null>(null);
  const [sessionRoles, setSessionRoles] = useState<string[]>([]);

  // Extension Modal State
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionDuration, setExtensionDuration] = useState("12");
  const [extensionReason, setExtensionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [requestedEmployeeIds, setRequestedEmployeeIds] = useState<Set<string>>(new Set());
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetTempPassword, setResetTempPassword] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const user = getSessionUser();
        const currentRole = getPrimaryRole(user?.roles ?? []);
        setRole(currentRole);
        setSessionRoles(user?.roles ?? []);

        setError(null);
        const [data, pendingRequests] = await Promise.all([
          getEmployees(),
          getContractExtensionRequests('Pending')
        ]);

        setEmployees(data);
        setRequestedEmployeeIds(new Set(pendingRequests.map((request) => request.employeeId)));
        if (data.length > 0) {
          setSelectedMember(data[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load team members');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSubmitExtension = async () => {
    if (!selectedEmployee || !extensionReason) return;
    setSubmitting(true);
    try {
      await createContractExtension(
        selectedEmployee.id,
        parseInt(extensionDuration) || 12,
        extensionReason
      );
      setRequestedEmployeeIds((prev) => new Set(prev).add(selectedEmployee.id));
      setSubmitSuccess(true);
      setTimeout(() => {
        setExtensionModalOpen(false);
        setSubmitSuccess(false);
        setExtensionReason("");
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit extension request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee) return;
    setResettingUserId(selectedEmployee.id);
    try {
      const result = await resetEmployeePassword(selectedEmployee.id);
      setResetTempPassword(result.temporaryPassword);
      setShowResetConfirmModal(false);
      setResetConfirmText('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setResettingUserId(null);
    }
  };

  const selectedEmployee = selectedMember
    ? employees.find(e => e.id === selectedMember)
    : null;
  const canResetPassword = sessionRoles.includes('HR');
  const hasPendingRequest = selectedEmployee ? requestedEmployeeIds.has(selectedEmployee.id) : false;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <AppSidebar role={role} />

      <div className="flex-1 ml-64 flex flex-col min-h-screen h-screen overflow-hidden">
        <AppHeader title="Team Members" role={role} />

        <main className="flex-1 p-6 lg:p-8 flex flex-col h-full overflow-hidden">
          {isLoading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading team members from backend...
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error} Use `http://localhost:5103` for backend and set `NEXT_PUBLIC_API_BASE_URL` if different.
            </div>
          )}

          <div className="flex gap-6 h-full min-h-0">
            {/* ── Left Panel: Team Members List ── */}
            <div className="w-[340px] flex-shrink-0 bg-[#22252e] rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
                <h2 className="text-[16px] font-semibold text-white">Team Members</h2>
                <span className="text-[12px] font-semibold bg-[#1e3a8a]/40 border border-[#1e3a8a] text-[#60a5fa] px-3 py-1 rounded-md">
                  {employees.length} Total
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedMember(employee.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${selectedMember === employee.id
                      ? 'border-[#3b82f6] bg-[#1e293b]/50 shadow-sm'
                      : 'border-transparent bg-[#1e2532] hover:bg-[#252d3d]'
                      }`}
                  >
                    <div className="font-semibold text-[15px] text-gray-100 truncate">{employee.name}</div>
                    {canResetPassword && (
                      <div className="text-[12px] text-gray-500 mt-0.5 truncate">User ID: {employee.id}</div>
                    )}
                    <div className="text-[13px] text-gray-400 mt-0.5 truncate">{employee.role}</div>
                    {employee.experienceYears && (
                      <div className="text-[12px] text-gray-500 mt-1">Exp: {employee.experienceYears} yrs</div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-block px-2.5 py-0.5 text-[11px] font-medium rounded ${(employee.daysRemaining ?? Number.MAX_SAFE_INTEGER) <= 60 && employee.employmentType !== 'Permanent' ? 'bg-[#78350f]/50 text-[#fbbf24]' : 'bg-[#064e3b]/50 text-[#34d399]'}`}>
                        {(employee.daysRemaining ?? Number.MAX_SAFE_INTEGER) <= 60 && employee.employmentType !== 'Permanent' ? 'Expiring Soon' : 'Active'}
                      </span>

                      {(employee.daysRemaining ?? Number.MAX_SAFE_INTEGER) <= 60 && employee.daysRemaining !== undefined && employee.employmentType !== 'Permanent' && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#fbbf24]">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>{employee.daysRemaining} days left</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right Panel: Member Details ── */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-2 pb-8">
              {selectedEmployee ? (
                <>
                  {/* Card 1: Header & Skills */}
                  <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg">
                          {getInitials(selectedEmployee.name)}
                        </div>
                        <div>
                          <h2 className="text-[22px] font-bold text-white">{selectedEmployee.name}</h2>
                          {canResetPassword && (
                            <p className="text-[12px] text-gray-500 mt-1">User ID: {selectedEmployee.id}</p>
                          )}
                          <p className="text-[14px] text-gray-400 mt-1">{selectedEmployee.role}</p>
                        </div>
                      </div>

                      {/* Level logic removed since it doesn't exist on Employee */}
                    </div>

                    {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                      <div>
                        <h3 className="text-[13px] font-semibold text-gray-400 mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-[#1e3a8a]/30 border border-[#1e3a8a]/50 text-[#93c5fd] text-[13px] rounded-lg"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Contract Information */}
                  <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[16px] font-bold text-white">Contract Information</h3>
                      <span className={`inline-block px-3 py-1 text-[12px] font-medium rounded-lg border ${(selectedEmployee.daysRemaining ?? Number.MAX_SAFE_INTEGER) <= 60 && selectedEmployee.employmentType !== 'Permanent' ? 'bg-[#78350f]/30 text-[#fbbf24] border-[#78350f]/50' : 'bg-[#064e3b]/30 text-[#34d399] border-[#064e3b]/50'}`}>
                        {(selectedEmployee.daysRemaining ?? Number.MAX_SAFE_INTEGER) <= 60 && selectedEmployee.employmentType !== 'Permanent' ? 'Expiring Soon' : 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-6">
                      <div>
                        <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Contract Start
                        </div>
                        <div className="text-[15px] text-white font-medium">{selectedEmployee.contractStart || 'Jan 15, 2025'}</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Contract End
                        </div>
                        <div className="text-[15px] text-white font-medium">
                          {selectedEmployee.employmentType === 'Permanent' ? '-' : (selectedEmployee.contractEnd || 'Jan 14, 2027')}
                        </div>
                      </div>
                    </div>

                    {selectedEmployee.employmentType !== 'Permanent' && (
                      <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-6">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Duration: 24 months
                      </div>
                    )}

                    {selectedEmployee.employmentType === 'Permanent' ? (
                      <div className="space-y-2">
                        <div className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-center text-[13px] font-medium text-[#34d399]">
                          Permanent Employee
                        </div>
                        {canResetPassword && (
                          <button
                            onClick={() => {
                              setShowResetConfirmModal(true);
                              setResetConfirmText('');
                            }}
                            disabled={resettingUserId === selectedEmployee.id}
                            className="w-full rounded-xl border border-amber-600 bg-amber-600/15 px-4 py-3 text-center text-[13px] font-semibold text-amber-300 hover:bg-amber-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resettingUserId === selectedEmployee.id ? 'Resetting Password...' : 'Reset Password to Default'}
                          </button>
                        )}
                      </div>
                    ) : role === 'GM' ? (
                      <>
                        <button
                          onClick={() => {
                            if (!hasPendingRequest) {
                              setExtensionModalOpen(true);
                            }
                          }}
                          disabled={hasPendingRequest}
                          className={`w-full font-bold text-[14px] py-3 rounded-xl transition-colors ${hasPendingRequest
                            ? 'bg-[#111827] text-gray-300 cursor-not-allowed border border-gray-700'
                            : 'bg-white hover:bg-gray-100 text-gray-900'
                            }`}
                        >
                          {hasPendingRequest ? 'Request Sent' : 'Request Contract Extension'}
                        </button>
                        {hasPendingRequest && (
                          <p className="mt-2 text-[12px] text-gray-400 text-center">Request has been sent to HR</p>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-center text-[13px] font-medium text-gray-300">
                          Contact GM to request contract extension
                        </div>
                        {canResetPassword && (
                          <button
                            onClick={() => {
                              setShowResetConfirmModal(true);
                              setResetConfirmText('');
                            }}
                            disabled={resettingUserId === selectedEmployee.id}
                            className="w-full rounded-xl border border-amber-600 bg-amber-600/15 px-4 py-3 text-center text-[13px] font-semibold text-amber-300 hover:bg-amber-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resettingUserId === selectedEmployee.id ? 'Resetting Password...' : 'Reset Password to Default'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 3: Resource Pipeline */}
                  {selectedEmployee.projects && selectedEmployee.projects.length > 0 && (
                    <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6">
                      <h3 className="text-[16px] font-bold text-white mb-4">Resource Pipeline</h3>
                      <div className="space-y-4">
                        {selectedEmployee.projects.map((project) => (
                          <div
                            key={project.id}
                            className="bg-[#1e2532] border border-gray-700/50 rounded-xl p-5"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-semibold text-[15px] text-white">{project.name}</div>
                                <div className="text-[13px] text-gray-400 mt-0.5">{project.client}</div>
                              </div>
                              <span className={`px-3 py-1 text-[12px] font-medium rounded-lg ${project.status === 'Completed' ? 'bg-gray-800 text-gray-300' :
                                project.status === 'Active' ? 'bg-[#064e3b]/30 text-[#34d399]' :
                                  'bg-[#1e3a8a]/30 text-[#60a5fa]'
                                }`}>
                                {project.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[13px] text-gray-400 mt-4">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{project.startDate} &rarr; {project.endDate}</span>
                            </div>

                            {project.startWeek && project.endWeek && (
                              <div className="text-[12px] text-gray-500 mt-1">
                                {project.startWeek} — {project.endWeek}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card 4: Availability Summary */}
                  {selectedEmployee.projects && selectedEmployee.projects.length > 0 && (
                    <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-6">
                      <h3 className="text-[16px] font-bold text-white mb-4">Availability Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#1e2532] border border-gray-700/30 rounded-xl p-5 text-center">
                          <div className="text-2xl font-bold text-white">{selectedEmployee.projects.length}</div>
                          <div className="text-[12px] text-gray-400 mt-1">Total Projects</div>
                        </div>

                        <div className="bg-[#064e3b]/20 border border-[#064e3b]/30 rounded-xl p-5 text-center">
                          <div className="text-2xl font-bold text-[#34d399]">
                            {selectedEmployee.projects.filter(p => p.status === 'Active').length}
                          </div>
                          <div className="text-[12px] text-[#34d399]/70 mt-1">Active</div>
                        </div>

                        <div className="bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-xl p-5 text-center">
                          <div className="text-2xl font-bold text-[#60a5fa]">
                            {selectedEmployee.projects.filter(p => p.status === 'Upcoming' || p.status === 'Scheduled').length}
                          </div>
                          <div className="text-[12px] text-[#60a5fa]/70 mt-1">Upcoming</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-[#22252e] rounded-xl border border-gray-700/50 p-12 flex flex-col items-center justify-center text-center h-full">
                  <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">No Team Member Selected</h3>
                  <p className="text-[14px] text-gray-400">Select a team member to view their details</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Extension Modal */}
      {role === 'GM' && extensionModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 text-white">
            <div className="p-7">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-[20px] font-bold">Request Contract Extension</h3>
                <button
                  onClick={() => setExtensionModalOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-[14px] text-gray-400 mb-8">Extend the contract duration for the selected employee.</p>

              {submitSuccess ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-[#10b981]/15 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[17px] font-bold text-white">Request Submitted</p>
                  <p className="text-[13px] text-gray-400 mt-1">The extension request has been sent to HR.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Employee Name */}
                  <div className="space-y-1">
                    <label className="text-[13px] text-gray-500 font-medium">Employee</label>
                    <p className="text-[16px] font-bold">{selectedEmployee.name}</p>
                  </div>

                  {/* Current End Date */}
                  <div className="space-y-1">
                    <label className="text-[13px] text-gray-500 font-medium">Current End Date</label>
                    <p className="text-[16px] font-bold">{selectedEmployee.contractEnd || 'Jan 14, 2027'}</p>
                  </div>

                  {/* Duration Input */}
                  <div className="space-y-2">
                    <label className="text-[13px] text-gray-500 font-medium">Extension Duration (months)</label>
                    <input
                      type="number"
                      value={extensionDuration}
                      onChange={(e) => setExtensionDuration(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-3 text-[15px] outline-none focus:border-gray-700 transition-colors"
                      placeholder="12"
                    />
                  </div>

                  {/* Projected New End Date */}
                  <div className="space-y-1">
                    <label className="text-[13px] text-gray-500 font-medium">New End Date</label>
                    <p className="text-[15px] font-bold text-[#10b981]">
                      {(() => {
                        const currentEnd = selectedEmployee.contractEnd ? new Date(selectedEmployee.contractEnd) : new Date("2027-01-14");
                        const duration = parseInt(extensionDuration) || 0;
                        if (!isNaN(currentEnd.getTime())) {
                          const newEnd = new Date(currentEnd);
                          newEnd.setMonth(newEnd.getMonth() + duration);
                          return newEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        }
                        return 'TBD';
                      })()}
                    </p>
                  </div>

                  {/* Reason Textarea */}
                  <div className="space-y-2">
                    <label className="text-[13px] text-gray-500 font-medium">Reason for Extension</label>
                    <textarea
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      placeholder="Explain why this contract extension is needed..."
                      rows={4}
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 text-[14px] outline-none focus:border-gray-700 transition-colors resize-none placeholder:text-gray-600"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setExtensionModalOpen(false)}
                      className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#262626] text-white font-bold text-[14px] rounded-lg transition-colors border border-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitExtension}
                      disabled={submitting || !extensionReason}
                      className="px-6 py-2.5 bg-white hover:bg-gray-200 disabled:bg-[#404040] disabled:text-[#737373] text-black font-bold text-[14px] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Submit Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {canResetPassword && showResetConfirmModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-[18px] font-bold">Confirm Password Reset</h3>
                <button
                  onClick={() => {
                    setShowResetConfirmModal(false);
                    setResetConfirmText('');
                  }}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-gray-300">
                To prevent accidental reset, type <span className="font-bold text-amber-300">Reset-Password</span> below for <span className="font-semibold">{selectedEmployee.name}</span>.
              </p>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type Reset-Password"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-amber-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowResetConfirmModal(false);
                    setResetConfirmText('');
                  }}
                  className="px-4 py-2 border border-gray-700 rounded-lg text-[13px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetConfirmText !== 'Reset-Password' || resettingUserId === selectedEmployee.id}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-black font-semibold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resettingUserId === selectedEmployee.id ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {canResetPassword && resetTempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            <div className="p-6 space-y-4">
              <h3 className="text-[18px] font-bold">Password Reset Success</h3>
              <p className="text-[13px] text-gray-300">Temporary password generated. Share this securely to the user:</p>
              <div className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-center text-[20px] font-bold tracking-wide text-amber-300">
                {resetTempPassword}
              </div>
              <p className="text-[12px] text-gray-400">User must change password on first login.</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setResetTempPassword(null)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
