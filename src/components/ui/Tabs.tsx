import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabClick?: (id: string) => void;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabClick, onChange, variant = 'underline' }) => {
  const handleTabClick = (id: string) => {
    onTabClick?.(id);
    onChange?.(id);
  };

  if (variant === 'pill') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200/80 bg-white/94 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/88">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`inline-flex items-center gap-2 rounded-[18px] px-3.5 py-2 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-primary/15 dark:text-sky-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive ? 'bg-white/15 text-white dark:bg-sky-300/10 dark:text-sky-100' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full items-center gap-1 rounded-[24px] border border-slate-200/80 bg-white/94 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/88">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`relative inline-flex min-w-fit items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm font-extrabold transition-all ${
                isActive
                  ? 'bg-slate-50 text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
              {isActive ? <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-primary" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
