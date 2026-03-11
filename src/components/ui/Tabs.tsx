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
  onTabClick: (id: string) => void;
  variant?: 'underline' | 'pill';
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabClick, variant = 'underline' }) => {
  if (variant === 'pill') {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200/80 bg-white/80 p-1.5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabClick(tab.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-slate-950 text-white shadow-brand dark:bg-primary dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap border-b border-slate-200/80 dark:border-slate-800">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabClick(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-extrabold transition-colors ${
              isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {tab.count}
              </span>
            )}
            {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-500 dark:bg-blue-400" />}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
