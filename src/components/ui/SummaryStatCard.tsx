import React from 'react';

interface SummaryStatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'info' | 'success' | 'warning' | 'danger' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  subtext?: string;
}

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({ label, title, value, icon, color = 'info', subtext }) => {
  const colorClasses: Record<string, string> = {
    info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    slate: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20',
  };

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/94 p-4 shadow-brand backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-lg dark:border-slate-800/90 dark:bg-slate-900/92">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700/70" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold tracking-[0.14em] text-slate-500 dark:text-slate-400">{title || label}</p>
          <p className="mt-2 break-words text-[1.4rem] font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[1.55rem]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${colorClasses[color]}`}>{icon}</div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span
          className={`h-2 w-2 rounded-full ${
            color === 'rose'
              ? 'bg-rose-500'
              : color === 'amber'
                ? 'bg-amber-500'
                : color === 'emerald' || color === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-sky-500'
          }`}
        />
        <span>{subtext || 'مؤشر تشغيلي مباشر'}</span>
      </div>
    </div>
  );
};

export default SummaryStatCard;
