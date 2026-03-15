import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import StatusPill from '../components/ui/StatusPill';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { exportOwnerLedgerToPdf } from '../services/pdfService';
import ReportDocumentLayout from '../components/print/ReportDocumentLayout';
import { AlertTriangle, BarChart3, CalendarClock, CalendarRange, Download, Landmark, Percent, Printer, ReceiptText, ShieldAlert, Wallet, Wrench } from 'lucide-react';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import FormSection from '../components/ui/FormSection';
import Tabs from '../components/ui/Tabs';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const OwnerLedgerReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetOwnerId = params.get('ownerId') || '';
  const { db } = useApp();
  const { settings } = db;
  const currency = settings?.currency || 'OMR';

  const [ownerId, setOwnerId] = useState(presetOwnerId);
  const [propertyId, setPropertyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<'summary' | 'transactions'>('summary');

  const ownerPropertyOptions = useMemo(() => {
    if (!ownerId) return [];
    return db.properties.filter((property) => property.ownerId === ownerId);
  }, [db.properties, ownerId]);

  const report = useMemo(() => {
    if (!ownerId) return null;

    const owner = db.owners.find((item) => item.id === ownerId);
    if (!owner) return null;

    const allProperties = db.properties.filter((property) => property.ownerId === ownerId);
    const properties = propertyId ? allProperties.filter((property) => property.id === propertyId) : allProperties;
    const propertyIds = new Set(properties.map((property) => property.id));
    const units = db.units.filter((unit) => propertyIds.has(unit.propertyId));
    const unitIds = new Set(units.map((unit) => unit.id));
    const contracts = db.contracts.filter((contract) => unitIds.has(contract.unitId));
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const now = Date.now();

    const inRange = (dateValue?: string | null) => {
      if (!dateValue) return true;
      const ts = new Date(dateValue).getTime();
      if (Number.isNaN(ts)) return true;
      const afterStart = !startDate || ts >= new Date(startDate).getTime();
      const beforeEnd = !endDate || ts <= new Date(endDate).getTime();
      return afterStart && beforeEnd;
    };

    const collections = db.receipts
      .filter((receipt) => contractIds.has(receipt.contractId) && receipt.status === 'POSTED' && inRange(receipt.dateTime))
      .map((receipt) => {
        const contract = contracts.find((item) => item.id === receipt.contractId);
        const tenant = db.tenants.find((item) => item.id === contract?.tenantId);
        return {
          id: receipt.id,
          contractId: receipt.contractId,
          date: receipt.dateTime,
          type: 'COLLECTION' as const,
          label: `تحصيل من ${tenant?.name || 'مستأجر'} • سند ${receipt.no || '—'}`,
          gross: receipt.amount,
        };
      });

    const ownerExpenseRows = db.expenses
      .filter((expense) => expense.status === 'POSTED' && expense.chargedTo === 'OWNER' && inRange(expense.dateTime))
      .filter((expense) => {
        if (expense.contractId && contractIds.has(expense.contractId)) return true;
        if (expense.propertyId && propertyIds.has(expense.propertyId)) return true;
        if (expense.unitId && unitIds.has(expense.unitId)) return true;
        return false;
      });

    const ownerExpenses = ownerExpenseRows.map((expense) => ({
      id: expense.id,
      date: expense.dateTime,
      type: 'EXPENSE' as const,
      label: `مصروف على المالك • ${expense.category || 'مصروف'}${expense.notes ? ` • ${expense.notes}` : ''}`,
      gross: -Math.abs(expense.amount),
    }));

    const isMaintenanceExpense = (category?: string | null) => {
      const c = String(category || '').toLowerCase();
      return c.includes('صيانة') || c.includes('maint');
    };

    const maintenanceExpensesTotal = ownerExpenseRows
      .filter((expense) => isMaintenanceExpense(expense.category))
      .reduce((sum, expense) => sum + Math.abs(Number(expense.amount || 0)), 0);

    const otherExpensesTotal = ownerExpenseRows
      .filter((expense) => !isMaintenanceExpense(expense.category))
      .reduce((sum, expense) => sum + Math.abs(Number(expense.amount || 0)), 0);

    const settlements = db.ownerSettlements
      .filter((settlement) => settlement.ownerId === ownerId && settlement.status === 'POSTED' && inRange(settlement.date))
      .map((settlement) => ({
        id: settlement.id,
        date: settlement.date,
        type: 'SETTLEMENT' as const,
        label: `تحويل للمالك • ${settlement.no || 'بدون رقم'}`,
        gross: -Math.abs(settlement.amount),
      }));

    const monthsTouched = new Set<string>();
    [...collections, ...ownerExpenses].forEach((entry) => {
      if (entry.date) monthsTouched.add(String(entry.date).slice(0, 7));
    });

    // Determine human-readable label for the owner's default commission setting. If the owner uses contract-level
    // agreements, this label will be overridden on a per-transaction basis in the report summary below.
    const commissionTypeLabel = owner.commissionType === 'FIXED' ? 'استثمار ثابت شهري' : owner.commissionType === 'RATE' ? 'نسبة إدارة من التحصيل' : 'بدون عمولة محددة';

    // Aggregate totals
    const grossCollections = collections.reduce((sum, entry) => sum + entry.gross, 0);
    const ownerExpensesTotal = ownerExpenses.reduce((sum, entry) => sum + Math.abs(entry.gross), 0);
    const settlementsTotal = settlements.reduce((sum, entry) => sum + Math.abs(entry.gross), 0);

    // Prepare sorted transaction list (collections, expenses, settlements)
    const transactions = [...collections, ...ownerExpenses, ...settlements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // For each collection we need to determine the applicable owner agreement. Default to owner's global commission settings.
    // Build a helper map to track first collection per contract per month when using fixed monthly agreements.
    const firstCollectionTracker: Record<string, Set<string>> = {};

    let officeShare = 0;
    let runningBefore = 0;
    let runningAfter = 0;
    const processed = transactions.map((entry) => {
      let commissionDeduction = 0;
      if (entry.type === 'COLLECTION') {
        // Retrieve contract to determine contract-level agreement.
        // Determine the contract associated with this collection entry (if any). Collections carry a contractId.
        const collectionContractId = (entry as any).contractId;
        const contract = collectionContractId ? contracts.find((c) => c.id === collectionContractId) : undefined;
        const agreementType = contract?.ownerAgreementType || owner.commissionType || null;
        const agreementValue = contract?.ownerAgreementValue ?? owner.commissionValue ?? 0;
        if (agreementType === 'RATE' || agreementType === 'PERCENTAGE') {
          // Percentage-based commission
          commissionDeduction = Math.abs(entry.gross) * (agreementValue / 100);
        } else if (agreementType === 'FIXED') {
          // Fixed monthly investment. Deduct only once per month per contract.
          const monthKey = String(entry.date).slice(0, 7);
          const contractId = contract?.id || 'global';
          if (!firstCollectionTracker[contractId]) firstCollectionTracker[contractId] = new Set();
          if (!firstCollectionTracker[contractId].has(monthKey)) {
            commissionDeduction = agreementValue;
            firstCollectionTracker[contractId].add(monthKey);
          }
        }
        officeShare += commissionDeduction;
      }
      runningBefore += entry.gross;
      runningAfter += entry.gross - commissionDeduction;
      return {
        ...entry,
        commissionDeduction,
        ownerNet: entry.gross - commissionDeduction,
        runningBefore,
        runningAfter,
      };
    });

    const beforeCommission = grossCollections - ownerExpensesTotal;
    const afterCommission = beforeCommission - officeShare;

    // Filter by search term (lowercase search for arabic string may not always convert but will pass) 
    const filteredBySearch = processed.filter((entry) => entry.label.toLowerCase().includes(search.toLowerCase()));

    const activeContracts = contracts.filter((contract) => {
      if (contract.status !== 'ACTIVE') return false;
      const contractEndDate = contract.endDate || contract.end;
      const endTs = contractEndDate ? new Date(contractEndDate).getTime() : Number.POSITIVE_INFINITY;
      return endTs >= now;
    });

    const expiringContracts = activeContracts.filter((contract) => {
      const contractEndDate = contract.endDate || contract.end;
      const endTs = contractEndDate ? new Date(contractEndDate).getTime() : Number.POSITIVE_INFINITY;
      const daysLeft = Math.ceil((endTs - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 45;
    });

    const overdueInvoices = db.invoices.filter((invoice) => {
      if (!contractIds.has(invoice.contractId)) return false;
      if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
      return new Date(invoice.dueDate).getTime() < now;
    });

    const unpaidRentTotal = db.invoices
      .filter((invoice) => contractIds.has(invoice.contractId) && invoice.status !== 'VOID' && invoice.type === 'RENT' && inRange(invoice.dueDate))
      .reduce((sum, invoice) => {
        const outstanding = Math.max(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0) - Number(invoice.paidAmount || 0), 0);
        return sum + outstanding;
      }, 0);

    const openMaintenance = db.maintenanceRecords.filter((record) => {
      if (!unitIds.has(record.unitId)) return false;
      return ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status);
    });

    const utilityExpensesTotal = db.expenses
      .filter((expense) => {
        if (expense.status !== 'POSTED') return false;
        const category = String(expense.category || '').toUpperCase();
        const serviceCategories = ['WATER', 'ELECTRICITY', 'INTERNET'];
        return serviceCategories.includes(category) && (
          contractIds.has(expense.contractId || '') ||
          unitIds.has(expense.unitId || '') ||
          propertyIds.has(expense.propertyId || '')
        );
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const outstandingBalance = afterCommission - settlementsTotal;

    return {
      owner,
      properties,
      units,
      activeContractsCount: activeContracts.length,
      expiringContracts,
      overdueInvoices,
      openMaintenance,
      utilityExpensesTotal,
      outstandingBalance,
      commissionTypeLabel,
      grossCollections,
      unpaidRentTotal,
      ownerExpensesTotal,
      maintenanceExpensesTotal,
      otherExpensesTotal,
      settlementsTotal,
      officeShare,
      beforeCommission,
      afterCommission,
      transactions: filteredBySearch,
    };
  }, [db, endDate, ownerId, propertyId, search, startDate]);

  const chartBars = useMemo(() => {
    if (!report) return [];
    const bars = [
      { label: 'إجمالي التحصيل', value: report.grossCollections, color: 'bg-blue-500' },
      { label: 'مصروفات المالك', value: report.ownerExpensesTotal, color: 'bg-rose-500' },
      { label: 'عمولة المكتب', value: report.officeShare, color: 'bg-amber-500' },
      { label: 'صافي بعد العمولة', value: report.afterCommission, color: 'bg-emerald-500' },
    ];
    const maxValue = Math.max(...bars.map((item) => Math.abs(item.value)), 1);
    return bars.map((item) => ({ ...item, width: `${Math.max((Math.abs(item.value) / maxValue) * 100, 8)}%` }));
  }, [report]);

  const ownerPdfPayload = useMemo(() => {
    if (!report) return null;

    return {
      owner: report.owner,
      data: {
        outstandingBalance: report.outstandingBalance,
        totalCollected: report.grossCollections,
        totalExpenses: report.ownerExpensesTotal,
        officeShare: report.officeShare,
        ownerNet: report.afterCommission,
        propertiesCount: report.properties.length,
        unitsCount: report.units.length,
        activeContractsCount: report.activeContractsCount,
        openMaintenanceCount: report.openMaintenance.length,
        overdueInvoicesCount: report.overdueInvoices.length,
        utilityExpenses: report.utilityExpensesTotal,
      },
      entries: report.transactions.map((tx) => ({
        date: tx.date,
        description: tx.label,
        debit: tx.gross < 0 ? Math.abs(tx.gross) : 0,
        credit: tx.gross > 0 ? tx.gross : 0,
      })),
      settings: settings!,
      dateRangeLabel:
        startDate || endDate
          ? `الفترة: ${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
          : 'الفترة: جميع الحركات المسجلة',
    };
  }, [report, settings, startDate, endDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="كشف حساب المالك" description="تقرير احترافي يوضح إجمالي التحصيل، عمولة المكتب، المصروفات، وصافي المستحق قبل وبعد خصم العمولة." />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate('/reports?tab=owner')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <BarChart3 size={16} />
          مركز التقارير
        </button>
        <button
          type="button"
          onClick={() => setIsPrintPreviewOpen(true)}
          disabled={!report}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={16} />
          معاينة قبل الطباعة
        </button>
      </div>

      <WorkspaceSection title="تصفية كشف الحساب" description="حدد المالك والفترة المطلوبة قبل عرض البيانات.">
        <FormSection title="اختيار المالك والفترة" columns={4}>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">اختر المالك</label>
            <select
              className={inputCls}
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                setPropertyId('');
              }}
            >
              <option value="">-- اختر مالك العقار --</option>
              {db.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">العقار</label>
            <select
              className={inputCls}
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={!ownerId}
            >
              <option value="">كل العقارات</option>
              {ownerPropertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">من تاريخ</label>
            <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">إلى تاريخ</label>
            <input className={inputCls} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </FormSection>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {ownerId ? (
            <div className="min-w-[240px] flex-1">
              <SearchFilterBar value={search} onSearch={setSearch} placeholder="بحث داخل البيان أو نوع الحركة..." />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => ownerPdfPayload && exportOwnerLedgerToPdf(ownerPdfPayload)}
            disabled={!ownerPdfPayload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} /> تصدير PDF
          </button>
        </div>
      </WorkspaceSection>

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryStatCard title="نوع الاتفاق" value={report.commissionTypeLabel} icon={<Percent size={18} />} color="slate" />
            <SummaryStatCard title="إجمالي التحصيل" value={formatCurrency(report.grossCollections, currency)} icon={<ReceiptText size={18} />} color="blue" />
            <SummaryStatCard title="مصروفات المالك" value={formatCurrency(report.ownerExpensesTotal, currency)} icon={<Wallet size={18} />} color="rose" />
            <SummaryStatCard title="قبل العمولة" value={formatCurrency(report.beforeCommission, currency)} icon={<Landmark size={18} />} color="amber" />
            <SummaryStatCard title="بعد العمولة" value={formatCurrency(report.afterCommission, currency)} icon={<BarChart3 size={18} />} color="emerald" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryStatCard title="إيجار غير محصل" value={formatCurrency(report.unpaidRentTotal, currency)} icon={<AlertTriangle size={18} />} color="amber" subtext="رصيد فواتير الإيجار المفتوحة" />
            <SummaryStatCard title="مصروفات صيانة" value={formatCurrency(report.maintenanceExpensesTotal, currency)} icon={<Wrench size={18} />} color="rose" subtext="مصروفات محملة على المالك" />
            <SummaryStatCard title="الرصيد بعد التسويات" value={formatCurrency(report.outstandingBalance, currency)} icon={<ShieldAlert size={18} />} color={report.outstandingBalance >= 0 ? 'emerald' : 'rose'} subtext="صافي المستحق للمالك" />
          </div>

          <div className="mt-4">
            <Tabs
              variant="pill"
              tabs={[
                { id: 'summary', label: 'ملخص وتحليل' },
                { id: 'transactions', label: 'الحركات التفصيلية' },
              ]}
              activeTab={ledgerTab}
              onChange={(id) => setLedgerTab(id as typeof ledgerTab)}
            />
          </div>

          {ledgerTab === 'summary' && (
            <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WorkspaceSection title="العقود النشطة" description="إجمالي العقود الجارية على عقارات المالك.">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.activeContractsCount.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <CalendarClock size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">إجمالي العقود الجارية حاليًا على عقارات هذا المالك.</p>
            </WorkspaceSection>

            <WorkspaceSection title="عقود قريبة من الانتهاء" description="عقود تحتاج متابعة خلال 45 يومًا.">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.expiringContracts.length.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">عقود تحتاج تجديدًا أو متابعة خلال 45 يومًا.</p>
            </WorkspaceSection>

            <WorkspaceSection title="الفواتير المتأخرة" description="فواتير غير مسددة تجاوزت تاريخ الاستحقاق.">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.overdueInvoices.length.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                  <ShieldAlert size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">فواتير غير مسددة تجاوزت تاريخ الاستحقاق على عقارات المالك.</p>
            </WorkspaceSection>

            <WorkspaceSection title="طلبات الصيانة المفتوحة" description="طلبات تحتاج متابعة تشغيلية أو مالية.">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.openMaintenance.length.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Wrench size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">طلبات تحتاج متابعة تشغيلية أو مالية على وحدات المالك.</p>
            </WorkspaceSection>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <WorkspaceSection title="مؤشرات التحليل السريع" description="تصور بصري للعلاقة بين إجمالي التحصيل، المصروفات، وعمولة المكتب.">
              <div className="mt-6 space-y-4">
                {chartBars.map((bar) => (
                  <div key={bar.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700">{bar.label}</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(bar.value, currency)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </WorkspaceSection>

            <WorkspaceSection title="ملخص الاتفاق مع المالك" description="تفاصيل سريعة عن حجم المحفظة والاتفاق.">
              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>المالك</span><strong className="text-slate-800">{report.owner.name}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>عدد العقارات</span><strong className="text-slate-800">{report.properties.length.toLocaleString('ar')}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>عدد الوحدات</span><strong className="text-slate-800">{report.units.length.toLocaleString('ar')}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>نوع الاتفاق</span><strong className="text-slate-800">{report.commissionTypeLabel}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>قيمة الاتفاق</span><strong className="text-slate-800">{report.owner.commissionType === 'FIXED' ? formatCurrency(report.owner.commissionValue || 0, currency) : `${report.owner.commissionValue || 0}%`}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>مصروفات الخدمات</span><strong className="text-slate-800">{formatCurrency(report.utilityExpensesTotal, currency)}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3"><span>عمولة المكتب المحتسبة</span><strong className="text-blue-700">{formatCurrency(report.officeShare, currency)}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3"><span>الرصيد النهائي بعد الخصم</span><strong className="text-emerald-700">{formatCurrency(report.outstandingBalance, currency)}</strong></div>
              </div>
            </WorkspaceSection>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <WorkspaceSection title="التنبيهات التشغيلية" description="أهم ما يحتاج متابعة يومية قبل تحويل مستحقات المالك.">
              <div className="flex items-center justify-between">
                <div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">فواتير متأخرة</span>
                  <StatusPill status={report.overdueInvoices.length > 0 ? 'danger' : 'success'}>{report.overdueInvoices.length > 0 ? `${report.overdueInvoices.length.toLocaleString('ar')} حالة` : 'لا يوجد'}</StatusPill>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">عقود تحتاج تجديدًا</span>
                  <StatusPill status={report.expiringContracts.length > 0 ? 'warning' : 'success'}>{report.expiringContracts.length > 0 ? `${report.expiringContracts.length.toLocaleString('ar')} عقد` : 'مستقر'}</StatusPill>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">صيانة مفتوحة</span>
                  <StatusPill status={report.openMaintenance.length > 0 ? 'info' : 'success'}>{report.openMaintenance.length > 0 ? `${report.openMaintenance.length.toLocaleString('ar')} طلب` : 'لا يوجد'}</StatusPill>
                </div>
              </div>
            </WorkspaceSection>

            <WorkspaceSection title="سجلات تحتاج انتباهًا" description="ملخص سريع لأقرب الاستحقاقات والحالات المفتوحة.">
              <div className="flex items-center justify-between">
                <div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <CalendarClock size={18} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {report.expiringContracts.slice(0, 3).map((contract) => (
                  <div key={contract.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{contract.no || `عقد ${contract.id.slice(0, 8)}`}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">ينتهي في {formatDate(contract.endDate || contract.end)}</p>
                      </div>
                      <StatusPill status="warning">قريب الانتهاء</StatusPill>
                    </div>
                  </div>
                ))}
                {!report.expiringContracts.length && !report.overdueInvoices.length && !report.openMaintenance.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    لا توجد عناصر تشغيلية حرجة حاليًا لهذا المالك.
                  </div>
                ) : null}
                {!report.expiringContracts.length && report.overdueInvoices.length > 0 ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-300">
                    توجد فواتير متأخرة تحتاج متابعة تحصيل قبل التسوية.
                  </div>
                ) : null}
                {!report.expiringContracts.length && !report.overdueInvoices.length && report.openMaintenance.length > 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-300">
                    توجد طلبات صيانة مفتوحة قد تؤثر على صافي مستحقات المالك.
                  </div>
                ) : null}
              </div>
            </WorkspaceSection>
          </div>
          </>
          )}

          {ledgerTab === 'transactions' && (
            <WorkspaceSection title="الحركات التفصيلية" description="يعرض الجدول التحصيل والمصروف والتسوية مع الرصيد قبل وبعد خصم العمولة.">
              <TableWrapper>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>التاريخ</Th>
                    <Th>البيان</Th>
                    <Th className="text-left">الإجمالي</Th>
                    <Th className="text-left">عمولة المكتب</Th>
                    <Th className="text-left">صافي المالك</Th>
                    <Th className="text-left">الرصيد قبل العمولة</Th>
                    <Th className="text-left">الرصيد بعد العمولة</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.transactions.map((tx) => (
                    <Tr key={`${tx.type}-${tx.id}`}>
                      <Td>{formatDate(tx.date)}</Td>
                      <Td className="max-w-[320px] text-sm text-slate-700">{tx.label}</Td>
                      <Td className={`text-left font-mono font-bold ${tx.gross >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{formatCurrency(tx.gross, currency)}</Td>
                      <Td className="text-left font-mono font-bold text-amber-600">{tx.commissionDeduction ? formatCurrency(tx.commissionDeduction, currency) : '—'}</Td>
                      <Td className="text-left font-mono font-bold text-emerald-700">{formatCurrency(tx.ownerNet, currency)}</Td>
                      <Td className="text-left font-mono">{formatCurrency(tx.runningBefore, currency)}</Td>
                      <Td className="text-left font-mono font-bold">{formatCurrency(tx.runningAfter, currency)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            </WorkspaceSection>
          )}

          <PrintPreviewModal
            isOpen={isPrintPreviewOpen}
            onClose={() => setIsPrintPreviewOpen(false)}
            title={`معاينة كشف حساب المالك${report ? ` - ${report.owner.name}` : ''}`}
            onExportPdf={() => {
              if (!report) return;
              exportOwnerLedgerToPdf(
                report.transactions,
                {
                  gross: report.beforeCommission,
                  officeShare: report.officeShare,
                  net: report.afterCommission,
                },
                settings!,
                report.owner.name,
                report.commissionTypeLabel,
                false,
              );
            }}
          >
            {report && settings ? (
              <ReportDocumentLayout
                company={settings.company}
                title="كشف حساب المالك"
                metadata={[
                  { label: 'المالك', value: report.owner.name },
                  { label: 'نظام العمولة', value: report.commissionTypeLabel },
                  { label: 'العقار', value: propertyId ? (report.properties[0]?.name || '—') : 'كل العقارات' },
                  {
                    label: 'الفترة',
                    value: startDate || endDate
                      ? `${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
                      : 'جميع الحركات المسجلة',
                  },
                ]}
                summary={[
                  { label: 'إجمالي التحصيل', value: formatCurrency(report.grossCollections, currency) },
                  { label: 'عمولة المكتب', value: formatCurrency(report.officeShare, currency) },
                  { label: 'الصافي بعد العمولة', value: formatCurrency(report.afterCommission, currency) },
                ]}
                columns={[
                  { key: 'date', label: 'التاريخ' },
                  { key: 'statement', label: 'البيان' },
                  { key: 'gross', label: 'الإجمالي', align: 'left' },
                  { key: 'commission', label: 'عمولة المكتب', align: 'left' },
                  { key: 'net', label: 'صافي المالك', align: 'left' },
                ]}
                rows={report.transactions.map((tx) => ({
                  date: formatDate(tx.date),
                  statement: tx.label,
                  gross: formatCurrency(tx.gross, currency),
                  commission: tx.commissionDeduction ? formatCurrency(tx.commissionDeduction, currency) : '—',
                  net: formatCurrency(tx.ownerNet, currency),
                }))}
                notes={[
                  'يعكس هذا الكشف التحصيلات والمصروفات الخاصة بالمالك مع احتساب عمولة المكتب حسب الاتفاق.',
                ]}
              />
            ) : null}
          </PrintPreviewModal>
        </>
      ) : (
        <EmptyState icon={CalendarRange} title="اختر مالكًا لعرض كشف الحساب" description="يمكنك بعد ذلك تصفية الفترة الزمنية، تصدير PDF، ومراجعة الأرصدة قبل وبعد خصم العمولة." />
      )}
    </div>
  );
};

export default OwnerLedgerReport;
