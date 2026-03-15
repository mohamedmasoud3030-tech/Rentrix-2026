import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: string;
  trendUp?: boolean;
}

const colorMap: Record<string, { icon: string; dot: string; border: string; accent: string }> = {
  blue: {
    icon: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    dot: 'bg-blue-500',
    border: 'border-blue-100/80 dark:border-blue-500/20',
    accent: 'text-slate-900 dark:text-slate-50',
  },
  yellow: {
    icon: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    dot: 'bg-amber-500',
    border: 'border-amber-100/80 dark:border-amber-500/20',
    accent: 'text-slate-900 dark:text-slate-50',
  },
  red: {
    icon: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    dot: 'bg-rose-500',
    border: 'border-rose-100/80 dark:border-rose-500/20',
    accent: 'text-slate-900 dark:text-slate-50',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    dot: 'bg-emerald-500',
    border: 'border-emerald-100/80 dark:border-emerald-500/20',
    accent: 'text-slate-900 dark:text-slate-50',
  },
  purple: {
    icon: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
    dot: 'bg-violet-500',
    border: 'border-violet-100/80 dark:border-violet-500/20',
    accent: 'text-slate-900 dark:text-slate-50',
  },
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color = 'blue', trend, trendUp }) => {
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`relative flex min-h-[132px] flex-col gap-4 overflow-hidden rounded-[26px] border ${c.border} bg-white/94 p-4 shadow-brand backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-lg dark:bg-slate-900/92`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700/70" />

      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <div className={`rounded-[16px] p-2.5 ${c.icon}`}>
            <div className="flex h-4 w-4 items-center justify-center">{icon}</div>
          </div>
        ) : <span />}

        {trend ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${trendUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {trend}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
        <p className={`break-words text-[1.55rem] font-black tracking-tight sm:text-[1.72rem] ${c.accent}`}>{value}</p>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">قراءة مباشرة</span>
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
      </div>
    </div>
  );
};

export default KpiCard;
