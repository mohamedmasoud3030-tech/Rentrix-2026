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
import { ContractPrintable } from '../components/print/ContractPrintable';
import { exportContractToPdf } from '../services/pdfService';
import { formatCurrency, formatDate, toArabicDigits } from '../utils/helpers';

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
  tenant?.name || tenant?.fullName || 'مستأجر غير محدد';

const displayUnitName = (unit: { name?: string | null; unitNumber?: string | null } | undefined) =>
  unit?.name || unit?.unitNumber || 'وحدة غير محددة';

const Contracts: React.FC = () => {
  const { db, dataService, contractBalances } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [printingContract, setPrintingContract] = useState<Contract | null>(null);
  const [defaultUnitId, setDefaultUnitId] = useState<string | undefined>();
  const [selectedContractId, setSelectedContractId] = useState('');

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
          tenantName: tenant?.name || 'مستأجر غير محدد',
          unitName: unit?.name || 'وحدة غير محددة',
          propertyName: property?.name || 'عقار غير محدد',
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

  const filteredContracts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contractRows;
    return contractRows.filter((contract) =>
      [contract.tenantName, contract.unitName, contract.propertyName, contract.status, contract.start, contract.end]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [contractRows, searchTerm]);

  const selectedContract = useMemo(() => contractRows.find((contract) => contract.id === selectedContractId) || contractRows[0] || null, [contractRows, selectedContractId]);

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

    return { unit, property, owner, tenant, invoices, receipts, expenses, maintenance, overdueInvoices, utilityExpenses };
  }, [db.expenses, db.invoices, db.maintenanceRecords, db.owners, db.properties, db.receipts, db.tenants, db.units, selectedContract]);

  const stats = useMemo(() => {
    const activeContracts = contractRows.filter((item) => item.status === 'ACTIVE');
    return {
      active: activeContracts.length,
      totalRent: activeContracts.reduce((sum, item) => sum + Number(item.rent || 0), 0),
      expiring: activeContracts.filter((item) => item.isExpiring).length,
      overdueBalance: activeContracts.reduce((sum, item) => sum + Math.max(item.balance, 0), 0),
    };
  }, [contractRows]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedUnitId = params.get('unitId');
    const requestedContractId = params.get('contractId');

    if (params.get('action') === 'add' && requestedUnitId) {
      setEditingContract(null);
      setDefaultUnitId(requestedUnitId);
      setIsModalOpen(true);
      navigate('/contracts', { replace: true });
      return;
    }

    if (requestedContractId) {
      const contract = db.contracts.find((item) => item.id === requestedContractId);
      if (contract) {
        setEditingContract(contract);
        setDefaultUnitId(undefined);
        setIsModalOpen(true);
      }
      navigate('/contracts', { replace: true });
    }
  }, [db.contracts, location.search, navigate]);

  const openCreate = () => {
    setEditingContract(null);
    setDefaultUnitId(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setDefaultUnitId(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = async (contractId: string) => {
    if (db.receipts.some((item) => item.contractId === contractId) || db.expenses.some((item) => item.contractId === contractId)) {
      toast.error('لا يمكن حذف العقد لوجود حركات مالية مرتبطة به.');
      return;
    }

    await dataService.remove('contracts', contractId);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة العقود" description="عرض وتعديل جميع عقود الإيجار وربط التحصيل والطباعة والتجديد من شاشة واحدة.">
        <button onClick={openCreate} className={primaryButton}>
          <PlusCircle size={16} />
          إضافة عقد
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard label="العقود النشطة" value={stats.active.toLocaleString('ar')} icon={<FileText size={20} />} color="blue" />
        <SummaryStatCard label="إجمالي الإيجارات" value={formatCurrency(stats.totalRent, currency)} icon={<DollarSign size={20} />} color="emerald" />
        <SummaryStatCard label="تنتهي قريبًا" value={stats.expiring.toLocaleString('ar')} icon={<Clock size={20} />} color={stats.expiring > 0 ? 'amber' : 'emerald'} />
        <SummaryStatCard label="المتأخرات" value={formatCurrency(stats.overdueBalance, currency)} icon={<AlertTriangle size={20} />} color={stats.overdueBalance > 0 ? 'rose' : 'emerald'} />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

        <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث باسم المستأجر أو الوحدة أو العقار أو حالة العقد..." />

        {filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
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
                        {contract.status === 'ACTIVE' ? 'نشط' : contract.status === 'ENDED' || contract.status === 'EXPIRED' ? 'منتهي' : 'معلّق'}
                      </StatusPill>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {contract.balance > 0 && (
                          <button onClick={() => navigate('/financials')} className={dangerButton}>
                            <DollarSign size={14} />
                            تحصيل
                          </button>
                        )}
                        {contract.isExpiring && (
                          <button onClick={() => openEdit(contract)} className={warningButton}>
                            <RefreshCw size={14} />
                            تجديد
                          </button>
                        )}
                        <button onClick={() => openEdit(contract)} className={ghostButton}>
                          تعديل
                        </button>
                        <button onClick={() => setPrintingContract(contract)} className={ghostButton}>
                          <Printer size={14} />
                          طباعة
                        </button>
                        <button onClick={() => handleDelete(contract.id)} className={dangerButton}>
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
          <Card className="p-6">
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

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<DollarSign size={18} />} color="emerald" title="الإيجار الشهري" value={formatCurrency(selectedContract.rent, currency)} />
              <SummaryStatCard icon={<AlertTriangle size={18} />} color="rose" title="الرصيد المستحق" value={formatCurrency(selectedContract.balance, currency)} />
              <SummaryStatCard icon={<FileText size={18} />} color="blue" title="الفواتير" value={contractWorkspace.invoices.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Receipt size={18} />} color="amber" title="الدفعات" value={contractWorkspace.receipts.length.toLocaleString('ar')} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="space-y-6">
            <Card className="p-6">
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

            <Card className="p-6">
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

      <ContractForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} contract={editingContract} defaultUnitId={defaultUnitId} />

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
          <ContractPrintable contract={printingContract} />
        </PrintPreviewModal>
      )}
    </div>
  );
};

const ContractForm: React.FC<{ isOpen: boolean; onClose: () => void; contract: Contract | null; defaultUnitId?: string }> = ({ isOpen, onClose, contract, defaultUnitId }) => {
  const { db, dataService } = useApp();
  const [data, setData] = useState<Partial<Omit<Contract, 'id' | 'createdAt'>>>({});

  const availableUnits = useMemo(
    () => db.units.filter((unit) => !db.contracts.some((item) => item.unitId === unit.id && item.status === 'ACTIVE' && item.id !== contract?.id)),
    [contract?.id, db.contracts, db.units]
  );

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
      tenantId: db.tenants[0]?.id || '',
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
  }, [availableUnits, contract, db.tenants, defaultUnitId, isOpen]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setData((current) => ({
      ...current,
      [name]: ['rent', 'dueDay', 'deposit', 'ownerAgreementValue'].includes(name) ? Number(value) : value,
    }));
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const start = event.target.value;
    const nextEnd = new Date(start);
    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    setData((current) => ({
      ...current,
      start,
      end: nextEnd.toISOString().slice(0, 10),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data.unitId || !data.tenantId || !data.start || !data.end) {
      toast.error('يرجى تعبئة الحقول الأساسية للعقد.');
      return;
    }

    if (contract) await dataService.update('contracts', contract.id, data);
    else await dataService.add('contracts', data);

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'تعديل العقد' : 'إضافة عقد جديد'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>الوحدة</label>
            <select className={inputCls} name="unitId" value={data.unitId || ''} onChange={handleChange} required>
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
          </div>
          <div>
            <label className={labelCls}>المستأجر</label>
            <select className={inputCls} name="tenantId" value={data.tenantId || ''} onChange={handleChange} required>
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
          <button type="submit" className={primaryButton}>
            حفظ العقد
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Contracts;
