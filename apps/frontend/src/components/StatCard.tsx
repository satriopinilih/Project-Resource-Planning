import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

export default function StatCard({ icon, value, label, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'text-blue-600 dark:text-blue-500',
    warning: 'text-yellow-600 dark:text-yellow-500',
    danger: 'text-red-600 dark:text-red-500',
    success: 'text-green-600 dark:text-green-500'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`${variantClasses[variant]}`}>
          {icon}
        </div>
        <div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}
