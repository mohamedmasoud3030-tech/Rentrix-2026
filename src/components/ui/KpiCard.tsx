import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: string;
  trendUp?: boolean;
}

const colorMap: Record<string, { bg: string; icon: string; border: string; accent: string }> = {
  blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/10', icon: 'bg-blue-500/12 text-blue-700 ring-1 ring-blue-200/70 dark:text-blue-300 dark:ring-blue-500/20', border: 'border-blue-100/70 dark:border-blue-500/20', accent: 'text-slate-900 dark:text-slate-50' },
  yellow: { bg: 'bg-amber-500/10 dark:bg-amber-500/10', icon: 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-200/70 dark:text-amber-300 dark:ring-amber-500/20', border: 'border-amber-100/70 dark:border-amber-500/20', accent: 'text-slate-900 dark:text-slate-50' },
  red: { bg: 'bg-rose-500/10 dark:bg-rose-500/10', icon: 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-200/70 dark:text-rose-300 dark:ring-rose-500/20', border: 'border-rose-100/70 dark:border-rose-500/20', accent: 'text-slate-900 dark:text-slate-50' },
  green: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/10', icon: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-200/70 dark:text-emerald-300 dark:ring-emerald-500/20', border: 'border-emerald-100/70 dark:border-emerald-500/20', accent: 'text-slate-900 dark:text-slate-50' },
  purple: { bg: 'bg-violet-500/10 dark:bg-violet-500/10', icon: 'bg-violet-500/12 text-violet-700 ring-1 ring-violet-200/70 dark:text-violet-300 dark:ring-violet-500/20', border: 'border-violet-100/70 dark:border-violet-500/20', accent: 'text-slate-900 dark:text-slate-50' },
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color = 'blue', trend, trendUp }) => {
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`relative flex min-h-[126px] flex-col gap-3 overflow-hidden rounded-[26px] border ${c.border} bg-white/88 p-4 shadow-brand backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-lg dark:bg-slate-900/86`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-slate-700/70" />
      <div className="absolute -right-6 top-2 h-24 w-24 rounded-full bg-slate-100/80 blur-2xl dark:bg-slate-800/70" />
      <div className="flex items-start justify-between">
        {icon && (
          <div className={`rounded-[16px] p-2.5 ${c.icon}`}>
            <div className="flex h-4 w-4 items-center justify-center">{icon}</div>
          </div>
        )}
        {trend && (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}>
            {trend}
          </span>
        )}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-extrabold tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
        <p className={`break-words text-[1.5rem] font-black tracking-tight sm:text-[1.65rem] ${c.accent}`}>{value}</p>
      </div>

      <div className={`absolute bottom-3 left-4 h-1.5 w-[38%] rounded-full ${c.bg.split(' ')[0]}`} />
    </div>
  );
};

export default KpiCard;
