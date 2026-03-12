import React from 'react';

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th
    className={`sticky top-0 z-[1] hidden border-b border-slate-200/80 bg-slate-50/92 px-3.5 py-2.5 text-right text-[10px] font-extrabold tracking-[0.14em] text-slate-500 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/92 dark:text-slate-400 sm:table-cell ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td
    className={`flex items-start justify-between gap-3 border-b border-slate-100/90 px-3 py-2 text-right text-sm text-slate-700 before:min-w-[5.25rem] before:text-[11px] before:font-extrabold before:text-slate-500 before:content-[attr(data-label)] dark:border-slate-800 dark:text-slate-200 dark:before:text-slate-400 sm:table-cell sm:px-3.5 sm:py-2.5 sm:text-inherit sm:before:hidden ${className}`}
    {...props}
  >
    {children}
  </td>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...props }) => (
  <tr
    className={`mb-2 block overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/92 shadow-sm transition-all duration-150 hover:bg-slate-50/80 focus:bg-slate-50/80 focus:outline-none dark:border-slate-800 dark:bg-slate-900/86 dark:hover:bg-slate-800/40 dark:focus:bg-slate-800/40 sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none ${className}`}
    {...props}
  >
    {children}
  </tr>
);

const TableWrapper: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/90 shadow-brand backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="max-h-[34rem] overflow-auto">
        <table className={`min-w-full table-fixed ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

export default TableWrapper;
