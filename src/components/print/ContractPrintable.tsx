import React from 'react';
import { Contract, Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { resolveBrandingFromSettings } from '../../utils/branding';

interface ContractPrintableProps {
  contract: Contract;
  settings?: Settings | null;
  tenantName?: string;
  unitName?: string;
  propertyName?: string;
  ownerName?: string;
}

const contractStatusLabel = (status: Contract['status']) => {
  if (status === 'ACTIVE') return 'ساري';
  if (status === 'SUSPENDED') return 'معلّق';
  return 'منتهي';
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
    <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">{label}</div>
    <div className="mt-2 text-sm font-bold text-slate-900">{value}</div>
  </div>
);

export const ContractPrintable: React.FC<ContractPrintableProps> = ({
  contract,
  settings,
  tenantName,
  unitName,
  propertyName,
  ownerName,
}) => {
  const brand = resolveBrandingFromSettings(settings || undefined);
  const company = settings?.company;
  const documentNumber = contract.no || contract.id.slice(0, 8).toUpperCase();
  const companyName = company?.companyName || company?.name || brand.companyName;

  return (
    <div className="print-document" dir="rtl">
      <div className="print-sheet space-y-8">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-3">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-slate-400">عقد مطبوع من النظام</p>
            <h1 className="text-[2rem] font-black tracking-tight text-slate-950">عقد إيجار</h1>
            <p className="text-sm leading-7 text-slate-600">
              مرجع العقد: <span className="font-extrabold text-slate-900">{documentNumber}</span>
            </p>
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

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-400">ملف العقد</div>
                <div className="mt-1 text-xl font-black text-slate-950">{tenantName || 'مستأجر غير محدد'}</div>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                {contractStatusLabel(contract.status)}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailRow label="رقم العقد" value={documentNumber} />
              <DetailRow label="حالة العقد" value={contractStatusLabel(contract.status)} />
              <DetailRow label="تاريخ البداية" value={formatDate(contract.start)} />
              <DetailRow label="تاريخ الانتهاء" value={formatDate(contract.end)} />
              <DetailRow label="قيمة الإيجار" value={formatCurrency(contract.rent, settings?.currency || 'OMR')} />
              <DetailRow label="قيمة التأمين" value={formatCurrency(contract.deposit || 0, settings?.currency || 'OMR')} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-400">الأطراف والارتباطات</div>
            <div className="mt-5 space-y-3">
              <DetailRow label="المستأجر" value={tenantName || 'غير محدد'} />
              <DetailRow label="الوحدة" value={unitName || 'غير محددة'} />
              <DetailRow label="العقار" value={propertyName || 'غير محدد'} />
              <DetailRow label="المالك" value={ownerName || 'غير محدد'} />
              <DetailRow label="يوم الاستحقاق الشهري" value={`اليوم ${contract.dueDay || 1}`} />
            </div>
          </div>
        </section>

        {contract.notes ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-400">ملاحظات العقد</div>
            <p className="mt-3 text-sm leading-8 text-slate-700">{contract.notes}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="text-sm font-extrabold text-slate-900">اعتماد المستأجر</div>
            <div className="mt-12 h-16 rounded-2xl border border-dashed border-slate-300 bg-white/80" />
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="text-sm font-extrabold text-slate-900">اعتماد المكتب / المالك</div>
            <div className="mt-12 h-16 rounded-2xl border border-dashed border-slate-300 bg-white/80" />
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-4 text-center text-xs leading-7 text-slate-500">
          <div>{brand.reportFooterText}</div>
          <div>تم إنشاء هذه النسخة من نظام Rentrix ERP</div>
        </footer>
      </div>
    </div>
  );
};
