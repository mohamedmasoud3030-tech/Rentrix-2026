import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchFilterBarProps {
  placeholder?: string;
  value?: string;
  searchTerm?: string;
  onSearch?: (query: string) => void;
  onSearchChange?: (query: string) => void;
  onFilter?: () => void;
  rightSlot?: React.ReactNode;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  placeholder,
  value,
  searchTerm,
  onSearch,
  onSearchChange,
  onFilter,
  rightSlot,
}) => {
  const controlledValue = useMemo(() => value ?? searchTerm ?? '', [value, searchTerm]);
  const [query, setQuery] = useState(controlledValue);

  useEffect(() => {
    setQuery(controlledValue);
  }, [controlledValue]);

  const handleChange = (nextValue: string) => {
    setQuery(nextValue);
    onSearch?.(nextValue);
    onSearchChange?.(nextValue);
  };

  return (
    <div className="mb-6 rounded-[26px] border border-slate-200/70 bg-white/75 p-3 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/65">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="text"
            value={query}
            className="w-full rounded-2xl border border-slate-200/80 bg-white/85 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-150 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900"
            placeholder={placeholder || 'بحث...'}
            onChange={(event) => handleChange(event.target.value)}
          />
        </div>

        {rightSlot && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{rightSlot}</div>}

        {onFilter && (
          <button
            onClick={onFilter}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal size={16} />
            تصفية
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchFilterBar;
