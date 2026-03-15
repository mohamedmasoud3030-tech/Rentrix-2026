import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Edit,
  ExternalLink,
  Mail,
  Percent,
  Phone,
  Plus,
  Printer,
  Trash2,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Card from '../components/ui/Card';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import DirectoryCard from '../components/ui/DirectoryCard';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import FormSection from '../components/ui/FormSection';
import { formatCurrency, formatDate } from '../utils/helpers';

interface OwnerRow {
  id: string;
  name: string;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  national_id?: string | null;
  commission_type?: 'RATE' | 'FIXED' | null;
  commission_value?: number | null;
  notes?: string | null;
}

interface OwnerFormData {
  name: string;
  phone: string;
  email: string;
  national_id: string;
  commission_type: 'RATE' | 'FIXED';
  commission_value: number;
  notes: string;
}

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-600';
const inlineActionButton =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';

const Owners: React.FC = () => {
  const navigate = useNavigate();
  const { db, ownerBalances, generateOwnerPortalLink } = useApp();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerRow | null>(null);
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerRow | null>(null);
  const [formData, setFormData] = useState<OwnerFormData>({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    commission_type: 'RATE',
    commission_value: 0,
    notes: '',
  });

  useEffect(() => {
    void fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = ((data as OwnerRow[]) || []).map((owner) => ({ ...owner, email: owner.email ?? owner.phone2 ?? null }));
      setOwners(rows);
      setSelectedOwnerId((current) => current || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء جلب بيانات الملاك');
    } finally {
      setLoading(false);
    }
  };

  const selectedOwner = useMemo(() => owners.find((owner) => owner.id === selectedOwnerId) || null, [owners, selectedOwnerId]);

  const filteredOwners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return owners;
    return owners.filter((owner) =>
      [owner.name, owner.phone, owner.email, owner.national_id, owner.notes].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  }, [owners, searchTerm]);

  const ownerWorkspace = useMemo(() => {
    if (!selectedOwner) return null;
    const properties = db.properties.filter((property) => property.ownerId === selectedOwner.id);
    const propertyIds = new Set(properties.map((property) => property.id));
    const units = db.units.filter((unit) => propertyIds.has(unit.propertyId));
    const unitIds = new Set(units.map((unit) => unit.id));
    const contracts = db.contracts.filter((contract) => unitIds.has(contract.unitId));
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const receipts = db.receipts.filter((receipt) => contractIds.has(receipt.contractId) && receipt.status === 'POSTED');
    const invoices = db.invoices.filter((invoice) => contractIds.has(invoice.contractId));
    const expenses = db.expenses.filter(
      (expense) =>
        expense.status === 'POSTED' &&
        (propertyIds.has(expense.propertyId || '') || unitIds.has(expense.unitId || '') || contractIds.has(expense.contractId || '')),
    );
    const maintenance = db.maintenanceRecords.filter((record) => propertyIds.has(record.propertyId) || unitIds.has(record.unitId || ''));
    const settlements = db.ownerSettlements.filter((settlement) => settlement.ownerId === selectedOwner.id && settlement.status === 'POSTED');
    const balance = ownerBalances[selectedOwner.id];
    const utilityExpenses = expenses.filter((expense) =>
      ['كهرباء', 'مياه', 'إنترنت', 'utilities', 'electricity', 'water', 'internet'].some((term) =>
        (expense.category || '').toLowerCase().includes(term.toLowerCase()),
      ),
    );
    const overdueInvoices = invoices.filter(
      (invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now(),
    );
    const expiringContracts = contracts
      .filter((contract) => contract.status === 'ACTIVE')
      .filter((contract) => {
        const end = new Date(contract.end).getTime();
        return end >= Date.now() && end - Date.now() <= 30 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 5);

    return { properties, units, contracts, receipts, invoices, expenses, maintenance, settlements, balance, utilityExpenses, overdueInvoices, expiringContracts };
  }, [db, ownerBalances, selectedOwner]);

  const stats = useMemo(
    () => ({
      total: owners.length,
      withPhone: owners.filter((owner) => owner.phone).length,
      fixedContracts: owners.filter((owner) => owner.commission_type === 'FIXED').length,
      rateContracts: owners.filter((owner) => owner.commission_type !== 'FIXED').length,
    }),
    [owners],
  );

  const agreementLabel = (owner: OwnerRow) =>
    owner.commission_type === 'FIXED'
      ? `استثمار ثابت • ${formatCurrency(owner.commission_value || 0)}`
      : `نسبة إدارة • ${Number(owner.commission_value || 0).toFixed(1)}%`;

  const handleOpenModal = (owner?: OwnerRow) => {
    if (owner) {
      setEditingOwner(owner);
      setFormData({
        name: owner.name,
        phone: owner.phone || '',
        email: owner.email || '',
        national_id: owner.national_id || '',
        commission_type: owner.commission_type || 'RATE',
        commission_value: Number(owner.commission_value || 0),
        notes: owner.notes || '',
      });
    } else {
      setEditingOwner(null);
      setFormData({ name: '', phone: '', email: '', national_id: '', commission_type: 'RATE', commission_value: 0, notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        id: editingOwner?.id || crypto.randomUUID(),
        name: formData.name,
        phone: formData.phone || null,
        phone2: formData.email || null,
        national_id: formData.national_id || null,
        commission_type: formData.commission_type,
        commission_value: formData.commission_value,
        notes: formData.notes || null,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      if (editingOwner) {
        const updatePayload = { ...payload } as any;
        delete updatePayload.id;
        delete updatePayload.created_at;
        const { error } = await supabase.from('owners').update(updatePayload).eq('id', editingOwner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('owners').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      await fetchOwners();
      toast.success(editingOwner ? 'تم تحديث بيانات المالك' : 'تم إضافة المالك');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async () => {
    if (!ownerToDelete) return;
    try {
      const { error } = await supabase.from('owners').delete().eq('id', ownerToDelete.id);
      if (error) throw error;
      setOwnerToDelete(null);
      await fetchOwners();
      toast.success('تم حذف المالك');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة الملاك" description="ملفات الملاك، رصيد كل مالك، العقارات المرتبطة، والمتابعة التشغيلية في مساحة عمل تنفيذية واحدة.">
        <button onClick={() => handleOpenModal()} className={primaryButton}><Plus size={18} /> إضافة مالك</button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="إجمالي الملاك" value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<Phone size={18} />} color="emerald" title="ملفات بها هاتف" value={stats.withPhone.toLocaleString('ar')} />
        <SummaryStatCard icon={<Wallet size={18} />} color="amber" title="اتفاق ثابت" value={stats.fixedContracts.toLocaleString('ar')} />
        <SummaryStatCard icon={<Percent size={18} />} color="rose" title="اتفاق نسبة" value={stats.rateContracts.toLocaleString('ar')} />
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">دليل الملاك</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">بطاقات ملفية أوضح تُسهّل الوصول إلى كشف الحساب والعقارات والمتابعة التشغيلية لكل مالك.</p>
          </div>
          <div className="rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">{filteredOwners.length.toLocaleString('ar')} ملف ظاهر</div>
        </div>

        <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث بالاسم أو الهاتف أو البريد أو الملاحظات..." />

        {loading ? (
          <LoadingSpinner label="جارٍ تحميل ملفات الملاك..." />
        ) : filteredOwners.length === 0 ? (
          <EmptyState icon={Building2} title="لا توجد نتائج" description="جرّب تعديل البحث أو أضف مالكًا جديدًا." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredOwners.map((owner) => {
              const ownerProperties = db.properties.filter((property) => property.ownerId === owner.id);
              const ownerPropertyIds = new Set(ownerProperties.map((property) => property.id));
              const ownerUnits = db.units.filter((unit) => ownerPropertyIds.has(unit.propertyId));
              const ownerUnitIds = new Set(ownerUnits.map((unit) => unit.id));
              const ownerContracts = db.contracts.filter((contract) => ownerUnitIds.has(contract.unitId));
              const overdueCount = db.invoices.filter(
                (invoice) => ownerContracts.some((contract) => contract.id === invoice.contractId) && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now(),
              ).length;

              return (
                <DirectoryCard
                  key={owner.id}
                  active={selectedOwnerId === owner.id}
                  onClick={() => setSelectedOwnerId(owner.id)}
                  title={owner.name}
                  eyebrow={owner.national_id || 'هوية غير مسجلة'}
                  subtitle={`${owner.phone || 'بدون هاتف'}${owner.email ? ` • ${owner.email}` : ''}`}
                  icon={<Users size={18} />}
                  actions={<div className="flex items-center gap-2"><button type="button" onClick={() => navigate(`/owner-ledger?ownerId=${owner.id}`)} className={inlineActionButton} title="كشف حساب المالك"><Wallet size={15} /></button><button type="button" onClick={async () => { const link = await generateOwnerPortalLink(owner.id); await navigator.clipboard.writeText(link); window.open(link, '_blank', 'noopener,noreferrer'); }} className={inlineActionButton} title="بوابة المالك"><ExternalLink size={15} /></button><button type="button" onClick={() => handleOpenModal(owner)} className={inlineActionButton} title="تعديل"><Edit size={15} /></button><button type="button" onClick={() => setOwnerToDelete(owner)} className={`${inlineActionButton} text-rose-600 dark:text-rose-300`} title="حذف"><Trash2 size={15} /></button></div>}
                  stats={[
                    { label: 'العقارات', value: ownerProperties.length.toLocaleString('ar'), tone: 'info' },
                    { label: 'الوحدات', value: ownerUnits.length.toLocaleString('ar') },
                    { label: 'العقود', value: ownerContracts.length.toLocaleString('ar'), tone: 'warning' },
                    { label: 'متأخرات', value: overdueCount.toLocaleString('ar'), tone: overdueCount > 0 ? 'danger' : 'success' },
                  ]}
                  footer={<div className="flex items-center justify-between gap-3"><span>{agreementLabel(owner)}</span><span className="font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(ownerBalances[owner.id]?.net || 0)}</span></div>}
                />
              );
            })}
          </div>
        )}
      </Card>

      {selectedOwner && ownerWorkspace && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل المالك</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ملف موحد يربط الأصول، العقود، التحصيلات، الصيانة، والتنبيهات الحرجة.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate(`/owner-ledger?ownerId=${selectedOwner.id}`)} className={ghostButton}><Printer size={15} /> كشف الحساب</button>
                <button type="button" onClick={() => navigate('/reports?tab=owners')} className={ghostButton}>تقارير الملاك</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<Building2 size={18} />} color="blue" title="العقارات" value={ownerWorkspace.properties.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Users size={18} />} color="slate" title="الوحدات" value={ownerWorkspace.units.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Mail size={18} />} color="amber" title="العقود" value={ownerWorkspace.contracts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Wallet size={18} />} color="emerald" title="الرصيد" value={formatCurrency(ownerWorkspace.balance?.net || 0)} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <WorkspaceSection title="الملف التعريفي" description="بيانات المالك الأساسية واتفاق التشغيل المعتمد."><div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200"><div><strong>الاسم:</strong> {selectedOwner.name}</div><div><strong>الهاتف:</strong> {selectedOwner.phone || '—'}</div><div><strong>البريد:</strong> {selectedOwner.email || '—'}</div><div><strong>الاتفاق:</strong> {agreementLabel(selectedOwner)}</div></div></WorkspaceSection>
              <WorkspaceSection title="الملخص المالي" description="تحصيلات ومصروفات وتسويات تخص محفظة هذا المالك."><div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200"><div><strong>التحصيلات:</strong> {formatCurrency(ownerWorkspace.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div><div><strong>المصروفات:</strong> {formatCurrency(ownerWorkspace.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div><div><strong>التسويات:</strong> {formatCurrency(ownerWorkspace.settlements.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div><div><strong>صيانة مفتوحة:</strong> {ownerWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div></div></WorkspaceSection>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WorkspaceSection title="فواتير تحتاج متابعة" description="أبرز الفواتير المتأخرة المرتبطة بعقارات المالك."><div className="space-y-2">{ownerWorkspace.overdueInvoices.slice(0, 4).map((invoice) => (<button type="button" key={invoice.id} onClick={() => navigate('/invoices')} className="flex w-full items-center justify-between rounded-2xl bg-white/85 px-3 py-2.5 text-right text-sm dark:bg-slate-900/70"><span className="min-w-0"><span className="block font-bold text-slate-800 dark:text-slate-100">{invoice.no || 'فاتورة'}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{formatDate(invoice.dueDate)}</span></span><span className="font-extrabold text-rose-600 dark:text-rose-300">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0))}</span></button>))}{!ownerWorkspace.overdueInvoices.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد فواتير متأخرة على عقارات هذا المالك.</div>}</div></WorkspaceSection>
              <WorkspaceSection title="عقود تقترب من الانتهاء" description="العقود النشطة التي تنتهي خلال ثلاثين يومًا."><div className="space-y-2">{ownerWorkspace.expiringContracts.map((contract) => (<button type="button" key={contract.id} onClick={() => navigate('/contracts')} className="flex w-full items-center justify-between rounded-2xl bg-white/85 px-3 py-2.5 text-right text-sm dark:bg-slate-900/70"><span className="min-w-0"><span className="block font-bold text-slate-800 dark:text-slate-100">{formatDate(contract.end)}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{db.tenants.find((tenant) => tenant.id === contract.tenantId)?.name || db.tenants.find((tenant) => tenant.id === contract.tenantId)?.fullName || 'مستأجر غير محدد'}</span></span><span className="font-extrabold text-amber-600 dark:text-amber-300">{formatCurrency(contract.rent || 0)}</span></button>))}{!ownerWorkspace.expiringContracts.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد عقود قاربت على الانتهاء خلال 30 يومًا.</div>}</div></WorkspaceSection>
            </div>

            <WorkspaceSection title="العقارات المرتبطة" description="عرض سريع للعقارات التابعة لهذا المالك مع حجم التشغيل بكل عقار." className="mt-6"><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{ownerWorkspace.properties.map((property) => { const propertyUnits = ownerWorkspace.units.filter((unit) => unit.propertyId === property.id); const propertyContracts = ownerWorkspace.contracts.filter((contract) => propertyUnits.some((unit) => unit.id === contract.unitId)); const openMaintenance = ownerWorkspace.maintenance.filter((record) => record.propertyId === property.id && ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status)).length; return (<div key={property.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70"><div className="flex items-center justify-between gap-3"><div><div className="font-bold text-slate-900 dark:text-slate-100">{property.name}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{property.city || property.district || 'بدون موقع مفصل'}</div></div><button type="button" onClick={() => navigate('/properties')} className="text-sm font-bold text-blue-600 dark:text-blue-300">فتح السجل</button></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/80"><div className="text-[11px] font-bold text-slate-500">الوحدات</div><div className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">{propertyUnits.length.toLocaleString('ar')}</div></div><div className="rounded-2xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/80"><div className="text-[11px] font-bold text-slate-500">العقود</div><div className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">{propertyContracts.length.toLocaleString('ar')}</div></div><div className="rounded-2xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/80"><div className="text-[11px] font-bold text-slate-500">المتابعة</div><div className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">{openMaintenance.toLocaleString('ar')}</div></div></div></div>); })}</div></WorkspaceSection>
          </Card>

          <div className="space-y-6">
            <Card className="p-6"><h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">التنبيهات</h3><div className="mt-4 space-y-3"><div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">الفواتير المتأخرة: {ownerWorkspace.overdueInvoices.length.toLocaleString('ar')}</div><div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">العقود التي تنتهي خلال 30 يومًا: {ownerWorkspace.expiringContracts.length.toLocaleString('ar')}</div><div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">طلبات الصيانة المفتوحة: {ownerWorkspace.maintenance.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status)).length.toLocaleString('ar')}</div></div></Card>

            <Card className="p-6"><h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">الخدمات والصيانة والوثائق</h3><div className="mt-4 space-y-4"><WorkspaceSection title="متابعة الخدمات" description="مصروفات الخدمات والملاحظات الحرجة على محفظة المالك."><div className="grid gap-2"><div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 dark:bg-slate-900/70"><span>مصروفات الخدمات</span><strong>{formatCurrency(ownerWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></div><div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 dark:bg-slate-900/70"><span>فواتير متأخرة</span><strong>{ownerWorkspace.overdueInvoices.length.toLocaleString('ar')}</strong></div><div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 dark:bg-slate-900/70"><span>طلبات صيانة مفتوحة</span><strong>{ownerWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</strong></div></div></WorkspaceSection><WorkspaceSection title="آخر طلبات الصيانة" description="أحدث الطلبات المسجلة على عقارات ووحدات هذا المالك."><div className="space-y-2">{ownerWorkspace.maintenance.slice(0, 4).map((record) => (<div key={record.id} className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70"><span className="flex items-center gap-2"><Wrench size={14} className="text-amber-500" />{record.description || record.issueTitle || 'طلب صيانة'}</span><span className="font-bold text-amber-600 dark:text-amber-300">{record.status}</span></div>))}{!ownerWorkspace.maintenance.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد طلبات صيانة مرتبطة بهذا المالك.</div>}</div></WorkspaceSection><AttachmentsManager entityType="owner" entityId={selectedOwner.id} /></div></Card>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingOwner ? 'تعديل بيانات المالك' : 'إضافة مالك جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="البيانات الأساسية" description="البيانات التعريفية ووسائل التواصل الأساسية لملف المالك."><div><label className={labelCls}>اسم المالك</label><input className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div><div><label className={labelCls}>الهاتف</label><input className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div><div><label className={labelCls}>البريد الإلكتروني</label><input className={inputCls} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div><div><label className={labelCls}>رقم الهوية / السجل</label><input className={inputCls} value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} /></div></FormSection>
          <FormSection title="اتفاق التشغيل" description="تحديد طريقة احتساب عمولة المكتب أو العائد الثابت للمالك."><div><label className={labelCls}>نوع الاتفاق</label><select className={inputCls} value={formData.commission_type} onChange={(e) => setFormData({ ...formData, commission_type: e.target.value as 'RATE' | 'FIXED' })}><option value="RATE">نسبة إدارة</option><option value="FIXED">استثمار ثابت</option></select></div><div><label className={labelCls}>القيمة</label><input className={inputCls} type="number" step="0.1" value={formData.commission_value} onChange={(e) => setFormData({ ...formData, commission_value: Number(e.target.value) })} /></div></FormSection>
          <FormSection title="ملاحظات الملف" description="أي تعليمات أو ملاحظات مرتبطة بطريقة التعامل مع هذا المالك." columns={1}><div><label className={labelCls}>ملاحظات</label><textarea className={`${inputCls} min-h-[110px]`} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div></FormSection>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" onClick={() => setIsModalOpen(false)} className={ghostButton}>إلغاء</button><button type="submit" className={primaryButton}>{editingOwner ? 'حفظ التعديلات' : 'إضافة المالك'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!ownerToDelete} onClose={() => setOwnerToDelete(null)} title="تأكيد حذف المالك" size="sm"><div className="space-y-4"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">سيتم حذف ملف المالك <strong>{ownerToDelete?.name || '—'}</strong> نهائيًا من قاعدة البيانات.</p><div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><button onClick={() => setOwnerToDelete(null)} className={ghostButton}>إلغاء</button><button onClick={handleDelete} className={dangerButton}>حذف المالك</button></div></div></Modal>
    </div>
  );
};

export default Owners;
