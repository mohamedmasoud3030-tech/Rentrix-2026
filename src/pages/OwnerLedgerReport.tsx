import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import StatusPill from '../components/ui/StatusPill';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { exportOwnerLedgerToPdf } from '../services/pdfService';
import { AlertTriangle, BarChart3, CalendarClock, CalendarRange, Download, Landmark, Percent, Printer, ReceiptText, ShieldAlert, Wallet, Wrench } from 'lucide-react';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const OwnerLedgerReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetOwnerId = params.get('ownerId') || '';
  const { db } = useApp();
  const { settings } = db;

  const [ownerId, setOwnerId] = useState(presetOwnerId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const report = useMemo(() => {
    if (!ownerId) return null;

    const owner = db.owners.find((item) => item.id === ownerId);
    if (!owner) return null;

    const properties = db.properties.filter((property) => property.ownerId === ownerId);
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

    const ownerExpenses = db.expenses
      .filter((expense) => expense.status === 'POSTED' && expense.chargedTo === 'OWNER' && contractIds.has(expense.contractId || '') && inRange(expense.dateTime))
      .map((expense) => ({
        id: expense.id,
        date: expense.dateTime,
        type: 'EXPENSE' as const,
        label: `مصروف على المالك • ${expense.category || 'مصروف'}${expense.notes ? ` • ${expense.notes}` : ''}`,
        gross: -Math.abs(expense.amount),
      }));

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
      ownerExpensesTotal,
      settlementsTotal,
      officeShare,
      beforeCommission,
      afterCommission,
      transactions: filteredBySearch,
    };
  }, [db, ownerId, startDate, endDate, search]);

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

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">اختر المالك</label>
            <select className={inputCls} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">-- اختر مالك العقار --</option>
              {db.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
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
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => report && exportOwnerLedgerToPdf(report.transactions, { gross: report.beforeCommission, officeShare: report.officeShare, net: report.afterCommission }, settings!, report.owner.name, report.commissionTypeLabel, false)}
              disabled={!report}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} /> تصدير PDF
            </button>
          </div>
        </div>
        {ownerId && (
          <div className="mt-4">
            <SearchFilterBar value={search} onSearch={setSearch} placeholder="بحث داخل البيان أو نوع الحركة..." />
          </div>
        )}
      </Card>

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryStatCard title="نوع الاتفاق" value={report.commissionTypeLabel} icon={<Percent size={18} />} color="slate" />
            <SummaryStatCard title="إجمالي التحصيل" value={formatCurrency(report.grossCollections)} icon={<ReceiptText size={18} />} color="blue" />
            <SummaryStatCard title="مصروفات المالك" value={formatCurrency(report.ownerExpensesTotal)} icon={<Wallet size={18} />} color="rose" />
            <SummaryStatCard title="قبل العمولة" value={formatCurrency(report.beforeCommission)} icon={<Landmark size={18} />} color="amber" />
            <SummaryStatCard title="بعد العمولة" value={formatCurrency(report.afterCommission)} icon={<BarChart3 size={18} />} color="emerald" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">العقود النشطة</p>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.activeContractsCount.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <CalendarClock size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">إجمالي العقود الجارية حاليًا على عقارات هذا المالك.</p>
            </Card>

            <Card className="border border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">العقود القريبة من الانتهاء</p>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.expiringContracts.length.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">عقود تحتاج تجديدًا أو متابعة خلال 45 يومًا.</p>
            </Card>

            <Card className="border border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">الفواتير المتأخرة</p>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.overdueInvoices.length.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                  <ShieldAlert size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">فواتير غير مسددة تجاوزت تاريخ الاستحقاق على عقارات المالك.</p>
            </Card>

            <Card className="border border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">طلبات الصيانة المفتوحة</p>
                  <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{report.openMaintenance.length.toLocaleString('ar')}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Wrench size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">طلبات تحتاج متابعة تشغيلية أو مالية على وحدات المالك.</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="border border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-800">مؤشرات التحليل السريع</h3>
              <p className="mt-1 text-sm text-slate-500">تصور بصري للعلاقة بين إجمالي التحصيل، المصروفات، وعمولة المكتب.</p>
              <div className="mt-6 space-y-4">
                {chartBars.map((bar) => (
                  <div key={bar.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700">{bar.label}</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(bar.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-800">ملخص الاتفاق مع المالك</h3>
              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>المالك</span><strong className="text-slate-800">{report.owner.name}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>عدد العقارات</span><strong className="text-slate-800">{report.properties.length.toLocaleString('ar')}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>عدد الوحدات</span><strong className="text-slate-800">{report.units.length.toLocaleString('ar')}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>نوع الاتفاق</span><strong className="text-slate-800">{report.commissionTypeLabel}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>قيمة الاتفاق</span><strong className="text-slate-800">{report.owner.commissionType === 'FIXED' ? formatCurrency(report.owner.commissionValue || 0) : `${report.owner.commissionValue || 0}%`}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span>مصروفات الخدمات</span><strong className="text-slate-800">{formatCurrency(report.utilityExpensesTotal)}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3"><span>عمولة المكتب المحتسبة</span><strong className="text-blue-700">{formatCurrency(report.officeShare)}</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3"><span>الرصيد النهائي بعد الخصم</span><strong className="text-emerald-700">{formatCurrency(report.outstandingBalance)}</strong></div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">التنبيهات التشغيلية</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أهم ما يحتاج متابعة يومية قبل تحويل مستحقات المالك.</p>
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
            </Card>

            <Card className="border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">سجلات تحتاج انتباهًا</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ملخص سريع لأقرب الاستحقاقات والحالات المفتوحة.</p>
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
            </Card>
          </div>

          <Card className="border border-slate-100 !p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-extrabold text-slate-800">الحركات التفصيلية</h3>
              <p className="mt-1 text-sm text-slate-500">يعرض الجدول التحصيل والمصروف والتسوية مع الرصيد قبل وبعد خصم العمولة.</p>
            </div>
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
                    <Td className={`text-left font-mono font-bold ${tx.gross >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{formatCurrency(tx.gross)}</Td>
                    <Td className="text-left font-mono font-bold text-amber-600">{tx.commissionDeduction ? formatCurrency(tx.commissionDeduction) : '—'}</Td>
                    <Td className="text-left font-mono font-bold text-emerald-700">{formatCurrency(tx.ownerNet)}</Td>
                    <Td className="text-left font-mono">{formatCurrency(tx.runningBefore)}</Td>
                    <Td className="text-left font-mono font-bold">{formatCurrency(tx.runningAfter)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrapper>
          </Card>

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
            {report && (
              <div className="space-y-6 text-right text-slate-800">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black">كشف حساب المالك</h2>
                  <p className="mt-2 text-sm text-slate-500">{report.owner.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {startDate || endDate
                      ? `الفترة: ${startDate ? formatDate(startDate) : 'من البداية'} إلى ${endDate ? formatDate(endDate) : 'حتى اليوم'}`
                      : 'الفترة: جميع الحركات المسجلة'}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold text-slate-500">إجمالي التحصيل</p>
                    <p className="mt-2 text-lg font-black text-slate-800">{formatCurrency(report.grossCollections)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold text-slate-500">عمولة المكتب</p>
                    <p className="mt-2 text-lg font-black text-amber-600">{formatCurrency(report.officeShare)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold text-slate-500">الصافي بعد العمولة</p>
                    <p className="mt-2 text-lg font-black text-emerald-700">{formatCurrency(report.afterCommission)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-right font-bold text-slate-500">التاريخ</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-500">البيان</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-500">الإجمالي</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-500">عمولة المكتب</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-500">صافي المالك</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transactions.slice(0, 18).map((tx) => (
                        <tr key={`preview-${tx.type}-${tx.id}`} className="border-t border-slate-100">
                          <td className="px-4 py-3">{formatDate(tx.date)}</td>
                          <td className="px-4 py-3 text-slate-700">{tx.label}</td>
                          <td className="px-4 py-3 text-left font-mono">{formatCurrency(tx.gross)}</td>
                          <td className="px-4 py-3 text-left font-mono">{tx.commissionDeduction ? formatCurrency(tx.commissionDeduction) : '—'}</td>
                          <td className="px-4 py-3 text-left font-mono font-bold">{formatCurrency(tx.ownerNet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {report.transactions.length > 18 && (
                  <p className="text-xs text-slate-400">
                    تعرض المعاينة أول {report.transactions.slice(0, 18).length.toLocaleString('ar')} حركة فقط. ملف PDF سيحتوي على جميع الحركات المطابقة للفلاتر.
                  </p>
                )}
              </div>
            )}
          </PrintPreviewModal>
        </>
      ) : (
        <EmptyState icon={CalendarRange} title="اختر مالكًا لعرض كشف الحساب" description="يمكنك بعد ذلك تصفية الفترة الزمنية، تصدير PDF، ومراجعة الأرصدة قبل وبعد خصم العمولة." />
      )}
    </div>
  );
};

export default OwnerLedgerReport;
