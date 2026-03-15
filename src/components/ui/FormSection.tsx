import React from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}

const gridClassMap: Record<NonNullable<FormSectionProps['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
};

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  columns = 2,
}) => {
  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
        {description ? <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      <div className={`grid gap-4 ${gridClassMap[columns]}`}>{children}</div>
    </section>
  );
};

export default FormSection;
