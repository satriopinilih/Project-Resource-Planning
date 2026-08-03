import React from 'react';

/**
 * InternBadge - Displays an "Intern" tag next to a junior employee's role.
 * Render this wherever employee roles are shown.
 */
interface InternBadgeProps {
  isIntern?: boolean;
  size?: 'xs' | 'sm';
}

export default function InternBadge({ isIntern, size = 'xs' }: InternBadgeProps) {
  if (!isIntern) return null;

  const sizeClass = size === 'sm'
    ? 'text-[11px] px-2 py-0.5'
    : 'text-[9px] px-1.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sizeClass} rounded-md font-bold uppercase tracking-wider bg-blue-900/50 text-blue-300 border border-blue-700/60 whitespace-nowrap`}
      title="This employee is tagged as an Intern"
    >
      Intern
    </span>
  );
}
