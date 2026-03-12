import React from 'react';

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th
    className={`hidden border-b border-slate-200/80 bg-slate-50/70 px-5 py-4 text-right text-[11px] font-extrabold tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 sm:table-cell ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td
    className={`flex items-start justify-between gap-4 border-b border-slate-100/90 px-4 py-3 text-right text-sm text-slate-700 before:min-w-[6.25rem] before:text-xs before:font-extrabold before:text-slate-500 before:content-[attr(data-label)] dark:border-slate-800 dark:text-slate-200 dark:before:text-slate-400 sm:table-cell sm:px-5 sm:py-4 sm:text-inherit sm:before:hidden ${className}`}
    {...props}
  >
    {children}
  </td>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...props }) => (
  <tr
    className={`mb-3 block overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm transition-all duration-150 hover:bg-slate-50/80 focus:bg-slate-50/80 focus:outline-none dark:border-slate-800 dark:bg-slate-900/86 dark:hover:bg-slate-800/40 dark:focus:bg-slate-800/40 sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none ${className}`}
    {...props}
  >
    {children}
  </tr>
);

const TableWrapper: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-brand backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="overflow-x-auto">
        <table className={`min-w-full ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

export default TableWrapper;
