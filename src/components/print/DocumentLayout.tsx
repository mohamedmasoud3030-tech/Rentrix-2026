import React from 'react';
import { Settings } from '../../types';
import { resolveBrandingFromSettings } from '../../utils/branding';

export interface DocumentInfoItem {
  label: string;
  value: React.ReactNode;
}

interface DocumentLayoutProps {
  settings?: Settings | null;
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}

export const DocumentInfoGrid: React.FC<{ items: DocumentInfoItem[]; columns?: string }> = ({
  items,
  columns = 'sm:grid-cols-2',
}) => (
  <div className={`grid gap-3 ${columns}`}>
    {items.map((item) => (
      <div key={item.label} className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
        <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">{item.label}</div>
        <div className="mt-2 text-sm font-bold text-slate-900">{item.value}</div>
      </div>
    ))}
  </div>
);

export const DocumentSection: React.FC<{ title: string; children: React.ReactNode; tone?: 'plain' | 'soft' }> = ({
  title,
  children,
  tone = 'plain',
}) => (
  <section className={`rounded-[24px] border border-slate-200 p-5 ${tone === 'soft' ? 'bg-slate-50/70' : 'bg-white'}`}>
    <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-400">{title}</div>
    <div className="mt-4">{children}</div>
  </section>
);

const DocumentLayout: React.FC<DocumentLayoutProps> = ({ settings, title, subtitle, badge, children }) => {
  const company = settings?.company;
  const brand = resolveBrandingFromSettings(settings || undefined);
  const companyName = company?.companyName || company?.name || brand.companyName;

  return (
    <div className="print-document" dir="rtl">
      <div className="print-sheet space-y-8">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-3">
            {badge ? <p className="text-[11px] font-extrabold tracking-[0.18em] text-slate-400">{badge}</p> : null}
            <h1 className="text-[2rem] font-black tracking-tight text-slate-950">{title}</h1>
            {subtitle ? <p className="text-sm leading-7 text-slate-600">{subtitle}</p> : null}
          </div>

          <div className="max-w-[320px] text-right">
            <h2 className="text-[1.65rem] font-black tracking-tight text-slate-950">{companyName}</h2>
            {company?.address ? <p className="mt-2 text-sm leading-7 text-slate-600">{company.address}</p> : null}
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {company?.phone ? <div>{company.phone}</div> : null}
              {company?.email ? <div>{company.email}</div> : null}
            </div>
          </div>
        </header>

        {children}

        <footer className="border-t border-slate-200 pt-4 text-center text-xs leading-7 text-slate-500">
          <div>{brand.reportFooterText}</div>
          <div>تم إنشاء هذه النسخة من نظام Rentrix ERP</div>
        </footer>
      </div>
    </div>
  );
};

export default DocumentLayout;
