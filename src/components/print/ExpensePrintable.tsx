import React from 'react';
import { Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DocumentLayout, { DocumentInfoGrid, DocumentSection } from './DocumentLayout';

interface ExpensePrintableProps {
  expense: any;
  settings?: Settings | null;
  propertyName?: string;
  unitName?: string;
}

const expenseStatusLabel = (status?: string | null) => (status === 'VOID' ? 'ملغي' : 'مرحّل');

const chargedToLabel = (chargedTo?: string | null) => {
  if (chargedTo === 'TENANT') return 'على المستأجر';
  if (chargedTo === 'OFFICE') return 'على المكتب';
  return 'على المالك';
};

export const ExpensePrintable: React.FC<ExpensePrintableProps> = ({
  expense,
  settings,
  propertyName,
  unitName,
}) => {
  const documentNumber = expense.no || expense.id.slice(0, 8).toUpperCase();

  return (
    <DocumentLayout
      settings={settings}
      title="سند صرف"
      subtitle={`مرجع السند: ${documentNumber}`}
      badge="مستند مالي مطبوع"
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <DocumentSection title="بيانات السند">
          <DocumentInfoGrid
            items={[
              { label: 'رقم السند', value: documentNumber },
              { label: 'الحالة', value: expenseStatusLabel(expense.status) },
              { label: 'التاريخ', value: formatDate(expense.dateTime) },
              { label: 'المبلغ', value: formatCurrency(expense.amount, settings?.currency || 'OMR') },
              { label: 'التصنيف', value: expense.category || 'غير محدد' },
              { label: 'التحميل المالي', value: chargedToLabel(expense.chargedTo) },
            ]}
          />
        </DocumentSection>

        <DocumentSection title="الارتباطات" tone="soft">
          <div className="space-y-3">
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">المستفيد / المرجع</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{expense.payee || expense.ref || 'غير محدد'}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">العقار / الوحدة</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{propertyName || 'عقار غير محدد'}</div>
              {unitName ? <div className="mt-1 text-xs text-slate-500">{unitName}</div> : null}
            </div>
          </div>
        </DocumentSection>
      </div>

      <DocumentSection title="وصف المصروف" tone="soft">
        <p className="text-sm leading-8 text-slate-700">{expense.notes || 'لا توجد ملاحظات إضافية على هذا المصروف.'}</p>
      </DocumentSection>
    </DocumentLayout>
  );
};
