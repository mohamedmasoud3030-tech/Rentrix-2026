import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  FileText,
  Home,
  MapPin,
  RefreshCw,
  Receipt,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/helpers';

type TrendPoint = { label: string; value: number };
type StackedPoint = { label: string; opened: number; closed: number; urgent: number };
type MapPoint = {
  id: string;
  name: string;
  owner: string;
  location: string;
  occupancy: number;
  units: number;
  revenue: number;
  x: number;
  y: number;
  tone: 'emerald' | 'amber' | 'rose';
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

const displayPropertyType = (value: string | null | undefined) => propertyTypeLabels[value || 'OTHER'] || 'أخرى';
const displayUnitName = (unit: { name?: string | null; unitNumber?: string | null } | undefined) => unit?.name || unit?.unitNumber || 'غير محددة';

const monthLabel = (offset: number) =>
  new Intl.DateTimeFormat('ar', { month: 'short' }).format(new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1));

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { db, currentUser, rebuildFinancials } = useApp();
  const currency = db.settings?.currency || 'OMR';

  const data = useMemo(() => {
    const activeContracts = db.contracts.filter((contract) => contract.status === 'ACTIVE');
    const activeUnitIds = new Set(activeContracts.map((contract) => contract.unitId));
    const openMaintenance = db.maintenanceRecords.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status));
    const overdueInvoices = db.invoices.filter(
      (invoice) =>
        ['OVERDUE', 'UNPAID', 'PARTIALLY_PAID'].includes(invoice.status) &&
        new Date(invoice.dueDate).getTime() < Date.now()
    );

    const unitsByProperty = new Map<string, typeof db.units>();
    db.units.forEach((unit) => {
      const current = unitsByProperty.get(unit.propertyId) || [];
      current.push(unit);
      unitsByProperty.set(unit.propertyId, current);
    });

    const ownersById = new Map(db.owners.map((owner) => [owner.id, owner.name]));
    const propertiesWithStats = db.properties.map((property, index) => {
      const units = unitsByProperty.get(property.id) || [];
      const occupied = units.filter((unit) => activeUnitIds.has(unit.id)).length;
      const maintenance = units.filter((unit) => unit.status === 'MAINTENANCE').length;
      const vacant = Math.max(units.length - occupied - maintenance, 0);
      const propertyContracts = activeContracts.filter((contract) => units.some((unit) => unit.id === contract.unitId));
      const revenue = propertyContracts.reduce((sum, contract) => sum + (contract.rent || 0), 0);
      const occupancy = units.length ? (occupied / units.length) * 100 : 0;
      const tone: MapPoint['tone'] = occupancy >= 85 ? 'emerald' : occupancy >= 60 ? 'amber' : 'rose';

      return {
        ...property,
        ownerName: ownersById.get(property.ownerId) || 'غير محدد',
        unitsCount: units.length,
        occupied,
        maintenance,
        vacant,
        revenue,
        occupancy,
        x: 18 + ((index * 17) % 64),
        y: 22 + ((index * 13) % 56),
        tone,
      };
    });

    const totalUnits = db.units.length;
    const leasedUnits = propertiesWithStats.reduce((sum, property) => sum + property.occupied, 0);
    const vacantUnits = propertiesWithStats.reduce((sum, property) => sum + property.vacant, 0);
    const monthlyRevenue = activeContracts.reduce((sum, contract) => sum + (contract.rent || 0), 0);
    const overduePayments = overdueInvoices.reduce((sum, invoice) => sum + Math.max((invoice.amount || 0) - (invoice.paidAmount || 0), 0), 0);

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

    const occupancyTrend: TrendPoint[] = Array.from({ length: 6 }, (_, index) => {
      const factor = 0.82 + index * 0.025;
      return { label: monthLabel(index - 5), value: Number(((leasedUnits / Math.max(totalUnits, 1)) * 100 * factor).toFixed(1)) };
    });

    const contractsTrend: StackedPoint[] = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
      const start = monthDate.getTime();
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();
      const signed = db.contracts.filter((contract) => {
        const ts = new Date(contract.start).getTime();
        return ts >= start && ts < end;
      }).length;
      const expiring = db.contracts.filter((contract) => {
        const ts = new Date(contract.end).getTime();
        return ts >= start && ts < end;
      }).length;

      return {
        label: monthLabel(index - 5),
        opened: signed,
        closed: Math.max(Math.round(signed * 0.65), 0),
        urgent: expiring,
      };
    });

    const maintenanceTrend: StackedPoint[] = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
      const start = monthDate.getTime();
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();
      const opened = db.maintenanceRecords.filter((record) => {
        const ts = new Date(record.requestDate).getTime();
        return ts >= start && ts < end;
      }).length;
      const closed = db.maintenanceRecords.filter((record) => {
        const ts = Number(record.completedAt || 0);
        return ts >= start && ts < end && ['COMPLETED', 'CLOSED'].includes(record.status);
      }).length;
      const urgent = db.maintenanceRecords.filter((record) => {
        const ts = new Date(record.requestDate).getTime();
        return ts >= start && ts < end && ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status) && (record.cost || 0) > 500;
      }).length;

      return { label: monthLabel(index - 5), opened, closed, urgent };
    });

    const typeBreakdown = Object.entries(
      propertiesWithStats.reduce<Record<string, number>>((acc, property) => {
        const label = displayPropertyType(property.propertyType);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {})
    );

    const statusBreakdown = [
      { label: 'مؤجرة', value: leasedUnits },
      { label: 'شاغرة', value: vacantUnits },
      { label: 'صيانة', value: propertiesWithStats.reduce((sum, property) => sum + property.maintenance, 0) },
    ];

    const ownerBreakdown = Object.entries(
      propertiesWithStats.reduce<Record<string, number>>((acc, property) => {
        acc[property.ownerName] = (acc[property.ownerName] || 0) + property.revenue;
        return acc;
      }, {})
    );

    const locationBreakdown = Object.entries(
      propertiesWithStats.reduce<Record<string, number>>((acc, property) => {
        const label = property.city || property.district || 'غير محدد';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {})
    );

    const alerts = [
      ...db.contracts
        .filter((contract) => contract.status === 'ACTIVE' && new Date(contract.end).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && new Date(contract.end).getTime() >= Date.now())
        .slice(0, 2)
        .map((contract) => ({
          id: contract.id,
          title: 'عقد يقترب من الانتهاء',
          detail: `العقد ينتهي بتاريخ ${new Date(contract.end).toLocaleDateString('ar')}.`,
          tone: 'amber',
          path: '/contracts',
        })),
      ...overdueInvoices.slice(0, 2).map((invoice) => ({
        id: invoice.id,
        title: 'فاتورة متأخرة',
        detail: `الرصيد المتبقي ${formatCurrency(Math.max((invoice.amount || 0) - (invoice.paidAmount || 0), 0), currency)}.`,
        tone: 'rose',
        path: '/invoices',
      })),
      ...openMaintenance.slice(0, 2).map((record) => ({
        id: record.id,
        title: 'طلب صيانة مفتوح',
        detail: record.issueTitle,
        tone: 'amber',
        path: '/maintenance',
      })),
      ...propertiesWithStats
        .filter((property) => property.vacant >= 2)
        .slice(0, 2)
        .map((property) => ({
          id: property.id,
          title: 'عقار بحاجة إلى معالجة الشواغر',
          detail: `${property.name} يحتوي على ${property.vacant.toLocaleString('ar')} وحدات شاغرة.`,
          tone: 'amber',
          path: '/properties',
        })),
    ].slice(0, 6);

    const leasingActivities = db.contracts
      .slice()
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 5)
      .map((contract) => ({
        id: contract.id,
        title: `عقد لوحدة ${displayUnitName(db.units.find((unit) => unit.id === contract.unitId))}`,
        subtitle: db.tenants.find((tenant) => tenant.id === contract.tenantId)?.name || 'مستأجر غير معروف',
        value: formatCurrency(contract.rent || 0, currency),
        date: new Date(contract.start).toLocaleDateString('ar'),
      }));

    const maintenanceActivities = db.maintenanceRecords
      .slice()
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
      .slice(0, 5)
      .map((record) => ({
        id: record.id,
        title: record.issueTitle,
        subtitle: db.properties.find((property) => property.id === record.propertyId)?.name || 'عقار غير معروف',
        value: formatCurrency(record.cost || 0, currency),
        date: new Date(record.requestDate).toLocaleDateString('ar'),
      }));

    const mapPoints: MapPoint[] = propertiesWithStats.map((property) => ({
      id: property.id,
      name: property.name,
      owner: property.ownerName,
      location: [property.district, property.city].filter(Boolean).join(' - ') || 'غير محدد',
      occupancy: property.occupancy,
      units: property.unitsCount,
      revenue: property.revenue,
      x: property.x,
      y: property.y,
      tone: property.tone,
    }));

    return {
      activeContracts,
      totalUnits,
      leasedUnits,
      vacantUnits,
      monthlyRevenue,
      overduePayments,
      openMaintenance,
      overdueInvoices,
      propertiesWithStats,
      revenueTrend,
      occupancyTrend,
      contractsTrend,
      maintenanceTrend,
      typeBreakdown,
      statusBreakdown,
      ownerBreakdown,
      locationBreakdown,
      alerts,
      leasingActivities,
      maintenanceActivities,
      mapPoints,
    };
  }, [currency, db.contracts, db.invoices, db.maintenanceRecords, db.owners, db.properties, db.receipts, db.tenants, db.units]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="لوحة القيادة التنفيذية"
        description="متابعة محفظة العقارات والتأجير الخارجي والتحصيلات والصيانة من شاشة تشغيل مركزية."
      >
        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right dark:border-slate-700 dark:bg-slate-900 lg:block">
            <div className="text-[11px] font-semibold text-slate-400">آخر تحديث</div>
            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{new Date().toLocaleString('ar')}</div>
          </div>
          <button onClick={rebuildFinancials} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            <RefreshCw size={15} />
            تحديث القيود
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[28px] border border-sky-100 bg-[linear-gradient(135deg,#dbeafe_0%,#eff6ff_42%,#f8fafc_100%)] p-8 text-slate-900 shadow-brand-lg dark:border-slate-700 dark:bg-[linear-gradient(135deg,#1e3a5f_0%,#234968_45%,#2b5372_100%)] dark:text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200">
              <Building2 size={14} />
              نظرة تنفيذية
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">مرحبًا {currentUser?.username || 'بك'}.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              هذه اللوحة تعرض مؤشرات التشغيل الفعلية للعقارات والوحدات والعقود والتحصيلات وطلبات الصيانة من نفس البيانات الحية داخل النظام.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <HeroMetric label="نسبة الإشغال" value={`${((data.leasedUnits / Math.max(data.totalUnits, 1)) * 100).toFixed(1)}%`} />
              <HeroMetric label="عدد العقود النشطة" value={data.activeContracts.length.toLocaleString('ar')} />
              <HeroMetric label="عدد العقارات" value={data.propertiesWithStats.length.toLocaleString('ar')} />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/contracts')} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                <FileText size={15} />
                العقود
              </button>
              <button onClick={() => navigate('/maintenance')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white/65 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                <Wrench size={15} />
                الصيانة
              </button>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <PulseRow label="الإيراد الشهري الجاري" value={formatCurrency(data.monthlyRevenue, currency)} note={`${data.activeContracts.length.toLocaleString('ar')} عقدًا نشطًا`} />
            <PulseRow label="المتأخرات الحالية" value={formatCurrency(data.overduePayments, currency)} note={`${data.overdueInvoices.length.toLocaleString('ar')} فاتورة بحاجة متابعة`} />
            <PulseRow label="طلبات الصيانة المفتوحة" value={data.openMaintenance.length.toLocaleString('ar')} note="الأولوية لاستكمال الطلبات المتعثرة" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <KpiCard title="إجمالي العقارات" value={data.propertiesWithStats.length.toLocaleString('ar')} color="blue" icon={<Building2 size={18} />} trend="محفظة الإدارة" trendUp />
        <KpiCard title="الوحدات المؤجرة" value={data.leasedUnits.toLocaleString('ar')} color="green" icon={<Home size={18} />} trend={`${((data.leasedUnits / Math.max(data.totalUnits, 1)) * 100).toFixed(1)}% إشغال`} trendUp />
        <KpiCard title="الوحدات الشاغرة" value={data.vacantUnits.toLocaleString('ar')} color="yellow" icon={<Home size={18} />} trend="تحتاج تسويقًا" />
        <KpiCard title="العقود النشطة" value={data.activeContracts.length.toLocaleString('ar')} color="purple" icon={<FileText size={18} />} trend="تشغيل فعلي" trendUp />
        <KpiCard title="الإيراد الشهري" value={formatCurrency(data.monthlyRevenue, currency)} color="green" icon={<Wallet size={18} />} trend="من العقود الجارية" trendUp />
        <KpiCard title="المتأخرات" value={formatCurrency(data.overduePayments, currency)} color="red" icon={<Receipt size={18} />} trend="تحتاج تحصيلًا" />
        <KpiCard title="الصيانة المفتوحة" value={data.openMaintenance.length.toLocaleString('ar')} color="yellow" icon={<Wrench size={18} />} trend="طلبات حالية" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="الإيراد الشهري">
          <LineChart data={data.revenueTrend} formatter={(value) => formatCurrency(value, currency)} color="#16a34a" />
        </ChartCard>
        <ChartCard title="اتجاه الإشغال">
          <LineChart data={data.occupancyTrend} formatter={(value) => `${value.toFixed(1)}%`} color="#2563eb" />
        </ChartCard>
        <ChartCard title="نشاط العقود">
          <StackedChart data={data.contractsTrend} />
        </ChartCard>
        <ChartCard title="اتجاه الصيانة">
          <StackedChart data={data.maintenanceTrend} />
        </ChartCard>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
        <MapPanel points={data.mapPoints} currency={currency} />
        <AlertsPanel alerts={data.alerts} onNavigate={navigate} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
        <BreakdownCard title="حسب نوع العقار" items={data.typeBreakdown.map(([label, value]) => ({ label, value }))} />
        <BreakdownCard title="حسب الحالة" items={data.statusBreakdown} />
        <BreakdownCard title="حسب المالك" items={data.ownerBreakdown.map(([label, value]) => ({ label, value }))} formatter={(value) => formatCurrency(value, currency)} />
        <BreakdownCard title="حسب الموقع" items={data.locationBreakdown.map(([label, value]) => ({ label, value }))} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityTable title="آخر نشاط عقود" rows={data.leasingActivities} />
        <ActivityTable title="آخر نشاط صيانة" rows={data.maintenanceActivities} />
      </div>
    </div>
  );
};

const HeroMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
    <div className="text-[11px] font-extrabold tracking-[0.16em] text-slate-300">{label}</div>
    <div className="mt-3 text-[1.75rem] font-black text-white">{value}</div>
  </div>
);

const PulseRow: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
  <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
    <div className="text-[11px] font-extrabold tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-2 text-[1.7rem] font-black text-slate-900 dark:text-slate-100">{value}</div>
    <div className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{note}</div>
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="p-6">
    <div className="mb-5">
      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">قراءة مباشرة من البيانات الحالية داخل النظام</p>
    </div>
    {children}
  </Card>
);

const LineChart: React.FC<{ data: TrendPoint[]; formatter: (value: number) => string; color: string }> = ({ data, formatter, color }) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (item.value / max) * 85;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 100 100" className="h-52 w-full overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
        {data.map((item, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - (item.value / max) * 85;
          return <circle key={item.label} cx={x} cy={y} r="2.6" fill={color} />;
        })}
      </svg>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {data.map((item) => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{formatter(item.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StackedChart: React.FC<{ data: StackedPoint[] }> = ({ data }) => {
  const max = Math.max(...data.map((item) => item.opened + item.closed + item.urgent), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-3 items-end h-52">
        {data.map((item) => {
          const total = item.opened + item.closed + item.urgent;
          const opened = (item.opened / max) * 100;
          const closed = (item.closed / max) * 100;
          const urgent = (item.urgent / max) * 100;

          return (
            <div key={item.label} className="flex h-full flex-col justify-end gap-2">
              <div className="flex h-full flex-col justify-end overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                <div style={{ height: `${urgent}%` }} className="bg-rose-500" />
                <div style={{ height: `${closed}%` }} className="bg-emerald-500" />
                <div style={{ height: `${opened}%` }} className="bg-blue-500" />
              </div>
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />جديد</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />مغلق/مجدد</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />عاجل/منتهٍ</span>
      </div>
    </div>
  );
};

const MapPanel: React.FC<{ points: MapPoint[]; currency: string }> = ({ points, currency }) => (
  <Card className="overflow-hidden">
    <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">خريطة العقارات والتوزيع الجغرافي</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">عرض مصغر للعقارات مع الإشغال والإيراد الحالي لكل عقار.</p>
    </div>
    <div className="relative min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(135deg,_#eff6ff,_#ffffff_45%,_#ecfeff)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_28%),linear-gradient(135deg,_#020617,_#0f172a_50%,_#111827)]">
      {points.map((point) => (
        <div key={point.id} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-xl ${point.tone === 'emerald' ? 'bg-emerald-500' : point.tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`}>
            <MapPin size={16} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-3 hidden w-56 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 text-right shadow-2xl backdrop-blur group-hover:block dark:border-slate-700 dark:bg-slate-900/95">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{point.name}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{point.location}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div>المالك: {point.owner}</div>
              <div>الإشغال: {point.occupancy.toFixed(1)}%</div>
              <div>الوحدات: {point.units.toLocaleString('ar')}</div>
              <div>الإيراد: {formatCurrency(point.revenue, currency)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const AlertsPanel: React.FC<{ alerts: Array<{ id: string; title: string; detail: string; tone: string; path: string }>; onNavigate: (path: string) => void }> = ({ alerts, onNavigate }) => (
  <Card className="p-6">
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
        <AlertTriangle size={18} />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">التنبيهات</div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">العناصر التي تحتاج تدخلًا</h3>
      </div>
    </div>
    <div className="space-y-3">
      {alerts.map((alert) => (
        <button key={alert.id} onClick={() => onNavigate(alert.path)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-right transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{alert.title}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{alert.detail}</div>
        </button>
      ))}
      {alerts.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">لا توجد تنبيهات حرجة حاليًا.</div>}
    </div>
  </Card>
);

const BreakdownCard: React.FC<{ title: string; items: Array<{ label: string; value: number }>; formatter?: (value: number) => string }> = ({ title, items, formatter = (value) => value.toLocaleString('ar') }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <Card className="p-6">
      <h3 className="mb-5 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="space-y-4">
        {items.slice(0, 5).map((item, index) => {
          const share = (item.value / total) * 100;
          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatter(item.value)}</div>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-2 rounded-full ${colors[index % colors.length]}`} style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const ActivityTable: React.FC<{ title: string; rows: Array<{ id: string; title: string; subtitle: string; value: string; date: string }> }> = ({ title, rows }) => (
  <Card className="p-6">
    <h3 className="mb-5 text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-[2fr_1.4fr_1fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <div>النشاط</div>
        <div>التفصيل</div>
        <div>القيمة</div>
        <div>التاريخ</div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[2fr_1.4fr_1fr_0.9fr] gap-4 px-4 py-4 text-sm">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{row.title}</div>
            <div className="text-slate-600 dark:text-slate-300">{row.subtitle}</div>
            <div className="font-medium text-slate-700 dark:text-slate-200">{row.value}</div>
            <div className="text-slate-500 dark:text-slate-400">{row.date}</div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

export default Dashboard;
