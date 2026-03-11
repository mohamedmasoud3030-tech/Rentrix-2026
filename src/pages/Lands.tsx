import React, { useMemo, useState, useEffect } from 'react';
import { MapPinned, TrendingUp, ReceiptText } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { formatCurrency } from '../utils/helpers';
import { Land } from '../types';

// Styling constants reused from the original LandsAndCommissions page
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-xs font-bold text-slate-600';
const primaryButton =
  'inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600';
const secondaryButton =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

/**
 * Lands page provides a dedicated view for managing the land inventory.
 * This page was split out of the combined lands/commissions module to give
 * operators a clear separation between property stock management and
 * commissions administration. The component surfaces high‑level stats and
 * delegates detailed CRUD operations to the LandInventoryView and LandForm
 * subcomponents.
 */
const Lands: React.FC = () => {
  const { db } = useApp();

  // Compute simple statistics for the inventory: available count, sold count and total value.
  const stats = useMemo(() => {
    const lands = db.lands || [];
    return {
      available: lands.filter((land) => land.status === 'AVAILABLE').length,
      sold: lands.filter((land) => land.status === 'SOLD').length,
      inventoryValue: lands.reduce((sum, land) => sum + (land.price || 0), 0),
    };
  }, [db.lands]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأراضي"
        description="إدارة مخزون الأراضي والعروض، مع إمكانية إضافة وتعديل القطع بسهولة."
      />
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryStatCard
          title="أراضٍ متاحة"
          value={stats.available}
          icon={<MapPinned size={18} />}
          color="blue"
        />
        <SummaryStatCard
          title="أراضٍ مباعة"
          value={stats.sold}
          icon={<TrendingUp size={18} />}
          color="emerald"
        />
        <SummaryStatCard
          title="قيمة المخزون"
          value={formatCurrency(stats.inventoryValue)}
          icon={<ReceiptText size={18} />}
          color="amber"
        />
      </div>
      <Card>
        <LandInventoryView />
      </Card>
    </div>
  );
};

/**
 * LandInventoryView encapsulates the listing and search/filter capabilities for lands.
 * It includes an inline modal form for both adding new lands and editing existing ones.
 */
const LandInventoryView: React.FC = () => {
  const { db, dataService } = useApp();
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLand, setEditingLand] = useState<Land | null>(null);

  // Filter lands client‑side based on name, location or plot number.
  const filtered = useMemo(
    () =>
      (db.lands || []).filter((land) =>
        [land.name, land.location, land.plotNo]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [db.lands, query],
  );

  const handleOpen = (land: Land | null = null) => {
    setEditingLand(land);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">مخزون الأراضي</h2>
          <p className="mt-1 text-sm text-slate-500">
            إدارة العروض، حالة القطع، وسعر البيع المتوقع وصافي المالك.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-full lg:w-80">
            <SearchFilterBar value={query} onSearch={setQuery} placeholder="بحث بالاسم أو الموقع أو رقم القطعة..." />
          </div>
          <button type="button" onClick={() => handleOpen()} className={primaryButton}>
            إضافة أرض
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((land) => {
          // Determine visual status representation
          const statusMeta: Record<string, { label: string; cls: string }> = {
            AVAILABLE: { label: 'متاحة', cls: 'bg-blue-50 text-blue-700' },
            RESERVED: { label: 'محجوزة', cls: 'bg-amber-50 text-amber-700' },
            SOLD: { label: 'مباعة', cls: 'bg-emerald-50 text-emerald-700' },
          };
          const status = statusMeta[land.status || 'AVAILABLE'] || statusMeta.AVAILABLE;
          return (
            <Card key={land.id} className="border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{land.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {land.location || 'بدون موقع'} • قطعة {land.plotNo || '—'}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>المساحة</span>
                  <strong className="text-slate-800">{land.area ? `${land.area} م²` : '—'}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>سعر العرض</span>
                  <strong className="text-slate-800">{formatCurrency(land.price || 0)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>صافي المالك</span>
                  <strong className="text-slate-800">{formatCurrency((land as any).ownerPrice || 0)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2">
                  <span>عمولة المكتب</span>
                  <strong className="text-blue-700">{formatCurrency((land as any).commission || 0)}</strong>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpen(land)}
                  className={secondaryButton}
                >
                  عرض وتعديل
                </button>
                <ActionsMenu
                  items={[
                    EditAction(() => handleOpen(land)),
                    DeleteAction(() => dataService.remove('lands', land.id)),
                  ]}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {!filtered.length && (
        <EmptyState
          icon={MapPinned}
          title="لا توجد أراضٍ"
          description="ابدأ بإضافة أرض جديدة أو غيّر عبارة البحث الحالية."
        />
      )}
      {isModalOpen && (
        <LandForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLand(null);
          }}
          land={editingLand}
        />
      )}
    </div>
  );
};

/**
 * LandForm is a reusable modal form for creating or updating a land record. It mirrors the
 * behaviour defined in the original module, ensuring we don't regress functionality when
 * splitting out the page. All numeric fields are coalesced to numbers and non‑numeric
 * fields preserved as strings. On submit, the appropriate dataService method is invoked.
 */
const LandForm: React.FC<{ isOpen: boolean; onClose: () => void; land: Land | null }> = ({ isOpen, onClose, land }) => {
  const { dataService } = useApp();
  const [data, setData] = useState<Partial<Land & { plotNo?: string; ownerPrice?: number; commission?: number; category?: string; notes?: string }>>({});

  useEffect(() => {
    if (land) setData(land as any);
    else setData({ status: 'AVAILABLE', price: 0, area: 0, category: 'سكني', ownerPrice: 0, commission: 0 });
  }, [land]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: ['area', 'price', 'ownerPrice', 'commission'].includes(name)
        ? value === ''
          ? 0
          : parseFloat(value)
        : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (land) dataService.update('lands', land.id, data as any);
    else dataService.add('lands', data as any);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={land ? 'تعديل بيانات الأرض' : 'إضافة أرض جديدة'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>رقم القطعة</label>
            <input className={inputCls} name="plotNo" value={(data as any).plotNo || ''} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelCls}>اسم / وصف الأرض</label>
            <input className={inputCls} name="name" value={data.name || ''} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelCls}>الموقع</label>
            <input className={inputCls} name="location" value={data.location || ''} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>المساحة</label>
            <input className={inputCls} type="number" name="area" value={data.area || ''} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>سعر العرض</label>
            <input className={inputCls} type="number" name="price" value={data.price || ''} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>الحالة</label>
            <select className={inputCls} name="status" value={data.status || 'AVAILABLE'} onChange={handleChange}>
              <option value="AVAILABLE">متاحة</option>
              <option value="RESERVED">محجوزة</option>
              <option value="SOLD">مباعة</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>صافي المالك</label>
            <input className={inputCls} type="number" name="ownerPrice" value={(data as any).ownerPrice || ''} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>عمولة المكتب</label>
            <input className={inputCls} type="number" name="commission" value={(data as any).commission || ''} onChange={handleChange} />
          </div>
        </div>
        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea className={`${inputCls} min-h-[96px]`} name="notes" value={(data as any).notes || ''} onChange={handleChange} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={secondaryButton}>
            إلغاء
          </button>
          <button type="submit" className={primaryButton}>
            حفظ الأرض
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Lands;