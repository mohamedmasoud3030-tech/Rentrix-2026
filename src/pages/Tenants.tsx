import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Tenant } from '../types';
import { AlertTriangle, Edit, FileText, Mail, Phone, Plus, Printer, Receipt, ShieldCheck, Trash2, User, Users, Wallet, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Card from '../components/ui/Card';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import DirectoryCard from '../components/ui/DirectoryCard';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import FormSection from '../components/ui/FormSection';
import { formatCurrency, formatDate } from '../utils/helpers';

const inputCls = 'w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelCls = 'mb-2 block text-xs font-extrabold tracking-wide text-slate-500 dark:text-slate-300';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-sky-700 hover:shadow-md';
const ghostButton = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-900';
const dangerButton = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-rose-600 hover:shadow-md';
const inlineActionButton = 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';

const statusLabelMap: Record<string, string> = {
  ACTIVE: 'نشط',
  INACTIVE: 'غير نشط',
  BLACKLISTED: 'قائمة سوداء',
  BLACKLIST: 'قائمة سوداء',
};

const normalizeTenants = (rows: any[]): Tenant[] =>
  (rows || []).map((tenant) => ({
    ...tenant,
    name: tenant.name || tenant.full_name || '',
    fullName: tenant.fullName || tenant.full_name || tenant.name || '',
    national_id: tenant.national_id || tenant.nationalId || null,
    nationalId: tenant.nationalId || tenant.national_id || null,
    status: tenant.status || 'ACTIVE',
  }));

const Tenants: React.FC = () => {
  const navigate = useNavigate();
  const { db, refreshData, contractBalances, tenantBalances } = useApp();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED',
    notes: '',
  });

  useEffect(() => {
    void fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = normalizeTenants((data as Tenant[]) || []);
      setTenants(rows);
      setSelectedTenantId((current) => current || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء جلب بيانات المستأجرين');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      blacklisted: tenants.filter((tenant) => tenant.status === 'BLACKLISTED').length,
      withEmail: tenants.filter((tenant) => tenant.email).length,
    }), [tenants]);

  const filteredTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.phone, tenant.email, tenant.national_id, tenant.notes].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  }, [tenants, searchTerm]);

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === selectedTenantId) || null, [selectedTenantId, tenants]);

  const tenantWorkspace = useMemo(() => {
    if (!selectedTenant) return null;
    const contracts = db.contracts.filter((contract) => contract.tenantId === selectedTenant.id);
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const units = contracts.map((contract) => db.units.find((unit) => unit.id === contract.unitId)).filter(Boolean);
    const properties = units.map((unit) => db.properties.find((property) => property?.id === unit?.propertyId)).filter(Boolean);
    const invoices = db.invoices.filter((invoice) => contractIds.has(invoice.contractId));
    const receipts = db.receipts.filter((receipt) => contractIds.has(receipt.contractId));
    const maintenance = db.maintenanceRecords.filter((record) => units.some((unit) => unit?.id === record.unitId));
    const overdueInvoices = invoices.filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now());
    const utilityExpenses = db.expenses.filter((expense) =>
      (contractIds.has(expense.contractId || '') || units.some((unit) => unit?.id === expense.unitId)) &&
      ['كهرباء', 'مياه', 'إنترنت', 'utilities', 'electricity', 'water', 'internet'].some((term) => (expense.category || '').toLowerCase().includes(term.toLowerCase())),
    );

    return {
      contracts,
      units,
      properties,
      invoices,
      receipts,
      maintenance,
      overdueInvoices,
      utilityExpenses,
      balance: tenantBalances[selectedTenant.id]?.balance || contracts.reduce((sum, contract) => sum + Number(contractBalances[contract.id]?.balance || 0), 0),
    };
  }, [contractBalances, db.contracts, db.expenses, db.invoices, db.maintenanceRecords, db.properties, db.receipts, db.units, selectedTenant, tenantBalances]);

  const handleOpenModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        phone: tenant.phone || '',
        email: tenant.email || '',
        national_id: tenant.national_id || tenant.nationalId || '',
        status: tenant.status === 'BLACKLIST' ? 'BLACKLISTED' : tenant.status || 'ACTIVE',
        notes: tenant.notes || '',
      });
    } else {
      setEditingTenant(null);
      setFormData({ name: '', phone: '', email: '', national_id: '', status: 'ACTIVE', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        id: editingTenant?.id || crypto.randomUUID(),
        full_name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        national_id: formData.national_id || null,
        notes: formData.notes || null,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      if (editingTenant) {
        const updatePayload = { ...payload };
        delete (updatePayload as any).id;
        delete (updatePayload as any).created_at;
        const { error } = await supabase.from('tenants').update(updatePayload).eq('id', editingTenant.id);
        if (error) throw error;
        toast.success('تم تحديث بيانات المستأجر بنجاح');
      } else {
        const { error } = await supabase.from('tenants').insert([payload]);
        if (error) throw error;
        toast.success('تمت إضافة المستأجر بنجاح');
      }

      setIsModalOpen(false);
      await refreshData();
      await fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', tenantToDelete.id);
      if (error) throw error;
      toast.success('تم حذف المستأجر بنجاح');
      setTenantToDelete(null);
      await refreshData();
      await fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة المستأجرين" description="ملفات المستأجرين، العقود النشطة، التحصيلات، والتنبيهات التشغيلية ضمن مساحة عمل أوضح وأسهل للمراجعة.">
        <button onClick={() => handleOpenModal()} className={primaryButton}><Plus size={18} /> إضافة مستأجر</button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="إجمالي المستأجرين" value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="emerald" title="مستأجرون نشطون" value={stats.active.toLocaleString('ar')} />
        <SummaryStatCard icon={<Trash2 size={18} />} color="rose" title="قائمة سوداء" value={stats.blacklisted.toLocaleString('ar')} />
        <SummaryStatCard icon={<Mail size={18} />} color="amber" title="ملفات بها بريد" value={stats.withEmail.toLocaleString('ar')} />
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">دليل المستأجرين</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">بطاقات أوضح للحالة، الرصيد، وعدد العقود بدل الاكتفاء بصف جدول طويل.</p>
          </div>
          <div className="rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">{filteredTenants.length.toLocaleString('ar')} ملف ظاهر</div>
        </div>

        <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث بالاسم أو الهاتف أو الهوية أو البريد أو الملاحظات..." />

        {loading ? (
          <LoadingSpinner label="جارٍ تحميل بيانات المستأجرين..." />
        ) : filteredTenants.length === 0 ? (
          <EmptyState icon={Users} title="لا توجد نتائج مطابقة" description="جرّب تعديل كلمات البحث أو أضف مستأجرًا جديدًا إلى النظام." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredTenants.map((tenant) => {
              const tenantContracts = db.contracts.filter((contract) => contract.tenantId === tenant.id);
              const overdueCount = db.invoices.filter((invoice) => tenantContracts.some((contract) => contract.id === invoice.contractId) && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now()).length;
              return (
                <DirectoryCard
                  key={tenant.id}
                  active={selectedTenantId === tenant.id}
                  onClick={() => setSelectedTenantId(tenant.id)}
                  title={tenant.name}
                  eyebrow={tenant.national_id || tenant.nationalId || 'هوية غير مسجلة'}
                  subtitle={`${tenant.phone || 'بدون هاتف'}${tenant.email ? ` • ${tenant.email}` : ''}`}
                  icon={<User size={18} />}
                  actions={<div className="flex items-center gap-2"><button type="button" onClick={() => navigate('/contracts')} className={inlineActionButton} title="العقود"><FileText size={15} /></button><button type="button" onClick={() => handleOpenModal(tenant)} className={inlineActionButton} title="تعديل"><Edit size={15} /></button><button type="button" onClick={() => setTenantToDelete(tenant)} className={`${inlineActionButton} text-rose-600 dark:text-rose-300`} title="حذف"><Trash2 size={15} /></button></div>}
                  stats={[
                    { label: 'العقود', value: tenantContracts.length.toLocaleString('ar'), tone: 'info' },
                    { label: 'المتأخرات', value: overdueCount.toLocaleString('ar'), tone: overdueCount > 0 ? 'danger' : 'success' },
                    { label: 'الحالة', value: statusLabelMap[tenant.status || 'ACTIVE'] || 'نشط', tone: tenant.status === 'BLACKLISTED' ? 'danger' : 'success' },
                    { label: 'الرصيد', value: formatCurrency(tenantBalances[tenant.id]?.balance || 0, db.settings?.currency || 'OMR'), tone: 'warning' },
                  ]}
                />
              );
            })}
          </div>
        )}
      </Card>

      {selectedTenant && tenantWorkspace && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل المستأجر</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">عرض موحد للعقود، التحصيلات، الفواتير، والصيانة داخل سجل واضح وسهل للمراجعة اليومية.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/financials')} className={ghostButton}><Receipt size={15} /> التحصيل</button>
                <button type="button" onClick={() => navigate('/contracts')} className={ghostButton}><FileText size={15} /> العقود</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<FileText size={18} />} color="blue" title="العقود" value={tenantWorkspace.contracts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Receipt size={18} />} color="emerald" title="الدفعات" value={tenantWorkspace.receipts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<AlertTriangle size={18} />} color="amber" title="فواتير متأخرة" value={tenantWorkspace.overdueInvoices.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Wallet size={18} />} color="rose" title="الرصيد" value={formatCurrency(tenantWorkspace.balance, db.settings?.currency || 'OMR')} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <WorkspaceSection title="الملف التعريفي" description="بيانات التواصل والحالة الحالية للمستأجر."><div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200"><div><strong>الاسم:</strong> {selectedTenant.name}</div><div><strong>الهاتف:</strong> {selectedTenant.phone || '—'}</div><div><strong>البريد:</strong> {selectedTenant.email || '—'}</div><div><strong>الحالة:</strong> <StatusPill status={selectedTenant.status || 'ACTIVE'}>{statusLabelMap[selectedTenant.status || 'ACTIVE'] || 'نشط'}</StatusPill></div></div></WorkspaceSection>
              <WorkspaceSection title="السجلات المرتبطة" description="ملخص العقارات والوحدات والتحصيلات الحالية."><div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200"><div><strong>الوحدات:</strong> {tenantWorkspace.units.length.toLocaleString('ar')}</div><div><strong>العقارات:</strong> {tenantWorkspace.properties.length.toLocaleString('ar')}</div><div><strong>الصيانة المفتوحة:</strong> {tenantWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div><div><strong>إجمالي المحصل:</strong> {formatCurrency(tenantWorkspace.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0), db.settings?.currency || 'OMR')}</div></div></WorkspaceSection>
            </div>

            <WorkspaceSection title="العقود النشطة والسجل المالي" description="الوحدات المرتبطة بالمستأجر مع الرصيد الحالي لكل عقد." className="mt-6"><div className="grid grid-cols-1 gap-3">{tenantWorkspace.contracts.map((contract) => { const unit = db.units.find((item) => item.id === contract.unitId); const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null; const balance = contractBalances[contract.id]?.balance || 0; return (<div key={contract.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-bold text-slate-900 dark:text-slate-100">{unit?.name || unit?.unitNumber || 'وحدة'}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{property?.name || 'عقار غير محدد'} • {formatDate(contract.start)} حتى {formatDate(contract.end)}</div></div><button type="button" onClick={() => navigate(`/contracts?contractId=${contract.id}`)} className="text-sm font-bold text-sky-600 dark:text-sky-300">فتح العقد</button></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80"><div className="text-[11px] font-bold text-slate-500">الإيجار</div><div className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(contract.rent, db.settings?.currency || 'OMR')}</div></div><div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80"><div className="text-[11px] font-bold text-slate-500">الرصيد</div><div className={`mt-1 font-extrabold ${balance > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{formatCurrency(balance, db.settings?.currency || 'OMR')}</div></div></div></div>); })}</div></WorkspaceSection>
          </Card>

          <div className="space-y-6">
            <Card className="p-6"><h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">التنبيهات والمتابعات</h3><div className="mt-4 space-y-3"><div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">فواتير متأخرة: {tenantWorkspace.overdueInvoices.length.toLocaleString('ar')}</div><div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">عقود تنتهي خلال 30 يومًا: {tenantWorkspace.contracts.filter((contract) => contract.status === 'ACTIVE' && new Date(contract.end).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && new Date(contract.end).getTime() >= Date.now()).length.toLocaleString('ar')}</div><div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">صيانة مفتوحة: {tenantWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div></div></Card>
            <Card className="p-6"><h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">الخدمات والمستندات</h3><div className="mt-4 space-y-4"><WorkspaceSection title="تتبع الخدمات" description="مصروفات الخدمات وحجم التعثرات المفتوحة على المستأجر."><div className="grid gap-2"><div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 dark:bg-slate-900/70"><span>مصروفات الخدمات</span><strong>{formatCurrency(tenantWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), db.settings?.currency || 'OMR')}</strong></div><div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 dark:bg-slate-900/70"><span>الفواتير المتأخرة</span><strong>{tenantWorkspace.overdueInvoices.length.toLocaleString('ar')}</strong></div></div></WorkspaceSection><WorkspaceSection title="آخر المتابعات" description="طلبات الصيانة والأنشطة المرتبطة بالمستأجر."><div className="space-y-2">{tenantWorkspace.maintenance.slice(0, 4).map((record) => (<div key={record.id} className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70"><span className="flex items-center gap-2"><Wrench size={14} className="text-amber-500" />{record.issueTitle || record.description || 'طلب صيانة'}</span><span className="font-bold text-amber-600 dark:text-amber-300">{record.status}</span></div>))}{!tenantWorkspace.maintenance.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد متابعات تشغيلية مرتبطة بهذا المستأجر.</div>}</div></WorkspaceSection><AttachmentsManager entityType="TENANT" entityId={selectedTenant.id} /><button type="button" onClick={() => navigate('/reports?tab=tenants')} className={`${ghostButton} w-full`}><Printer size={15} /> طباعة تقرير المستأجر</button></div></Card>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant ? 'تعديل بيانات المستأجر' : 'إضافة مستأجر جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="البيانات الأساسية" description="بيانات الهوية ووسائل التواصل الأساسية للمستأجر."><div><label className={labelCls}>اسم المستأجر <span className="text-rose-500">*</span></label><input className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="الاسم الكامل" required /></div><div><label className={labelCls}>رقم الهاتف</label><input className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+968 9999 9999" /></div><div><label className={labelCls}>البريد الإلكتروني</label><input className={inputCls} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="tenant@example.com" /></div><div><label className={labelCls}>رقم الهوية</label><input className={inputCls} value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} placeholder="الهوية أو الإقامة" /></div></FormSection>
          <FormSection title="حالة الملف" description="تحديد حالة التعامل الحالية وإضافة أي ملاحظات تشغيلية مهمة." columns={1}><div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]"><div><label className={labelCls}>الحالة</label><select className={inputCls} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' })}><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option><option value="BLACKLISTED">قائمة سوداء</option></select></div><div><label className={labelCls}>ملاحظات</label><textarea className={`${inputCls} min-h-[120px]`} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية عن المستأجر أو تفضيلاته" /></div></div></FormSection>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800"><button type="button" onClick={() => setIsModalOpen(false)} className={ghostButton}>إلغاء</button><button type="submit" className={primaryButton}>{editingTenant ? 'حفظ التعديلات' : 'إضافة المستأجر'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!tenantToDelete} onClose={() => setTenantToDelete(null)} title="تأكيد حذف المستأجر" size="sm"><div className="space-y-6"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"><Trash2 size={18} /></div><div><h3 className="text-base font-semibold text-slate-900 dark:text-white">هل أنت متأكد من الحذف؟</h3><p className="text-sm text-slate-600 dark:text-slate-300">سيتم حذف المستأجر نهائيًا من السجل.</p></div></div><div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10"><p className="text-sm text-slate-700 dark:text-slate-200">سيتم حذف ملف المستأجر <strong className="font-semibold text-slate-900 dark:text-white">{tenantToDelete?.name || '—'}</strong> من قاعدة البيانات نهائيًا. تأكد من عدم وجود عقود فعالة مرتبطة به قبل المتابعة.</p></div><div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800"><button onClick={() => setTenantToDelete(null)} className={ghostButton}>إلغاء</button><button onClick={handleDelete} className={dangerButton}>حذف المستأجر</button></div></div></Modal>
    </div>
  );
};

export default Tenants;
