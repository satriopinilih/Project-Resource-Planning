'use client';

import React from 'react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { Employee } from '@/lib/types';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function EmployeeDetailsModal({ isOpen, onClose, employee }: EmployeeDetailsModalProps) {
  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Details" maxWidth="lg">
      <div className="space-y-6">
        {/* Header with Avatar */}
        <div className="flex items-start gap-4 pb-4 border-b dark:border-gray-700">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {employee.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{employee.role}</p>
              </div>
              {employee.level && (
                <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-semibold rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Level {employee.level}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</div>
            <div className="text-gray-900 dark:text-white mt-1">{employee.role}</div>
          </div>
          
          {employee.department && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</div>
              <div className="text-gray-900 dark:text-white mt-1">{employee.department}</div>
            </div>
          )}

          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</div>
            <div className="text-gray-900 dark:text-white mt-1">{employee.email}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Employment Type</div>
            <div className="mt-1">
              <StatusBadge status={employee.employmentType} size="sm" />
            </div>
          </div>

          {employee.experienceYears && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience Level</div>
              <div className="text-gray-900 dark:text-white mt-1">{employee.experienceYears} years</div>
            </div>
          )}
        </div>

        {/* Skills */}
        {employee.skills && employee.skills.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</div>
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-full border border-blue-200 dark:border-blue-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contract Information */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Contract Information</h4>
            <StatusBadge status={employee.contractStatus} size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Start Date:</div>
              <div className="text-gray-900 dark:text-white font-medium">{employee.contractStart}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">End Date:</div>
              <div className="text-gray-900 dark:text-white font-medium">{employee.contractEnd}</div>
            </div>
            {employee.daysRemaining !== undefined && (
              <div>
                <div className="text-gray-500 dark:text-gray-400">Duration:</div>
                <div className="text-gray-900 dark:text-white font-medium">18 months</div>
              </div>
            )}
            <div>
              <div className="text-gray-500 dark:text-gray-400">Status:</div>
              <div className={`font-medium ${employee.contractStatus === 'Expiring Soon' ? 'text-yellow-600 dark:text-yellow-500' : 'text-green-600 dark:text-green-500'}`}>
                {employee.contractStatus}
              </div>
            </div>
          </div>
          {employee.contractStatus === 'Expiring Soon' && (
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 italic">
              Only GM can request contract extensions
            </div>
          )}
        </div>

        {/* Contract Extension Requests (if any) */}
        {employee.id === '2' && (
          <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600 p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Contract Extension Requests</h5>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Extension: 24 months</span>
                <StatusBadge status="Pending" size="sm" />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div>Current End: May 31, 2026</div>
                <div>New End: May 31, 2028</div>
                <div>Requested: Mar 15, 2026</div>
              </div>
              <div className="pt-2 border-t dark:border-gray-700">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason:</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Michael Chen has been an exceptional performer and is currently assigned to critical projects...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Assignments */}
        {employee.projects && employee.projects.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Project Assignments</h4>
            <div className="space-y-3">
              {employee.projects.map((project) => (
                <div
                  key={project.id}
                  className={`border rounded-lg p-3 ${
                    project.status === 'Completed'
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                      : project.status === 'Active'
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                      : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{project.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{project.client}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
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
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{project.startDate} — {project.endDate}</span>
                  </div>
                  {project.startWeek && project.endWeek && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {project.startWeek} — {project.endWeek}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability Summary (if projects exist) */}
        {employee.projects && employee.projects.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Availability Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{employee.projects.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Projects</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                  {employee.projects.filter(p => p.status === 'Active').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                  {employee.projects.filter(p => p.status === 'Upcoming' || p.status === 'Scheduled').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Upcoming</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
