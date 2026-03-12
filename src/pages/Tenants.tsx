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
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { formatCurrency, formatDate } from '../utils/helpers';

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelCls = 'mb-2 block text-xs font-extrabold tracking-wide text-slate-500 dark:text-slate-300';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-sky-700 hover:shadow-md';
const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-900';
const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-rose-600 hover:shadow-md';

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

  const stats = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      blacklisted: tenants.filter((tenant) => tenant.status === 'BLACKLISTED').length,
      withEmail: tenants.filter((tenant) => tenant.email).length,
    }),
    [tenants]
  );

  const filteredTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.phone, tenant.email, tenant.national_id, tenant.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [tenants, searchTerm]);

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === selectedTenantId) || null, [selectedTenantId, tenants]);

  const tenantWorkspace = useMemo(() => {
    if (!selectedTenant) return null;
    const contracts = db.contracts.filter((contract) => contract.tenantId === selectedTenant.id);
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const units = contracts
      .map((contract) => db.units.find((unit) => unit.id === contract.unitId))
      .filter(Boolean);
    const properties = units
      .map((unit) => db.properties.find((property) => property?.id === unit?.propertyId))
      .filter(Boolean);
    const invoices = db.invoices.filter((invoice) => contractIds.has(invoice.contractId));
    const receipts = db.receipts.filter((receipt) => contractIds.has(receipt.contractId));
    const maintenance = db.maintenanceRecords.filter((record) => units.some((unit) => unit?.id === record.unitId));
    const overdueInvoices = invoices.filter(
      (invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now(),
    );
    const utilityExpenses = db.expenses.filter(
      (expense) =>
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
      <PageHeader title="إدارة المستأجرين" description="ملفات المستأجرين، بيانات التواصل، حالة الحساب، ومراجعة جاهزية الربط مع العقود والتحصيل.">
        <button onClick={() => handleOpenModal()} className={primaryButton}>
          <Plus size={18} />
          إضافة مستأجر
        </button>
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
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">قاعدة المستأجرين</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">واجهة أوضح للبحث، مراجعة الحالة، والوصول السريع إلى بيانات التواصل والهوية.</p>
          </div>
        </div>

        <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث بالاسم أو الهاتف أو الهوية أو البريد أو الملاحظات..." />

        {loading ? (
          <LoadingSpinner label="جاري تحميل بيانات المستأجرين..." />
        ) : filteredTenants.length === 0 ? (
          <EmptyState icon={Users} title="لا توجد نتائج مطابقة" description="جرّب تعديل كلمات البحث أو أضف مستأجرًا جديدًا إلى النظام." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th className="w-1/3">المستأجر</Th>
                <Th className="w-1/4">التواصل</Th>
                <Th className="w-1/6">الهوية</Th>
                <Th className="w-1/6">الحالة</Th>
                <Th className="w-1/6 text-center">إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <Tr key={tenant.id} className={selectedTenantId === tenant.id ? 'bg-sky-50/70 dark:bg-sky-500/10' : ''} onClick={() => setSelectedTenantId(tenant.id)}>
                  <Td>
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{tenant.name}</div>
                        <div className="text-xs text-slate-500">#{tenant.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        {tenant.phone || 'لا يوجد هاتف'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        {tenant.email || 'لا يوجد بريد'}
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-sm text-slate-600 dark:text-slate-300">{tenant.national_id || tenant.nationalId || 'غير مسجلة'}</Td>
                  <Td>
                    <StatusPill status={tenant.status || 'ACTIVE'}>{statusLabelMap[tenant.status || 'ACTIVE'] || tenant.status || 'نشط'}</StatusPill>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(tenant)}
                        className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700 transition-all duration-150 hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                        title="تعديل"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setTenantToDelete(tenant)}
                        className="inline-flex items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 transition-all duration-150 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {selectedTenant && tenantWorkspace && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل المستأجر</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">عرض موحد للعقود والتحصيل والتنبيهات والصيانة والمستندات داخل سجل واحد.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/financials')} className={ghostButton}>
                  <Receipt size={15} />
                  التحصيل
                </button>
                <button type="button" onClick={() => navigate('/contracts')} className={ghostButton}>
                  <FileText size={15} />
                  العقود
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<FileText size={18} />} color="blue" title="العقود" value={tenantWorkspace.contracts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Receipt size={18} />} color="emerald" title="الدفعات" value={tenantWorkspace.receipts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<AlertTriangle size={18} />} color="amber" title="فواتير متأخرة" value={tenantWorkspace.overdueInvoices.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Wallet size={18} />} color="rose" title="الرصيد" value={formatCurrency(tenantWorkspace.balance, db.settings?.currency || 'OMR')} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الملف التعريفي</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>الاسم:</strong> {selectedTenant.name}</div>
                  <div><strong>الهاتف:</strong> {selectedTenant.phone || '—'}</div>
                  <div><strong>البريد:</strong> {selectedTenant.email || '—'}</div>
                  <div><strong>الحالة:</strong> {statusLabelMap[selectedTenant.status || 'ACTIVE'] || 'نشط'}</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">السجلات المرتبطة</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>الوحدات:</strong> {tenantWorkspace.units.length.toLocaleString('ar')}</div>
                  <div><strong>العقارات:</strong> {tenantWorkspace.properties.length.toLocaleString('ar')}</div>
                  <div><strong>الصيانة المفتوحة:</strong> {tenantWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div>
                  <div><strong>إجمالي المحصل:</strong> {formatCurrency(tenantWorkspace.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0), db.settings?.currency || 'OMR')}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
                <div>العقد / الوحدة</div>
                <div>الفترة</div>
                <div>الرصيد</div>
                <div>الإجراء</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {tenantWorkspace.contracts.map((contract) => {
                  const unit = db.units.find((item) => item.id === contract.unitId);
                  const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;
                  const balance = contractBalances[contract.id]?.balance || 0;
                  return (
                    <div key={contract.id} className="grid grid-cols-[1fr_0.9fr_0.8fr_0.8fr] gap-4 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{unit?.name || unit?.unitNumber || 'وحدة'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{property?.name || 'عقار غير محدد'}</div>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">{formatDate(contract.start)} - {formatDate(contract.end)}</div>
                      <div className={balance > 0 ? 'font-bold text-rose-600 dark:text-rose-300' : 'font-bold text-emerald-600 dark:text-emerald-300'}>
                        {formatCurrency(balance, db.settings?.currency || 'OMR')}
                      </div>
                      <div>
                        <button type="button" onClick={() => navigate(`/contracts?contractId=${contract.id}`)} className="font-bold text-sky-600 dark:text-sky-300">
                          فتح السجل
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">التنبيهات والمتابعات</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  فواتير متأخرة: {tenantWorkspace.overdueInvoices.length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  عقود تنتهي خلال 30 يومًا: {tenantWorkspace.contracts.filter((contract) => contract.status === 'ACTIVE' && new Date(contract.end).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && new Date(contract.end).getTime() >= Date.now()).length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  صيانة مفتوحة: {tenantWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">الخدمات والمستندات</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                  <div className="font-bold text-slate-700 dark:text-slate-200">تتبع الخدمات</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>مصروفات الخدمات</span>
                      <strong>{formatCurrency(tenantWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), db.settings?.currency || 'OMR')}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>الفواتير المتأخرة</span>
                      <strong>{tenantWorkspace.overdueInvoices.length.toLocaleString('ar')}</strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <Wrench size={15} />
                    آخر المتابعات
                  </div>
                  <div className="space-y-2">
                    {tenantWorkspace.maintenance.slice(0, 4).map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70">
                        <span>{record.issueTitle || record.description || 'طلب صيانة'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-300">{record.status}</span>
                      </div>
                    ))}
                    {!tenantWorkspace.maintenance.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد متابعات تشغيلية مرتبطة بهذا المستأجر.</div>}
                  </div>
                </div>
                <AttachmentsManager entityType="TENANT" entityId={selectedTenant.id} />
                <button type="button" onClick={() => navigate('/reports?tab=tenants')} className={`${ghostButton} w-full`}>
                  <Printer size={15} />
                  طباعة تقرير المستأجر
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant ? 'تعديل بيانات المستأجر' : 'إضافة مستأجر جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className={labelCls}>
                اسم المستأجر <span className="text-rose-500">*</span>
              </label>
              <input className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="الاسم الكامل" required />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف</label>
              <input className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+968 9999 9999" />
            </div>
            <div>
              <label className={labelCls}>البريد الإلكتروني</label>
              <input className={inputCls} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="tenant@example.com" />
            </div>
            <div>
              <label className={labelCls}>رقم الهوية</label>
              <input className={inputCls} value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} placeholder="الهوية أو الإقامة" />
            </div>
            <div>
              <label className={labelCls}>الحالة</label>
              <select className={inputCls} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' })}>
                <option value="ACTIVE">نشط</option>
                <option value="INACTIVE">غير نشط</option>
                <option value="BLACKLISTED">قائمة سوداء</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>ملاحظات</label>
            <textarea className={`${inputCls} min-h-[120px]`} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية عن المستأجر أو تفضيلاته" />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <button type="button" onClick={() => setIsModalOpen(false)} className={ghostButton}>
              إلغاء
            </button>
            <button type="submit" className={primaryButton}>
              {editingTenant ? 'حفظ التعديلات' : 'إضافة المستأجر'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!tenantToDelete} onClose={() => setTenantToDelete(null)} title="تأكيد حذف المستأجر" size="sm">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">هل أنت متأكد من الحذف؟</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">سيتم حذف المستأجر نهائيًا من السجل.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              سيتم حذف ملف المستأجر <strong className="font-semibold text-slate-900 dark:text-white">{tenantToDelete?.name || '—'}</strong> من قاعدة البيانات نهائيًا.
              تأكد من عدم وجود عقود فعالة مرتبطة به قبل المتابعة.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <button onClick={() => setTenantToDelete(null)} className={ghostButton}>
              إلغاء
            </button>
            <button onClick={handleDelete} className={dangerButton}>
              حذف المستأجر
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tenants;
