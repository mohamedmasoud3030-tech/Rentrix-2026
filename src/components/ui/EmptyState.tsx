import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200/80 bg-white/55 px-6 py-12 text-center shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/45">
      {Icon && (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-slate-400 shadow-brand dark:bg-slate-900 dark:text-slate-500">
          <Icon size={24} />
        </div>
      )}
      <h3 className="mt-5 text-lg font-black text-slate-700 dark:text-slate-100">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
};

export default EmptyState;
