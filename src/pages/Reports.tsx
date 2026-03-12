import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  CalendarClock,
  CalendarRange,
  FileBarChart,
  History,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  BarChart3,
  Clock,
  Download,
  Landmark,
  Percent,
  Printer,
  ReceiptText,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import SimpleBarChart from '../components/ui/SimpleBarChart';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import PageHeader from '../components/ui/PageHeader';
import StatusPill from '../components/ui/StatusPill';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { formatCurrency, formatDate } from '../utils/helpers';
import { exportOwnerLedgerToPdf } from '../services/pdfService';
import {
  calculateAgingReport,
  calculateBalanceSheetData,
  calculateIncomeStatementData,
} from '../services/accountingService';
import type { Account, Invoice } from '../types';

// Extend the report tab type to include advanced reports with charts.
type ReportTab =
  | 'rent_roll'
  | 'owner'
  | 'tenant'
  | 'income_statement'
  | 'trial_balance'
  | 'balance_sheet'
  | 'aging'
  | 'tenant_statement'
  | 'office_profit'
  | 'revenue_expenses';

type TrialBalanceRow = {
  id: string;
  no: string;
  name: string;
  type: Account['type'];
  debit: number;
  credit: number;
  balance: number;
};

const reportCards: Array<{ title: string; subtitle: string; icon: React.ReactNode; tab: ReportTab }> = [
  {
    title: 'قائمة الإيجارات',
    subtitle: 'مستوى الإشغال، الذمم، وتواريخ انتهاء العقود في شاشة واحدة.',
    icon: <FileBarChart size={22} />,
    tab: 'rent_roll',
  },
  {
    title: 'الأرباح والخسائر',
    subtitle: 'تحليل الإيرادات والمصروفات وصافي دخل الفترة الحالية.',
    icon: <TrendingUp size={22} />,
    tab: 'income_statement',
  },
  {
    title: 'الميزانية العمومية',
    subtitle: 'صورة دقيقة للأصول والالتزامات وحقوق الملكية.',
    icon: <Scale size={22} />,
    tab: 'balance_sheet',
  },
  {
    title: 'أعمار الذمم',
    subtitle: 'تصنيف المديونيات حسب مدة التأخير لتوجيه التحصيل.',
    icon: <History size={22} />,
    tab: 'aging',
  },
  {
    title: 'ميزان المراجعة',
    subtitle: 'توازن الحسابات المدينة والدائنة مع الرصيد الختامي.',
    icon: <Calculator size={22} />,
    tab: 'trial_balance',
  },
  {
    title: 'كشف حساب مالك',
    subtitle: 'ملخص موقف الملاك المالية ومؤشرات الاستحقاق.',
    icon: <Wallet size={22} />,
    tab: 'owner',
  },
  {
    title: 'ملف المستأجرين النشطين',
    subtitle: 'ملخص العقود الجارية والذمم وتواريخ الانتهاء لكل مستأجر.',
    icon: <Users size={22} />,
    tab: 'tenant',
  },
  {
    title: 'كشف حساب المستأجر',
    subtitle: 'بيان بالتعاقدات والمدفوعات والمستحقات لكل مستأجر مع رسوم بيانية.',
    icon: <Users size={22} />,
    tab: 'tenant_statement',
  },
  {
    title: 'تقرير أرباح المكتب',
    subtitle: 'تحليل العمولات والمصروفات وصافي أرباح المكتب.',
    icon: <Wallet size={22} />,
    tab: 'office_profit',
  },
  {
    title: 'الإيرادات والمصروفات',
    subtitle: 'مقارنة بين إجمالي الإيرادات والمصروفات عبر رسم بياني.',
    icon: <BarChart3 size={22} />,
    tab: 'revenue_expenses',
  },
];

const cardIconMap: Record<ReportTab, string> = {
  rent_roll: 'bg-blue-50 text-blue-600',
  income_statement: 'bg-emerald-50 text-emerald-600',
  balance_sheet: 'bg-violet-50 text-violet-600',
  aging: 'bg-amber-50 text-amber-600',
  trial_balance: 'bg-slate-100 text-slate-700',
  owner: 'bg-indigo-50 text-indigo-600',
  tenant: 'bg-sky-50 text-sky-600',
  tenant_statement: 'bg-fuchsia-50 text-fuchsia-600',
  office_profit: 'bg-rose-50 text-rose-600',
  revenue_expenses: 'bg-amber-50 text-amber-600',
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const tableHeadCls = 'px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500';
const tableCellCls = 'px-4 py-3 text-sm text-slate-700';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useApp();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [activeTab, setActiveTab] = useState<ReportTab | null>(queryParams.get('tab') as ReportTab | null);

  const reportsOverview = useMemo(() => {
    const now = Date.now();
    const overdueInvoices = (db.invoices || []).filter((invoice) => {
      if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
      return new Date(invoice.dueDate).getTime() < now;
    });
    const expiringContracts = (db.contracts || []).filter((contract) => {
      if (contract.status !== 'ACTIVE') return false;
      const endDate = contract.endDate || contract.end;
      const endTs = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY;
      const daysLeft = Math.ceil((endTs - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 45;
    });

    return {
      totalReports: reportCards.length,
      owners: (db.owners || []).length,
      overdueInvoices: overdueInvoices.length,
      expiringContracts: expiringContracts.length,
    };
  }, [db]);

  const openReport = (tab: ReportTab) => {
    setActiveTab(tab);
    navigate(`/reports?tab=${tab}`);
  };

  const closeReport = () => {
    setActiveTab(null);
    navigate('/reports');
  };

  const titleMap: Record<ReportTab, string> = {
    rent_roll: 'قائمة الإيجارات',
    owner: 'كشف حساب الملاك',
    income_statement: 'الأرباح والخسائر',
    trial_balance: 'ميزان المراجعة',
    balance_sheet: 'الميزانية العمومية',
    aging: 'أعمار الذمم',
    tenant: 'ملف المستأجرين النشطين',
    tenant_statement: 'كشف حساب المستأجر',
    office_profit: 'تقرير أرباح المكتب',
    revenue_expenses: 'الإيرادات والمصروفات',
  };

  return (
    <div className="space-y-8">
      {!activeTab ? (
        <>
          <PageHeader
            title="مركز التقارير والذكاء المالي"
            description="تقارير تنفيذية ومحاسبية لإدارة الأداء، التحصيل، والمخاطر التشغيلية."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reportCards.map((card) => (
              <button
                key={card.tab}
                type="button"
                onClick={() => openReport(card.tab)}
                className="group rounded-2xl border border-slate-100 bg-white p-6 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${cardIconMap[card.tab]}`}>
                    {card.icon}
                  </div>
                  <ArrowLeft className="mt-1 h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-blue-500" />
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-lg font-extrabold text-slate-800">{card.title}</h3>
                  <p className="text-sm leading-6 text-slate-500">{card.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-5 animate-in slide-in-from-bottom-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeReport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              العودة إلى مركز التقارير
            </button>
            <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              {titleMap[activeTab as ReportTab]}
            </div>
          </div>

          <Card className="p-6 md:p-8">
            {activeTab === 'rent_roll' && <RentRoll />}
            {activeTab === 'income_statement' && <IncomeStatement />}
            {activeTab === 'balance_sheet' && <BalanceSheet />}
            {activeTab === 'trial_balance' && <TrialBalance />}
            {activeTab === 'aging' && <AgingReportView />}
            {activeTab === 'owner' && <OwnerSummaryReport />}
            {activeTab === 'tenant' && <TenantPortfolioReport />}
            {activeTab === 'tenant_statement' && <TenantStatementReport />}
            {activeTab === 'office_profit' && <OfficeProfitReport />}
            {activeTab === 'revenue_expenses' && <RevenueExpensesReport />}
          </Card>
        </div>
      )}
    </div>
  );
};

const ReportSectionHeader: React.FC<{ icon: React.ReactNode; title: string; description?: string; rightSlot?: React.ReactNode }> = ({
  icon,
  title,
  description,
  rightSlot,
}) => (
  <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
        {description && <p className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
    </div>
    {rightSlot}
  </div>
);

const EmptyStateCard: React.FC<{ title: string; description: string; icon?: React.ReactNode }> = ({ title, description, icon }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
      {icon ?? <FileBarChart size={24} />}
    </div>
    <h3 className="mt-4 text-lg font-bold text-slate-700">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
  </div>
);

const MetricCard: React.FC<{ title: string; value: string; tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'; icon?: React.ReactNode }> = ({
  title,
  value,
  tone = 'slate',
  icon,
}) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">{value}</p>
        </div>
        {icon && <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>}
      </div>
    </div>
  );
};

const RentRoll: React.FC = () => {
  const { db, contractBalances } = useApp();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const ownersMap = new Map(db.owners.map((owner) => [owner.id, owner]));
    const propertiesMap = new Map(db.properties.map((property) => [property.id, property]));
    const unitsMap = new Map(db.units.map((unit) => [unit.id, unit]));
    const tenantsMap = new Map(db.tenants.map((tenant) => [tenant.id, tenant]));
    const invoicesByContract = db.invoices.reduce<Record<string, Invoice[]>>((acc, invoice) => {
      if (!acc[invoice.contractId]) acc[invoice.contractId] = [];
      acc[invoice.contractId].push(invoice);
      return acc;
    }, {});

    return db.contracts
      .map((contract) => {
        const unit = unitsMap.get(contract.unitId);
        const property = unit ? propertiesMap.get(unit.propertyId) : undefined;
        const owner = property ? ownersMap.get(property.ownerId) : undefined;
        const tenant = tenantsMap.get(contract.tenantId);
        const contractInvoices = invoicesByContract[contract.id] || [];
        const overdueCount = contractInvoices.filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)).length;
        const balance = contractBalances[contract.id]?.balance || 0;
        const endDate = new Date(contract.end);
        const now = new Date();
        const daysToExpiry = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
        const riskLevel = balance > 0 ? 'financial' : daysToExpiry <= 30 ? 'expiry' : 'healthy';

        return {
          contract,
          unit,
          property,
          owner,
          tenant,
          balance,
          overdueCount,
          daysToExpiry,
          riskLevel,
        };
      })
      .filter((row) => row.unit && row.property && row.tenant)
      .filter((row) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [row.tenant?.name, row.unit?.name, row.property?.name, row.owner?.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (a.balance !== b.balance) return b.balance - a.balance;
        return new Date(a.contract.end).getTime() - new Date(b.contract.end).getTime();
      });
  }, [db, contractBalances, search]);

  const occupiedUnits = rows.length;
  const totalRent = rows.reduce((sum, row) => sum + row.contract.rent, 0);
  const totalArrears = rows.reduce((sum, row) => sum + Math.max(row.balance, 0), 0);

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<FileBarChart size={22} />}
        title="قائمة الإيجارات"
        description="تقرير تشغيلي شامل يربط بين العقود، الوحدات، الملاك، والمخاطر المالية الفورية."
        rightSlot={
          <div className="w-full max-w-sm">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المستأجر أو الوحدة أو العقار"
              className={inputCls}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="العقود المعروضة" value={occupiedUnits.toLocaleString('ar')} tone="blue" icon={<Users size={20} />} />
        <MetricCard title="إجمالي الإيجار الشهري" value={formatCurrency(totalRent)} tone="emerald" icon={<Wallet size={20} />} />
        <MetricCard title="إجمالي الذمم المفتوحة" value={formatCurrency(totalArrears)} tone="rose" icon={<AlertCircle size={20} />} />
      </div>

      {rows.length === 0 ? (
        <EmptyStateCard title="لا توجد عقود لعرضها" description="أضف عقودًا فعالة أو عدّل البحث لعرض بيانات قائمة الإيجارات." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th className={tableHeadCls}>العقار / الوحدة</th>
                <th className={tableHeadCls}>المستأجر</th>
                <th className={tableHeadCls}>المالك</th>
                <th className={tableHeadCls}>الإيجار</th>
                <th className={tableHeadCls}>الذمم</th>
                <th className={tableHeadCls}>ينتهي في</th>
                <th className={tableHeadCls}>الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const riskRowCls =
                  row.riskLevel === 'financial'
                    ? 'bg-rose-50/50'
                    : row.riskLevel === 'expiry'
                    ? 'bg-amber-50/50'
                    : '';

                return (
                  <tr key={row.contract.id} className={`${riskRowCls} transition-colors hover:bg-slate-50/80`}>
                    <td className={tableCellCls}>
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800">{row.property?.name}</div>
                        <div className="text-xs text-slate-500">الوحدة: {row.unit?.name}</div>
                      </div>
                    </td>
                    <td className={tableCellCls}>
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800">{row.tenant?.name}</div>
                        <div className="text-xs text-slate-500">{row.tenant?.phone || 'لا يوجد رقم'}</div>
                      </div>
                    </td>
                    <td className={tableCellCls}>{row.owner?.name || '—'}</td>
                    <td className={`${tableCellCls} font-mono font-bold`}>{formatCurrency(row.contract.rent)}</td>
                    <td className={tableCellCls}>
                      <div className="space-y-1">
                        <div className={`font-mono font-bold ${row.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(Math.max(row.balance, 0))}
                        </div>
                        <div className="text-xs text-slate-500">{row.overdueCount} فاتورة مفتوحة</div>
                      </div>
                    </td>
                    <td className={tableCellCls}>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800">{formatDate(row.contract.end)}</div>
                        <div className="text-xs text-slate-500">
                          {row.daysToExpiry >= 0 ? `${row.daysToExpiry} يوم` : `منتهي منذ ${Math.abs(row.daysToExpiry)} يوم`}
                        </div>
                      </div>
                    </td>
                    <td className={tableCellCls}>
                      {row.riskLevel === 'financial' ? (
                        <StatusPill status="OVERDUE">ذمم تحتاج تحصيل</StatusPill>
                      ) : row.riskLevel === 'expiry' ? (
                        <StatusPill status="PENDING">قريب الانتهاء</StatusPill>
                      ) : (
                        <StatusPill status="ACTIVE">مستقر</StatusPill>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const IncomeStatement: React.FC = () => {
  const { db } = useApp();
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const defaultEnd = today.toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const report = useMemo(() => calculateIncomeStatementData(db, startDate, endDate), [db, startDate, endDate]);

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<TrendingUp size={22} />}
        title="تقرير الأرباح والخسائر"
        description="قراءة سريعة للإيرادات والمصروفات وصافي نتيجة الفترة المختارة."
        rightSlot={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="إجمالي الإيرادات" value={formatCurrency(report.totalRevenue)} tone="emerald" icon={<TrendingUp size={20} />} />
        <MetricCard title="إجمالي المصروفات" value={formatCurrency(report.totalExpense)} tone="rose" icon={<TrendingDown size={20} />} />
        <MetricCard title="صافي النتيجة" value={formatCurrency(report.netIncome)} tone={report.netIncome >= 0 ? 'blue' : 'amber'} icon={<Wallet size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800">الإيرادات</h3>
              <p className="text-sm text-slate-500">الحسابات ذات الرصيد الدائن ضمن الفترة المحددة.</p>
            </div>
          </div>
          {report.revenues.length === 0 ? (
            <EmptyStateCard title="لا توجد إيرادات مسجلة" description="لا توجد قيود إيرادات ضمن الفترة المحددة." icon={<TrendingUp size={22} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={tableHeadCls}>رقم الحساب</th>
                    <th className={tableHeadCls}>الحساب</th>
                    <th className={tableHeadCls}>الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.revenues.map((item) => (
                    <tr key={item.no} className="hover:bg-slate-50/80">
                      <td className={`${tableCellCls} font-mono`}>{item.no}</td>
                      <td className={tableCellCls}>{item.name}</td>
                      <td className={`${tableCellCls} font-mono font-bold text-emerald-700`}>{formatCurrency(item.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
              <TrendingDown size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800">المصروفات</h3>
              <p className="text-sm text-slate-500">كل ما تم تحميله على المكتب أو الوحدات ضمن الفترة.</p>
            </div>
          </div>
          {report.expenses.length === 0 ? (
            <EmptyStateCard title="لا توجد مصروفات مسجلة" description="لا توجد قيود مصروفات ضمن الفترة المحددة." icon={<TrendingDown size={22} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={tableHeadCls}>رقم الحساب</th>
                    <th className={tableHeadCls}>الحساب</th>
                    <th className={tableHeadCls}>الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.expenses.map((item) => (
                    <tr key={item.no} className="hover:bg-slate-50/80">
                      <td className={`${tableCellCls} font-mono`}>{item.no}</td>
                      <td className={tableCellCls}>{item.name}</td>
                      <td className={`${tableCellCls} font-mono font-bold text-rose-700`}>{formatCurrency(item.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const AgingReportView: React.FC = () => {
  const { db } = useApp();
  const data = useMemo(() => calculateAgingReport(db), [db]);

  const overdueTotal = data.reduce((sum, item) => sum + item.totalDue, 0);

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<AlertCircle size={22} />}
        title="تحليل أعمار الذمم"
        description="تصنيف الذمم حسب مدة التأخير لمساعدة فريق التحصيل على تحديد الأولويات."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="إجمالي الذمم" value={formatCurrency(overdueTotal)} tone="rose" icon={<Wallet size={20} />} />
        <MetricCard title="عدد المستأجرين" value={data.length.toLocaleString('ar')} tone="blue" icon={<Users size={20} />} />
        <MetricCard title="أعلى 30+ يوم" value={formatCurrency(data.reduce((s, d) => s + d.thirtyPlus, 0))} tone="amber" icon={<History size={20} />} />
        <MetricCard title="أعلى 90+ يوم" value={formatCurrency(data.reduce((s, d) => s + d.ninetyPlus, 0))} tone="rose" icon={<AlertCircle size={20} />} />
      </div>

      {data.length === 0 ? (
        <EmptyStateCard title="لا توجد ذمم مستحقة" description="جميع حسابات المستأجرين في وضع ممتاز حالياً." icon={<History size={22} />} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th className={tableHeadCls}>المستأجر</th>
                <th className={tableHeadCls}>الإجمالي</th>
                <th className={tableHeadCls}>حالي</th>
                <th className={tableHeadCls}>30+</th>
                <th className={tableHeadCls}>60+</th>
                <th className={tableHeadCls}>90+</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.tenantName} className="hover:bg-slate-50/80">
                  <td className={`${tableCellCls} font-bold text-slate-800`}>{row.tenantName}</td>
                  <td className={`${tableCellCls} font-mono font-black text-slate-900`}>{formatCurrency(row.totalDue)}</td>
                  <td className={`${tableCellCls} font-mono text-slate-500`}>{formatCurrency(row.current)}</td>
                  <td className={`${tableCellCls} font-mono font-semibold text-amber-700`}>{formatCurrency(row.thirtyPlus)}</td>
                  <td className={`${tableCellCls} font-mono font-semibold text-orange-600`}>{formatCurrency(row.sixtyPlus)}</td>
                  <td className={`${tableCellCls} font-mono font-black text-rose-700`}>{formatCurrency(row.ninetyPlus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const BalanceSheet: React.FC = () => {
  const { db } = useApp();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const data = useMemo(() => calculateBalanceSheetData(db, date), [db, date]);

  const SectionCard: React.FC<{
    title: string;
    tone: 'blue' | 'rose' | 'violet';
    rows: Array<{ no: string; name: string; balance: number }>;
    total: number;
  }> = ({ title, tone, rows, total }) => {
    const toneMap = {
      blue: 'bg-blue-50 text-blue-700',
      rose: 'bg-rose-50 text-rose-700',
      violet: 'bg-violet-50 text-violet-700',
    } as const;

    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
          <div className={`rounded-xl px-3 py-1 text-xs font-bold ${toneMap[tone]}`}>{formatCurrency(Math.abs(total))}</div>
        </div>
        {rows.length === 0 ? (
          <EmptyStateCard title={`لا توجد أرصدة ضمن ${title}`} description="لم يتم العثور على قيود محاسبية مرتبطة بهذه المجموعة حتى التاريخ المحدد." />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.no} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div>
                  <div className="font-semibold text-slate-800">{row.name}</div>
                  <div className="text-xs font-mono text-slate-500">{row.no}</div>
                </div>
                <div className="font-mono font-bold text-slate-800">{formatCurrency(Math.abs(row.balance))}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<Scale size={22} />}
        title="الميزانية العمومية"
        description="صورة محاسبية فورية حتى التاريخ المختار توضح هيكل الأصول والالتزامات وحقوق الملكية."
        rightSlot={<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="الأصول" tone="blue" rows={data.assets} total={data.totalAssets} />
        <div className="space-y-6">
          <SectionCard title="الالتزامات" tone="rose" rows={data.liabilities} total={data.totalLiabilities} />
          <SectionCard title="حقوق الملكية" tone="violet" rows={data.equity} total={data.totalEquity} />
        </div>
      </div>
    </div>
  );
};

const TrialBalance: React.FC = () => {
  const { db } = useApp();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const rows = useMemo<TrialBalanceRow[]>(() => {
    const end = new Date(date);
    const accountMap = new Map(db.accounts.map((account) => [account.id, account]));
    const aggregates = new Map<string, TrialBalanceRow>();

    db.accounts.forEach((account) => {
      aggregates.set(account.id, {
        id: account.id,
        no: account.no,
        name: account.name,
        type: account.type,
        debit: 0,
        credit: 0,
        balance: 0,
      });
    });

    db.journalEntries
      .filter((entry) => new Date(entry.date) <= end)
      .forEach((entry) => {
        const bucket = aggregates.get(entry.accountId);
        if (!bucket) return;
        if (entry.type === 'DEBIT') bucket.debit += entry.amount;
        else bucket.credit += entry.amount;
      });

    return Array.from(aggregates.values())
      .map((row) => {
        const account = accountMap.get(row.id);
        return {
          ...row,
          balance: row.debit - row.credit,
          type: account?.type || row.type,
        };
      })
      .filter((row) => row.debit !== 0 || row.credit !== 0)
      .sort((a, b) => a.no.localeCompare(b.no));
  }, [db, date]);

  const totals = useMemo(
    () => ({
      debit: rows.reduce((sum, row) => sum + row.debit, 0),
      credit: rows.reduce((sum, row) => sum + row.credit, 0),
    }),
    [rows],
  );

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<Calculator size={22} />}
        title="ميزان المراجعة"
        description="مطابقة شاملة للحسابات المدينة والدائنة حتى تاريخ معين مع الرصيد الختامي لكل حساب."
        rightSlot={<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="إجمالي المدين" value={formatCurrency(totals.debit)} tone="blue" icon={<TrendingUp size={20} />} />
        <MetricCard title="إجمالي الدائن" value={formatCurrency(totals.credit)} tone="amber" icon={<TrendingDown size={20} />} />
        <MetricCard title="الفرق" value={formatCurrency(Math.abs(totals.debit - totals.credit))} tone={totals.debit === totals.credit ? 'emerald' : 'rose'} icon={<Scale size={20} />} />
      </div>

      {rows.length === 0 ? (
        <EmptyStateCard title="لا توجد قيود للفترة المختارة" description="لا توجد قيود محاسبية أو أرصدة فعالة حتى هذا التاريخ." icon={<Calculator size={22} />} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th className={tableHeadCls}>رقم الحساب</th>
                <th className={tableHeadCls}>الحساب</th>
                <th className={tableHeadCls}>النوع</th>
                <th className={tableHeadCls}>مدين</th>
                <th className={tableHeadCls}>دائن</th>
                <th className={tableHeadCls}>الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className={`${tableCellCls} font-mono`}>{row.no}</td>
                  <td className={tableCellCls}>{row.name}</td>
                  <td className={tableCellCls}>
                    <StatusPill status={row.type === 'ASSET' ? 'ACTIVE' : row.type === 'LIABILITY' ? 'VOID' : 'PENDING'}>{row.type}</StatusPill>
                  </td>
                  <td className={`${tableCellCls} font-mono`}>{formatCurrency(row.debit)}</td>
                  <td className={`${tableCellCls} font-mono`}>{formatCurrency(row.credit)}</td>
                  <td className={`${tableCellCls} font-mono font-bold ${row.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                    {formatCurrency(Math.abs(row.balance))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className={`${tableCellCls} font-black`} colSpan={3}>الإجمالي</td>
                <td className={`${tableCellCls} font-mono font-black`}>{formatCurrency(totals.debit)}</td>
                <td className={`${tableCellCls} font-mono font-black`}>{formatCurrency(totals.credit)}</td>
                <td className={`${tableCellCls} font-mono font-black ${totals.debit === totals.credit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {totals.debit === totals.credit ? 'متوازن' : formatCurrency(Math.abs(totals.debit - totals.credit))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};


const TenantPortfolioReport: React.FC = () => {
  const { db, contractBalances } = useApp();
  const rows = useMemo(() => {
    const unitMap = new Map(db.units.map((unit) => [unit.id, unit]));
    const propertyMap = new Map(db.properties.map((property) => [property.id, property]));
    return db.tenants
      .map((tenant) => {
        const activeContracts = db.contracts.filter((contract) => contract.tenantId === tenant.id && contract.status === 'ACTIVE');
        const totalDue = activeContracts.reduce((sum, contract) => sum + (contractBalances[contract.id]?.balance || 0), 0);
        const nextEnding = activeContracts
          .map((contract) => contract.end)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

        return {
          tenant,
          contracts: activeContracts.map((contract) => {
            const unit = unitMap.get(contract.unitId);
            const property = unit ? propertyMap.get(unit.propertyId) : undefined;
            return { contract, unit, property, balance: contractBalances[contract.id]?.balance || 0 };
          }),
          totalDue,
          nextEnding,
        };
      })
      .filter((row) => row.contracts.length > 0)
      .sort((a, b) => b.totalDue - a.totalDue || a.tenant.name.localeCompare(b.tenant.name));
  }, [db, contractBalances]);

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<Users size={22} />}
        title="المستأجرون النشطون"
        description="مراجعة العقود النشطة والمبالغ المستحقة وتاريخ أقرب انتهاء لكل مستأجر."
      />

      {rows.length === 0 ? (
        <EmptyStateCard title="لا يوجد مستأجرون بعقود نشطة" description="ستظهر هنا المحافظ النشطة لكل مستأجر بمجرد ربطهم بعقود فعّالة." icon={<Users size={22} />} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th className={tableHeadCls}>المستأجر</th>
                <th className={tableHeadCls}>عدد العقود</th>
                <th className={tableHeadCls}>الوحدات / العقارات</th>
                <th className={tableHeadCls}>أقرب انتهاء</th>
                <th className={tableHeadCls}>الرصيد المستحق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ tenant, contracts, totalDue, nextEnding }) => (
                <tr key={tenant.id} className="hover:bg-slate-50/80">
                  <td className={tableCellCls}>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800">{tenant.name}</div>
                      <div className="text-xs text-slate-500">{tenant.phone || tenant.email || 'لا توجد وسيلة تواصل'}</div>
                    </div>
                  </td>
                  <td className={tableCellCls}>{contracts.length.toLocaleString('ar')}</td>
                  <td className={tableCellCls}>
                    <div className="space-y-1 text-xs text-slate-500">
                      {contracts.slice(0, 2).map(({ unit, property, contract }) => (
                        <div key={contract.id}>
                          <span className="font-semibold text-slate-700">{unit?.name || 'وحدة'}</span>
                          <span> — {property?.name || 'عقار غير معروف'}</span>
                        </div>
                      ))}
                      {contracts.length > 2 && <div>+{(contracts.length - 2).toLocaleString('ar')} وحدات إضافية</div>}
                    </div>
                  </td>
                  <td className={tableCellCls}>{nextEnding ? formatDate(nextEnding) : '—'}</td>
                  <td className={`${tableCellCls} font-mono font-bold ${totalDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(totalDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const OwnerSummaryReport: React.FC = () => {
  const { db, ownerBalances } = useApp();
  const rows = useMemo(
    () =>
      db.owners
        .map((owner) => {
          const stats = ownerBalances[owner.id];
          const properties = db.properties.filter((property) => property.ownerId === owner.id).length;
          return {
            owner,
            stats,
            properties,
          };
        })
        .sort((a, b) => (b.stats?.net || 0) - (a.stats?.net || 0)),
    [db, ownerBalances],
  );

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<Wallet size={22} />}
        title="ملخص حسابات الملاك"
        description="متابعة صافي المستحقات، التحصيلات، وتوزيع المحفظة العقارية لكل مالك."
      />

      {rows.length === 0 ? (
        <EmptyStateCard title="لا يوجد ملاك بعد" description="أضف ملاكًا إلى النظام لعرض ملخص الحسابات والمستحقات." icon={<Wallet size={22} />} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th className={tableHeadCls}>المالك</th>
                <th className={tableHeadCls}>العقارات</th>
                <th className={tableHeadCls}>التحصيلات</th>
                <th className={tableHeadCls}>المصروفات</th>
                <th className={tableHeadCls}>التسويات</th>
                <th className={tableHeadCls}>حصة المكتب</th>
                <th className={tableHeadCls}>الصافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ owner, stats, properties }) => (
                <tr key={owner.id} className="hover:bg-slate-50/80">
                  <td className={tableCellCls}>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800">{owner.name}</div>
                      <div className="text-xs text-slate-500">{owner.phone || owner.email || 'لا توجد بيانات تواصل'}</div>
                    </div>
                  </td>
                  <td className={tableCellCls}>{properties.toLocaleString('ar')}</td>
                  <td className={`${tableCellCls} font-mono`}>{formatCurrency(stats?.collections || 0)}</td>
                  <td className={`${tableCellCls} font-mono`}>{formatCurrency(stats?.expenses || 0)}</td>
                  <td className={`${tableCellCls} font-mono`}>{formatCurrency(stats?.settlements || 0)}</td>
                  <td className={`${tableCellCls} font-mono`}>{formatCurrency(stats?.officeShare || 0)}</td>
                  <td className={`${tableCellCls} font-mono font-bold ${(stats?.net || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(stats?.net || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * تقرير كشف حساب المستأجر.
 * يعرض عدد العقود والمدفوعات والمستحقات لكل مستأجر ويتضمن رسم بياني لأعلى المستحقات.
 */
const TenantStatementReport: React.FC = () => {
  const { db } = useApp();

  // إعداد بيانات المستأجرين: عدد العقود، إجمالي المدفوعات، إجمالي المستحقات، وأقرب موعد استحقاق.
  const statements = useMemo(() => {
    return (db.tenants || []).map((tenant) => {
      const tenantContracts = (db.contracts || []).filter((c) => c.tenantId === tenant.id);
      const contractIds = tenantContracts.map((c) => c.id);
      // Sum all posted receipts for these contracts
      const payments = (db.receipts || [])
        .filter((r) => contractIds.includes(r.contractId) && r.status !== 'VOID')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      // Consider invoices that are not void; due amount = amount - paidAmount
      const tenantInvoices = (db.invoices || []).filter((i) => contractIds.includes(i.contractId) && i.status !== 'VOID');
      const unpaidInvoices = tenantInvoices.filter((i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID' || i.status === 'OVERDUE');
      const dues = unpaidInvoices.reduce((sum, inv) => sum + Math.max(inv.amount - (inv.paidAmount || 0), 0), 0);
      // Find earliest due date among unpaid invoices
      const nextDueInvoice = unpaidInvoices.reduce<null | typeof tenantInvoices[0]>((min, inv) => {
        if (!min) return inv;
        return new Date(inv.dueDate) < new Date(min.dueDate) ? inv : min;
      }, null);
      const nextDue = nextDueInvoice ? nextDueInvoice.dueDate : null;
      return {
        id: tenant.id,
        name: tenant.name,
        numContracts: contractIds.length,
        payments,
        dues,
        nextDue,
      };
    });
  }, [db]);

  // Aggregate totals for summary cards
  const totals = useMemo(() => {
    const totalTenants = statements.length;
    const totalPayments = statements.reduce((sum, s) => sum + s.payments, 0);
    const totalDues = statements.reduce((sum, s) => sum + s.dues, 0);
    const nextDueDates = statements
      .map((s) => s.nextDue)
      .filter(Boolean)
      .sort((a, b) => (new Date(a as string).getTime() - new Date(b as string).getTime()));
    const nextDue = nextDueDates.length > 0 ? (nextDueDates[0] as string) : null;
    return { totalTenants, totalPayments, totalDues, nextDue };
  }, [statements]);

  // Data for bar chart: top 5 tenants by outstanding dues
  const chartData = useMemo(() => {
    const sorted = [...statements]
      .filter((s) => s.dues > 0)
      .sort((a, b) => b.dues - a.dues)
      .slice(0, 5);
    return sorted.map((item) => ({
      label: item.name.split(' ')[0] || item.name,
      value: item.dues,
    }));
  }, [statements]);

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<Users size={22} />}
        title="كشف حساب المستأجر"
        description="رصد سريع لأداء المستأجرين على مستوى العقود والمدفوعات والمستحقات."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryStatCard title="عدد المستأجرين" value={totals.totalTenants.toLocaleString('ar')} icon={<Users size={20} />} color="blue" />
        <SummaryStatCard title="إجمالي المدفوعات" value={formatCurrency(totals.totalPayments)} icon={<TrendingUp size={20} />} color="emerald" />
        <SummaryStatCard title="إجمالي المستحقات" value={formatCurrency(totals.totalDues)} icon={<TrendingDown size={20} />} color="rose" />
        <SummaryStatCard
          title="أقرب استحقاق"
          value={totals.nextDue ? formatDate(totals.nextDue) : 'لا يوجد'}
          icon={<Clock size={20} />}
          color="amber"
        />
      </div>
      {chartData.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-4 text-lg font-extrabold text-slate-800">أعلى المستحقات حسب المستأجر</h3>
          <SimpleBarChart data={chartData} height={180} />
        </Card>
      )}
      <div className="overflow-x-auto">
        <TableWrapper>
          <thead className="bg-slate-50">
            <Tr>
              <Th>المستأجر</Th>
              <Th>العقود</Th>
              <Th>المدفوعات</Th>
              <Th>المستحقات</Th>
              <Th>أقرب استحقاق</Th>
            </Tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statements.map((s) => (
              <Tr key={s.id}>
                <Td className="font-bold text-slate-800">{s.name}</Td>
                <Td className="font-mono">{s.numContracts.toLocaleString('ar')}</Td>
                <Td className="font-mono font-bold text-emerald-700">{formatCurrency(s.payments)}</Td>
                <Td className="font-mono font-bold text-rose-700">{formatCurrency(s.dues)}</Td>
                <Td className="font-mono">{s.nextDue ? formatDate(s.nextDue) : '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>
    </div>
  );
};

/**
 * تقرير أرباح المكتب.
 * يعرض إجمالي العمولات والمصروفات وصافي الأرباح، ويقارنها عبر رسم بياني.
 */
const OfficeProfitReport: React.FC = () => {
  const { db, ownerBalances } = useApp();

  const data = useMemo(() => {
    // Total commission earned by office from owner balances
    const totalCommission = Object.values(ownerBalances || {}).reduce((sum, b: any) => sum + (b.officeShare || 0), 0);
    // Total expenses charged to the office (ignore void entries)
    const totalExpenses = (db.expenses || [])
      .filter((exp) => exp.status !== 'VOID' && exp.chargedTo === 'OFFICE')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    // Total receipts collected (all posted receipts)
    const totalReceipts = (db.receipts || [])
      .filter((r) => r.status !== 'VOID')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const netProfit = totalCommission - totalExpenses;
    // Group expenses by category
    const categories: Record<string, number> = {};
    (db.expenses || [])
      .filter((exp) => exp.status !== 'VOID' && exp.chargedTo === 'OFFICE')
      .forEach((exp) => {
        const key = exp.category || 'غير مصنف';
        categories[key] = (categories[key] || 0) + (exp.amount || 0);
      });
    return { totalCommission, totalExpenses, totalReceipts, netProfit, categories };
  }, [db, ownerBalances]);

  // Prepare bar chart dataset comparing commission, expenses and net profit
  const chartData = useMemo(() => {
    return [
      { label: 'العمولات', value: data.totalCommission, color: 'bg-blue-500' },
      { label: 'المصروفات', value: data.totalExpenses, color: 'bg-rose-500' },
      { label: 'الصافي', value: data.netProfit, color: data.netProfit >= 0 ? 'bg-emerald-500' : 'bg-amber-500' },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<Wallet size={22} />}
        title="تقرير أرباح المكتب"
        description="تحليل العمولات والمصروفات وصافي أرباح المكتب."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryStatCard title="إجمالي العمولات" value={formatCurrency(data.totalCommission)} icon={<Wallet size={20} />} color="blue" />
        <SummaryStatCard title="إجمالي المصروفات" value={formatCurrency(data.totalExpenses)} icon={<TrendingDown size={20} />} color="rose" />
        <SummaryStatCard title="إجمالي التحصيل" value={formatCurrency(data.totalReceipts)} icon={<TrendingUp size={20} />} color="emerald" />
        <SummaryStatCard
          title="صافي الأرباح"
          value={formatCurrency(data.netProfit)}
          icon={<BarChart3 size={20} />}
          color={data.netProfit >= 0 ? 'emerald' : 'amber'}
        />
      </div>
      <Card className="p-5">
        <h3 className="mb-4 text-lg font-extrabold text-slate-800">العمولات والمصروفات مقابل الصافي</h3>
        <SimpleBarChart data={chartData} height={180} />
      </Card>
      <Card className="p-5">
        <h3 className="mb-4 text-lg font-extrabold text-slate-800">تفاصيل المصروفات حسب الفئة</h3>
        {Object.keys(data.categories).length === 0 ? (
          <EmptyStateCard title="لا توجد مصروفات" description="لم يتم تسجيل مصروفات على المكتب." />
        ) : (
          <div className="overflow-x-auto">
            <TableWrapper>
              <thead className="bg-slate-50">
                <Tr>
                  <Th>الفئة</Th>
                  <Th>المبلغ</Th>
                </Tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(data.categories).map(([cat, amount]) => (
                  <Tr key={cat}>
                    <Td>{cat}</Td>
                    <Td className="font-mono font-bold">{formatCurrency(amount)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrapper>
          </div>
        )}
      </Card>
    </div>
  );
};

/**
 * تقرير الإيرادات والمصروفات.
 * يجمع بين تحصيل الإيجارات والعمولات كمصدر للإيرادات ويقارنها بالمصروفات عبر رسم بياني.
 */
const RevenueExpensesReport: React.FC = () => {
  const { db, ownerBalances } = useApp();
  const data = useMemo(() => {
    const totalReceipts = (db.receipts || [])
      .filter((r) => r.status !== 'VOID')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalCommission = Object.values(ownerBalances || {}).reduce((sum, b: any) => sum + (b.officeShare || 0), 0);
    const totalRevenue = totalReceipts + totalCommission;
    const totalExpenses = (db.expenses || []).filter((e) => e.status !== 'VOID').reduce((sum, e) => sum + (e.amount || 0), 0);
    const netDifference = totalRevenue - totalExpenses;
    // Revenue categories: receipts and commission
    const revenueCategories: Record<string, number> = {
      'تحصيل الإيجارات': totalReceipts,
      'العمولات': totalCommission,
    };
    // Expense categories: aggregate all
    const expenseCategories: Record<string, number> = {};
    (db.expenses || [])
      .filter((e) => e.status !== 'VOID')
      .forEach((e) => {
        const key = e.category || 'غير مصنف';
        expenseCategories[key] = (expenseCategories[key] || 0) + (e.amount || 0);
      });
    return { totalRevenue, totalExpenses, netDifference, revenueCategories, expenseCategories };
  }, [db, ownerBalances]);
  // Chart dataset
  const chartData = useMemo(() => {
    return [
      { label: 'الإيرادات', value: data.totalRevenue, color: 'bg-blue-500' },
      { label: 'المصروفات', value: data.totalExpenses, color: 'bg-rose-500' },
      { label: 'الصافي', value: data.netDifference, color: data.netDifference >= 0 ? 'bg-emerald-500' : 'bg-amber-500' },
    ];
  }, [data]);
  return (
    <div className="space-y-6">
      <ReportSectionHeader
        icon={<BarChart3 size={22} />}
        title="الإيرادات والمصروفات"
        description="مقارنة بين إجمالي الإيرادات (التحصيل والعمولات) والمصروفات للأداء المالي."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryStatCard title="إجمالي الإيرادات" value={formatCurrency(data.totalRevenue)} icon={<TrendingUp size={20} />} color="emerald" />
        <SummaryStatCard title="إجمالي المصروفات" value={formatCurrency(data.totalExpenses)} icon={<TrendingDown size={20} />} color="rose" />
        <SummaryStatCard
          title="الصافي"
          value={formatCurrency(data.netDifference)}
          icon={<Wallet size={20} />}
          color={data.netDifference >= 0 ? 'emerald' : 'amber'}
        />
      </div>
      <Card className="p-5">
        <h3 className="mb-4 text-lg font-extrabold text-slate-800">الإيرادات والمصروفات مقابل الصافي</h3>
        <SimpleBarChart data={chartData} height={180} />
      </Card>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-lg font-extrabold text-slate-800">تفاصيل الإيرادات</h3>
          {Object.keys(data.revenueCategories).length === 0 ? (
            <EmptyStateCard title="لا توجد إيرادات" description="لم يتم تسجيل أي إيرادات." />
          ) : (
            <div className="overflow-x-auto">
              <TableWrapper>
                <thead className="bg-slate-50">
                  <Tr>
                    <Th>الفئة</Th>
                    <Th>المبلغ</Th>
                  </Tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(data.revenueCategories).map(([cat, amount]) => (
                    <Tr key={cat}>
                      <Td>{cat}</Td>
                      <Td className="font-mono font-bold">{formatCurrency(amount)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-lg font-extrabold text-slate-800">تفاصيل المصروفات</h3>
          {Object.keys(data.expenseCategories).length === 0 ? (
            <EmptyStateCard title="لا توجد مصروفات" description="لم يتم تسجيل أي مصروفات." />
          ) : (
            <div className="overflow-x-auto">
              <TableWrapper>
                <thead className="bg-slate-50">
                  <Tr>
                    <Th>الفئة</Th>
                    <Th>المبلغ</Th>
                  </Tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(data.expenseCategories).map(([cat, amount]) => (
                    <Tr key={cat}>
                      <Td>{cat}</Td>
                      <Td className="font-mono font-bold">{formatCurrency(amount)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Reports;
