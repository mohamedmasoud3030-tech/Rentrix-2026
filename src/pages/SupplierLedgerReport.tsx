import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, CalendarRange, Download, Printer, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import ReportDocumentLayout from '../components/print/ReportDocumentLayout';
import FormSection from '../components/ui/FormSection';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { exportStructuredReportToPdf } from '../services/pdfService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';

type LedgerRow = {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running: number;
};

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';

const SupplierLedgerReport: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetPayee = params.get('payee') || '';

  const { db } = useApp();
  const currency = db.settings?.currency || 'OMR';

  const [payee, setPayee] = useState(presetPayee);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [search, setSearch] = useState('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const payeeOptions = useMemo(() => {
    const values = new Set<string>();
    (db.expenses || []).forEach((expense) => {
      if (expense.status !== 'POSTED') return;
      const name = (expense.payee || '').trim();
      if (name) values.add(name);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [db.expenses]);

  const availableUnits = useMemo(() => {
    if (!propertyId) return db.units || [];
    return (db.units || []).filter((u) => u.propertyId === propertyId);
  }, [db.units, propertyId]);

  const report = useMemo(() => {
    if (!payee) return null;

    const inRange = (dateValue?: string | null) => {
      if (!dateValue) return true;
      const ts = new Date(dateValue).getTime();
      if (Number.isNaN(ts)) return true;
      const afterStart = !startDate || ts >= new Date(startDate).getTime();
      const beforeEnd = !endDate || ts <= new Date(endDate).getTime();
      return afterStart && beforeEnd;
    };

    const q = search.trim().toLowerCase();
    const expenses = (db.expenses || [])
      .filter((expense) => expense.status === 'POSTED')
      .filter((expense) => String(expense.payee || '').trim() === payee)
      .filter((expense) => (!propertyId || expense.propertyId === propertyId))
      .filter((expense) => (!unitId || expense.unitId === unitId))
      .filter((expense) => inRange(expense.dateTime))
      .filter((expense) => {
        if (!q) return true;
        return [expense.no, expense.category, expense.notes, expense.ref].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .slice()
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    let running = 0;
    const rows: LedgerRow[] = expenses.map((expense) => {
      running += Number(expense.amount || 0);
      const ref = expense.no || expense.id.slice(0, 8).toUpperCase();
      const property = expense.propertyId ? db.properties.find((p) => p.id === expense.propertyId) : null;
      const unit = expense.unitId ? db.units.find((u) => u.id === expense.unitId) : null;
      const descriptionParts = [
        expense.category || 'مصروف',
        property?.name ? `العقار: ${property.name}` : null,
        unit?.name || unit?.unitNumber ? `الوحدة: ${unit?.name || unit?.unitNumber}` : null,
        expense.notes ? `ملاحظة: ${expense.notes}` : null,
      ].filter(Boolean);

      return {
        id: expense.id,
        date: expense.dateTime,
        reference: ref,
        description: descriptionParts.join(' • '),
        debit: Number(expense.amount || 0),
        credit: 0,
        running,
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);

    return { rows, totalDebit, count: rows.length };
  }, [db.expenses, db.properties, db.units, endDate, payee, propertyId, search, startDate, unitId]);

  const openPrintPreview = () => {
    if (!report) {
      toast.error('اختر موردًا أولًا لعرض كشف الحساب.');
      return;
    }
    setIsPrintPreviewOpen(true);
  };

  const exportToPdf = () => {
    if (!report) return;
    exportStructuredReportToPdf({
      title: 'كشف حساب المورد',
      fileName: 'supplier-ledger.pdf',
      settings: db.settings,
      metadata: [
        { label: 'المورد', value: payee },
        {
          label: 'الفترة',
          value:
            startDate || endDate
              ? `${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
              : 'جميع الحركات',
        },
        { label: 'عدد السجلات', value: report.count.toLocaleString('ar') },
      ],
      summary: [
        { label: 'إجمالي المصروفات', value: formatCurrency(report.totalDebit, currency) },
      ],
      columns: [
        { key: 'date', label: 'التاريخ' },
        { key: 'reference', label: 'المرجع' },
        { key: 'description', label: 'البيان' },
        { key: 'debit', label: 'مدفوع', align: 'left' },
        { key: 'running', label: 'إجمالي تراكمي', align: 'left' },
      ],
      rows: report.rows.map((row) => ({
        date: formatDateTime(row.date),
        reference: row.reference,
        description: row.description,
        debit: formatCurrency(row.debit, currency),
        running: formatCurrency(row.running, currency),
      })),
      notes: ['يعكس هذا الكشف المصروفات المرحلة المرتبطة بالمورد (حقل المستفيد) ضمن نطاق الفلاتر المحددة.'],
    });
  };

  return (
    <div className="app-page" dir="rtl">
      <PageHeader
        title="كشف حساب المورد"
        description="عرض المصروفات المرحلة حسب المورد (المستفيد) مع إجمالي تراكمي للطباعة والتوثيق."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={openPrintPreview} disabled={!report}>
            <Printer size={16} />
            معاينة للطباعة
          </button>
          <button type="button" className="btn btn-primary" onClick={exportToPdf} disabled={!report}>
            <Download size={16} />
            تصدير PDF
          </button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        <WorkspaceSection title="فلاتر الكشف" description="اختر المورد ثم قيّد الفترة والنطاق التشغيلي.">
          <div className="space-y-4">
            <FormSection title="التحديد" description="اختيار المورد والفترة" columns={3}>
              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">المورد</label>
                <select value={payee} onChange={(e) => setPayee(e.target.value)} className={inputCls}>
                  <option value="">اختر المورد</option>
                  {payeeOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">من</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">إلى</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </div>
            </FormSection>

            <FormSection title="النطاق" description="العقار/الوحدة والبحث" columns={3}>
              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">العقار</label>
                <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setUnitId(''); }} className={inputCls}>
                  <option value="">كل العقارات</option>
                  {db.properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">الوحدة</label>
                <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls}>
                  <option value="">كل الوحدات</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name || unit.unitNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">البحث</label>
                <SearchFilterBar value={search} onSearch={setSearch} placeholder="بحث في رقم السند / التصنيف / الملاحظات..." />
              </div>
            </FormSection>
          </div>
        </WorkspaceSection>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStatCard title="إجمالي المصروفات" value={formatCurrency(report?.totalDebit || 0, currency)} icon={<Wallet size={18} />} color="rose" subtext="مصروفات مرحلة" />
          <SummaryStatCard title="عدد السجلات" value={(report?.count || 0).toLocaleString('ar')} icon={<CalendarRange size={18} />} color="slate" subtext="ضمن الفلاتر" />
          <SummaryStatCard title="تحذير" value={payee ? 'مفعّل' : 'اختر موردًا'} icon={<AlertTriangle size={18} />} color="amber" subtext="يجب اختيار المورد" />
        </div>

        <WorkspaceSection title="الحركات" description="المصروفات المرحلة المرتبطة بالمورد ضمن نطاق الفلاتر.">
          {!payee ? (
            <EmptyState icon={Wallet} title="اختر موردًا" description="حدد المورد من الأعلى لعرض كشف الحساب." />
          ) : !report || report.rows.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد مصروفات" description="لا توجد مصروفات مرحلة لهذا المورد ضمن النطاق المختار." />
          ) : (
            <TableWrapper>
              <thead>
                <Tr>
                  <Th>التاريخ</Th>
                  <Th>المرجع</Th>
                  <Th>البيان</Th>
                  <Th>مدفوع</Th>
                  <Th>إجمالي</Th>
                </Tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td data-label="التاريخ">{formatDateTime(row.date)}</Td>
                    <Td data-label="المرجع" className="font-mono font-bold text-slate-800">{row.reference}</Td>
                    <Td data-label="البيان" className="text-sm text-slate-700">{row.description}</Td>
                    <Td data-label="مدفوع" className="text-left font-mono font-bold text-rose-700">{formatCurrency(row.debit, currency)}</Td>
                    <Td data-label="إجمالي" className="text-left font-mono font-black">{formatCurrency(row.running, currency)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </WorkspaceSection>
      </div>

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={`معاينة كشف حساب المورد${payee ? ` - ${payee}` : ''}`}
        onExportPdf={report ? exportToPdf : undefined}
      >
        {report ? (
          <ReportDocumentLayout
            company={db.settings.company}
            title="كشف حساب المورد"
            metadata={[
              { label: 'المورد', value: payee || '—' },
              {
                label: 'الفترة',
                value:
                  startDate || endDate
                    ? `${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
                    : 'جميع الحركات',
              },
              { label: 'عدد السجلات', value: report.count.toLocaleString('ar') },
            ]}
            summary={[
              { label: 'إجمالي المصروفات', value: formatCurrency(report.totalDebit, currency) },
            ]}
            columns={[
              { key: 'date', label: 'التاريخ' },
              { key: 'reference', label: 'المرجع' },
              { key: 'description', label: 'البيان' },
              { key: 'debit', label: 'مدفوع', align: 'left' },
              { key: 'running', label: 'إجمالي تراكمي', align: 'left' },
            ]}
            rows={report.rows.map((row) => ({
              date: formatDateTime(row.date),
              reference: row.reference,
              description: row.description,
              debit: formatCurrency(row.debit, currency),
              running: formatCurrency(row.running, currency),
            }))}
            notes={[
              'يعكس هذا الكشف المصروفات المرحلة المرتبطة بالمورد ضمن نطاق الفلاتر المحددة.',
            ]}
          />
        ) : null}
      </PrintPreviewModal>
    </div>
  );
};

export default SupplierLedgerReport;

