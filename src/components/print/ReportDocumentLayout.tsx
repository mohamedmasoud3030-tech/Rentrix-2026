import React from 'react';
import { CompanyInfo } from '../../types';
import { formatDate } from '../../utils/helpers';

export interface ReportLayoutMetadataItem {
  label: string;
  value: string;
}

export interface ReportLayoutSummaryItem {
  label: string;
  value: string;
  helperText?: string;
}

export interface ReportLayoutColumn {
  key: string;
  label: string;
  align?: 'right' | 'left' | 'center';
}

interface ReportDocumentLayoutProps {
  company?: Partial<CompanyInfo>;
  title: string;
  metadata?: ReportLayoutMetadataItem[];
  summary?: ReportLayoutSummaryItem[];
  columns?: ReportLayoutColumn[];
  rows?: Array<Record<string, React.ReactNode>>;
  notes?: string[];
  generatedAt?: string;
}

const alignClassMap: Record<NonNullable<ReportLayoutColumn['align']>, string> = {
  right: 'text-right',
  left: 'text-left',
  center: 'text-center',
};

const ReportDocumentLayout: React.FC<ReportDocumentLayoutProps> = ({
  company,
  title,
  metadata = [],
  summary = [],
  columns = [],
  rows = [],
  notes = [],
  generatedAt,
}) => {
  const printDate = generatedAt || formatDate(new Date().toISOString());

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 bg-white p-6 text-right text-slate-900 print:max-w-none print:p-0" dir="rtl">
      <header className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {company?.logoDataUrl ? (
              <img src={company.logoDataUrl} alt={company?.name || 'شعار الشركة'} className="h-14 w-14 rounded-2xl border border-slate-200 bg-white object-contain p-2" />
            ) : null}
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-2xl font-black text-slate-950">{company?.name || 'بيانات الشركة'}</div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rentrix ERP</div>
            <div className="text-sm text-slate-600">{title}</div>
            <div className="text-xs text-slate-500">{[company?.address, company?.phone, company?.email].filter(Boolean).join(' | ')}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <div className="text-xs font-bold text-slate-500">تاريخ الطباعة</div>
            <div className="mt-1 font-black text-slate-900">{printDate}</div>
          </div>
        </div>
      </header>

      {metadata.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-black text-slate-900">بيانات التقرير</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {metadata.map((item) => (
              <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[11px] font-bold text-slate-500">{item.label}</div>
                <div className="mt-1 text-sm font-black text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {summary.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-black text-slate-900">الملخص التنفيذي</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {summary.map((item) => (
              <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-bold text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-black text-slate-950">{item.value}</div>
                {item.helperText ? <div className="mt-1 text-[11px] text-slate-500">{item.helperText}</div> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {columns.length > 0 ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={`border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-600 ${alignClassMap[column.align || 'right']}`}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={`row-${index}`} className="border-b border-slate-100 last:border-b-0">
                    {columns.map((column) => (
                      <td key={`${index}-${column.key}`} className={`px-4 py-3 align-top text-slate-700 ${alignClassMap[column.align || 'right']}`}>
                        {row[column.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-5 text-center text-sm text-slate-500">
                    لا توجد بيانات لعرضها في هذا التقرير.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-900">ملاحظات</h3>
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                {note}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
        <span>تم الإنشاء بواسطة Rentrix ERP</span>
        <span>{printDate}</span>
      </footer>
    </div>
  );
};

export default ReportDocumentLayout;
