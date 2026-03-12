
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import Card from '../components/ui/Card';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ReceiptText, RefreshCw, PlusCircle, AlertTriangle, DollarSign, Clock, Hash, CheckCircle2 } from 'lucide-react';
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

// Use the shared table components to unify styling
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';

const primaryButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const successButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600';
const displayTenantName = (tenant?: { name?: string | null; fullName?: string | null } | null) => tenant?.name || tenant?.fullName || 'â€”';
const displayUnitName = (unit?: { name?: string | null; unitNumber?: string | null } | null) => unit?.name || unit?.unitNumber || 'â€”';

const Invoices: React.FC = () => {
    const { db, financeService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filters = [ { key: 'all', label: 'Ø§Ù„ÙƒÙ„' }, { key: 'unpaid', label: 'ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©' }, { key: 'overdue', label: 'Ù…ØªØ£Ø®Ø±Ø©' }, { key: 'paid', label: 'Ù…Ø¯ÙÙˆØ¹Ø©' }];
    const [activeFilter, setActiveFilter] = useState('all');
    const activeFilterChips = [
        ...(searchTerm ? [{ key: 'search', label: `Ø¨Ø­Ø«: ${searchTerm}` }] : []),
        ...(activeFilter !== 'all'
            ? [{ key: 'status', label: `Ø§Ù„Ø­Ø§Ù„Ø©: ${filters.find((item) => item.key === activeFilter)?.label || activeFilter}` }]
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
            toast.success(`ØªÙ… Ø¥ØµØ¯Ø§Ø± ${count} ÙØ§ØªÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø© Ø¨Ù†Ø¬Ø§Ø­.`);
        } catch (error) { toast.error(`ÙØ´Ù„ Ø¥ØµØ¯Ø§Ø± Ø§Ù„ÙÙˆØ§ØªÙŠØ±: ${error instanceof Error ? error.message : 'Ø®Ø·Ø£ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ'}`);
        } finally { setIsMonthlyLoading(false); }
    };
    
    const getInvoiceStatusLabel = (status: Invoice['status']) => {
        const map: { [key in Invoice['status']]: string } = { 'PAID': 'Ù…Ø¯ÙÙˆØ¹Ø©', 'UNPAID': 'ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©', 'PARTIALLY_PAID': 'Ù…Ø¯ÙÙˆØ¹Ø© Ø¬Ø²Ø¦ÙŠØ§Ù‹', 'OVERDUE': 'Ù…ØªØ£Ø®Ø±Ø©', 'VOID': 'Ù…Ù„ØºØ§Ø©' };
        return map[status] || status;
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

    const invoiceWorkspace = useMemo(() => {
        if (!selectedInvoice) return null;
        const contract = db.contracts.find((item) => item.id === selectedInvoice.contractId);
        const property = selectedInvoice.unit ? db.properties.find((item) => item.id === selectedInvoice.unit?.propertyId) : null;
        const owner = property ? db.owners.find((item) => item.id === property.ownerId) : null;
        const receipts = db.receipts.filter((receipt) => receipt.contractId === selectedInvoice.contractId);
        const balance = selectedInvoice.amount + (selectedInvoice.taxAmount || 0) - selectedInvoice.paidAmount;
        return { contract, property, owner, receipts, balance };
    }, [db.contracts, db.owners, db.properties, db.receipts, selectedInvoice]);

    return (
        <div className="app-page page-enter" dir="rtl">
            <PageHeader title="Ø§Ù„ÙÙˆØ§ØªÙŠØ± ÙˆØ§Ù„Ù…Ø·Ø§Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©" description="Ù…Ø³Ø§Ø­Ø© Ø¹Ù…Ù„ Ù„Ù„ÙÙˆØªØ±Ø© ÙˆØ§Ù„ØªØ­ØµÙŠÙ„ ÙˆØ±Ø¨Ø· Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± ÙˆØ§Ù„Ø¹Ù‚Ø¯ ÙˆØ§Ù„ÙˆØ­Ø¯Ø©." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryStatCard label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØªØ£Ø®Ø±Ø§Øª" value={formatCurrency(summaryData.overdueAmount)} icon={<AlertTriangle size={24}/>} color="danger"/>
                <SummaryStatCard label="Ø¹Ø¯Ø¯ Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…ØªØ£Ø®Ø±Ø©" value={summaryData.overdueCount} icon={<Hash size={24}/>} color="danger"/>
                <SummaryStatCard label="Ù…Ø³ØªØ­Ù‚ (ØºÙŠØ± Ù…ØªØ£Ø®Ø±)" value={formatCurrency(summaryData.unpaidAmount)} icon={<DollarSign size={24}/>} color="warning"/>
                <SummaryStatCard label="Ù…ØªÙˆØ³Ø· Ø£ÙŠØ§Ù… Ø§Ù„ØªØ£Ø®ÙŠØ±" value={summaryData.avgOverdueDays.toFixed(0)} icon={<Clock size={24}/>} color="warning"/>
            </div>
            <Card className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">Ø§Ù„ÙÙˆØ§ØªÙŠØ± ÙˆØ§Ù„Ù…Ø·Ø§Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className={ghostButtonCls}><PlusCircle size={16} /> Ø¥Ø¶Ø§ÙØ© ÙØ§ØªÙˆØ±Ø©</button>
                        <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className={primaryButtonCls}>
                            {isMonthlyLoading && <RefreshCw size={16} className="animate-spin" />} {isMonthlyLoading ? 'Ø¬Ø§Ø±ÙŠ...' : 'Ø¥ØµØ¯Ø§Ø± Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ø¢Ù„ÙŠ'}
                        </button>
                    </div>
                </div>
                <SearchFilterBar
                    value={searchTerm}
                    onSearch={setSearchTerm}
                    placeholder={'\u0627\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0648\u062d\u062f\u0629...'}
                    rightSlot={
                        <select className="w-full min-w-[170px] rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200" value={activeFilter} onChange={(event) => handleFilterChange(event.target.value)}>
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
                <div>
                    {/* Wrap table with TableWrapper for consistent styling */}
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
                                const balance = inv.amount + (inv.taxAmount || 0) - inv.paidAmount;
                                return (
                                <Tr key={inv.id} onClick={() => setSelectedInvoiceId(inv.id)} className={`group cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-blue-50/70 dark:bg-blue-500/10' : ''} ${inv.status === 'PAID' ? 'opacity-60' : ''} ${inv.status === 'OVERDUE' ? 'bg-rose-50/60 dark:bg-rose-500/5' : ''}`}>
                                    <Td data-label="#" className="font-mono text-xs">{inv.no}</Td>
                                    <Td data-label={'\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 / \u0627\u0644\u0648\u062d\u062f\u0629'}><div className="font-bold">{displayTenantName(inv.tenant)}</div><div className="text-[10px] text-slate-500 dark:text-slate-400">{displayUnitName(inv.unit)}</div></Td>
                                    <Td data-label={'\u0627\u0644\u0646\u0648\u0639'} className="text-xs">{inv.type}</Td>
                                    <Td data-label={'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642'} className="text-xs">{formatDate(inv.dueDate)}</Td>
                                    <Td data-label={'\u0627\u0644\u0645\u0628\u0644\u063a'}><div className="font-mono font-bold">{formatCurrency(inv.amount + (inv.taxAmount || 0))}</div>{balance > 0 && <div className="text-[10px] text-rose-600 dark:text-rose-300">{'\u0645\u062a\u0628\u0642\u064a:'} {formatCurrency(balance)}</div>}</Td>
                                    <Td data-label={'\u0627\u0644\u062d\u0627\u0644\u0629'}><StatusPill status={inv.status}>{getInvoiceStatusLabel(inv.status)}</StatusPill></Td>
                                    <Td data-label={'\u0625\u062c\u0631\u0627\u0621 \u0633\u0631\u064a\u0639'} className="text-left">
                                        <div className="flex items-center justify-end gap-2">
                                            {inv.status !== 'PAID' && (
                                                <button 
                                                    onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${inv.id}`)}
                                                    className={successButtonCls}
                                                >
                                                    <DollarSign size={12}/> {'\u062a\u062d\u0635\u064a\u0644'}
                                                </button>
                                            )}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                     {invoicesWithDetails.length === 0 && (<div className="text-center py-16"><ReceiptText size={52} className="mx-auto text-muted" /><h3 className="mt-4 text-xl font-semibold text-heading">Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ±</h3></div>)}
                </div>
                <InvoiceForm isOpen={isModalOpen} onClose={() => {setEditingInvoice(null); setIsModalOpen(false);}} invoice={editingInvoice} />
            </Card>
            {selectedInvoice && invoiceWorkspace && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.06fr_0.94fr]">
                    <Card className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ù…Ø³Ø§Ø­Ø© Ø¹Ù…Ù„ Ø§Ù„ÙØ§ØªÙˆØ±Ø©</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ù…ØªØ§Ø¨Ø¹Ø© Ø­Ø§Ù„Ø© Ø§Ù„Ø³Ø¯Ø§Ø¯ ÙˆØ±Ø¨Ø· Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ø§Ù„Ø¹Ù‚Ø¯ ÙˆØ§Ù„Ù…Ø³ØªØ£Ø¬Ø± ÙˆØ§Ù„ÙˆØ­Ø¯Ø© ÙˆØ§Ù„ØªØ­ØµÙŠÙ„.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedInvoice.status !== 'PAID' && (
                                    <button onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${selectedInvoice.id}`)} className={successButtonCls}>
                                        <DollarSign size={14}/>
                                        ØªØ­ØµÙŠÙ„
                                    </button>
                                )}
                                <button onClick={() => setPrintingInvoice(selectedInvoice)} className={ghostButtonCls}>
                                    <ReceiptText size={14}/>
                                    Ø·Ø¨Ø§Ø¹Ø©
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryStatCard label="Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©" value={selectedInvoice.no || 'â€”'} icon={<Hash size={18}/>} color="slate"/>
                            <SummaryStatCard label="Ø§Ù„Ù…Ø¨Ù„Øº" value={formatCurrency(selectedInvoice.amount + (selectedInvoice.taxAmount || 0))} icon={<DollarSign size={18}/>} color="blue"/>
                            <SummaryStatCard label="Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ" value={formatCurrency(invoiceWorkspace.balance)} icon={<AlertTriangle size={18}/>} color={invoiceWorkspace.balance > 0 ? 'rose' : 'emerald'}/>
                            <SummaryStatCard label="Ø§Ù„Ø­Ø§Ù„Ø©" value={getInvoiceStatusLabel(selectedInvoice.status)} icon={<CheckCircle2 size={18}/>} color={selectedInvoice.status === 'PAID' ? 'emerald' : 'amber'}/>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ø§Ù„Ø±Ø¨Ø· Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±:</strong> {selectedInvoice.tenant?.name || 'â€”'}</div>
                                    <div><strong>Ø§Ù„ÙˆØ­Ø¯Ø©:</strong> {selectedInvoice.unit?.name || 'â€”'}</div>
                                    <div><strong>Ø§Ù„Ø¹Ù‚Ø§Ø±:</strong> {invoiceWorkspace.property?.name || 'â€”'}</div>
                                    <div><strong>Ø§Ù„Ù…Ø§Ù„Ùƒ:</strong> {invoiceWorkspace.owner?.name || 'â€”'}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚ ÙˆØ§Ù„ØªØ­ØµÙŠÙ„</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚:</strong> {formatDate(selectedInvoice.dueDate)}</div>
                                    <div><strong>Ø§Ù„Ù…Ø¯ÙÙˆØ¹:</strong> {formatCurrency(selectedInvoice.paidAmount)}</div>
                                    <div><strong>Ø§Ù„Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø©:</strong> {invoiceWorkspace.receipts.length.toLocaleString('ar')}</div>
                                    <div><strong>Ù†ÙˆØ¹ Ø§Ù„ÙØ§ØªÙˆØ±Ø©:</strong> {selectedInvoice.type}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <Card className="p-4 sm:p-5">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„ÙØ§ØªÙˆØ±Ø©</h3>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                    {invoiceWorkspace.balance > 0 && new Date(selectedInvoice.dueDate).getTime() < Date.now() ? 'Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…ØªØ£Ø®Ø±Ø© ÙˆØªØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø© ÙÙˆØ±ÙŠØ©.' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø§Ù„Ø© ØªØ£Ø®ÙŠØ± Ø­Ø±Ø¬Ø© Ø¹Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.'}
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                    ÙŠÙ…ÙƒÙ† Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù…Ø¨Ø§Ø´Ø±Ø© Ø¥Ù„Ù‰ Ø§Ù„ØªØ­ØµÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© Ø£Ùˆ Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ù…Ø§Ù„ÙŠ Ù…Ù† Ù†ÙØ³ Ø§Ù„ØµÙØ­Ø©.
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 sm:p-5">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª ÙˆØ§Ù„Ø·Ø¨Ø§Ø¹Ø©</h3>
                            <div className="mt-4">
                                <AttachmentsManager entityType="INVOICE" entityId={selectedInvoice.id} />
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {printingInvoice && (
                <PrintPreviewModal
                    isOpen={!!printingInvoice}
                    onClose={() => setPrintingInvoice(null)}
                    title={`Ø·Ø¨Ø§Ø¹Ø© ÙØ§ØªÙˆØ±Ø© #${printingInvoice.no}`}
                    onExportPdf={() => {
                        if (!db || !printingInvoice) return;
                        const contract = db.contracts.find(c => c.id === printingInvoice.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportInvoiceToPdf(printingInvoice, tenant, contract, db.settings);
                    }}
                >
                    <InvoicePrintable invoice={printingInvoice} settings={db.settings} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

export default Invoices;
