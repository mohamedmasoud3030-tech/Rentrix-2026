import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface CommandItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface Props {
  isOpen: boolean;
  items: CommandItem[];
  onClose: () => void;
  onSelect: (item: CommandItem) => void;
}

const CommandPalette: React.FC<Props> = ({ isOpen, items, onClose, onSelect }) => {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => [item.label, item.badge, item.path].filter(Boolean).join(' ').toLowerCase().includes(normalized));
  }, [items, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/46 px-4 pt-24 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 shadow-[0_34px_90px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-slate-50">لوحة الأوامر</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">انتقال سريع بين الشاشات والإجراءات المتاحة داخل النظام.</div>
            </div>
            <div className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Ctrl/Cmd + K
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن شاشة أو إجراء..."
              className="w-full rounded-[22px] border border-slate-200/80 bg-white/84 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition-all placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700/90 dark:bg-slate-900/86 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="max-h-[24rem] overflow-y-auto p-2">
          {filteredItems.length ? (
            filteredItems.map((item, index) => (
              <button
                key={`${item.path}-${index}`}
                className="flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-right transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70"
                onClick={() => onSelect(item)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {item.icon || <Search size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-50">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{item.path}</span>
                </span>
                {item.badge ? (
                  <span className="rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              لا توجد نتائج مطابقة لعبارة البحث الحالية.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
