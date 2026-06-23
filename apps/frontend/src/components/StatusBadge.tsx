import React from 'react';

interface StatusBadgeProps {
  status: 'Active' | 'Expiring Soon' | 'Pending' | 'Approved' | 'Declined' | 'Permanent' | 'Professional Services' | 'Urgent' | 'Expired';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const variants = {
    'Active': 'bg-green-50 text-green-700 border-green-200',
    'Expiring Soon': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Pending': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Approved': 'bg-green-50 text-green-700 border-green-200',
    'Declined': 'bg-red-50 text-red-700 border-red-200',
    'Permanent': 'bg-blue-50 text-blue-700 border-blue-200',
    'Professional Services': 'bg-gray-50 text-gray-700 border-gray-200',
    'Urgent': 'bg-red-50 text-red-700 border-red-200',
    'Expired': 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${variants[status]} ${sizeClasses[size]}`}>
      {status}
    </span>
  );
}
