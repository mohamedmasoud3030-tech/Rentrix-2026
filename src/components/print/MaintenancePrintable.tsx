import React from 'react';
import { Settings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DocumentLayout, { DocumentInfoGrid, DocumentSection } from './DocumentLayout';

interface MaintenancePrintableProps {
  record: any;
  settings?: Settings | null;
  propertyName?: string;
  unitName?: string;
}

const maintenanceStatusLabel = (status?: string | null) => {
  if (status === 'COMPLETED' || status === 'CLOSED') return 'مكتمل';
  if (status === 'IN_PROGRESS') return 'قيد التنفيذ';
  if (status === 'CANCELLED') return 'ملغي';
  return 'مفتوح';
};

const chargedToLabel = (chargedTo?: string | null) => {
  if (chargedTo === 'TENANT') return 'على المستأجر';
  if (chargedTo === 'OFFICE') return 'على المكتب';
  return 'على المالك';
};

export const MaintenancePrintable: React.FC<MaintenancePrintableProps> = ({
  record,
  settings,
  propertyName,
  unitName,
}) => {
  const documentNumber = record.no || record.id.slice(0, 8).toUpperCase();

  return (
    <DocumentLayout
      settings={settings}
      title="طلب صيانة"
      subtitle={`مرجع الطلب: ${documentNumber}`}
      badge="مستند تشغيلي مطبوع"
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <DocumentSection title="بيانات الطلب">
          <DocumentInfoGrid
            items={[
              { label: 'رقم الطلب', value: documentNumber },
              { label: 'الحالة', value: maintenanceStatusLabel(record.status) },
              { label: 'العنوان', value: record.issueTitle || 'طلب صيانة' },
              { label: 'تاريخ الطلب', value: formatDate(record.requestDate) },
              { label: 'التكلفة', value: formatCurrency(record.cost || 0, settings?.currency || 'OMR') },
              { label: 'التحميل المالي', value: chargedToLabel(record.chargedTo) },
            ]}
          />
        </DocumentSection>

        <DocumentSection title="الموقع" tone="soft">
          <div className="space-y-3">
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">العقار</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{propertyName || 'غير محدد'}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">الوحدة</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{unitName || 'غير محددة'}</div>
            </div>
          </div>
        </DocumentSection>
      </div>

      <DocumentSection title="وصف المشكلة" tone="soft">
        <p className="text-sm leading-8 text-slate-700">{record.description || 'لا توجد تفاصيل إضافية على طلب الصيانة.'}</p>
      </DocumentSection>
    </DocumentLayout>
  );
};
