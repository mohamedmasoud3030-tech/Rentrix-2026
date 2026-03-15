import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  children,
  eyebrow = 'مساحة عمل مؤسسية',
}) => {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200/85 bg-white/94 px-4 py-4 shadow-brand backdrop-blur-xl dark:border-slate-800/85 dark:bg-slate-900/90 sm:px-5 sm:py-5">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_66%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_66%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-50/95 via-white/35 to-transparent dark:from-white/[0.04]" />

      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em] text-slate-500 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15">
              {icon || <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span>{eyebrow}</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-[1.7rem] font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[2rem]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-4xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400 sm:text-[0.95rem]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {children ? (
          <div className="justify-self-start xl:justify-self-end">
            <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200/80 bg-slate-50/92 p-2 shadow-sm backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/60">
              {children}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PageHeader;
