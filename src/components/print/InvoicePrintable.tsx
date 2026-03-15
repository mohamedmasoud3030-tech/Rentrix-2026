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
  const itemDescription = (() => {
    const unitLabel = unitName || '';
    if (invoice.type === 'MAINTENANCE') return unitLabel ? `أعمال صيانة للوحدة ${unitLabel}` : 'أعمال صيانة';
    if (invoice.type === 'DEPOSIT') return unitLabel ? `تأمين للوحدة ${unitLabel}` : 'تأمين';
    if (invoice.type === 'OTHER') return unitLabel ? `مطالبة أخرى للوحدة ${unitLabel}` : 'مطالبة أخرى';
    return unitLabel ? `إيجار الوحدة ${unitLabel}` : 'إيجار';
  })();

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
            columns="sm:grid-cols-3"
            items={[
              { label: 'رقم الفاتورة', value: documentNumber },
              { label: 'تاريخ الإصدار', value: formatDate(invoice.createdAt || invoice.updatedAt || new Date().toISOString()) },
              { label: 'الحالة', value: invoiceStatusLabel(invoice.status) },
              { label: 'نوع الفاتورة', value: invoiceTypeLabel(invoice.type) },
              { label: 'تاريخ الاستحقاق', value: formatDate(invoice.dueDate) },
              { label: 'المبلغ الأساسي', value: formatCurrency(Number(invoice.amount || 0), settings?.currency || 'OMR') },
              { label: 'الضريبة', value: formatCurrency(Number(invoice.taxAmount || 0), settings?.currency || 'OMR') },
              { label: 'الإجمالي', value: formatCurrency(totalAmount, settings?.currency || 'OMR') },
              { label: 'المدفوع', value: formatCurrency(Number(invoice.paidAmount || 0), settings?.currency || 'OMR') },
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

      <DocumentSection title="بنود الفاتورة">
        <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/90">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-[11px] font-extrabold tracking-[0.08em] text-slate-500">البند</th>
                <th className="px-4 py-3 text-right text-[11px] font-extrabold tracking-[0.08em] text-slate-500">الوصف</th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold tracking-[0.08em] text-slate-500">المبلغ</th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold tracking-[0.08em] text-slate-500">الضريبة</th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold tracking-[0.08em] text-slate-500">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold text-slate-900">{invoiceTypeLabel(invoice.type)}</td>
                <td className="px-4 py-3 text-slate-600">{itemDescription}</td>
                <td className="px-4 py-3 text-left font-mono font-bold text-slate-800">{formatCurrency(Number(invoice.amount || 0), settings?.currency || 'OMR')}</td>
                <td className="px-4 py-3 text-left font-mono text-slate-600">{formatCurrency(Number(invoice.taxAmount || 0), settings?.currency || 'OMR')}</td>
                <td className="px-4 py-3 text-left font-mono font-black text-slate-950">{formatCurrency(totalAmount, settings?.currency || 'OMR')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocumentSection>

      <DocumentSection title="ملاحظات الفاتورة" tone="soft">
        <p className="text-sm leading-8 text-slate-700">{invoice.notes || 'لا توجد ملاحظات إضافية على الفاتورة.'}</p>
      </DocumentSection>
    </DocumentLayout>
  );
};
