
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { ReceiptText, RefreshCw, PlusCircle, AlertTriangle, DollarSign, Clock, Hash, CheckCircle2, FileText, Wallet, Link2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ActionsMenu, { EditAction, VoidAction, PrintAction } from '../components/shared/ActionsMenu';
import InvoiceForm from '../components/forms/InvoiceForm';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { InvoicePrintable } from '../components/print/InvoicePrintable';
import { exportInvoiceToPdf } from '../services/pdfService';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import Tabs from '../components/ui/Tabs';

// Use the shared table components to unify styling
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';

const primaryButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const successButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600';
const displayTenantName = (tenant?: { name?: string | null; fullName?: string | null } | null) => tenant?.name || tenant?.fullName || '—';
const displayUnitName = (unit?: { name?: string | null; unitNumber?: string | null } | null) => unit?.name || unit?.unitNumber || '—';

const Invoices: React.FC = () => {
    const { db, financeService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const currency = db.settings?.currency || 'OMR';

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceTab, setInvoiceTab] = useState<'overview' | 'payments' | 'activity'>('overview');

    const filters = [ { key: 'all', label: 'الكل' }, { key: 'unpaid', label: 'غير مدفوعة' }, { key: 'overdue', label: 'متأخرة' }, { key: 'paid', label: 'مدفوعة' }];
    const [activeFilter, setActiveFilter] = useState('all');
    const activeFilterChips = [
        ...(searchTerm ? [{ key: 'search', label: `بحث: ${searchTerm}` }] : []),
        ...(activeFilter !== 'all'
            ? [{ key: 'status', label: `الحالة: ${filters.find((item) => item.key === activeFilter)?.label || activeFilter}` }]
            : []),
    ];

    useEffect(() => {
        const filterParam = new URLSearchParams(location.search).get('filter') || 'all';
        if (filters.some(f => f.key === filterParam)) setActiveFilter(filterParam);
    }, [location.search]);

    const handleFilterChange = (filterKey: string) => {
        setActiveFilter(filterKey);
        navigate(`/invoices?filter=${filterKey}`);
    };

    const handleGenerateInvoices = async () => {
        setIsMonthlyLoading(true);
        try {
            const count = await financeService.generateMonthlyInvoices();
            toast.success(`تم إصدار ${count} فاتورة جديدة بنجاح.`);
        } catch (error) { toast.error(`فشل إصدار الفواتير: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally { setIsMonthlyLoading(false); }
    };
    
    const getInvoiceStatusLabel = (status: Invoice['status']) => {
        const map: { [key in Invoice['status']]: string } = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'PARTIALLY_PAID': 'مدفوعة جزئياً', 'OVERDUE': 'متأخرة', 'VOID': 'ملغاة' };
        return map[status] || status;
    };

    const getInvoiceTypeLabel = (type: Invoice['type']) => {
        const map: Record<Invoice['type'], string> = {
            RENT: 'إيجار',
            MAINTENANCE: 'صيانة',
            DEPOSIT: 'تأمين',
            OTHER: 'أخرى',
        };
        return map[type] || type;
    };

    const summaryData = useMemo(() => {
        const unpaid = db.invoices.filter(i => i.status !== 'PAID' && i.status !== 'VOID');
        const overdue = unpaid.filter(i => new Date(i.dueDate) < new Date() && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status));
        
        const overdueAmount = overdue.reduce((sum, i) => sum + (i.amount + (i.taxAmount||0) - i.paidAmount), 0);
        const unpaidAmount = unpaid.reduce((sum, i) => sum + (i.amount + (i.taxAmount||0) - i.paidAmount), 0) - overdueAmount;
        const totalOverdueDays = overdue.reduce((sum, i) => sum + (new Date().getTime() - new Date(i.dueDate).getTime()) / (1000 * 3600 * 24), 0);

        return {
            overdueAmount,
            overdueCount: overdue.length,
            unpaidAmount,
            avgOverdueDays: overdue.length > 0 ? totalOverdueDays / overdue.length : 0,
        };
    }, [db.invoices]);

    const invoicesWithDetails = useMemo(() => {
        let filteredInvoices = db.invoices.filter(inv => inv.status !== 'VOID');
        if (activeFilter !== 'all') {
            filteredInvoices = filteredInvoices.filter(inv => {
                if (activeFilter === 'unpaid') return ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status);
                if (activeFilter === 'overdue') return inv.status === 'OVERDUE';
                if (activeFilter === 'paid') return inv.status === 'PAID';
                return true;
            });
        }
        const term = searchTerm.trim().toLowerCase();
        return filteredInvoices
            .map(inv => ({ ...inv, tenant: db.tenants.find(t => t.id === db.contracts.find(c => c.id === inv.contractId)?.tenantId), unit: db.units.find(u => u.id === db.contracts.find(c=>c.id === inv.contractId)?.unitId)}))
            .filter((inv) => {
                if (!term) return true;
                return [inv.no, inv.type, inv.tenant?.name, inv.tenant?.fullName, inv.unit?.name, inv.unit?.unitNumber]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(term);
            })
            .sort((a, b) => {
                if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
                if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
                return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            });
    }, [db, activeFilter, searchTerm]);

    const selectedInvoice = useMemo(
        () => invoicesWithDetails.find((invoice) => invoice.id === selectedInvoiceId) || invoicesWithDetails[0] || null,
        [invoicesWithDetails, selectedInvoiceId]
    );

    useEffect(() => {
        setInvoiceTab('overview');
    }, [selectedInvoiceId]);

    const invoiceWorkspace = useMemo(() => {
        if (!selectedInvoice) return null;

        const contract = db.contracts.find((item) => item.id === selectedInvoice.contractId) || null;
        const tenant =
            (contract ? db.tenants.find((item) => item.id === contract.tenantId) : null) ||
            selectedInvoice.tenant ||
            null;
        const unit =
            (contract ? db.units.find((item) => item.id === contract.unitId) : null) ||
            selectedInvoice.unit ||
            null;
        const property = unit ? db.properties.find((item) => item.id === unit.propertyId) || null : null;
        const owner = property ? db.owners.find((item) => item.id === property.ownerId) || null : null;

        const allocations = db.receiptAllocations.filter((allocation) => allocation.invoiceId === selectedInvoice.id);
        const payments = allocations
            .map((allocation) => {
                const receipt = db.receipts.find((item) => item.id === allocation.receiptId);
                if (!receipt) return null;
                return { allocation, receipt };
            })
            .filter((item): item is { allocation: (typeof allocations)[number]; receipt: (typeof db.receipts)[number] } => Boolean(item))
            .sort((a, b) => new Date(b.receipt.dateTime).getTime() - new Date(a.receipt.dateTime).getTime());

        const total = Number(selectedInvoice.amount || 0) + Number(selectedInvoice.taxAmount || 0);
        const paidAmount = Number(selectedInvoice.paidAmount || 0);
        const balance = Math.max(total - paidAmount, 0);
        const allocatedAmount = allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0);

        return {
            contract,
            tenant,
            unit,
            property,
            owner,
            allocations,
            payments,
            total,
            paidAmount,
            balance,
            allocatedAmount,
        };
    }, [db.contracts, db.owners, db.properties, db.receiptAllocations, db.receipts, db.tenants, db.units, selectedInvoice]);

    const printingInvoiceWorkspace = useMemo(() => {
        if (!printingInvoice) return null;
        const contract = db.contracts.find((item) => item.id === printingInvoice.contractId) || null;
        const tenant = contract ? db.tenants.find((item) => item.id === contract.tenantId) || null : null;
        const unit = contract ? db.units.find((item) => item.id === contract.unitId) || null : null;
        const property = unit ? db.properties.find((item) => item.id === unit.propertyId) || null : null;
        return { contract, tenant, unit, property };
    }, [db.contracts, db.properties, db.tenants, db.units, printingInvoice]);

    return (
        <div className="app-page page-enter" dir="rtl">
            <PageHeader title="الفواتير والمطالبات المالية" description="مساحة عمل للفوترة والتحصيل وربط الفاتورة بالمستأجر والعقد والوحدة." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryStatCard label="إجمالي المتأخرات" value={formatCurrency(summaryData.overdueAmount, currency)} icon={<AlertTriangle size={24}/>} color="danger"/>
                <SummaryStatCard label="عدد الفواتير المتأخرة" value={summaryData.overdueCount} icon={<Hash size={24}/>} color="danger"/>
                <SummaryStatCard label="مستحق (غير متأخر)" value={formatCurrency(summaryData.unpaidAmount, currency)} icon={<DollarSign size={24}/>} color="warning"/>
                <SummaryStatCard label="متوسط أيام التأخير" value={summaryData.avgOverdueDays.toFixed(0)} icon={<Clock size={24}/>} color="warning"/>
            </div>
            <WorkspaceSection
                title="الفواتير والمطالبات المالية"
                description="متابعة حالة الاستحقاق والتحصيل وربط الفواتير بالعقود والمستأجرين."
                actions={
                    <>
                        <button onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className={ghostButtonCls}>
                            <PlusCircle size={16} /> إضافة فاتورة
                        </button>
                        <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className={primaryButtonCls}>
                            {isMonthlyLoading && <RefreshCw size={16} className="animate-spin" />} {isMonthlyLoading ? 'جاري...' : 'إصدار الفواتير الآلي'}
                        </button>
                    </>
                }
            >
                <SearchFilterBar
                    value={searchTerm}
                    onSearch={setSearchTerm}
                    placeholder={'\u0627\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0648\u062d\u062f\u0629...'}
                    rightSlot={
                        <select
                            className="w-full min-w-[170px] rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
                            value={activeFilter}
                            onChange={(event) => handleFilterChange(event.target.value)}
                        >
                            {filters.map((filter) => (
                                <option key={filter.key} value={filter.key}>
                                    {filter.label}
                                </option>
                            ))}
                        </select>
                    }
                    filterChips={activeFilterChips}
                    onRemoveChip={(key) => {
                        if (key === 'search') setSearchTerm('');
                        if (key === 'status') handleFilterChange('all');
                    }}
                    onClearAll={activeFilterChips.length ? () => { setSearchTerm(''); handleFilterChange('all'); } : undefined}
                />

                {invoicesWithDetails.length ? (
                    <TableWrapper>
                        <thead className="bg-slate-50 dark:bg-slate-800/70">
                            <tr>
                                <Th>#</Th>
                                <Th>{'\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 / \u0627\u0644\u0648\u062d\u062f\u0629'}</Th>
                                <Th>{'\u0627\u0644\u0646\u0648\u0639'}</Th>
                                <Th>{'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642'}</Th>
                                <Th>{'\u0627\u0644\u0645\u0628\u0644\u063a'}</Th>
                                <Th>{'\u0627\u0644\u062d\u0627\u0644\u0629'}</Th>
                                <Th className="text-left">{'\u0625\u062c\u0631\u0627\u0621 \u0633\u0631\u064a\u0639'}</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoicesWithDetails.map(inv => {
                                const total = Number(inv.amount || 0) + Number(inv.taxAmount || 0);
                                const balance = Math.max(total - Number(inv.paidAmount || 0), 0);
                                const invoiceNo = inv.no || inv.id.slice(0, 8).toUpperCase();

                                return (
                                <Tr
                                    key={inv.id}
                                    onClick={() => setSelectedInvoiceId(inv.id)}
                                    className={`group cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-blue-50/70 dark:bg-blue-500/10' : ''} ${inv.status === 'PAID' ? 'opacity-60' : ''} ${inv.status === 'OVERDUE' ? 'bg-rose-50/60 dark:bg-rose-500/5' : ''}`}
                                >
                                    <Td data-label="#" className="font-mono text-xs">{invoiceNo}</Td>
                                    <Td data-label={'\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 / \u0627\u0644\u0648\u062d\u062f\u0629'}>
                                        <div className="font-bold">{displayTenantName(inv.tenant)}</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{displayUnitName(inv.unit)}</div>
                                    </Td>
                                    <Td data-label={'\u0627\u0644\u0646\u0648\u0639'} className="text-xs">{getInvoiceTypeLabel(inv.type)}</Td>
                                    <Td data-label={'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642'} className="text-xs">{formatDate(inv.dueDate)}</Td>
                                    <Td data-label={'\u0627\u0644\u0645\u0628\u0644\u063a'}>
                                        <div className="font-mono font-bold">{formatCurrency(total, currency)}</div>
                                        {balance > 0 && (
                                            <div className="text-[10px] text-rose-600 dark:text-rose-300">
                                                {'\u0645\u062a\u0628\u0642\u064a:'} {formatCurrency(balance, currency)}
                                            </div>
                                        )}
                                    </Td>
                                    <Td data-label={'\u0627\u0644\u062d\u0627\u0644\u0629'}><StatusPill status={inv.status}>{getInvoiceStatusLabel(inv.status)}</StatusPill></Td>
                                    <Td data-label={'\u0625\u062c\u0631\u0627\u0621 \u0633\u0631\u064a\u0639'} className="text-left">
                                        <div className="flex items-center justify-end gap-2">
                                            {inv.status !== 'PAID' && (
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        navigate(`/financials?tab=receipts&action=add&invoiceId=${inv.id}`);
                                                    }}
                                                    className={successButtonCls}
                                                >
                                                    <DollarSign size={12}/> {'\u062a\u062d\u0635\u064a\u0644'}
                                                </button>
                                            )}
                                            <div className="opacity-0 transition-opacity group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
                                                <ActionsMenu items={[
                                                    EditAction(() => {setEditingInvoice(inv); setIsModalOpen(true);}),
                                                    PrintAction(() => setPrintingInvoice(inv)),
                                                    VoidAction(() => financeService.voidInvoice(inv.id)),
                                                ]} />
                                            </div>
                                        </div>
                                    </Td>
                                </Tr>
                            )})}
                        </tbody>
                    </TableWrapper>
                ) : (
                    <div className="erp-empty py-10">
                        <ReceiptText size={52} className="mx-auto text-slate-300 dark:text-slate-700" />
                        <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">لا توجد فواتير</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">ابدأ بإضافة فاتورة جديدة أو عدّل عوامل التصفية لإظهار النتائج.</p>
                    </div>
                )}

                <InvoiceForm isOpen={isModalOpen} onClose={() => {setEditingInvoice(null); setIsModalOpen(false);}} invoice={editingInvoice} />
            </WorkspaceSection>
            {selectedInvoice && invoiceWorkspace && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.06fr_0.94fr]">
                    <WorkspaceSection
                        title="سجل الفاتورة"
                        description="سجل مالي رسمي يوضح بيانات الفاتورة، حالة السداد، والدفعات المرتبطة."
                        actions={
                            <>
                                {selectedInvoice.status !== 'PAID' && (
                                    <button onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${selectedInvoice.id}`)} className={successButtonCls}>
                                        <DollarSign size={14}/>
                                        تحصيل
                                    </button>
                                )}
                                <button onClick={() => setPrintingInvoice(selectedInvoice)} className={ghostButtonCls}>
                                    <ReceiptText size={14}/>
                                    طباعة
                                </button>
                            </>
                        }
                    >
                        {(() => {
                            const invoiceNo = selectedInvoice.no || selectedInvoice.id.slice(0, 8).toUpperCase();
                            const channelLabel = (channel?: string | null) => {
                                if (channel === 'CASH') return 'نقدي';
                                if (channel === 'BANK') return 'تحويل بنكي';
                                if (channel === 'CARD') return 'بطاقة';
                                return channel || '—';
                            };
                            const itemDescription = (() => {
                                const unitLabel = displayUnitName(invoiceWorkspace.unit);
                                if (selectedInvoice.type === 'MAINTENANCE') return unitLabel ? `أعمال صيانة للوحدة ${unitLabel}` : 'أعمال صيانة';
                                if (selectedInvoice.type === 'DEPOSIT') return unitLabel ? `تأمين للوحدة ${unitLabel}` : 'تأمين';
                                if (selectedInvoice.type === 'OTHER') return unitLabel ? `مطالبة أخرى للوحدة ${unitLabel}` : 'مطالبة أخرى';
                                return unitLabel ? `إيجار الوحدة ${unitLabel}` : 'إيجار';
                            })();

                            const tabItems = [
                                { id: 'overview', label: 'نظرة عامة', icon: <Link2 size={16} /> },
                                { id: 'payments', label: 'المدفوعات', icon: <Wallet size={16} />, count: invoiceWorkspace.payments.length },
                                { id: 'activity', label: 'السجل', icon: <FileText size={16} /> },
                            ];

                            return (
                                <>
                                    <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <SummaryStatCard label="رقم الفاتورة" value={invoiceNo} icon={<Hash size={18}/>} color="slate"/>
                                        <SummaryStatCard label="الإجمالي" value={formatCurrency(invoiceWorkspace.total, currency)} icon={<DollarSign size={18}/>} color="blue"/>
                                        <SummaryStatCard label="المدفوع" value={formatCurrency(invoiceWorkspace.paidAmount, currency)} icon={<CheckCircle2 size={18}/>} color={invoiceWorkspace.paidAmount > 0 ? 'emerald' : 'slate'}/>
                                        <SummaryStatCard label="المتبقي" value={formatCurrency(invoiceWorkspace.balance, currency)} icon={<AlertTriangle size={18}/>} color={invoiceWorkspace.balance > 0 ? 'rose' : 'emerald'}/>
                                    </div>

                                    <div className="mt-4">
                                        <Tabs
                                            tabs={tabItems}
                                            activeTab={invoiceTab}
                                            onChange={(id) => setInvoiceTab(id as typeof invoiceTab)}
                                            variant="pill"
                                        />
                                    </div>

                                    {invoiceTab === 'overview' ? (
                                        <div className="mt-4 space-y-4">
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الارتباطات</div>
                                                    <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                                        <div><strong>المستأجر:</strong> {displayTenantName(invoiceWorkspace.tenant)}</div>
                                                        <div><strong>الوحدة:</strong> {displayUnitName(invoiceWorkspace.unit)}</div>
                                                        <div><strong>العقار:</strong> {invoiceWorkspace.property?.name || '—'}</div>
                                                        <div><strong>المالك:</strong> {invoiceWorkspace.owner?.name || '—'}</div>
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الفوترة والتحصيل</div>
                                                    <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                                        <div><strong>نوع الفاتورة:</strong> {getInvoiceTypeLabel(selectedInvoice.type)}</div>
                                                        <div><strong>تاريخ الاستحقاق:</strong> {formatDate(selectedInvoice.dueDate)}</div>
                                                        <div><strong>حالة السداد:</strong> <StatusPill status={selectedInvoice.status}>{getInvoiceStatusLabel(selectedInvoice.status)}</StatusPill></div>
                                                        <div><strong>عدد السندات:</strong> {invoiceWorkspace.payments.length.toLocaleString('ar')}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/94 shadow-sm dark:border-slate-800/90 dark:bg-slate-900/92">
                                                <div className="border-b border-slate-100 px-4 py-3 text-xs font-black text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                                    بنود الفاتورة
                                                </div>
                                                <div className="overflow-auto">
                                                    <table className="min-w-[680px] w-full border-collapse text-sm">
                                                        <thead className="bg-slate-50/80 dark:bg-slate-800/70">
                                                            <tr>
                                                                <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-500">البند</th>
                                                                <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-500">الوصف</th>
                                                                <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-500">المبلغ</th>
                                                                <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-500">الضريبة</th>
                                                                <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-500">الإجمالي</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-t border-slate-100 dark:border-slate-800">
                                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{getInvoiceTypeLabel(selectedInvoice.type)}</td>
                                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{itemDescription}</td>
                                                                <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-100">{formatCurrency(selectedInvoice.amount, currency)}</td>
                                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{formatCurrency(selectedInvoice.taxAmount || 0, currency)}</td>
                                                                <td className="px-4 py-3 font-mono font-black text-slate-900 dark:text-white">{formatCurrency(invoiceWorkspace.total, currency)}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200/80 bg-white/94 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800/90 dark:bg-slate-900/92 dark:text-slate-200">
                                                <div className="text-xs font-black text-slate-600 dark:text-slate-300">ملاحظات</div>
                                                <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{selectedInvoice.notes || 'لا توجد ملاحظات إضافية على الفاتورة.'}</p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {invoiceTab === 'payments' ? (
                                        <div className="mt-4 space-y-4">
                                            {invoiceWorkspace.payments.length ? (
                                                <TableWrapper>
                                                    <thead className="bg-slate-50 dark:bg-slate-800/70">
                                                        <tr>
                                                            <Th>التاريخ</Th>
                                                            <Th>السند</Th>
                                                            <Th>الطريقة</Th>
                                                            <Th>المرجع</Th>
                                                            <Th>المبلغ</Th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {invoiceWorkspace.payments.map(({ allocation, receipt }) => (
                                                            <Tr key={`${receipt.id}-${allocation.id}`}>
                                                                <Td data-label="التاريخ" className="text-xs">{formatDateTime(receipt.dateTime || receipt.createdAt)}</Td>
                                                                <Td data-label="السند" className="font-mono text-xs font-bold">{receipt.no || receipt.id.slice(0, 8).toUpperCase()}</Td>
                                                                <Td data-label="الطريقة" className="text-xs">{channelLabel(receipt.channel)}</Td>
                                                                <Td data-label="المرجع" className="text-xs text-slate-500 dark:text-slate-400">{receipt.ref || receipt.notes || '—'}</Td>
                                                                <Td data-label="المبلغ" className="font-mono font-black">{formatCurrency(allocation.amount, currency)}</Td>
                                                            </Tr>
                                                        ))}
                                                    </tbody>
                                                </TableWrapper>
                                            ) : (
                                                <div className="erp-empty py-10">
                                                    <Wallet size={52} className="mx-auto text-slate-300 dark:text-slate-700" />
                                                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">لا توجد مدفوعات مرتبطة</h3>
                                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">سجّل سند قبض لهذه الفاتورة ليظهر في هذا القسم.</p>
                                                </div>
                                            )}

                                            {Math.abs(invoiceWorkspace.allocatedAmount - invoiceWorkspace.paidAmount) > 0.001 ? (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                                    ملاحظة: مجموع التخصيصات ({formatCurrency(invoiceWorkspace.allocatedAmount, currency)}) لا يطابق قيمة المدفوع المسجلة على الفاتورة ({formatCurrency(invoiceWorkspace.paidAmount, currency)}).
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {invoiceTab === 'activity' ? (
                                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-200/80 bg-white/94 px-4 py-3 shadow-sm dark:border-slate-800/90 dark:bg-slate-900/92">
                                                <div className="text-[11px] font-bold text-slate-500">تاريخ الإصدار</div>
                                                <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatDate(selectedInvoice.createdAt)}</div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200/80 bg-white/94 px-4 py-3 shadow-sm dark:border-slate-800/90 dark:bg-slate-900/92">
                                                <div className="text-[11px] font-bold text-slate-500">آخر تحديث</div>
                                                <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatDate(selectedInvoice.updatedAt)}</div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200/80 bg-white/94 px-4 py-3 shadow-sm dark:border-slate-800/90 dark:bg-slate-900/92">
                                                <div className="text-[11px] font-bold text-slate-500">رقم العقد</div>
                                                <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{invoiceWorkspace.contract?.no || invoiceWorkspace.contract?.id?.slice(0, 8) || '—'}</div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200/80 bg-white/94 px-4 py-3 shadow-sm dark:border-slate-800/90 dark:bg-slate-900/92">
                                                <div className="text-[11px] font-bold text-slate-500">تاريخ الإلغاء</div>
                                                <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{selectedInvoice.voidedAt ? formatDate(selectedInvoice.voidedAt) : '—'}</div>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            );
                        })()}
                    </WorkspaceSection>

                    <div className="space-y-4">
                        <WorkspaceSection title="تنبيهات الفاتورة" description="قراءة سريعة لحالة التأخير والتخصيصات." >
                            <div className="space-y-3">
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                    {invoiceWorkspace.balance > 0 && new Date(selectedInvoice.dueDate).getTime() < Date.now()
                                        ? 'الفاتورة متأخرة وتحتاج متابعة فورية.'
                                        : 'لا توجد حالة تأخير حرجة على هذه الفاتورة.'}
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                    يمكنك الانتقال مباشرة إلى التحصيل أو الطباعة أو السجل المالي من نفس الصفحة.
                                </div>
                            </div>
                        </WorkspaceSection>

                        <WorkspaceSection title="المستندات" description="مرفقات الفاتورة وروابط المستندات المؤرشفة.">
                            <AttachmentsManager entityType="INVOICE" entityId={selectedInvoice.id} />
                        </WorkspaceSection>
                    </div>
                </div>
            )}

            {printingInvoice && (
                <PrintPreviewModal
                    isOpen={!!printingInvoice}
                    onClose={() => setPrintingInvoice(null)}
                    title={`طباعة فاتورة #${printingInvoice.no || printingInvoice.id.slice(0, 8).toUpperCase()}`}
                    onExportPdf={() => {
                        if (!db || !printingInvoice) return;
                        const contract = db.contracts.find(c => c.id === printingInvoice.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportInvoiceToPdf(printingInvoice, tenant, contract, db.settings);
                    }}
                >
                    <InvoicePrintable
                        invoice={printingInvoice}
                        settings={db.settings}
                        tenantName={
                            printingInvoiceWorkspace?.tenant?.name ||
                            printingInvoiceWorkspace?.tenant?.fullName ||
                            'مستأجر غير محدد'
                        }
                        unitName={
                            printingInvoiceWorkspace?.unit?.name ||
                            printingInvoiceWorkspace?.unit?.unitNumber ||
                            'وحدة غير محددة'
                        }
                        propertyName={printingInvoiceWorkspace?.property?.name || 'عقار غير محدد'}
                    />
                </PrintPreviewModal>
            )}
        </div>
    );
};

export default Invoices;
