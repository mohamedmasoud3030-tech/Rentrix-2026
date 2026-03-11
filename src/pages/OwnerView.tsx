import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Building2, Home, ShieldCheck, User2, Wallet } from 'lucide-react';
import Card from '../components/ui/Card';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Contract, Tenant } from '../types';

const decodePortalToken = (token: string | null) => {
  if (!token) return null;

  try {
    const decoded = atob(token);
    const [ownerId, issuedAtValue] = decoded.split(':');
    const issuedAt = Number(issuedAtValue);

    if (!ownerId || Number.isNaN(issuedAt)) {
      return null;
    }

    return { ownerId, issuedAt };
  } catch {
    return null;
  }
};

const OwnerView: React.FC = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [searchParams] = useSearchParams();
  const authToken = searchParams.get('auth');
  const { db, ownerBalances } = useApp();
  const { owners, properties, units, contracts, tenants, settings } = db;

  const owner = useMemo(() => owners.find((item) => item.id === ownerId), [ownerId, owners]);
  const tokenData = useMemo(() => decodePortalToken(authToken), [authToken]);
  const ownerStats = ownerId ? ownerBalances[ownerId] : null;

  const isTokenValid = Boolean(
    owner &&
      tokenData &&
      tokenData.ownerId === ownerId &&
      authToken === owner.portalToken &&
      Date.now() - tokenData.issuedAt <= 24 * 60 * 60 * 1000
  );

  const activeContractsByUnit = useMemo(
    () => new Map<string, Contract>(contracts.filter((item) => item.status === 'ACTIVE').map((item) => [item.unitId, item])),
    [contracts]
  );

  const tenantsById = useMemo(
    () => new Map<string, Tenant>(tenants.map((item) => [item.id, item])),
    [tenants]
  );

  const ownerProperties = useMemo(
    () =>
      properties
        .filter((property) => property.ownerId === ownerId)
        .map((property) => {
          const propertyUnits = units
            .filter((unit) => unit.propertyId === property.id)
            .map((unit) => {
              const contract = activeContractsByUnit.get(unit.id);
              const tenant = contract ? tenantsById.get(contract.tenantId) : null;

              return {
                ...unit,
                contract,
                tenant,
                isOccupied: Boolean(contract),
              };
            });

          return {
            ...property,
            units: propertyUnits,
          };
        }),
    [ownerId, properties, units, activeContractsByUnit, tenantsById]
  );

  const totalUnits = ownerProperties.reduce((sum, property) => sum + property.units.length, 0);
  const occupiedUnits = ownerProperties.reduce(
    (sum, property) => sum + property.units.filter((unit) => unit.isOccupied).length,
    0
  );
  const vacantUnits = totalUnits - occupiedUnits;

  if (!isTokenValid || !owner || !ownerStats || !settings) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">تعذر فتح بوابة المالك</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد من إدارة النظام.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="bg-gradient-to-l from-blue-600 to-slate-900 p-8 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
                  <Building2 size={14} />
                  بوابة تقارير المالك
                </div>
                <h1 className="mt-4 text-3xl font-extrabold">{owner.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
                  عرض مباشر لملف العقارات والوحدات والتحصيلات والمبالغ الصافية المستحقة لك.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                <p className="text-xs font-bold text-slate-200">آخر تحديث</p>
                <p className="mt-2 text-lg font-extrabold">{new Date().toLocaleDateString('ar')}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryStatCard icon={<Wallet size={18} />} color="emerald" title="إجمالي التحصيلات" value={formatCurrency(ownerStats.collections, settings.currency)} />
          <SummaryStatCard icon={<Wallet size={18} />} color="rose" title="إجمالي المصاريف والعمولة" value={formatCurrency(ownerStats.expenses + ownerStats.officeShare, settings.currency)} />
          <SummaryStatCard icon={<Wallet size={18} />} color="blue" title="صافي المستحق" value={formatCurrency(ownerStats.net, settings.currency)} />
          <SummaryStatCard icon={<Building2 size={18} />} color="slate" title="العقارات" value={ownerProperties.length.toLocaleString('ar')} />
          <SummaryStatCard icon={<Home size={18} />} color="amber" title="الوحدات الشاغرة" value={vacantUnits.toLocaleString('ar')} subtext={`المؤجر ${occupiedUnits.toLocaleString('ar')} من ${totalUnits.toLocaleString('ar')}`} />
        </div>

        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Home size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">العقارات والوحدات</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                حالة الإشغال الحالية لكل وحدة مع المستأجر الفعلي وتاريخ انتهاء العقد.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {ownerProperties.map((property) => (
              <Card key={property.id} className="border border-slate-200 p-5 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{property.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {[property.district, property.city].filter(Boolean).join(' - ') || 'الموقع غير مسجل'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {property.units.length.toLocaleString('ar')} وحدة
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {property.units.map((unit) => (
                    <div
                      key={unit.id}
                      className={`rounded-2xl border p-4 ${
                        unit.isOccupied
                          ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                          : 'border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                        <Home size={16} />
                        {unit.name}
                      </div>

                      {unit.isOccupied ? (
                        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <User2 size={14} />
                            {unit.tenant?.name || 'مستأجر غير معروف'}
                          </div>
                          <p>تاريخ نهاية العقد: {formatDate(unit.contract?.end || '')}</p>
                          <p>الإيجار الشهري: {formatCurrency(unit.contract?.rent || unit.rentDefault || 0, settings.currency)}</p>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>الحالة: شاغرة</p>
                          <p>الإيجار المقترح: {formatCurrency(unit.rentDefault || 0, settings.currency)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OwnerView;
