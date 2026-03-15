import React from 'react';
import { Receipt, Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DocumentLayout, { DocumentInfoGrid, DocumentSection } from './DocumentLayout';

interface ReceiptPrintableProps {
  receipt: Receipt;
  settings?: Settings | null;
  tenantName?: string;
  unitName?: string;
  propertyName?: string;
}

const paymentChannelLabel = (channel?: string | null) => {
  if (channel === 'BANK') return 'تحويل بنكي';
  if (channel === 'CARD') return 'بطاقة / شبكة';
  return 'نقدي';
};

const receiptStatusLabel = (status: Receipt['status']) => (status === 'POSTED' ? 'مرحّل' : 'ملغي');

export const ReceiptPrintable: React.FC<ReceiptPrintableProps> = ({
  receipt,
  settings,
  tenantName,
  unitName,
  propertyName,
}) => {
  const documentNumber = receipt.no || receipt.id.slice(0, 8).toUpperCase();

  return (
    <DocumentLayout
      settings={settings}
      title="سند قبض"
      subtitle={`مرجع السند: ${documentNumber}`}
      badge="مستند مالي مطبوع"
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <DocumentSection title="بيانات السند">
          <DocumentInfoGrid
            items={[
              { label: 'رقم السند', value: documentNumber },
              { label: 'الحالة', value: receiptStatusLabel(receipt.status) },
              { label: 'التاريخ', value: formatDate(receipt.dateTime) },
              { label: 'المبلغ', value: formatCurrency(receipt.amount, settings?.currency || 'OMR') },
              { label: 'طريقة الدفع', value: paymentChannelLabel(receipt.channel) },
              { label: 'المرجع', value: receipt.ref || '—' },
            ]}
          />
        </DocumentSection>

        <DocumentSection title="الارتباطات" tone="soft">
          <div className="space-y-3">
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">المستأجر</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{tenantName || 'غير محدد'}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">الوحدة / العقار</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{unitName || 'وحدة غير محددة'}</div>
              {propertyName ? <div className="mt-1 text-xs text-slate-500">{propertyName}</div> : null}
            </div>
          </div>
        </DocumentSection>
      </div>

      <DocumentSection title="ملاحظات السند" tone="soft">
        <p className="text-sm leading-8 text-slate-700">{receipt.notes || 'لا توجد ملاحظات مرفقة على هذا السند.'}</p>
      </DocumentSection>
    </DocumentLayout>
  );
};
