import React from 'react';
import { Contract, Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';

interface ContractPrintableProps {
  contract: Contract;
  settings?: Settings | null;
}

const PrintHeader: React.FC<{ settings?: Settings | null; title: string; subtitle: string }> = ({ settings, title, subtitle }) => {
  const company = settings?.company;
  return (
    <div className="border-b border-slate-200 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="text-lg font-black text-slate-900">{company?.name || 'بيانات الشركة غير مكتملة'}</div>
          <div>{company?.address || '—'}</div>
          <div>{company?.phone || '—'}</div>
          <div>{company?.email || '—'}</div>
        </div>
        {company?.logoDataUrl ? <img src={company.logoDataUrl} alt="شعار الشركة" className="h-16 w-16 rounded-2xl object-contain" /> : null}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-right">
        <div className="text-xl font-black text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
};

export const ContractPrintable: React.FC<ContractPrintableProps> = ({ contract, settings }) => {
  return (
    <div className="space-y-6 p-8 text-right" dir="rtl">
      <PrintHeader settings={settings} title="عقد إيجار" subtitle={`مرجع العقد: ${contract.no || contract.id}`} />
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>رقم العقد:</strong> {contract.no || contract.id}</div>
        <div><strong>تاريخ البدء:</strong> {formatDate(contract.start)}</div>
        <div><strong>تاريخ الانتهاء:</strong> {formatDate(contract.end)}</div>
        <div><strong>قيمة الإيجار:</strong> {formatCurrency(contract.rent, settings?.currency || 'OMR')}</div>
        <div><strong>قيمة التأمين:</strong> {formatCurrency(contract.deposit || 0, settings?.currency || 'OMR')}</div>
        <div><strong>حالة العقد:</strong> {contract.status}</div>
      </div>
      <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        هذه المعاينة تستخدم بيانات الشركة المحفوظة في الإعدادات لتوحيد الترويسة على جميع المستندات المطبوعة.
      </p>
    </div>
  );
};
