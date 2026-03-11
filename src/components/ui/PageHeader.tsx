import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon, children }) => {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-slate-200/70 pb-6 dark:border-slate-800/80 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3.5 py-1.5 text-[11px] font-extrabold text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15">
            {icon || <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span>لوحة تشغيل</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 lg:text-[2.15rem]">{title}</h1>
          {description && <p className="max-w-3xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-shrink-0 flex-wrap items-center gap-2 self-start lg:self-auto">{children}</div>}
    </div>
  );
};

export default PageHeader;
