import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Building2, Clock, DollarSign, FileText, Home, PlusCircle, Printer, Receipt, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Contract } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { ContractPrintable } from '../components/print/ContractPrintable';
import { exportContractToPdf } from '../services/pdfService';
import { fixMojibake, formatCurrency, formatDate, toArabicDigits } from '../utils/helpers';

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm backdrop-blur-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const warningButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600';
const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-600';

type ContractRow = Contract & {
  tenantName: string;
  unitName: string;
  propertyName: string;
  balance: number;
  isExpiring: boolean;
  risk: 'high' | 'medium' | 'low';
};

const displayTenantName = (tenant: { name?: string | null; fullName?: string | null } | undefined) =>
  fixMojibake(tenant?.name || tenant?.fullName || 'مستأجر غير محدد');

const displayUnitName = (unit: { name?: string | null; unitNumber?: string | null } | undefined) =>
  fixMojibake(unit?.name || unit?.unitNumber || 'وحدة غير محددة');

const getContractStatusLabel = (status: Contract['status']) => {
  if (status === 'ACTIVE') return 'نشط';
  if (status === 'ENDED' || status === 'EXPIRED' || status === 'TERMINATED') return 'منتهي';
  return 'معلّق';
};

const Contracts: React.FC = () => {
  const { db, dataService, contractBalances } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [printingContract, setPrintingContract] = useState<Contract | null>(null);
  const [defaultUnitId, setDefaultUnitId] = useState<string | undefined>();
  const [defaultTenantId, setDefaultTenantId] = useState<string | undefined>();
  const [selectedContractId, setSelectedContractId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Contract['status']>('ALL');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currency = db.settings?.currency || 'OMR';

  const contractRows = useMemo<ContractRow[]>(() => {
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + (db.settings?.contractAlertDays || db.settings?.company?.contractAlertDays || 30));

    return (db.contracts || [])
      .map((contract) => {
        const unit = db.units.find((item) => item.id === contract.unitId);
        const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;
        const tenant = db.tenants.find((item) => item.id === contract.tenantId);
        const balance = Number(contractBalances[contract.id]?.balance || 0);
        const isExpiring = contract.status === 'ACTIVE' && new Date(contract.end) <= alertDate && new Date(contract.end) >= new Date();
        const risk: ContractRow['risk'] = balance > 0 ? 'high' : isExpiring ? 'medium' : 'low';

        return {
          ...contract,
          tenantName: displayTenantName(tenant || undefined),
          unitName: displayUnitName(unit || undefined),
          propertyName: fixMojibake(property?.name || 'عقار غير محدد'),
          balance,
          isExpiring,
          risk,
        };
      })
      .sort((a, b) => {
        const riskWeight = { high: 0, medium: 1, low: 2 };
        if (riskWeight[a.risk] !== riskWeight[b.risk]) return riskWeight[a.risk] - riskWeight[b.risk];
        return new Date(a.end).getTime() - new Date(b.end).getTime();
      });
  }, [contractBalances, db.contracts, db.properties, db.settings, db.tenants, db.units]);

  const stats = useMemo(() => {
    const active = contractRows.filter((contract) => contract.status === 'ACTIVE').length;
    const totalRent = contractRows.reduce((sum, contract) => sum + Number(contract.rent || 0), 0);
    const expiring = contractRows.filter((contract) => contract.isExpiring).length;
    const overdueBalance = contractRows.reduce((sum, contract) => sum + Math.max(contract.balance, 0), 0);
    return {
      active,
      totalRent,
      expiring,
      overdueBalance,
    };
  }, [contractRows]);

  const filteredContracts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contractRows.filter((contract) => {
      const matchesStatus = statusFilter === 'ALL' || contract.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return (
      [contract.tenantName, contract.unitName, contract.propertyName, contract.status, contract.start, contract.end]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
      );
    });
  }, [contractRows, searchTerm, statusFilter]);

  const selectedContract = useMemo(
    () => filteredContracts.find((contract) => contract.id === selectedContractId) || filteredContracts[0] || null,
    [filteredContracts, selectedContractId],
  );

  const contractWorkspace = useMemo(() => {
    if (!selectedContract) return null;
    const unit = db.units.find((item) => item.id === selectedContract.unitId);
    const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;
    const owner = property ? db.owners.find((item) => item.id === property.ownerId) : null;
    const tenant = db.tenants.find((item) => item.id === selectedContract.tenantId);
    const invoices = db.invoices.filter((invoice) => invoice.contractId === selectedContract.id);
    const receipts = db.receipts.filter((receipt) => receipt.contractId === selectedContract.id);
    const expenses = db.expenses.filter((expense) => expense.contractId === selectedContract.id);
    const maintenance = db.maintenanceRecords.filter((record) => record.unitId === unit?.id || record.propertyId === property?.id);
    const overdueInvoices = invoices.filter(
      (invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now(),
    );
    const utilityExpenses = expenses.filter((expense) =>
      ['كهرباء', 'مياه', 'إنترنت', 'utilities', 'electricity', 'water', 'internet'].some((term) => (expense.category || '').toLowerCase().includes(term.toLowerCase())),
    );

    const upcomingInvoices = invoices
      .filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    return { unit, property, owner, tenant, invoices, receipts, expenses, maintenance, overdueInvoices, utilityExpenses, upcomingInvoices };
  }, [db.expenses, db.invoices, db.maintenanceRecords, db.owners, db.properties, db.receipts, db.tenants, db.units, selectedContract]);

  const activeFilterChips = [
    ...(searchTerm ? [{ key: 'search', label: `\u0628\u062d\u062b: ${searchTerm}` }] : []),
    ...(statusFilter !== 'ALL'
      ? [
          {
            key: 'status',
            label: `\u0627\u0644\u062d\u0627\u0644\u0629: ${
              statusFilter === 'ACTIVE'
                ? '\u0646\u0634\u0637'
                : statusFilter === 'ENDED'
                  ? '\u0645\u0646\u062a\u0647\u064a'
                  : '\u0645\u0639\u0644\u0642'
            }`,
          },
        ]
      : []),
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedUnitId = params.get('unitId');
    const requestedTenantId = params.get('tenantId');
    const requestedContractId = params.get('contractId');

    if (params.get('new') === '1' || params.get('action') === 'add') {
      setEditingContract(null);
      setDefaultUnitId(requestedUnitId || undefined);
      setDefaultTenantId(requestedTenantId || undefined);
      setIsModalOpen(true);
      navigate('/contracts', { replace: true });
      return;
    }

    if (requestedContractId) {
      const contract = db.contracts.find((item) => item.id === requestedContractId);
      if (contract) {
        setEditingContract(contract);
        setDefaultUnitId(undefined);
        setDefaultTenantId(undefined);
        setIsModalOpen(true);
      }
      navigate('/contracts', { replace: true });
    }
  }, [db.contracts, location.search, navigate]);

  const openCreate = () => {
    setEditingContract(null);
    setDefaultUnitId(undefined);
    setDefaultTenantId(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setDefaultUnitId(undefined);
    setDefaultTenantId(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = async (contractId: string) => {
    if (db.receipts.some((item) => item.contractId === contractId) || db.expenses.some((item) => item.contractId === contractId)) {
      toast.error('لا يمكن حذف العقد لوجود حركات مالية مرتبطة به.');
      return;
    }

    setPendingDeleteId(contractId);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      setIsDeleting(true);
      await dataService.remove('contracts', pendingDeleteId, { silent: true });
      toast.success('تم حذف العقد.');
      if (selectedContractId === pendingDeleteId) {
        setSelectedContractId('');
      }
      setPendingDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف العقد.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="app-page page-enter" dir="rtl">
      <PageHeader title="إدارة العقود" description="عرض وتعديل جميع عقود الإيجار وربط التحصيل والطباعة والتجديد من شاشة واحدة.">
        <button onClick={openCreate} className={primaryButton}>
          <PlusCircle size={16} />
          إضافة عقد
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard label="العقود النشطة" value={stats.active.toLocaleString('ar')} icon={<FileText size={20} />} color="blue" />
        <SummaryStatCard label="إجمالي الإيجارات" value={formatCurrency(stats.totalRent, currency)} icon={<DollarSign size={20} />} color="emerald" />
        <SummaryStatCard label="تنتهي قريبًا" value={stats.expiring.toLocaleString('ar')} icon={<Clock size={20} />} color={stats.expiring > 0 ? 'amber' : 'emerald'} />
        <SummaryStatCard label="المتأخرات" value={formatCurrency(stats.overdueBalance, currency)} icon={<AlertTriangle size={20} />} color={stats.overdueBalance > 0 ? 'rose' : 'emerald'} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">قائمة العقود</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">العقود مرتبة حسب الأولوية مع أزرار مباشرة للتحصيل والتجديد والطباعة.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/financials')} className={ghostButton}>
              <DollarSign size={16} />
              التحصيلات
            </button>
            <button onClick={() => navigate('/reports?tab=contracts')} className={ghostButton}>
              <FileText size={16} />
              تقرير العقود
            </button>
          </div>
        </div>

        <SearchFilterBar
          value={searchTerm}
          onSearch={setSearchTerm}
          placeholder={'\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 \u0623\u0648 \u0627\u0644\u0648\u062d\u062f\u0629 \u0623\u0648 \u0627\u0644\u0639\u0642\u0627\u0631...'}
          rightSlot={
            <select className={`${inputCls} min-w-[180px]`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | Contract['status'])}>
              <option value="ALL">{'\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a'}</option>
              <option value="ACTIVE">{'\u0646\u0634\u0637'}</option>
              <option value="ENDED">{'\u0645\u0646\u062a\u0647\u064a'}</option>
              <option value="SUSPENDED">{'\u0645\u0639\u0644\u0642'}</option>
            </select>
          }
          filterChips={activeFilterChips}
          onRemoveChip={(key) => {
            if (key === 'search') setSearchTerm('');
            if (key === 'status') setStatusFilter('ALL');
          }}
          onClearAll={activeFilterChips.length ? () => { setSearchTerm(''); setStatusFilter('ALL'); } : undefined}
        />

        {filteredContracts.length === 0 ? (
          <div className="erp-empty py-10">
            <FileText size={52} className="text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">لا توجد عقود مطابقة</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">أضف عقدًا جديدًا أو غيّر عبارة البحث لعرض النتائج.</p>
          </div>
        ) : (
          <TableWrapper>
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr>
                <Th>العقد</Th>
                <Th>الإيجار</Th>
                <Th>الفترة</Th>
                <Th>الرصيد المستحق</Th>
                <Th>الحالة</Th>
                <Th>الإجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContracts.map((contract) => {
                const rowTone =
                  contract.risk === 'high'
                    ? 'bg-rose-50/60 dark:bg-rose-500/5'
                    : contract.risk === 'medium'
                      ? 'bg-amber-50/60 dark:bg-amber-500/5'
                      : '';

                return (
                  <Tr key={contract.id} className={`${rowTone} ${selectedContract?.id === contract.id ? 'ring-1 ring-blue-200 dark:ring-blue-500/30' : ''}`} onClick={() => setSelectedContractId(contract.id)}>
                    <Td>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{contract.unitName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{contract.tenantName}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{contract.propertyName}</div>
                    </Td>
                    <Td className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(contract.rent, currency)}</Td>
                    <Td className="text-sm text-slate-500 dark:text-slate-400">
                      {toArabicDigits(formatDate(contract.start))} ← {toArabicDigits(formatDate(contract.end))}
                    </Td>
                    <Td className={contract.balance > 0 ? 'font-bold text-rose-600 dark:text-rose-300' : 'font-bold text-emerald-600 dark:text-emerald-300'}>
                      {formatCurrency(contract.balance, currency)}
                    </Td>
                    <Td>
                      <StatusPill status={contract.status}>
                        {getContractStatusLabel(contract.status)}
                      </StatusPill>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {contract.balance > 0 && (
                          <button onClick={(event) => { event.stopPropagation(); navigate('/financials'); }} className={dangerButton}>
                            <DollarSign size={14} />
                            تحصيل
                          </button>
                        )}
                        {contract.isExpiring && (
                          <button onClick={(event) => { event.stopPropagation(); openEdit(contract); }} className={warningButton}>
                            <RefreshCw size={14} />
                            تجديد
                          </button>
                        )}
                        <button onClick={(event) => { event.stopPropagation(); openEdit(contract); }} className={ghostButton}>
                          تعديل
                        </button>
                        <button onClick={(event) => { event.stopPropagation(); setPrintingContract(contract); }} className={ghostButton}>
                          <Printer size={14} />
                          طباعة
                        </button>
                        <button onClick={(event) => { event.stopPropagation(); void handleDelete(contract.id); }} className={dangerButton}>
                          <Trash2 size={14} />
                          حذف
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {selectedContract && contractWorkspace && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل العقد</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ربط العقد بالمستأجر والوحدة والعقار والتحصيل والفواتير والمستندات في شاشة واحدة.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPrintingContract(selectedContract)} className={ghostButton}>
                  <Printer size={15} />
                  طباعة العقد
                </button>
                <button type="button" onClick={() => navigate('/financials')} className={ghostButton}>
                  <Receipt size={15} />
                  التحصيل
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<DollarSign size={18} />} color="emerald" title="الإيجار الشهري" value={formatCurrency(selectedContract.rent, currency)} />
              <SummaryStatCard icon={<AlertTriangle size={18} />} color="rose" title="الرصيد المستحق" value={formatCurrency(selectedContract.balance, currency)} />
              <SummaryStatCard icon={<FileText size={18} />} color="blue" title="الفواتير" value={contractWorkspace.invoices.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Receipt size={18} />} color="amber" title="الدفعات" value={contractWorkspace.receipts.length.toLocaleString('ar')} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">البيانات الأساسية</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>المستأجر:</strong> {contractWorkspace.tenant ? displayTenantName(contractWorkspace.tenant) : '—'}</div>
                  <div><strong>الوحدة:</strong> {displayUnitName(contractWorkspace.unit || undefined)}</div>
                  <div><strong>العقار:</strong> {contractWorkspace.property?.name || '—'}</div>
                  <div><strong>المالك:</strong> {contractWorkspace.owner?.name || '—'}</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الحركة المالية</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>إجمالي الفواتير:</strong> {formatCurrency(contractWorkspace.invoices.reduce((sum, item) => sum + Number(item.amount || 0) + Number(item.taxAmount || 0), 0), currency)}</div>
                  <div><strong>إجمالي المقبوض:</strong> {formatCurrency(contractWorkspace.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency)}</div>
                  <div><strong>المصروفات:</strong> {formatCurrency(contractWorkspace.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency)}</div>
                  <div><strong>التأمين:</strong> {formatCurrency(selectedContract.deposit || 0, currency)}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">الاستحقاقات القادمة</div>
                <div className="space-y-2">
                  {contractWorkspace.upcomingInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70">
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-800 dark:text-slate-100">{invoice.no || 'فاتورة'}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(invoice.dueDate)}</span>
                      </span>
                      <span className="font-extrabold text-slate-700 dark:text-slate-200">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0), currency)}</span>
                    </div>
                  ))}
                  {!contractWorkspace.upcomingInvoices.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد فواتير معلقة أو قادمة لهذا العقد.</div>}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">إجراءات سريعة</div>
                <div className="grid grid-cols-1 gap-2">
                  <button type="button" onClick={() => navigate('/financials')} className={ghostButton}>
                    <Receipt size={15} />
                    فتح شاشة التحصيل لهذا العقد
                  </button>
                  <button type="button" onClick={() => navigate('/invoices')} className={ghostButton}>
                    <FileText size={15} />
                    مراجعة الفواتير
                  </button>
                  <button type="button" onClick={() => navigate('/maintenance')} className={ghostButton}>
                    <Wrench size={15} />
                    متابعة الصيانة المرتبطة
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_0.85fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
                <div>الفاتورة</div>
                <div>الاستحقاق</div>
                <div>الحالة</div>
                <div>المبلغ</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {contractWorkspace.invoices.slice(0, 6).map((invoice) => (
                  <div key={invoice.id} className="grid grid-cols-[1fr_0.85fr_0.8fr_0.8fr] gap-4 px-4 py-3 text-sm">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{invoice.no || 'فاتورة'}</div>
                    <div className="text-slate-600 dark:text-slate-300">{formatDate(invoice.dueDate)}</div>
                    <div><StatusPill status={invoice.status}>{invoice.status}</StatusPill></div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0), currency)}</div>
                  </div>
                ))}
                {!contractWorkspace.invoices.length && <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">لا توجد فواتير مرتبطة بهذا العقد حتى الآن.</div>}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">التنبيهات والمتابعة</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  الفواتير المتأخرة: {contractWorkspace.overdueInvoices.length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  ينتهي خلال 30 يومًا: {selectedContract.isExpiring ? 'نعم' : 'لا'}
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  متابعات الصيانة: {contractWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">الخدمات والمستندات</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                  <div className="font-bold text-slate-700 dark:text-slate-200">تتبع الخدمات</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>مصروفات الخدمات</span>
                      <strong>{formatCurrency(contractWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>الفواتير المتأخرة</span>
                      <strong>{contractWorkspace.overdueInvoices.length.toLocaleString('ar')}</strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <Wrench size={15} />
                    آخر أعمال الصيانة
                  </div>
                  <div className="space-y-2">
                    {contractWorkspace.maintenance.slice(0, 4).map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70">
                        <span>{record.issueTitle || record.description || 'طلب صيانة'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-300">{record.status}</span>
                      </div>
                    ))}
                    {!contractWorkspace.maintenance.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد أعمال صيانة مرتبطة بهذا العقد.</div>}
                  </div>
                </div>
                <AttachmentsManager entityType="CONTRACT" entityId={selectedContract.id} />
              </div>
            </Card>
          </div>
        </div>
      )}

      <ContractForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contract={editingContract}
        defaultUnitId={defaultUnitId}
        defaultTenantId={defaultTenantId}
      />

      {printingContract && (
        <PrintPreviewModal
          isOpen={!!printingContract}
          onClose={() => setPrintingContract(null)}
          title="معاينة طباعة العقد"
          onExportPdf={() => {
            if (!printingContract || !db.settings) return;
            const tenant = db.tenants.find((item) => item.id === printingContract.tenantId);
            const unit = db.units.find((item) => item.id === printingContract.unitId);
            const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : undefined;
            const owner = property ? db.owners.find((item) => item.id === property.ownerId) : undefined;
            exportContractToPdf(printingContract, tenant, unit, property, owner, db.settings);
          }}
        >
          <ContractPrintable contract={printingContract} settings={db.settings} />
        </PrintPreviewModal>
      )}

      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        title="تأكيد حذف العقد"
        message="سيتم حذف العقد نهائيًا إذا لم تكن هناك حركات مالية مرتبطة به."
        confirmLabel="حذف العقد"
        cancelLabel="إلغاء"
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (isDeleting) return;
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
};

const ContractForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  defaultUnitId?: string;
  defaultTenantId?: string;
}> = ({ isOpen, onClose, contract, defaultUnitId, defaultTenantId }) => {
  const { db, dataService } = useApp();
  const [data, setData] = useState<Partial<Omit<Contract, 'id' | 'createdAt'>>>({});

  const availableUnits = useMemo(
    () => db.units.filter((unit) => !db.contracts.some((item) => item.unitId === unit.id && item.status === 'ACTIVE' && item.id !== contract?.id)),
    [contract?.id, db.contracts, db.units]
  );
  const hasAvailableUnits = availableUnits.length > 0 || !!contract;
  const hasTenants = db.tenants.length > 0;
  const selectedUnit = useMemo(() => db.units.find((unit) => unit.id === data.unitId) || null, [data.unitId, db.units]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (contract) {
      setData(contract);
      return;
    }

    const startDate = new Date(today);
    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);

    setData({
      unitId: defaultUnitId || availableUnits[0]?.id || '',
      tenantId: (defaultTenantId && db.tenants.some((tenant) => tenant.id === defaultTenantId) ? defaultTenantId : db.tenants[0]?.id) || '',
      rent: 0,
      dueDay: 1,
      start: today,
      end: endDate.toISOString().slice(0, 10),
      deposit: 0,
      status: 'ACTIVE',
      ownerAgreementType: 'PERCENTAGE',
      ownerAgreementValue: 10,
      notes: '',
    });
  }, [availableUnits, contract, db.tenants, defaultTenantId, defaultUnitId, isOpen]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setData((current) => ({
      ...current,
      [name]: ['rent', 'dueDay', 'deposit', 'ownerAgreementValue'].includes(name) ? Number(value) : value,
    }));
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const start = event.target.value;
    if (!start) {
      setData((current) => ({
        ...current,
        start: '',
        end: '',
      }));
      return;
    }

    const nextEnd = new Date(start);
    if (Number.isNaN(nextEnd.getTime())) {
      setData((current) => ({
        ...current,
        start,
      }));
      return;
    }

    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    setData((current) => ({
      ...current,
      start,
      end: nextEnd.toISOString().slice(0, 10),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasAvailableUnits) {
      toast.error('لا توجد وحدات متاحة حاليًا لإنشاء عقد جديد.');
      return;
    }

    if (!hasTenants) {
      toast.error('لا يوجد مستأجرون مسجلون. أضف مستأجرًا أولًا ثم أنشئ العقد.');
      return;
    }

    if (!data.unitId || !data.tenantId || !data.start || !data.end) {
      toast.error('يرجى تعبئة الحقول الأساسية للعقد.');
      return;
    }

    if (new Date(data.end).getTime() <= new Date(data.start).getTime()) {
      toast.error('يجب أن يكون تاريخ نهاية العقد بعد تاريخ البداية.');
      return;
    }

    try {
      if (contract) await dataService.update('contracts', contract.id, data, { silent: true });
      else await dataService.add('contracts', data, { silent: true });
      toast.success(contract ? 'تم تحديث العقد بنجاح.' : 'تم تسجيل العقد بنجاح.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ بيانات العقد.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'تعديل العقد' : 'إضافة عقد جديد'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!hasAvailableUnits && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            لا توجد وحدات شاغرة متاحة لإضافة عقد جديد الآن. قم بإنهاء عقد قائم أو أضف وحدة جديدة ثم أعد المحاولة.
          </div>
        )}
        {!hasTenants && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            لا يمكن إنشاء عقد بدون مستأجر. أضف مستأجرًا أولًا من شاشة المستأجرين أو العملاء المحتملين.
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>الوحدة</label>
            <select className={inputCls} name="unitId" value={data.unitId || ''} onChange={handleChange} required disabled={!hasAvailableUnits && !contract}>
              {!contract && !availableUnits.length && <option value="">لا توجد وحدات متاحة</option>}
              {contract && !availableUnits.some((item) => item.id === contract.unitId) && (
                <option value={contract.unitId}>
                  {db.units.find((item) => item.id === contract.unitId)?.name || 'الوحدة الحالية'}
                </option>
              )}
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({db.properties.find((property) => property.id === unit.propertyId)?.name || 'عقار غير محدد'})
                </option>
              ))}
            </select>
            {selectedUnit && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                العقار: {fixMojibake(db.properties.find((property) => property.id === selectedUnit.propertyId)?.name || 'عقار غير محدد')}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>المستأجر</label>
            <select className={inputCls} name="tenantId" value={data.tenantId || ''} onChange={handleChange} required disabled={!hasTenants}>
              {!db.tenants.length && <option value="">لا يوجد مستأجرون مسجلون</option>}
              {db.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {displayTenantName(tenant)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>الإيجار</label>
            <input className={inputCls} name="rent" type="number" value={data.rent ?? 0} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelCls}>يوم الاستحقاق</label>
            <input className={inputCls} name="dueDay" type="number" min="1" max="28" value={data.dueDay ?? 1} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelCls}>بداية العقد</label>
            <input className={inputCls} name="start" type="date" value={data.start || ''} onChange={handleStartDateChange} required />
          </div>
          <div>
            <label className={labelCls}>نهاية العقد</label>
            <input className={inputCls} name="end" type="date" value={data.end || ''} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelCls}>التأمين</label>
            <input className={inputCls} name="deposit" type="number" value={data.deposit ?? 0} onChange={handleChange} />
          </div>
          <div>
            <label className={labelCls}>الحالة</label>
            <select className={inputCls} name="status" value={data.status || 'ACTIVE'} onChange={handleChange}>
              <option value="ACTIVE">نشط</option>
              <option value="ENDED">منتهي</option>
              <option value="SUSPENDED">معلّق</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>نوع اتفاق المالك</label>
            <select className={inputCls} name="ownerAgreementType" value={data.ownerAgreementType || 'PERCENTAGE'} onChange={handleChange}>
              <option value="PERCENTAGE">نسبة إدارة</option>
              <option value="FIXED">استثمار ثابت</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>قيمة الاتفاق</label>
            <input
              className={inputCls}
              name="ownerAgreementValue"
              type="number"
              value={data.ownerAgreementValue ?? 0}
              onChange={handleChange}
              placeholder={data.ownerAgreementType === 'FIXED' ? 'مبلغ الاستثمار الشهري' : 'نسبة الإدارة %'}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>ملاحظات</label>
            <textarea className={`${inputCls} min-h-[110px]`} name="notes" value={data.notes || ''} onChange={handleChange} />
          </div>
        </div>

        {contract && <AttachmentsManager entityType="CONTRACT" entityId={contract.id} />}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className={ghostButton}>
            إلغاء
          </button>
          <button type="submit" className={primaryButton} disabled={!hasAvailableUnits || !hasTenants}>
            حفظ العقد
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Contracts;





