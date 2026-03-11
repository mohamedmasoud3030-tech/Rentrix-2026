import React from 'react';

interface StatusPillProps {
  status: string;
  children: React.ReactNode;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, children }) => {
  const getClasses = () => {
    switch (status) {
      case 'ACTIVE':
      case 'PAID':
      case 'POSTED':
      case 'COMPLETED':
      case 'CLOSED':
      case 'RENTED':
        return 'border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'ENDED':
      case 'EXPIRED':
      case 'VOID':
      case 'CANCELLED':
        return 'border border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
      case 'SUSPENDED':
      case 'OPEN':
      case 'IN_PROGRESS':
      case 'PARTIALLY_PAID':
      case 'OVERDUE':
      case 'MAINTENANCE':
        return 'border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
      case 'UNPAID':
      case 'NEW':
      case 'VACANT':
        return 'border border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300';
      default:
        return 'border border-slate-200/80 bg-neutral-100 text-neutral-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm ${getClasses()}`}>{children}</span>;
};

export default StatusPill;
