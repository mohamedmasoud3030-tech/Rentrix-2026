import React from 'react';
import { Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DocumentLayout, { DocumentInfoGrid, DocumentSection } from './DocumentLayout';

interface InvoicePrintableProps {
  invoice: any;
  settings?: Settings | null;
  tenantName?: string;
  unitName?: string;
  propertyName?: string;
}

const invoiceStatusLabel = (status: string) => {
  if (status === 'PAID') return 'مدفوعة';
  if (status === 'PARTIALLY_PAID') return 'مدفوعة جزئيًا';
  if (status === 'OVERDUE') return 'متأخرة';
  if (status === 'VOID') return 'ملغاة';
  return 'غير مدفوعة';
};

const invoiceTypeLabel = (type?: string | null) => {
  if (type === 'MAINTENANCE') return 'صيانة';
  if (type === 'DEPOSIT') return 'تأمين';
  if (type === 'OTHER') return 'أخرى';
  return 'إيجار';
};

export const InvoicePrintable: React.FC<InvoicePrintableProps> = ({
  invoice,
  settings,
  tenantName,
  unitName,
  propertyName,
}) => {
  const documentNumber = invoice.no || invoice.id.slice(0, 8).toUpperCase();
  const totalAmount = Number(invoice.amount || 0) + Number(invoice.taxAmount || 0);
  const balance = Math.max(totalAmount - Number(invoice.paidAmount || 0), 0);

  return (
    <DocumentLayout
      settings={settings}
      title="فاتورة مطالبة"
      subtitle={`رقم الفاتورة: ${documentNumber}`}
      badge="مستند مالي مطبوع"
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <DocumentSection title="بيانات الفاتورة">
          <DocumentInfoGrid
            items={[
              { label: 'رقم الفاتورة', value: documentNumber },
              { label: 'الحالة', value: invoiceStatusLabel(invoice.status) },
              { label: 'نوع الفاتورة', value: invoiceTypeLabel(invoice.type) },
              { label: 'تاريخ الاستحقاق', value: formatDate(invoice.dueDate) },
              { label: 'إجمالي المبلغ', value: formatCurrency(totalAmount, settings?.currency || 'OMR') },
              { label: 'المتبقي', value: formatCurrency(balance, settings?.currency || 'OMR') },
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

      <DocumentSection title="ملاحظات الفاتورة" tone="soft">
        <p className="text-sm leading-8 text-slate-700">{invoice.notes || 'لا توجد ملاحظات إضافية على الفاتورة.'}</p>
      </DocumentSection>
    </DocumentLayout>
  );
};
