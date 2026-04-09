'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import GmSidebar from '@/app/dashboard/gm/components/Sidebar';
import GmHeader from '@/app/dashboard/gm/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { getEmployees, seedBackendData } from '@/lib/api';
import { Employee } from '@/lib/types';
import { getPrimaryRole, getSessionUser } from '@/lib/auth';

export default function TeamMembersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'GM' | 'HR' | 'PM' | 'Marketing' | 'Staff' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const user = getSessionUser();
        const currentRole = getPrimaryRole(user?.roles ?? []);
        setRole(currentRole);

        setError(null);
        await seedBackendData();
        const data = await getEmployees();
        setEmployees(data);
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

  const selectedEmployee = selectedMember 
    ? employees.find(e => e.id === selectedMember)
    : null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className={role === 'GM' ? 'flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300' : 'flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors'}>
      {role === 'GM' ? <GmSidebar /> : <Sidebar />}
      
      <div className={role === 'GM' ? 'flex-1 ml-[290px] flex flex-col min-h-screen' : 'flex-1 flex flex-col'}>
        {role === 'GM' ? <GmHeader title="Team Members" /> : <Header />}
        
        <main className="flex-1 p-8">
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
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Members</h1>
          </div>

          <div className="flex gap-6">
            {/* Team Members List */}
            <div className="w-96">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{employees.length} Total</span>
                </div>

                <div className="space-y-3">
                  {employees.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => setSelectedMember(employee.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedMember === employee.id
                          ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {getInitials(employee.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">{employee.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{employee.role}</div>
                          {employee.experience && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Exp: {employee.experience}</div>
                          )}
                          <div className="mt-2">
                            <StatusBadge status={employee.contractStatus} size="sm" />
                          </div>
                          {employee.contractStatus === 'Expiring Soon' && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600 dark:text-yellow-500">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>{employee.daysRemaining} days left</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Member Details */}
            <div className="flex-1">
              {selectedEmployee ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                  {/* Header with Avatar and Level */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {getInitials(selectedEmployee.name)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedEmployee.name}</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedEmployee.role}</p>
                      </div>
                    </div>
                    {selectedEmployee.level && (
                      <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-sm font-semibold rounded-full flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Level {selectedEmployee.level}
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contract Information */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contract Information</h3>
                      <StatusBadge status={selectedEmployee.contractStatus} size="sm" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Contract Start
                        </div>
                        <div className="text-gray-900 dark:text-white font-medium">{selectedEmployee.contractStart}</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Contract End
                        </div>
                        <div className="text-gray-900 dark:text-white font-medium">{selectedEmployee.contractEnd}</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Duration: 18 months
                        </div>
                      </div>
                    </div>

                    {selectedEmployee.contractStatus === 'Expiring Soon' && (
                      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 italic">
                        Only GM can request contract extensions
                      </div>
                    )}
                  </div>

                  {/* Contract Extension Requests */}
                  {selectedEmployee.id === '2' && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contract Extension Requests</h3>
                      </div>
                      
                      <div className="border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Extension: 24 months</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              <div>Current End: May 31, 2026</div>
                              <div>New End: May 31, 2028</div>
                            </div>
                          </div>
                          <StatusBadge status="Pending" size="sm" />
                        </div>
                        
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Requested: Mar 15, 2026
                        </div>
                        
                        <div className="pt-3 border-t border-yellow-200 dark:border-yellow-800">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason:</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Michael Chen has been an exceptional performer and is currently assigned to critical projects. His expertise in Business Analysis and Process Modeling is vital for our upcoming Data Analytics Platform project. We strongly recommend extending his contract to ensure project continuity and maintain our high delivery standards.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resource Pipeline (Projects) */}
                  {selectedEmployee.projects && selectedEmployee.projects.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Resource Pipeline</h3>
                      <div className="space-y-3">
                        {selectedEmployee.projects.map((project) => (
                          <div
                            key={project.id}
                            className={`border rounded-lg p-4 ${
                              project.status === 'Completed'
                                ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                : project.status === 'Active'
                                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{project.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{project.client}</div>
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  project.status === 'Completed'
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    : project.status === 'Active'
                                    ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-300'
                                    : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-300'
                                }`}
                              >
                                {project.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{project.startDate} — {project.endDate}</span>
                            </div>
                            {project.startWeek && project.endWeek && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {project.startWeek} — {project.endWeek}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Availability Summary */}
                  {selectedEmployee.projects && selectedEmployee.projects.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Availability Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">{selectedEmployee.projects.length}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Projects</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                            {selectedEmployee.projects.filter(p => p.status === 'Active').length}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                            {selectedEmployee.projects.filter(p => p.status === 'Upcoming' || p.status === 'Scheduled').length}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Upcoming</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
                  <div className="text-center">
                    <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Team Member Selected</h3>
                    <p className="text-gray-600 dark:text-gray-400">Select a team member to view their details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
