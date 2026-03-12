import React from 'react';
import { Receipt, Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';

interface ReceiptPrintableProps {
  receipt: Receipt;
  settings?: Settings | null;
}

const Header: React.FC<{ settings?: Settings | null; title: string }> = ({ settings, title }) => {
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
      <div className="mt-5 text-xl font-black text-slate-900">{title}</div>
    </div>
  );
};

export const ReceiptPrintable: React.FC<ReceiptPrintableProps> = ({ receipt, settings }) => {
  return (
    <div className="space-y-6 p-8 text-right" dir="rtl">
      <Header settings={settings} title="سند قبض" />
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>رقم السند:</strong> {receipt.no}</div>
        <div><strong>التاريخ:</strong> {formatDate(receipt.dateTime)}</div>
        <div><strong>المبلغ:</strong> {formatCurrency(receipt.amount, settings?.currency || 'OMR')}</div>
        <div><strong>طريقة الدفع:</strong> {receipt.channel}</div>
        <div className="col-span-2"><strong>ملاحظات:</strong> {receipt.notes || '—'}</div>
      </div>
    </div>
  );
};
