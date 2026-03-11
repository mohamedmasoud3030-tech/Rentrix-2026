import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building, AlertCircle, Clock, Home, User, FileText, Wrench, Phone, MapPinned, LayoutGrid, Wallet } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Unit } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import { formatCurrency, formatDate } from '../utils/helpers';

type UnitStatus = 'vacant' | 'occupied' | 'expiring' | 'overdue';

interface UnitWithDetails extends Omit<Unit, 'status'> {
  status: UnitStatus;
  contractId?: string;
  tenantName?: string;
  tenantPhone?: string;
  contractEnd?: string;
  balance?: number;
}

const filterPillMap: Record<UnitStatus | 'all', string> = {
  all: 'bg-slate-100 text-slate-700',
  vacant: 'bg-blue-50 text-blue-700',
  occupied: 'bg-emerald-50 text-emerald-700',
  expiring: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
};

const PropertyMap: React.FC = () => {
  const { db, contractBalances } = useApp();
  const settings = db.settings;
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUnit, setSelectedUnit] = useState<UnitWithDetails | null>(null);

  const initialFilter = (searchParams.get('filter') as UnitStatus | null) || 'all';
  const [filter, setFilter] = useState<UnitStatus | 'all'>(initialFilter);

  // Search term for filtering properties and units. Persist to query params under 'search'.
  const initialKeyword = (searchParams.get('search') as string | null) || '';
  const [keyword, setKeyword] = useState<string>(initialKeyword);

  const propertiesWithUnits = useMemo(() => {
    const unitsWithDetails: UnitWithDetails[] = (db.units || []).map((unit) => {
      const activeContract = (db.contracts || []).find((contract) => contract.unitId === unit.id && contract.status === 'ACTIVE');
      if (!activeContract) return { ...unit, status: 'vacant' as UnitStatus };

      const contractData = contractBalances[activeContract.id];
      const tenant = (db.tenants || []).find((tenantRow) => tenantRow.id === activeContract.tenantId);
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + (settings.contractAlertDays || 30));
      const isExpiring = new Date(activeContract.end) <= alertDate;

      let status: UnitStatus = 'occupied';
      if ((contractData?.balance || 0) > 0) status = 'overdue';
      else if (isExpiring) status = 'expiring';

      return {
        ...unit,
        status,
        contractId: activeContract.id,
        tenantName: tenant?.name,
        tenantPhone: tenant?.phone || undefined,
        contractEnd: activeContract.end,
        balance: contractData?.balance || 0,
      };
    });

    return (db.properties || [])
      .map((property) => ({
        ...property,
        units: unitsWithDetails.filter((unit) => unit.propertyId === property.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db, contractBalances, settings.contractAlertDays]);

  const filteredProperties = useMemo(() => {
    let result = propertiesWithUnits;
    // Apply status filter first
    if (filter !== 'all') {
      result = result
        .map((property) => ({
          ...property,
          units: property.units.filter((unit) => unit.status === filter),
        }))
        .filter((property) => property.units.length > 0);
    }
    // Apply keyword search across property name, address/city, unit name and tenant name
    if (keyword && keyword.trim() !== '') {
      const kw = keyword.trim().toLowerCase();
      return result
        .map((property) => {
          const matchProperty =
            property.name.toLowerCase().includes(kw) ||
            (!!property.address && property.address.toLowerCase().includes(kw)) ||
            (!!property.city && property.city.toLowerCase().includes(kw));
          const filteredUnits = property.units.filter((unit) => {
            const tenantName = unit.tenantName || '';
            return (
              unit.name.toLowerCase().includes(kw) ||
              tenantName.toLowerCase().includes(kw) ||
              matchProperty
            );
          });
          if (filteredUnits.length > 0) {
            return { ...property, units: filteredUnits };
          }
          if (matchProperty) {
            return { ...property };
          }
          return null;
        })
        .filter(Boolean) as typeof propertiesWithUnits;
    }
    return result;
  }, [propertiesWithUnits, filter, keyword]);

  const statusFilters: { key: UnitStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'كل الوحدات' },
    { key: 'vacant', label: 'شاغرة' },
    { key: 'overdue', label: 'متأخرة' },
    { key: 'expiring', label: 'ستنتهي قريبًا' },
    { key: 'occupied', label: 'مؤجرة' },
  ];

  const stats = useMemo(() => {
    const allUnits = propertiesWithUnits.flatMap((property) => property.units);
    return {
      properties: propertiesWithUnits.length,
      units: allUnits.length,
      vacant: allUnits.filter((unit) => unit.status === 'vacant').length,
      risk: allUnits.filter((unit) => unit.status === 'overdue' || unit.status === 'expiring').length,
    };
  }, [propertiesWithUnits]);

  const handleFilterChange = (newFilter: UnitStatus | 'all') => {
    setFilter(newFilter);
    if (newFilter === 'all') searchParams.delete('filter');
    else searchParams.set('filter', newFilter);
    setSearchParams(searchParams);
  };

  // Update keyword in state and query string on change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="خريطة العقارات والوحدات" description="قراءة مرئية سريعة لحالة الوحدات والإشغال والمخاطر التشغيلية حسب كل عقار." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Building size={18} />} color="blue" title="العقارات" value={stats.properties.toLocaleString('ar')} />
        <SummaryStatCard icon={<LayoutGrid size={18} />} color="slate" title="الوحدات" value={stats.units.toLocaleString('ar')} />
        <SummaryStatCard icon={<Home size={18} />} color="emerald" title="الوحدات الشاغرة" value={stats.vacant.toLocaleString('ar')} />
        <SummaryStatCard icon={<AlertCircle size={18} />} color="amber" title="وحدات تحتاج متابعة" value={stats.risk.toLocaleString('ar')} />
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">لوحة الإشغال البصري</h2>
            <p className="mt-1 text-sm text-slate-500">اختر حالة الوحدة لعرضها بسرعة، ثم افتح البطاقة للحصول على العقد والمستأجر والمستحقات.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* حقل البحث لفلترة العقارات والوحدات */}
            <input
              type="search"
              value={keyword}
              onChange={handleSearchChange}
              placeholder="بحث عن عقار أو وحدة أو مستأجر"
              className="w-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
            />
            {statusFilters.map((statusFilter) => (
              <button
                key={statusFilter.key}
                type="button"
                onClick={() => handleFilterChange(statusFilter.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-bold transition-all ${filterPillMap[statusFilter.key]} ${
                  filter === statusFilter.key ? 'ring-2 ring-blue-200 ring-offset-2' : ''
                }`}
              >
                {statusFilter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <EmptyState icon={MapPinned} title="لا توجد نتائج في هذا المنظور" description="جرّب تغيير فلتر الحالة أو أضف وحدات وعقودًا جديدة لعرضها على الخريطة." />
        ) : (
          <div className="space-y-6">
            {filteredProperties.map((property) => (
              <div key={property.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">{property.name}</h3>
                    <p className="text-sm text-slate-500">{property.address || property.city || 'بدون عنوان مفصل'}</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                    {property.units.length.toLocaleString('ar')} وحدة
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                  {property.units.map((unit) => (
                    <UnitCard key={unit.id} unit={unit} onClick={() => setSelectedUnit(unit)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedUnit && <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />}
    </div>
  );
};

const UnitCard: React.FC<{ unit: UnitWithDetails; onClick: () => void }> = ({ unit, onClick }) => {
  const statusClassMap: Record<UnitStatus, string> = {
    vacant: 'border-blue-200 bg-blue-50 text-blue-700',
    occupied: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    expiring: 'border-amber-200 bg-amber-50 text-amber-700',
    overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  const labelMap: Record<UnitStatus, string> = {
    vacant: 'شاغرة',
    occupied: 'مؤجرة',
    expiring: 'تنتهي قريبًا',
    overdue: 'متأخرة',
  };

  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusClassMap[unit.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-black">{unit.name}</div>
          <div className="mt-1 text-[11px] font-bold opacity-80">{labelMap[unit.status]}</div>
        </div>
        {unit.status === 'overdue' ? <AlertCircle size={16} /> : unit.status === 'expiring' ? <Clock size={16} /> : <Home size={16} />}
      </div>
      <div className="mt-3 text-xs opacity-80">{unit.tenantName || 'بدون مستأجر حالي'}</div>
    </button>
  );
};

const UnitDetailModal: React.FC<{ unit: UnitWithDetails; onClose: () => void }> = ({ unit, onClose }) => {
  const navigate = useNavigate();

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`تفاصيل الوحدة: ${unit.name}`}>
      <div className="space-y-5">
        <div className={`rounded-2xl border p-4 ${filterPillMap[unit.status]}`}>
          <div className="flex items-center gap-2 font-extrabold">{unit.status === 'vacant' ? <Home size={18} /> : <AlertCircle size={18} />} {unit.tenantName || 'الوحدة متاحة للتأجير'}</div>
          <p className="mt-2 text-sm leading-6">{unit.status === 'vacant' ? 'يمكن الانتقال مباشرة إلى شاشة العقود لإنشاء عقد جديد لهذه الوحدة.' : 'تفاصيل العقد والمستأجر والموقف المالي تظهر أدناه لسرعة اتخاذ القرار.'}</p>
        </div>

        {unit.status !== 'vacant' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-bold text-slate-800"><User size={16} /> المستأجر</div>
              <div>{unit.tenantName || '—'}</div>
              <div className="mt-2 text-xs">{unit.tenantPhone || 'لا يوجد هاتف مسجل'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-bold text-slate-800"><Wallet size={16} /> الوضع المالي</div>
              <div>الرصيد: <strong className={(unit.balance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}>{formatCurrency(unit.balance || 0, 'OMR')}</strong></div>
              <div className="mt-2 text-xs">انتهاء العقد: {unit.contractEnd ? formatDate(unit.contractEnd) : '—'}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          {unit.contractId && (
            <button type="button" onClick={() => goTo(`/contracts?contractId=${unit.contractId}`)} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600">
              <FileText size={16} /> عرض العقد
            </button>
          )}
          <button type="button" onClick={() => goTo('/maintenance')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            <Wrench size={16} /> إضافة طلب صيانة
          </button>
          {unit.tenantPhone && (
            <button type="button" onClick={() => window.open(`https://wa.me/${unit.tenantPhone}`, '_blank')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
              <Phone size={16} /> تواصل سريع
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PropertyMap;
