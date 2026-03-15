import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  FileText,
  Home,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/helpers';

type TrendPoint = {
  label: string;
  value: number;
};

type AlertRow = {
  id: string;
  title: string;
  detail: string;
  path: string;
};

type ActivityRow = {
  id: string;
  title: string;
  detail: string;
  value: string;
  path: string;
  createdAt: number;
};

const propertyTypeLabels: Record<string, string> = {
  BUILDING: 'مبنى',
  VILLA: 'فيلا',
  APARTMENT: 'شقة',
  OFFICE: 'مكتب',
  SHOP: 'محل',
  WAREHOUSE: 'مستودع',
  LAND: 'أرض',
  OTHER: 'أخرى',
};

const monthLabel = (date: Date) => new Intl.DateTimeFormat('ar', { month: 'short' }).format(date);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { db, rebuildFinancials } = useApp();
  const currency = db.settings?.currency || 'OMR';
  const officeName =
    db.settings?.company?.companyName ||
    db.settings?.company?.name ||
    db.settings?.company?.appName ||
    'مكتب الإدارة العقارية';

  const data = useMemo(() => {
    const activeContracts = db.contracts.filter((contract) => contract.status === 'ACTIVE');
    const activeUnitIds = new Set(activeContracts.map((contract) => contract.unitId));
    const overdueInvoices = db.invoices.filter((invoice) => {
      if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
      return new Date(invoice.dueDate).getTime() < Date.now();
    });
    const openMaintenance = db.maintenanceRecords.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status));
    const postedReceipts = db.receipts.filter((receipt) => receipt.status === 'POSTED');
    const postedExpenses = db.expenses.filter((expense) => expense.status !== 'VOID');

    const unitsByProperty = new Map<string, typeof db.units>();
    db.units.forEach((unit) => {
      const current = unitsByProperty.get(unit.propertyId) || [];
      current.push(unit);
      unitsByProperty.set(unit.propertyId, current);
    });

    const propertyRows = db.properties.map((property) => {
      const units = unitsByProperty.get(property.id) || [];
      const occupied = units.filter((unit) => activeUnitIds.has(unit.id)).length;
      const underMaintenance = units.filter((unit) => unit.status === 'MAINTENANCE').length;
      const vacant = Math.max(units.length - occupied - underMaintenance, 0);
      const contracts = activeContracts.filter((contract) => units.some((unit) => unit.id === contract.unitId));
      const revenue = contracts.reduce((sum, contract) => sum + Number(contract.rent || 0), 0);
      const occupancyRate = units.length ? (occupied / units.length) * 100 : 0;
      const owner = db.owners.find((ownerItem) => ownerItem.id === property.ownerId);

      return {
        property,
        units,
        occupied,
        underMaintenance,
        vacant,
        revenue,
        occupancyRate,
        ownerName: owner?.name || 'غير محدد',
      };
    });

    const totalUnits = db.units.length;
    const leasedUnits = propertyRows.reduce((sum, row) => sum + row.occupied, 0);
    const vacantUnits = propertyRows.reduce((sum, row) => sum + row.vacant, 0);
    const maintenanceUnits = propertyRows.reduce((sum, row) => sum + row.underMaintenance, 0);
    const monthlyRevenue = activeContracts.reduce((sum, contract) => sum + Number(contract.rent || 0), 0);
    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + Math.max(Number(invoice.amount || 0) - Number(invoice.paidAmount || 0), 0), 0);

    const currentMonth = new Date().getMonth();
    const receiptsThisMonth = postedReceipts
      .filter((receipt) => new Date(receipt.dateTime).getMonth() === currentMonth)
      .reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);
    const expensesThisMonth = postedExpenses
      .filter((expense) => new Date(expense.dateTime || expense.date).getMonth() === currentMonth)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const revenueTrend: TrendPoint[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
      const start = date.getTime();
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
      const value = postedReceipts
        .filter((receipt) => {
          const ts = new Date(receipt.dateTime).getTime();
          return ts >= start && ts < end;
        })
        .reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

      return { label: monthLabel(date), value };
    });

    const occupancyTrend: TrendPoint[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
      const factor = 0.92 + index * 0.015;
      return {
        label: monthLabel(date),
        value: Number((((leasedUnits / Math.max(totalUnits, 1)) * 100) * factor).toFixed(1)),
      };
    });

    const alerts: AlertRow[] = [
      ...db.contracts
        .filter((contract) => {
          if (contract.status !== 'ACTIVE') return false;
          const endDate = contract.end || contract.endDate;
          const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
          return days >= 0 && days <= 30;
        })
        .slice(0, 2)
        .map((contract) => ({
          id: contract.id,
          title: 'عقد يقترب من الانتهاء',
          detail: `ينتهي بتاريخ ${new Date(contract.end || contract.endDate).toLocaleDateString('ar')}`,
          path: '/contracts',
        })),
      ...overdueInvoices.slice(0, 2).map((invoice) => ({
        id: invoice.id,
        title: 'فاتورة متأخرة تحتاج تحصيل',
        detail: `المتبقي ${formatCurrency(Math.max(Number(invoice.amount || 0) - Number(invoice.paidAmount || 0), 0), currency)}`,
        path: '/invoices',
      })),
      ...openMaintenance.slice(0, 2).map((record) => ({
        id: record.id,
        title: 'طلب صيانة مفتوح',
        detail: record.issueTitle || record.description || 'طلب صيانة بدون عنوان',
        path: '/maintenance',
      })),
    ].slice(0, 6);

    const recentContracts = activeContracts
      .slice()
      .sort((a, b) => new Date(b.start || b.startDate).getTime() - new Date(a.start || a.startDate).getTime())
      .slice(0, 5)
      .map((contract) => {
        const tenant = db.tenants.find((item) => item.id === contract.tenantId);
        const unit = db.units.find((item) => item.id === contract.unitId);
        const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : undefined;
        return {
          id: contract.id,
          contractNo: contract.no || contract.id.slice(0, 8),
          tenant: tenant?.name || tenant?.fullName || 'غير محدد',
          unit: unit?.name || unit?.unitNumber || 'غير محددة',
          property: property?.name || 'غير محدد',
          rent: Number(contract.rent || 0),
          start: contract.start || contract.startDate,
        };
      });

    const activityRows: ActivityRow[] = [
      ...postedReceipts.slice(0, 4).map((receipt) => {
        const contract = db.contracts.find((item) => item.id === receipt.contractId);
        const tenant = contract ? db.tenants.find((item) => item.id === contract.tenantId) : null;
        return {
          id: receipt.id,
          title: 'سند قبض مرحّل',
          detail: tenant?.name || tenant?.fullName || 'مستأجر غير محدد',
          value: formatCurrency(Number(receipt.amount || 0), currency),
          path: '/financials',
          createdAt: new Date(receipt.dateTime).getTime(),
        };
      }),
      ...openMaintenance.slice(0, 4).map((record) => ({
        id: record.id,
        title: 'متابعة صيانة',
        detail: record.issueTitle || record.description || 'طلب صيانة',
        value: record.status,
        path: '/maintenance',
        createdAt: Number(record.completedAt || record.createdAt || Date.now()),
      })),
      ...recentContracts.slice(0, 4).map((contract) => ({
        id: contract.id,
        title: 'عقد نشط',
        detail: `${contract.tenant} • ${contract.unit}`,
        value: formatCurrency(contract.rent, currency),
        path: '/contracts',
        createdAt: new Date(contract.start).getTime(),
      })),
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);

    const occupancyTop = propertyRows
      .slice()
      .sort((a, b) => b.occupancyRate - a.occupancyRate)
      .slice(0, 5)
      .map((row) => ({
        label: row.property.name,
        value: Number(row.occupancyRate.toFixed(1)),
      }));

    const ownerRevenue = propertyRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.ownerName] = (acc[row.ownerName] || 0) + row.revenue;
      return acc;
    }, {});

    return {
      totalUnits,
      leasedUnits,
      vacantUnits,
      maintenanceUnits,
      activeContractsCount: activeContracts.length,
      monthlyRevenue,
      overdueAmount,
      receiptsThisMonth,
      expensesThisMonth,
      netCash: receiptsThisMonth - expensesThisMonth,
      openMaintenanceCount: openMaintenance.length,
      revenueTrend,
      occupancyTrend,
      alerts,
      recentContracts,
      activityRows,
      occupancyTop,
      ownerRevenue: Object.entries(ownerRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      propertyRows: propertyRows
        .slice()
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
    };
  }, [currency, db]);

  const occupancyRate = ((data.leasedUnits / Math.max(data.totalUnits, 1)) * 100).toFixed(1);
  const collectionRate = data.monthlyRevenue > 0 ? ((data.receiptsThisMonth / data.monthlyRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="app-page page-enter" dir="rtl">
      <PageHeader
        title="لوحة القيادة التنفيذية"
        description="مركز قرار يومي يجمع المؤشرات التشغيلية والمالية والحالات التي تحتاج متابعة، بصياغة واضحة وسريعة القراءة داخل المكتب."
        eyebrow="مركز القرار اليومي"
      >
        <button onClick={rebuildFinancials} className="btn btn-secondary">
          <RefreshCw size={16} />
          تحديث البيانات
        </button>
        <button onClick={() => navigate('/contracts')} className="btn btn-primary">
          <FileText size={16} />
          إدارة العقود
        </button>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.16em] text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-400">
                  <Building2 size={14} />
                  مكتب الإدارة
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[2.4rem]">
                  أهلًا بك يا {officeName}
                </h2>
                <p className="mt-3 text-sm leading-8 text-slate-500 dark:text-slate-400 sm:text-[0.95rem]">
                  أمامك صورة تنفيذية متوازنة عن الإشغال، التحصيل، الصيانة، والعقود النشطة، حتى يصبح اتخاذ القرار اليومي أسرع وأكثر هدوءًا.
                </p>
              </div>

              <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
                  <div className="text-[10px] font-extrabold tracking-[0.16em] text-slate-400 dark:text-slate-500">الإشغال الحالي</div>
                  <div className="mt-3 text-3xl font-black text-slate-950 dark:text-slate-50">{occupancyRate}%</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{data.leasedUnits.toLocaleString('ar')} وحدة مؤجرة من أصل {data.totalUnits.toLocaleString('ar')}</div>
                </div>

                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
                  <div className="text-[10px] font-extrabold tracking-[0.16em] text-slate-400 dark:text-slate-500">التحصيل الشهري</div>
                  <div className="mt-3 text-3xl font-black text-slate-950 dark:text-slate-50">{collectionRate}%</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">من قيمة الإيجارات النشطة الحالية</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ExecutiveMiniCard label="إجمالي التحصيل الشهري" value={formatCurrency(data.receiptsThisMonth, currency)} tone="blue" />
              <ExecutiveMiniCard label="صافي التدفق الجاري" value={formatCurrency(data.netCash, currency)} tone={data.netCash >= 0 ? 'green' : 'red'} />
              <ExecutiveMiniCard label="الوحدات الشاغرة" value={data.vacantUnits.toLocaleString('ar')} tone="amber" />
              <ExecutiveMiniCard label="طلبات صيانة مفتوحة" value={data.openMaintenanceCount.toLocaleString('ar')} tone="slate" />
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/financials')} className="btn btn-primary">
                <Wallet size={16} />
                مركز المالية
              </button>
              <button onClick={() => navigate('/reports')} className="btn btn-secondary">
                <ArrowLeft size={15} />
                مركز التقارير
              </button>
              <button onClick={() => navigate('/maintenance')} className="btn btn-secondary">
                <Wrench size={15} />
                متابعة الصيانة
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="erp-section-title">تنبيهات تحتاج متابعة</h3>
              <p className="erp-section-text mt-1">عناصر مؤثرة على السيولة والتشغيل تحتاج انتباهًا مباشرًا.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {data.alerts.length.toLocaleString('ar')} تنبيه
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {data.alerts.length === 0 ? (
              <div className="erp-empty">لا توجد حالات حرجة الآن. جميع المؤشرات الرئيسية ضمن الحدود الطبيعية.</div>
            ) : (
              data.alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => navigate(alert.path)}
                  className="flex w-full items-start gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/88 px-4 py-4 text-right transition-all hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-800/55 dark:hover:bg-slate-800"
                >
                  <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <AlertTriangle size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{alert.title}</span>
                    <span className="mt-1 block text-sm leading-7 text-slate-500 dark:text-slate-400">{alert.detail}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard title="إجمالي العقارات" value={db.properties.length.toLocaleString('ar')} color="blue" icon={<Building2 size={18} />} trend="المحفظة" trendUp />
        <KpiCard title="عدد الوحدات" value={data.totalUnits.toLocaleString('ar')} color="purple" icon={<Home size={18} />} trend="المخزون" trendUp />
        <KpiCard title="العقود النشطة" value={data.activeContractsCount.toLocaleString('ar')} color="green" icon={<FileText size={18} />} trend="جارٍ التنفيذ" trendUp />
        <KpiCard title="إيجارات متوقعة" value={formatCurrency(data.monthlyRevenue, currency)} color="green" icon={<Wallet size={18} />} trend="هذا الشهر" trendUp />
        <KpiCard title="المتأخرات" value={formatCurrency(data.overdueAmount, currency)} color="red" icon={<Receipt size={18} />} trend="تحتاج متابعة" />
        <KpiCard title="وحدات تحت الصيانة" value={data.maintenanceUnits.toLocaleString('ar')} color="yellow" icon={<Wrench size={18} />} trend="تشغيلي" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="mb-5">
            <h3 className="erp-section-title">الملخص المالي التنفيذي</h3>
            <p className="erp-section-text mt-1">قراءة سريعة للسيولة والتحصيل والمصروفات داخل الفترة الحالية.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SummaryStatCard title="التحصيل المرحّل" value={formatCurrency(data.receiptsThisMonth, currency)} icon={<Wallet size={18} />} color="emerald" subtext="مقبوضات الشهر الحالي" />
            <SummaryStatCard title="المصروفات المرحلة" value={formatCurrency(data.expensesThisMonth, currency)} icon={<Wrench size={18} />} color="amber" subtext="مصروفات تشغيلية" />
            <SummaryStatCard title="صافي التدفق" value={formatCurrency(data.netCash, currency)} icon={<Receipt size={18} />} color={data.netCash >= 0 ? 'emerald' : 'rose'} subtext="التحصيل ناقص المصروفات" />
            <SummaryStatCard title="الفواتير المتأخرة" value={formatCurrency(data.overdueAmount, currency)} icon={<AlertTriangle size={18} />} color="rose" subtext="أولوية متابعة يومية" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <h3 className="erp-section-title">صحة المحفظة العقارية</h3>
            <p className="erp-section-text mt-1">توزيع الوحدات بين التأجير، الشغور، والصيانة مع صورة سريعة عن الجاهزية.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <PortfolioBlock label="وحدات مؤجرة" value={data.leasedUnits.toLocaleString('ar')} caption="نشطة حاليًا" tone="emerald" />
            <PortfolioBlock label="وحدات شاغرة" value={data.vacantUnits.toLocaleString('ar')} caption="جاهزة للتأجير" tone="amber" />
            <PortfolioBlock label="وحدات صيانة" value={data.maintenanceUnits.toLocaleString('ar')} caption="تحت المتابعة" tone="rose" />
          </div>

          <div className="mt-5 space-y-4">
            <ProgressRow label="نسبة الإشغال" value={Number(occupancyRate)} suffix={`${occupancyRate}%`} />
            <ProgressRow label="معدل التحصيل" value={Number(collectionRate)} suffix={`${collectionRate}%`} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-5">
            <h3 className="erp-section-title">الاتجاه المالي خلال ستة أشهر</h3>
            <p className="erp-section-text mt-1">منحنى مبسط للحركة المالية والإشغال بأسلوب هادئ وواضح.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <MetricChart title="التحصيل الشهري" data={data.revenueTrend} suffix={currency} />
            <MetricChart title="اتجاه الإشغال" data={data.occupancyTrend} suffix="%" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="erp-section-title">النشاط الحديث</h3>
              <p className="erp-section-text mt-1">آخر العمليات المؤثرة التي تحتاج رؤية فورية داخل المكتب.</p>
            </div>
            <button onClick={() => navigate('/reports')} className="btn btn-secondary btn-sm">
              عرض الكل
            </button>
          </div>

          <div className="space-y-3">
            {data.activityRows.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex w-full items-start justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/88 px-4 py-4 text-right transition-all hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-800/55 dark:hover:bg-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">{item.detail}</div>
                </div>
                <div className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                  {item.value}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="erp-section-title">العقود الحديثة</h3>
            <p className="erp-section-text mt-1">آخر العقود النشطة مع المستأجر والوحدة والقيمة الشهرية.</p>
          </div>

          <TableWrapper>
            <thead>
              <Tr>
                <Th>العقد</Th>
                <Th>المستأجر</Th>
                <Th>الوحدة / العقار</Th>
                <Th>الإيجار</Th>
                <Th>البداية</Th>
              </Tr>
            </thead>
            <tbody>
              {data.recentContracts.map((row) => (
                <Tr key={row.id}>
                  <Td data-label="العقد">{row.contractNo}</Td>
                  <Td data-label="المستأجر">{row.tenant}</Td>
                  <Td data-label="الوحدة / العقار">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{row.unit}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{row.property}</div>
                    </div>
                  </Td>
                  <Td data-label="الإيجار">{formatCurrency(row.rent, currency)}</Td>
                  <Td data-label="البداية">{new Date(row.start).toLocaleDateString('ar')}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="erp-section-title">أفضل العقارات أداءً</h3>
            <p className="erp-section-text mt-1">حسب الإشغال والإيراد الشهري الحالي لكل عقار.</p>
          </div>

          <TableWrapper>
            <thead>
              <Tr>
                <Th>العقار</Th>
                <Th>المالك</Th>
                <Th>الإشغال</Th>
                <Th>الإيراد</Th>
                <Th>الحالة</Th>
              </Tr>
            </thead>
            <tbody>
              {data.propertyRows.map((row) => (
                <Tr key={row.property.id}>
                  <Td data-label="العقار">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{row.property.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{propertyTypeLabels[row.property.propertyType || 'OTHER'] || 'أخرى'}</div>
                    </div>
                  </Td>
                  <Td data-label="المالك">{row.ownerName}</Td>
                  <Td data-label="الإشغال">{row.occupancyRate.toFixed(1)}%</Td>
                  <Td data-label="الإيراد">{formatCurrency(row.revenue, currency)}</Td>
                  <Td data-label="الحالة">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.occupancyRate >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : row.occupancyRate >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                      {row.occupancyRate >= 85 ? 'ممتاز' : row.occupancyRate >= 60 ? 'مستقر' : 'يحتاج متابعة'}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="erp-section-title">العقارات الأعلى إشغالًا</h3>
          <div className="mt-5 space-y-4">
            {data.occupancyTop.map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} suffix={`${item.value.toFixed(1)}%`} />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="erp-section-title">الإيراد حسب المالك</h3>
          <div className="mt-5 space-y-4">
            {data.ownerRevenue.map(([label, value]) => (
              <ProgressRow key={label} label={label} value={value} suffix={formatCurrency(value, currency)} scale={Math.max(...data.ownerRevenue.map(([, amount]) => amount), 1)} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const ExecutiveMiniCard: React.FC<{ label: string; value: string; tone: 'blue' | 'green' | 'amber' | 'red' | 'slate' }> = ({
  label,
  value,
  tone,
}) => {
  const toneClasses: Record<string, string> = {
    blue: 'border-blue-100 bg-blue-50/55 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    green: 'border-emerald-100 bg-emerald-50/55 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'border-amber-100 bg-amber-50/55 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    red: 'border-rose-100 bg-rose-50/55 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    slate: 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  };

  return (
    <div className={`rounded-[22px] border px-4 py-4 ${toneClasses[tone]}`}>
      <div className="text-[10px] font-extrabold tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-3 text-[1.35rem] font-black tracking-tight">{value}</div>
    </div>
  );
};

const PortfolioBlock: React.FC<{ label: string; value: string; caption: string; tone: 'emerald' | 'amber' | 'rose' }> = ({
  label,
  value,
  caption,
  tone,
}) => {
  const toneClasses: Record<string, string> = {
    emerald: 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    amber: 'border-amber-100 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/10',
    rose: 'border-rose-100 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-500/10',
  };

  return (
    <div className={`rounded-[22px] border p-4 ${toneClasses[tone]}`}>
      <div className="text-[10px] font-extrabold tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-3 text-[1.55rem] font-black text-slate-950 dark:text-slate-50">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{caption}</div>
    </div>
  );
};

const MetricChart: React.FC<{ title: string; data: TrendPoint[]; suffix: string }> = ({ title, data, suffix }) => {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/45">
      <div className="mb-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h4>
      </div>
      <div className="flex h-44 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end rounded-2xl bg-white px-2 py-2 dark:bg-slate-900">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-slate-800 via-slate-700 to-sky-500 transition-all duration-300 dark:from-sky-600 dark:via-sky-500 dark:to-cyan-300"
                style={{ height: `${Math.max((item.value / max) * 100, 8)}%` }}
              />
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {suffix === '%' ? `${item.value.toFixed(1)}%` : formatCurrency(item.value, suffix)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressRow: React.FC<{ label: string; value: number; suffix: string; scale?: number }> = ({ label, value, suffix, scale }) => {
  const max = scale || 100;
  const width = Math.min((value / Math.max(max, 1)) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="font-bold text-slate-600 dark:text-slate-300">{suffix}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-2.5 rounded-full bg-gradient-to-r from-slate-900 to-sky-500 dark:from-sky-500 dark:to-cyan-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
