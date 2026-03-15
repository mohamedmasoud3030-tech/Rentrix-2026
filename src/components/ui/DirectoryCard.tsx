import React from 'react';

interface DirectoryStat {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface DirectoryCardProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  actions?: React.ReactNode;
  stats?: DirectoryStat[];
  footer?: React.ReactNode;
  className?: string;
}

const toneClassMap: Record<NonNullable<DirectoryStat['tone']>, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
};

const DirectoryCard: React.FC<DirectoryCardProps> = ({
  title,
  subtitle,
  eyebrow,
  icon,
  active = false,
  onClick,
  actions,
  stats = [],
  footer,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group w-full rounded-[28px] border text-right transition-all duration-200',
        'bg-white/95 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-md',
        'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_48px_rgba(37,99,235,0.12)]',
        'dark:bg-slate-900/92 dark:hover:border-blue-500/30 dark:hover:shadow-[0_18px_48px_rgba(2,6,23,0.45)]',
        active
          ? 'border-blue-200 ring-2 ring-blue-500/15 dark:border-blue-500/35 dark:ring-blue-500/20'
          : 'border-slate-200/80 dark:border-slate-800/80',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {eyebrow ? (
            <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {eyebrow}
            </div>
          ) : null}
          <div className="space-y-1">
            <h3 className="truncate text-base font-black text-slate-900 dark:text-slate-100">{title}</h3>
            {subtitle ? (
              <p className="line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2">
          {actions ? <div onClick={(event) => event.stopPropagation()}>{actions}</div> : null}
          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200">
              {icon}
            </div>
          ) : null}
        </div>
      </div>

      {stats.length ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {stats.slice(0, 4).map((stat) => (
            <div key={stat.label} className={`rounded-2xl px-3 py-2 ${toneClassMap[stat.tone || 'default']}`}>
              <div className="text-[11px] font-bold text-current/80">{stat.label}</div>
              <div className="mt-1 text-sm font-extrabold">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {footer ? (
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {footer}
        </div>
      ) : null}
    </button>
  );
};

export default DirectoryCard;
