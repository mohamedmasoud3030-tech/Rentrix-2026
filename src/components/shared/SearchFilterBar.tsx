import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface FilterChip {
  key: string;
  label: string;
}

interface SearchFilterBarProps {
  placeholder?: string;
  value?: string;
  searchTerm?: string;
  onSearch?: (query: string) => void;
  onSearchChange?: (query: string) => void;
  onChange?: (query: string) => void;
  onFilter?: () => void;
  rightSlot?: React.ReactNode;
  filterChips?: FilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearAll?: () => void;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  placeholder,
  value,
  searchTerm,
  onSearch,
  onSearchChange,
  onChange,
  onFilter,
  rightSlot,
  filterChips = [],
  onRemoveChip,
  onClearAll,
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
    onChange?.(nextValue);
  };

  return (
    <div className="erp-toolbar">
      <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
          <input
            type="text"
            value={query}
            className="w-full rounded-2xl border border-slate-200/80 bg-white/85 py-2 pl-9 pr-3.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-150 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900"
            placeholder={placeholder || 'ابحث داخل السجلات'}
            onChange={(event) => handleChange(event.target.value)}
          />
        </div>

        {rightSlot ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{rightSlot}</div> : null}

        {onFilter ? (
          <button
            type="button"
            onClick={onFilter}
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal size={16} />
            تصفية
          </button>
        ) : null}
      </div>

      {(filterChips.length > 0 || onClearAll) ? (
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onRemoveChip?.(chip.key)}
              className="erp-chip transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <span>{chip.label}</span>
              {onRemoveChip ? <X size={12} /> : null}
            </button>
          ))}

          {onClearAll && filterChips.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-[32px] items-center rounded-full border border-transparent px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              مسح الكل
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SearchFilterBar;
