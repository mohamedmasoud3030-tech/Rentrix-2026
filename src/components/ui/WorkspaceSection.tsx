import React from 'react';

interface WorkspaceSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({
  title,
  description,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`rounded-[26px] border border-slate-200/80 bg-slate-50/72 p-4 dark:border-slate-800/80 dark:bg-slate-950/40 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
          {description ? <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
};

export default WorkspaceSection;
