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
    info: 'bg-blue-500/12 text-blue-700 ring-1 ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    success: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    warning: 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    danger: 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    blue: 'bg-blue-500/12 text-blue-700 ring-1 ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    emerald: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    amber: 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-700 ring-1 ring-slate-200/70 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20',
  };

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-brand backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-lg dark:border-slate-800/90 dark:bg-slate-900/88">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-slate-700/70" />
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${colorClasses[color]}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-slate-500 dark:text-slate-400">{title || label}</p>
          <p className="mt-2 break-words text-[1.65rem] font-black tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          {subtext && <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

export default SummaryStatCard;
