import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon, children, eyebrow = 'مساحة عمل مؤسسية' }) => {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white/72 px-4 py-3.5 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/55">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-[10px] font-extrabold text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15">
              {icon || <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span>{eyebrow}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 lg:text-[1.55rem]">{title}</h1>
            {description ? <p className="max-w-4xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
        </div>

        {children ? <div className="erp-inline-actions self-start lg:self-auto">{children}</div> : null}
      </div>
    </div>
  );
};

export default PageHeader;
