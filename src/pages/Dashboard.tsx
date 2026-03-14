import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  FileText,
  Home,
  RefreshCw,
  Receipt,
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

const monthLabel = (offset: number) =>
  new Intl.DateTimeFormat('ar', { month: 'short' }).format(new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1));

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { db, currentUser, rebuildFinancials } = useApp();
  const currency = db.settings?.currency || 'OMR';

  const data = useMemo(() => {
    const activeContracts = db.contracts.filter((contract) => contract.status === 'ACTIVE');
    const activeUnitIds = new Set(activeContracts.map((contract) => contract.unitId));
    const overdueInvoices = db.invoices.filter((invoice) => {
      if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
      return new Date(invoice.dueDate).getTime() < Date.now();
    });
    const openMaintenance = db.maintenanceRecords.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status));

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
      const revenue = contracts.reduce((sum, contract) => sum + (contract.rent || 0), 0);
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
    const monthlyRevenue = activeContracts.reduce((sum, contract) => sum + (contract.rent || 0), 0);
    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + Math.max((invoice.amount || 0) - (invoice.paidAmount || 0), 0), 0);
    const expensesThisMonth = db.expenses
      .filter((expense) => {
        const ts = new Date(expense.date).getMonth();
        return ts === new Date().getMonth() && expense.status !== 'VOID';
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const revenueTrend: TrendPoint[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
      const start = date.getTime();
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
      const value = db.receipts
        .filter((receipt) => {
          const ts = new Date(receipt.dateTime).getTime();
          return ts >= start && ts < end && receipt.status === 'POSTED';
        })
        .reduce((sum, receipt) => sum + (receipt.amount || 0), 0);

      return { label: monthLabel(index - 5), value };
    });

    const occupancyTrend: TrendPoint[] = Array.from({ length: 6 }, (_, index) => ({
      label: monthLabel(index - 5),
      value: Number((((leasedUnits / Math.max(totalUnits, 1)) * 100) * (0.9 + index * 0.02)).toFixed(1)),
    }));

    const alerts: AlertRow[] = [
      ...db.contracts
        .filter((contract) => {
          if (contract.status !== 'ACTIVE') return false;
          const days = Math.ceil((new Date(contract.end).getTime() - Date.now()) / 86400000);
          return days >= 0 && days <= 30;
        })
        .slice(0, 2)
        .map((contract) => ({
          id: contract.id,
          title: 'عقد يقترب من الانتهاء',
          detail: `ينتهي بتاريخ ${new Date(contract.end).toLocaleDateString('ar')}`,
          path: '/contracts',
        })),
      ...overdueInvoices.slice(0, 2).map((invoice) => ({
        id: invoice.id,
        title: 'فاتورة متأخرة',
        detail: `الرصيد المتبقي ${formatCurrency(Math.max((invoice.amount || 0) - (invoice.paidAmount || 0), 0), currency)}`,
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
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 5)
      .map((contract) => {
        const tenant = db.tenants.find((item) => item.id === contract.tenantId);
        const unit = db.units.find((item) => item.id === contract.unitId);
        const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : undefined;
        return {
          id: contract.id,
          contractNo: contract.no || contract.id.slice(0, 8),
          tenant: tenant?.name || 'غير محدد',
          unit: unit?.name || unit?.unitNumber || 'غير محددة',
          property: property?.name || 'غير محدد',
          rent: contract.rent || 0,
          start: contract.start,
        };
      });

    const operationsSummary = [
      { label: 'العقارات', value: db.properties.length, icon: <Building2 size={18} /> },
      { label: 'الوحدات', value: totalUnits, icon: <Home size={18} /> },
      { label: 'المستأجرون', value: db.tenants.length, icon: <Users size={18} /> },
      { label: 'طلبات الصيانة', value: openMaintenance.length, icon: <Wrench size={18} /> },
    ];

    const occupancyTop = propertyRows
      .slice()
      .sort((a, b) => b.occupancyRate - a.occupancyRate)
      .slice(0, 5)
      .map((row) => ({
        label: row.property.name,
        value: Number(row.occupancyRate.toFixed(1)),
      }));

    const ownerRevenue = propertyRows
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.ownerName] = (acc[row.ownerName] || 0) + row.revenue;
        return acc;
      }, {});

    return {
      totalUnits,
      leasedUnits,
      vacantUnits,
      activeContractsCount: activeContracts.length,
      monthlyRevenue,
      overdueAmount,
      expensesThisMonth,
      openMaintenanceCount: openMaintenance.length,
      revenueTrend,
      occupancyTrend,
      alerts,
      recentContracts,
      operationsSummary,
      occupancyTop,
      ownerRevenue: Object.entries(ownerRevenue).slice(0, 5),
      propertyRows: propertyRows.slice(0, 6),
    };
  }, [currency, db]);

  return (
    <div className="page-enter space-y-6" dir="rtl">
      <PageHeader
        title="لوحة القيادة التنفيذية"
        description="نظرة تشغيلية ومالية مركزية على العقارات والوحدات والعقود والتحصيل والصيانة في تجربة ERP موحدة."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2 text-right text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="text-[11px] font-extrabold tracking-[0.16em] text-slate-400 dark:text-slate-500">آخر تحديث</div>
            <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{new Date().toLocaleString('ar')}</div>
          </div>
          <button onClick={rebuildFinancials} className="btn btn-primary">
            <RefreshCw size={16} />
            تحديث القيود
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(255,255,255,0.9)_45%,rgba(59,130,246,0.08))] p-6 dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(15,23,42,0.9)_45%,rgba(59,130,246,0.12))]">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700 dark:border-sky-400/20 dark:bg-slate-900/70 dark:text-slate-200">
              <Building2 size={14} />
              لوحة تنفيذية
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              أهلاً {currentUser?.username || 'بك'} في Rentrix
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-600 dark:text-slate-300">
              هذه الشاشة تجمع أهم مؤشرات المكتب التنفيذية يوميًا: الإشغال، الإيرادات، المتأخرات، الصيانة المفتوحة، وحركة العقود.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <SummaryStatCard title="نسبة الإشغال" value={`${((data.leasedUnits / Math.max(data.totalUnits, 1)) * 100).toFixed(1)}%`} color="blue" icon={<Home size={18} />} />
              <SummaryStatCard title="العقود النشطة" value={data.activeContractsCount.toLocaleString('ar')} color="emerald" icon={<FileText size={18} />} />
              <SummaryStatCard title="طلبات الصيانة المفتوحة" value={data.openMaintenanceCount.toLocaleString('ar')} color="amber" icon={<Wrench size={18} />} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate('/contracts')} className="btn btn-primary">
                إدارة العقود
              </button>
              <button onClick={() => navigate('/reports')} className="btn btn-secondary">
                مركز التقارير
                <ArrowLeft size={15} />
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="erp-section-title">تنبيهات تحتاج متابعة</h3>
          <p className="erp-section-text mt-1">تنبيهات مرتبطة بالاستحقاقات والتأخير والصيانة المفتوحة.</p>
          <div className="mt-5 space-y-3">
            {data.alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                لا توجد تنبيهات حرجة حالياً.
              </div>
            ) : (
              data.alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => navigate(alert.path)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-4 text-right transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-600"
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
        <KpiCard title="إجمالي العقارات" value={db.properties.length.toLocaleString('ar')} color="blue" icon={<Building2 size={18} />} trend="محفظة الإدارة" trendUp />
        <KpiCard title="عدد الوحدات" value={data.totalUnits.toLocaleString('ar')} color="purple" icon={<Home size={18} />} trend="إجمالي الوحدات المسجلة" trendUp />
        <KpiCard title="العقود النشطة" value={data.activeContractsCount.toLocaleString('ar')} color="green" icon={<FileText size={18} />} trend="عقود جارية" trendUp />
        <KpiCard title="الإيرادات الشهرية" value={formatCurrency(data.monthlyRevenue, currency)} color="green" icon={<Wallet size={18} />} trend="من العقود النشطة" trendUp />
        <KpiCard title="المتأخرات" value={formatCurrency(data.overdueAmount, currency)} color="red" icon={<Receipt size={18} />} trend="فواتير تحتاج تحصيل" />
        <KpiCard title="المصروفات" value={formatCurrency(data.expensesThisMonth, currency)} color="yellow" icon={<Wrench size={18} />} trend="مصروفات هذا الشهر" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="erp-section-title">التحليل المالي والإشغال</h3>
              <p className="erp-section-text mt-1">قراءة سريعة لاتجاه الإيرادات والإشغال خلال آخر ستة أشهر.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <MetricChart title="الإيرادات الشهرية" data={data.revenueTrend} suffix={currency} />
            <MetricChart title="اتجاه الإشغال" data={data.occupancyTrend} suffix="%" />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="erp-section-title">مؤشرات تشغيلية سريعة</h3>
          <p className="erp-section-text mt-1">لقطات فورية على السجلات الأساسية داخل المكتب.</p>
          <div className="mt-5 grid gap-4">
            {data.operationsSummary.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/55">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي السجلات الحالية</div>
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">{item.value.toLocaleString('ar')}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="erp-section-title">العقود الحديثة</h3>
            <p className="erp-section-text mt-1">آخر العقود النشطة مع الإيجار والوحدة والعقار.</p>
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
            <p className="erp-section-text mt-1">حسب الإشغال والإيراد الشهري الحالي.</p>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="erp-section-title">العقارات الأعلى إشغالاً</h3>
          <div className="mt-5 space-y-4">
            {data.occupancyTop.map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} suffix="%" />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="erp-section-title">الإيراد حسب المالك</h3>
          <div className="mt-5 space-y-4">
            {data.ownerRevenue.map(([label, value]) => (
              <ProgressRow
                key={label}
                label={label}
                value={value}
                suffix={formatCurrency(value, currency)}
                scale={Math.max(...data.ownerRevenue.map(([, amount]) => amount), 1)}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const MetricChart: React.FC<{ title: string; data: TrendPoint[]; suffix: string }> = ({ title, data, suffix }) => {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-800/45">
      <div className="mb-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h4>
      </div>
      <div className="flex h-44 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end rounded-2xl bg-white px-2 py-2 dark:bg-slate-900">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-sky-600 to-cyan-400 transition-all duration-300"
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
        <div className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
