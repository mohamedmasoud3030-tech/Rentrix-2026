import React from 'react';

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th
    className={`border-b border-slate-200/80 bg-slate-50/70 px-6 py-4 text-right text-[11px] font-extrabold tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td
    className={`align-middle border-b border-slate-100/90 px-6 py-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200 ${className}`}
    {...props}
  >
    {children}
  </td>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...props }) => (
  <tr className={`transition-all duration-150 hover:bg-slate-50/80 focus:bg-slate-50/80 focus:outline-none dark:hover:bg-slate-800/40 dark:focus:bg-slate-800/40 ${className}`} {...props}>
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
