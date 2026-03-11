import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Wallet, TrendingUp, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { useApp } from '../contexts/AppContext';
import { Commission } from '../types';
import { formatCurrency } from '../utils/helpers';
import { toast } from 'react-hot-toast';

// Shared styling constants from LandsAndCommissions page
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-xs font-bold text-slate-600';
const primaryButton =
  'inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600';
const secondaryButton =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

/**
 * Commissions page provides a standalone management interface for staff commissions. The page was
 * extracted from the combined lands/commissions module to reduce cognitive load and to enable
 * future enhancements like linking commissions to missions. Commissions can be associated with
 * leads, missions or recorded manually.
 */
const Commissions: React.FC = () => {
  const { db, dataService, financeService } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [pendingPayout, setPendingPayout] = useState<Commission | null>(null);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);

  // Precompute quick lookup maps for user, lead and mission names
  const usersMap = useMemo(() => new Map<string, string>((db.auth.users || []).map((u) => [u.id, u.username])), [db.auth.users]);
  const leadMap = useMemo(() => new Map<string, string>((db.leads || []).map((lead) => [lead.id, lead.name])), [db.leads]);
  const missionMap = useMemo(() => new Map<string, string>((db.missions || []).map((m) => [m.id, m.title])), [db.missions]);

  // Summary statistics for the page: total, unpaid and paid amounts and counts
  const commissionStats = useMemo(() => {
    const totalCount = (db.commissions || []).length;
    const unpaidCount = (db.commissions || []).filter((comm) => comm.status !== 'PAID').length;
    const paidCount = totalCount - unpaidCount;
    const linkedToLeads = (db.commissions || []).filter((comm) => comm.entityType === 'leads').length;
    const linkedToMissions = (db.commissions || []).filter((comm) => comm.entityType === 'missions').length;
    return { totalCount, unpaidCount, paidCount, linkedToLeads, linkedToMissions };
  }, [db.commissions]);

  // Filter commissions list by search and status
  const filtered = useMemo(() => {
    return (db.commissions || []).filter((comm) => {
      const statusMatches = statusFilter === 'ALL' || comm.status === statusFilter;
      const entityName =
        comm.entityType === 'leads'
          ? leadMap.get(comm.entityId || '')
          : comm.entityType === 'missions'
          ? missionMap.get(comm.entityId || '')
          : comm.entityId || '';
      const haystack = [usersMap.get(comm.staffId || ''), entityName, comm.type, comm.entityType]
        .join(' ')
        .toLowerCase();
      return statusMatches && haystack.includes(query.toLowerCase());
    });
  }, [db.commissions, statusFilter, query, usersMap, leadMap, missionMap]);

  // Monetary summarisation of the filtered list
  const summary = useMemo(() => {
    return {
      total: filtered.reduce((sum, comm) => sum + (comm.amount || 0), 0),
      unpaid: filtered
        .filter((comm) => comm.status === 'UNPAID')
        .reduce((sum, comm) => sum + (comm.amount || 0), 0),
      paid: filtered
        .filter((comm) => comm.status === 'PAID')
        .reduce((sum, comm) => sum + (comm.amount || 0), 0),
      leadLinked: filtered.filter((comm) => comm.entityType === 'leads').length,
      missionLinked: filtered.filter((comm) => comm.entityType === 'missions').length,
    };
  }, [filtered]);

  /**
   * Resolve human readable entity name based on entityType
   */
  const resolveEntity = (comm: Commission) => {
    if (comm.entityType === 'leads') return leadMap.get(comm.entityId || '') || 'محتمل غير معروف';
    if (comm.entityType === 'missions') return missionMap.get(comm.entityId || '') || 'مهمة غير معروفة';
    return comm.entityId || 'مرجع يدوي';
  };

  const handlePayout = async () => {
    if (!pendingPayout) return;
    try {
      setPayoutLoading(pendingPayout.id);
      await financeService.payoutCommission(pendingPayout.id);
      // Reset state upon success
      toast.success('تم صرف العمولة بنجاح.');
      setPendingPayout(null);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر صرف العمولة.');
    } finally {
      setPayoutLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="العمولات"
        description="إدارة ومتابعة العمولات المرتبطة بالمحتملين والمهام مع إمكانية صرف العمولة مباشرة."
      >
        <button
          type="button"
          onClick={() => {
            setEditingCommission(null);
            setIsModalOpen(true);
          }}
          className={primaryButton}
        >
          إضافة عمولة
        </button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard
          title="إجمالي العمولة"
          value={formatCurrency(summary.total)}
          icon={<DollarSign size={18} />}
          color="blue"
        />
        <SummaryStatCard
          title="معلقة"
          value={formatCurrency(summary.unpaid)}
          icon={<Wallet size={18} />}
          color="amber"
        />
        <SummaryStatCard
          title="مصروفة"
          value={formatCurrency(summary.paid)}
          icon={<TrendingUp size={18} />}
          color="emerald"
        />
        <SummaryStatCard
          title="مرتبطة بمحتملات/مهام"
          value={summary.leadLinked + summary.missionLinked}
          icon={<Users size={18} />}
          color="rose"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">سجل العمولات</h2>
            <p className="mt-1 text-sm text-slate-500">قائمة شاملة بالعمولات المرتبطة بالمحتملين والمهام مع أدوات للتصفية والصرف.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:w-72">
              <SearchFilterBar value={query} onSearch={setQuery} placeholder="بحث بالموظف أو المرجع أو النوع..." />
            </div>
            <select
              className={inputCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">كل الحالات</option>
              <option value="UNPAID">قيد الانتظار</option>
              <option value="PAID">تم الصرف</option>
            </select>
          </div>
        </div>

        <TableWrapper>
          <thead className="bg-slate-50">
            <tr>
              <Th>الموظف</Th>
              <Th>نوع العمولة</Th>
              <Th>المرجع</Th>
              <Th className="text-left">قيمة الصفقة</Th>
              <Th className="text-left">النسبة</Th>
              <Th className="text-left">المستحق</Th>
              <Th>الحالة</Th>
              <Th>إجراءات</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((comm) => {
              // Map commission type codes to friendly Arabic labels and classes
              const TYPE_META: Record<string, { label: string; cls: string }> = {
                SALE: { label: 'عمولة بيع', cls: 'bg-blue-50 text-blue-700' },
                RENT: { label: 'عمولة تأجير', cls: 'bg-emerald-50 text-emerald-700' },
                MANAGEMENT: { label: 'عمولة إدارة', cls: 'bg-purple-50 text-purple-700' },
                LEAD: { label: 'عمولة محتمل', cls: 'bg-rose-50 text-rose-700' },
                MISSION: { label: 'عمولة مهمة', cls: 'bg-orange-50 text-orange-700' },
              };
              const STATUS_META: Record<string, { label: string; cls: string }> = {
                UNPAID: { label: 'قيد الانتظار', cls: 'bg-amber-50 text-amber-700' },
                PAID: { label: 'تم الصرف', cls: 'bg-emerald-50 text-emerald-700' },
              };
              const typeMeta = TYPE_META[comm.type || 'SALE'] || { label: comm.type || '—', cls: 'bg-slate-100 text-slate-700' };
              const statusMeta = STATUS_META[comm.status || 'UNPAID'] || STATUS_META.UNPAID;
              return (
                <Tr key={comm.id} className={comm.status === 'PAID' ? 'opacity-70' : ''}>
                  <Td className="font-medium text-slate-800">{usersMap.get(comm.staffId || '') || 'غير معروف'}</Td>
                  <Td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${typeMeta.cls}`}>{typeMeta.label}</span>
                  </Td>
                  <Td>
                    <div>
                      <p className="font-medium text-slate-800">{resolveEntity(comm)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {comm.entityType === 'leads'
                          ? 'محتمل'
                          : comm.entityType === 'missions'
                          ? 'مهمة'
                          : 'مرجع يدوي'}
                      </p>
                    </div>
                  </Td>
                  <Td className="text-left font-mono">{formatCurrency(comm.dealValue || 0)}</Td>
                  <Td className="text-left font-mono">{comm.percentage ? `${comm.percentage}%` : '—'}</Td>
                  <Td className="text-left font-mono font-bold text-emerald-700">{formatCurrency(comm.amount || 0)}</Td>
                  <Td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusMeta.cls}`}>{statusMeta.label}</span>
                  </Td>
                  <Td>
                    <ActionsMenu
                      items={[
                        EditAction(() => {
                          setEditingCommission(comm);
                          setIsModalOpen(true);
                        }),
                        ...(comm.status === 'UNPAID'
                          ? [
                              {
                                label: payoutLoading === comm.id ? 'جاري الصرف...' : 'صرف العمولة',
                                icon: <DollarSign size={16} />,
                                onClick: () => setPendingPayout(comm),
                              },
                            ]
                          : []),
                        DeleteAction(() => dataService.remove('commissions', comm.id)),
                      ]}
                    />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrapper>
        {!filtered.length && (
          <EmptyState
            icon={DollarSign}
            title="لا توجد عمولات"
            description="يمكنك إضافة عمولة مرتبطة بمحتمل أو مهمة."
          />
        )}
      </Card>
      {/* Commission Form */}
      {isModalOpen && (
        <CommissionForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          commission={editingCommission}
        />
      )}
      {/* Payout Confirmation Modal */}
      {pendingPayout && (
        <Modal
          isOpen={!!pendingPayout}
          onClose={() => setPendingPayout(null)}
          title="تأكيد صرف العمولة"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              سيتم صرف عمولة بقيمة{' '}
              <strong className="text-slate-800">{formatCurrency(pendingPayout.amount || 0)}</strong>{' '}
              للموظف{' '}
              <strong className="text-slate-800">{usersMap.get(pendingPayout.staffId || '') || 'غير معروف'}</strong>.
            </p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setPendingPayout(null)} className={secondaryButton}>
                إلغاء
              </button>
              <button type="button" onClick={handlePayout} className={primaryButton}>
                تأكيد الصرف
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/**
 * CommissionForm provides the modal content for creating and editing commissions. It supports
 * linking a commission to a lead or a mission. Amounts are calculated automatically based on
 * the deal value and percentage, but can be overridden manually. When submitted, the form
 * persists the data via the shared dataService.
 */
const CommissionForm: React.FC<{ isOpen: boolean; onClose: () => void; commission: Commission | null }> = ({ isOpen, onClose, commission }) => {
  const { db, dataService } = useApp();
  const [data, setData] = useState<Partial<Commission>>({});

  // Initialise form state on mount or when editingCommission changes
  useEffect(() => {
    if (commission) setData(commission);
    else {
      setData({
        staffId: db.auth.users[0]?.id || '',
        type: 'LEAD',
        status: 'UNPAID',
        entityType: 'leads',
        entityId: db.leads[0]?.id || '',
        dealValue: 0,
        percentage: 0,
      });
    }
  }, [commission, db.auth.users, db.leads]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: ['dealValue', 'percentage', 'amount'].includes(name)
        ? value === ''
          ? 0
          : parseFloat(value)
        : value,
    }));
  };

  const calculatedAmount = useMemo(() => {
    if (data.dealValue && data.percentage) return (data.dealValue * data.percentage) / 100;
    return data.amount || 0;
  }, [data.dealValue, data.percentage, data.amount]);

  const entityOptions = useMemo(() => {
    if (data.entityType === 'leads') return db.leads.map((lead) => ({ value: lead.id, label: lead.name }));
    if (data.entityType === 'missions') return db.missions.map((mission) => ({ value: mission.id, label: mission.title }));
    return [];
  }, [data.entityType, db.leads, db.missions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...data, amount: calculatedAmount };
    if (commission) dataService.update('commissions', commission.id, finalData);
    else dataService.add('commissions', finalData as any);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={commission ? 'تعديل عمولة' : 'إضافة عمولة جديدة'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>الموظف المسؤول</label>
            <select className={inputCls} name="staffId" value={data.staffId || ''} onChange={handleChange} required>
              {db.auth.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>نوع العمولة</label>
            <select className={inputCls} name="type" value={data.type || ''} onChange={handleChange}>
              <option value="LEAD">محتمل</option>
              <option value="MISSION">مهمة</option>
              <option value="SALE">بيع أرض</option>
              <option value="RENT">تأجير</option>
              <option value="MANAGEMENT">إدارة</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>الكيان المرتبط</label>
            <select className={inputCls} name="entityType" value={data.entityType || ''} onChange={handleChange}>
              <option value="leads">محتمل</option>
              <option value="missions">مهمة</option>
              <option value="manual">يدوي / عام</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>المرجع</label>
            {data.entityType === 'manual' ? (
              <input className={inputCls} name="entityId" value={data.entityId || ''} onChange={handleChange} placeholder="مرجع يدوي أو رقم صفقة" />
            ) : (
              <select className={inputCls} name="entityId" value={data.entityId || ''} onChange={handleChange}>
                <option value="">-- اختر المرجع --</option>
                {entityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>قيمة الصفقة</label>
            <input className={inputCls} type="number" name="dealValue" value={data.dealValue || ''} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>النسبة %</label>
            <input className={inputCls} type="number" name="percentage" value={data.percentage || ''} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>المبلغ المستحق</label>
            <input className={inputCls} type="number" name="amount" value={calculatedAmount} onChange={handleChange} />
          </div>
        </div>
        <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
          العمولة المحسوبة تلقائيًا: <strong>{formatCurrency(calculatedAmount)}</strong>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={secondaryButton}>
            إلغاء
          </button>
          <button type="submit" className={primaryButton}>
            حفظ العمولة
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Commissions;