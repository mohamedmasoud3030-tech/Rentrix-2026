import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarRange,
  Download,
  Printer,
  ReceiptText,
  Users,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import ReportDocumentLayout from '../components/print/ReportDocumentLayout';
import Tabs from '../components/ui/Tabs';
import FormSection from '../components/ui/FormSection';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { exportStructuredReportToPdf } from '../services/pdfService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { toast } from 'react-hot-toast';

type LedgerTab = 'summary' | 'transactions';
type TxType = 'ALL' | 'INVOICES' | 'PAYMENTS';

type LedgerRow = {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running: number;
  kind: 'INVOICE' | 'PAYMENT';
};

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';

const TenantLedgerReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetTenantId = params.get('tenantId') || '';

  const { db } = useApp();
  const currency = db.settings?.currency || 'OMR';

  const [tenantId, setTenantId] = useState(presetTenantId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [txType, setTxType] = useState<TxType>('ALL');
  const [search, setSearch] = useState('');
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('summary');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const tenantContext = useMemo(() => {
    if (!tenantId) return null;
    const tenant = db.tenants.find((t) => t.id === tenantId) || null;
    if (!tenant) return null;
    const contracts = db.contracts.filter((c) => c.tenantId === tenantId);
    const unitIds = new Set(contracts.map((c) => c.unitId));
    const units = db.units.filter((u) => unitIds.has(u.id));
    const propertyIds = new Set(units.map((u) => u.propertyId));
    const properties = db.properties.filter((p) => propertyIds.has(p.id));
    return { tenant, contracts, units, properties };
  }, [db.contracts, db.properties, db.tenants, db.units, tenantId]);

  const report = useMemo(() => {
    if (!tenantContext) return null;

    const inRange = (dateValue?: string | null) => {
      if (!dateValue) return true;
      const ts = new Date(dateValue).getTime();
      if (Number.isNaN(ts)) return true;
      const afterStart = !startDate || ts >= new Date(startDate).getTime();
      const beforeEnd = !endDate || ts <= new Date(endDate).getTime();
      return afterStart && beforeEnd;
    };

    const allowedUnitIds = new Set(
      tenantContext.units
        .filter((unit) => (!propertyId || unit.propertyId === propertyId) && (!unitId || unit.id === unitId))
        .map((unit) => unit.id),
    );

    const scopedContracts = tenantContext.contracts.filter((contract) => allowedUnitIds.has(contract.unitId));
    const contractIds = new Set(scopedContracts.map((contract) => contract.id));

    const invoiceRows = db.invoices
      .filter((inv) => contractIds.has(inv.contractId) && inv.status !== 'VOID')
      .map((inv) => {
        const total = Number(inv.amount || 0) + Number(inv.taxAmount || 0);
        const contract = scopedContracts.find((c) => c.id === inv.contractId) || null;
        const unit = contract ? tenantContext.units.find((u) => u.id === contract.unitId) || null : null;
        const property = unit ? tenantContext.properties.find((p) => p.id === unit.propertyId) || null : null;
        const reference = inv.no || inv.id.slice(0, 8).toUpperCase();
        const descriptionParts = [
          inv.type === 'RENT' ? 'فاتورة إيجار' : inv.type === 'MAINTENANCE' ? 'فاتورة صيانة' : inv.type === 'DEPOSIT' ? 'فاتورة تأمين' : 'فاتورة أخرى',
          unit?.name || unit?.unitNumber ? `الوحدة: ${unit?.name || unit?.unitNumber}` : null,
          property?.name ? `العقار: ${property.name}` : null,
        ].filter(Boolean);

        return {
          id: `invoice-${inv.id}`,
          date: inv.dueDate,
          reference,
          description: descriptionParts.join(' • '),
          debit: total,
          credit: 0,
          running: 0,
          kind: 'INVOICE' as const,
          rawDate: new Date(inv.dueDate).getTime(),
        };
      })
      .filter((row) => inRange(row.date));

    const invoiceById = new Map(
      db.invoices
        .filter((inv) => contractIds.has(inv.contractId))
        .map((inv) => [inv.id, inv]),
    );

    const receiptById = new Map(db.receipts.map((receipt) => [receipt.id, receipt]));

    const paymentRows = db.receiptAllocations
      .filter((allocation) => {
        const invoice = invoiceById.get(allocation.invoiceId);
        if (!invoice || invoice.status === 'VOID') return false;
        const receipt = receiptById.get(allocation.receiptId);
        if (!receipt || receipt.status !== 'POSTED') return false;
        return contractIds.has(invoice.contractId);
      })
      .map((allocation) => {
        const invoice = invoiceById.get(allocation.invoiceId)!;
        const receipt = receiptById.get(allocation.receiptId)!;
        const invoiceRef = invoice.no || invoice.id.slice(0, 8).toUpperCase();
        const receiptRef = receipt.no || receipt.id.slice(0, 8).toUpperCase();
        return {
          id: `payment-${allocation.id}`,
          date: receipt.dateTime,
          reference: receiptRef,
          description: `سداد فاتورة ${invoiceRef} عبر سند قبض ${receiptRef}`,
          debit: 0,
          credit: Number(allocation.amount || 0),
          running: 0,
          kind: 'PAYMENT' as const,
          rawDate: new Date(receipt.dateTime).getTime(),
        };
      })
      .filter((row) => inRange(row.date));

    const q = search.trim().toLowerCase();
    const merged = [...invoiceRows, ...paymentRows]
      .filter((row) => {
        if (txType === 'INVOICES' && row.kind !== 'INVOICE') return false;
        if (txType === 'PAYMENTS' && row.kind !== 'PAYMENT') return false;
        if (!q) return true;
        return [row.reference, row.description].some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => a.rawDate - b.rawDate);

    let running = 0;
    const rows: LedgerRow[] = merged.map((row) => {
      running += Number(row.debit || 0) - Number(row.credit || 0);
      return {
        id: row.id,
        date: row.date,
        reference: row.reference,
        description: row.description,
        debit: row.debit,
        credit: row.credit,
        running,
        kind: row.kind,
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
    const totalCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
    const balance = totalDebit - totalCredit;

    const now = Date.now();
    const overdue = db.invoices
      .filter((inv) => contractIds.has(inv.contractId) && inv.status !== 'VOID' && new Date(inv.dueDate).getTime() < now)
      .reduce((sum, inv) => sum + Math.max(Number(inv.amount || 0) + Number(inv.taxAmount || 0) - Number(inv.paidAmount || 0), 0), 0);

    return {
      tenant: tenantContext.tenant,
      properties: tenantContext.properties,
      units: tenantContext.units,
      contractsCount: scopedContracts.length,
      rows,
      totalDebit,
      totalCredit,
      balance,
      overdue,
    };
  }, [db.invoices, db.receiptAllocations, db.receipts, endDate, propertyId, search, startDate, tenantContext, txType, unitId]);

  const availableProperties = tenantContext?.properties || [];
  const availableUnits = useMemo(() => {
    if (!tenantContext) return [];
    return tenantContext.units.filter((unit) => (!propertyId || unit.propertyId === propertyId));
  }, [propertyId, tenantContext]);

  const openPrintPreview = () => {
    if (!report) {
      toast.error('اختر مستأجرًا أولًا لعرض كشف الحساب.');
      return;
    }
    setIsPrintPreviewOpen(true);
  };

  const exportToPdf = () => {
    if (!report) return;
    exportStructuredReportToPdf({
      title: 'كشف حساب المستأجر',
      fileName: 'tenant-ledger.pdf',
      settings: db.settings,
      metadata: [
        { label: 'المستأجر', value: report.tenant.name || report.tenant.fullName || '—' },
        { label: 'عدد العقود', value: report.contractsCount.toLocaleString('ar') },
        {
          label: 'الفترة',
          value:
            startDate || endDate
              ? `${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
              : 'جميع الحركات',
        },
      ],
      summary: [
        { label: 'إجمالي الفواتير (مدين)', value: formatCurrency(report.totalDebit, currency) },
        { label: 'إجمالي الدفعات (دائن)', value: formatCurrency(report.totalCredit, currency) },
        { label: 'الرصيد الحالي', value: formatCurrency(report.balance, currency) },
        { label: 'متأخرات مستحقة', value: formatCurrency(report.overdue, currency) },
      ],
      columns: [
        { key: 'date', label: 'التاريخ' },
        { key: 'reference', label: 'المرجع' },
        { key: 'description', label: 'البيان' },
        { key: 'debit', label: 'مدين', align: 'left' },
        { key: 'credit', label: 'دائن', align: 'left' },
        { key: 'running', label: 'الرصيد', align: 'left' },
      ],
      rows: report.rows.map((row) => ({
        date: row.kind === 'PAYMENT' ? formatDateTime(row.date) : formatDate(row.date),
        reference: row.reference,
        description: row.description,
        debit: row.debit ? formatCurrency(row.debit, currency) : '—',
        credit: row.credit ? formatCurrency(row.credit, currency) : '—',
        running: formatCurrency(row.running, currency),
      })),
      notes: [
        'يعكس هذا الكشف الفواتير والدفعات المرتبطة بعقود المستأجر. تم احتساب الرصيد كمحصلة (مدين - دائن).',
      ],
    });
  };

  return (
    <div className="app-page" dir="rtl">
      <PageHeader
        title="كشف حساب المستأجر"
        description="دفتر أستاذ يوضح الفواتير والدفعات مع رصيد جارٍ لتسهيل المتابعة والتحصيل."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/reports?tab=tenants')}>
            <Users size={16} />
            تقارير المستأجرين
          </button>
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
        <WorkspaceSection title="فلاتر الكشف" description="حدد المستأجر والفترة ونطاق العقار/الوحدة لتضييق النتائج.">
          <div className="space-y-4">
            <FormSection title="التحديد" description="اختر المستأجر ثم طبّق الفلاتر المطلوبة." columns={3}>
              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">المستأجر</label>
                <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={inputCls}>
                  <option value="">اختر المستأجر</option>
                  {db.tenants
                    .slice()
                    .sort((a, b) => String(a.name || a.fullName).localeCompare(String(b.name || b.fullName), 'ar'))
                    .map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name || tenant.fullName}
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

            <FormSection title="النطاق" description="تحديد العقار/الوحدة والمعاملات." columns={4}>
              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">العقار</label>
                <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setUnitId(''); }} className={inputCls} disabled={!tenantContext}>
                  <option value="">كل العقارات</option>
                  {availableProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">الوحدة</label>
                <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls} disabled={!tenantContext}>
                  <option value="">كل الوحدات</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name || unit.unitNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">نوع الحركة</label>
                <select value={txType} onChange={(e) => setTxType(e.target.value as TxType)} className={inputCls}>
                  <option value="ALL">الكل</option>
                  <option value="INVOICES">الفواتير</option>
                  <option value="PAYMENTS">الدفعات</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">البحث</label>
                <SearchFilterBar value={search} onSearch={setSearch} placeholder="ابحث في المرجع أو البيان..." />
              </div>
            </FormSection>
          </div>
        </WorkspaceSection>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStatCard title="إجمالي الفواتير" value={formatCurrency(report?.totalDebit || 0, currency)} icon={<ReceiptText size={18} />} color="blue" subtext="إجمالي المدين" />
          <SummaryStatCard title="إجمالي الدفعات" value={formatCurrency(report?.totalCredit || 0, currency)} icon={<Wallet size={18} />} color="emerald" subtext="إجمالي الدائن" />
          <SummaryStatCard title="الرصيد الحالي" value={formatCurrency(report?.balance || 0, currency)} icon={<Users size={18} />} color={report && report.balance > 0 ? 'rose' : 'slate'} subtext="مدين على المستأجر" />
          <SummaryStatCard title="متأخرات" value={formatCurrency(report?.overdue || 0, currency)} icon={<AlertTriangle size={18} />} color="amber" subtext="فواتير تجاوزت تاريخ الاستحقاق" />
        </div>

        <WorkspaceSection title="النتائج" description="عرض ملخص أو جدول الحركات مع رصيد جارٍ.">
          <Tabs
            tabs={[
              { id: 'summary', label: 'ملخص', icon: <CalendarRange size={16} /> },
              { id: 'transactions', label: 'الحركات', icon: <ReceiptText size={16} />, count: report?.rows.length || 0 },
            ]}
            activeTab={ledgerTab}
            onTabClick={(id) => setLedgerTab(id as LedgerTab)}
          />

          <div className="pt-5">
            {!tenantId ? (
              <EmptyState icon={Users} title="اختر مستأجرًا" description="حدد المستأجر من الأعلى لعرض كشف الحساب." />
            ) : !report ? (
              <EmptyState icon={CalendarRange} title="لا توجد بيانات" description="تعذر تكوين كشف الحساب لهذا المستأجر." />
            ) : ledgerTab === 'summary' ? (
              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <WorkspaceSection title="بطاقة المستأجر" description="ملخص سريع للارتباطات والعقود.">
                  <div className="grid gap-3 rounded-[22px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800/80 dark:bg-slate-900/80 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/70">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">المستأجر</div>
                      <div className="mt-2 font-black text-slate-900 dark:text-white">{tenantContext?.tenant.name || tenantContext?.tenant.fullName}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tenantContext?.tenant.phone || 'لا يوجد رقم هاتف'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/70">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">عدد العقود</div>
                      <div className="mt-2 font-black text-slate-900 dark:text-white">{report.contractsCount.toLocaleString('ar')}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">ضمن النطاق المحدد</div>
                    </div>
                  </div>
                </WorkspaceSection>

                <WorkspaceSection title="مؤشرات التحصيل" description="مؤشرات تساعد في تحديد الأولويات.">
                  <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800/80 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/70">
                      <span className="font-bold text-slate-700 dark:text-slate-200">الرصيد الحالي</span>
                      <span className="font-mono font-black text-slate-900 dark:text-white">{formatCurrency(report.balance, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 px-4 py-3 text-sm dark:bg-amber-500/10">
                      <span className="font-bold text-amber-700 dark:text-amber-200">متأخرات</span>
                      <span className="font-mono font-black text-amber-800 dark:text-amber-200">{formatCurrency(report.overdue, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-50/70 px-4 py-3 text-sm dark:bg-emerald-500/10">
                      <span className="font-bold text-emerald-700 dark:text-emerald-200">إجمالي الدفعات</span>
                      <span className="font-mono font-black text-emerald-800 dark:text-emerald-200">{formatCurrency(report.totalCredit, currency)}</span>
                    </div>
                  </div>
                </WorkspaceSection>
              </div>
            ) : report.rows.length ? (
              <TableWrapper>
                <thead>
                  <Tr>
                    <Th>التاريخ</Th>
                    <Th>المرجع</Th>
                    <Th>البيان</Th>
                    <Th>مدين</Th>
                    <Th>دائن</Th>
                    <Th>الرصيد</Th>
                  </Tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <Tr key={row.id}>
                      <Td data-label="التاريخ">{row.kind === 'PAYMENT' ? formatDateTime(row.date) : formatDate(row.date)}</Td>
                      <Td data-label="المرجع" className="font-mono font-bold text-slate-800">{row.reference}</Td>
                      <Td data-label="البيان" className="text-sm text-slate-700">{row.description}</Td>
                      <Td data-label="مدين" className="text-left font-mono font-bold text-slate-900">{row.debit ? formatCurrency(row.debit, currency) : '—'}</Td>
                      <Td data-label="دائن" className="text-left font-mono font-bold text-emerald-700">{row.credit ? formatCurrency(row.credit, currency) : '—'}</Td>
                      <Td data-label="الرصيد" className="text-left font-mono font-black">{formatCurrency(row.running, currency)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            ) : (
              <EmptyState icon={ReceiptText} title="لا توجد حركات" description="لا توجد فواتير أو دفعات ضمن النطاق المختار." />
            )}
          </div>
        </WorkspaceSection>
      </div>

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={`معاينة كشف حساب المستأجر${report ? ` - ${report.tenant.name || report.tenant.fullName}` : ''}`}
        onExportPdf={report ? exportToPdf : undefined}
      >
        {report ? (
          <ReportDocumentLayout
            company={db.settings.company}
            title="كشف حساب المستأجر"
            metadata={[
              { label: 'المستأجر', value: report.tenant.name || report.tenant.fullName || '—' },
              { label: 'عدد العقود', value: report.contractsCount.toLocaleString('ar') },
              {
                label: 'الفترة',
                value:
                  startDate || endDate
                    ? `${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
                    : 'جميع الحركات',
              },
            ]}
            summary={[
              { label: 'إجمالي المدين', value: formatCurrency(report.totalDebit, currency) },
              { label: 'إجمالي الدائن', value: formatCurrency(report.totalCredit, currency) },
              { label: 'الرصيد الحالي', value: formatCurrency(report.balance, currency) },
              { label: 'متأخرات', value: formatCurrency(report.overdue, currency) },
            ]}
            columns={[
              { key: 'date', label: 'التاريخ' },
              { key: 'reference', label: 'المرجع' },
              { key: 'description', label: 'البيان' },
              { key: 'debit', label: 'مدين', align: 'left' },
              { key: 'credit', label: 'دائن', align: 'left' },
              { key: 'running', label: 'الرصيد', align: 'left' },
            ]}
            rows={report.rows.map((row) => ({
              date: row.kind === 'PAYMENT' ? formatDateTime(row.date) : formatDate(row.date),
              reference: row.reference,
              description: row.description,
              debit: row.debit ? formatCurrency(row.debit, currency) : '—',
              credit: row.credit ? formatCurrency(row.credit, currency) : '—',
              running: formatCurrency(row.running, currency),
            }))}
            notes={[
              'تم إنشاء هذا الكشف بناءً على الفواتير والدفعات المسجلة داخل النظام. يرجى مراجعة أي فروقات عبر سندات القبض والقيود.',
            ]}
          />
        ) : null}
      </PrintPreviewModal>
    </div>
  );
};

export default TenantLedgerReport;
