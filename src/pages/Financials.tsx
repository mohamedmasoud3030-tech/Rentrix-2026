
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Receipt, Expense, DepositTx, OwnerSettlement, Tenant, Invoice } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, VoidAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, formatDateTime, formatDate } from '../utils/helpers';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { Receipt as ReceiptIcon, CreditCard, Landmark, PiggyBank, MessageCircle, Wallet, ArrowRightLeft, History } from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { toast } from 'react-hot-toast';
import StatusPill from '../components/ui/StatusPill';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import { ReceiptPrintable } from '../components/print/ReceiptPrintable';
import { ExpensePrintable } from '../components/print/ExpensePrintable';
import { exportReceiptToPdf, exportExpenseToPdf } from '../services/pdfService';


const inputCls =
    'w-full rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm backdrop-blur-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';
const primaryButtonCls =
    'inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButtonCls =
    'inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const sectionTitleCls = 'text-xl font-black tracking-tight text-slate-800 dark:text-slate-100';
const tableHeadCls = 'bg-slate-50/70 dark:bg-slate-800/70';
const infoPanelCls = 'rounded-2xl bg-slate-50/90 p-4 dark:bg-slate-800/70';
const quietActionCls =
    'inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';

const Financials: React.FC = () => {
    const navigate = useNavigate();
    const { db, ownerBalances, contractBalances } = useApp();
    const [activeTab, setActiveTab] = useState<'receipts' | 'expenses' | 'deposits' | 'settlements'>('receipts');
    const currency = db.settings?.currency || 'OMR';
    const officeWorkspace = useMemo(() => {
        const overdueInvoices = db.invoices.filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now());
        const openMaintenance = db.maintenanceRecords.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status));
        const postedReceipts = db.receipts.filter((item) => item.status === 'POSTED');
        const postedExpenses = db.expenses.filter((item) => item.status === 'POSTED');
        const postedSettlements = db.ownerSettlements.filter((item) => item.status === 'POSTED');
        const ownerPayables = Object.values(ownerBalances || {}).reduce((sum: number, item: any) => sum + Number(item?.net || 0), 0);
        const tenantReceivables = Object.values(contractBalances || {}).reduce((sum: number, item: any) => sum + Math.max(Number(item?.balance || 0), 0), 0);
        return {
            overdueInvoices,
            openMaintenance,
            receiptsTotal: postedReceipts.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            expensesTotal: postedExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            settlementsTotal: postedSettlements.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            receiptsCount: postedReceipts.length,
            expensesCount: postedExpenses.length,
            settlementsCount: postedSettlements.length,
            ownerPayables,
            tenantReceivables,
            topOverdueInvoices: overdueInvoices
                .map((invoice) => {
                    const contract = db.contracts.find((item) => item.id === invoice.contractId);
                    const tenant = contract ? db.tenants.find((item) => item.id === contract.tenantId) : null;
                    const unit = contract ? db.units.find((item) => item.id === contract.unitId) : null;
                    return {
                        ...invoice,
                        tenantName: tenant?.name || tenant?.fullName || 'Ù…Ø³ØªØ£Ø¬Ø± ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
                        unitName: unit?.name || unit?.unitNumber || 'ÙˆØ­Ø¯Ø© ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©',
                    };
                })
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5),
            topOwnerBalances: Object.entries(ownerBalances || {})
                .map(([ownerId, balance]: [string, any]) => ({
                    ownerId,
                    ownerName: db.owners.find((owner) => owner.id === ownerId)?.name || 'Ù…Ø§Ù„Ùƒ ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
                    net: Number(balance?.net || 0),
                }))
                .filter((item) => item.net > 0)
                .sort((a, b) => b.net - a.net)
                .slice(0, 5),
            maintenanceImpact: openMaintenance
                .map((record) => {
                    const property = db.properties.find((item) => item.id === record.propertyId);
                    const unit = record.unitId ? db.units.find((item) => item.id === record.unitId) : null;
                    return {
                        id: record.id,
                        issueTitle: record.issueTitle || record.description || 'Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø©',
                        propertyName: property?.name || 'Ø¹Ù‚Ø§Ø± ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
                        unitName: unit?.name || unit?.unitNumber || 'ÙˆØ­Ø¯Ø© ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©',
                    };
                })
                .slice(0, 4),
        };
    }, [contractBalances, db.contracts, db.expenses, db.invoices, db.maintenanceRecords, db.ownerSettlements, db.owners, db.properties, db.receipts, db.tenants, db.units, ownerBalances]);
    
    return (
        <div className="app-page page-enter">
            <PageHeader title="Ø§Ù„Ø®Ø²ÙŠÙ†Ø© ÙˆØ§Ù„Ù…Ø§Ù„ÙŠØ©" description="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø³Ù†Ø¯Ø§ØªØŒ Ø§Ù„Ù…ØµØ±ÙˆÙØ§ØªØŒ ÙˆØ§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ© Ù„Ù„Ù…Ù„Ø§Ùƒ ÙˆØ§Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ†." />
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setActiveTab('receipts')} className={quietActionCls}>
                    <ReceiptIcon size={15} />
                    Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶
                </button>
                <button type="button" onClick={() => setActiveTab('expenses')} className={quietActionCls}>
                    <Wallet size={15} />
                    Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª
                </button>
                <button type="button" onClick={() => navigate('/invoices')} className={ghostButtonCls}>
                    <CreditCard size={15} />
                    Ø§Ù„ÙÙˆØ§ØªÙŠØ±
                </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ù‚Ø¨ÙˆØ¶Ø§Øª</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.receiptsTotal, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.receiptsCount.toLocaleString('ar')} Ø³Ù†Ø¯ Ù‚Ø¨Ø¶ Ù…Ø±Ø­Ù„</div>
                </Card>
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.expensesTotal, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.expensesCount.toLocaleString('ar')} Ù…ØµØ±ÙˆÙ Ù…Ø±Ø­Ù„</div>
                </Card>
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.ownerPayables, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.settlementsCount.toLocaleString('ar')} ØªØ³ÙˆÙŠØ© Ù…Ø§Ù„Ùƒ Ù…Ø±Ø­Ù‘Ù„Ø©</div>
                </Card>
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ù…ØªØ£Ø®Ø±Ø§Øª Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ†</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.tenantReceivables, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.overdueInvoices.length.toLocaleString('ar')} ÙØ§ØªÙˆØ±Ø© Ù…ØªØ£Ø®Ø±Ø©</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="p-4 sm:p-5">
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ù…Ø³Ø§Ø­Ø© Ø¹Ù…Ù„ Ø§Ù„Ù…ÙƒØªØ¨</h3>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø§Ù„ÙŠ</div>
                            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                <div><strong>ØµØ§ÙÙŠ Ø§Ù„ØªØ¯ÙÙ‚:</strong> {formatCurrency(officeWorkspace.receiptsTotal - officeWorkspace.expensesTotal - officeWorkspace.settlementsTotal, currency)}</div>
                                <div><strong>ØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ:</strong> {formatCurrency(officeWorkspace.settlementsTotal, currency)}</div>
                                <div><strong>Ø§Ù„Ø¹Ù‚ÙˆØ¯ Ø§Ù„Ù†Ø´Ø·Ø©:</strong> {db.contracts.filter((item) => item.status === 'ACTIVE').length.toLocaleString('ar')}</div>
                                <div><strong>Ø§Ù„Ù…Ù„Ø§Ùƒ:</strong> {db.owners.length.toLocaleString('ar')}</div>
                            </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ø§Ù„ØªØ´ØºÙŠÙ„ ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª</div>
                            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                <div><strong>ÙÙˆØ§ØªÙŠØ± Ù…ØªØ£Ø®Ø±Ø©:</strong> {officeWorkspace.overdueInvoices.length.toLocaleString('ar')}</div>
                                <div><strong>ØµÙŠØ§Ù†Ø© Ù…ÙØªÙˆØ­Ø©:</strong> {officeWorkspace.openMaintenance.length.toLocaleString('ar')}</div>
                                <div><strong>Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶:</strong> {officeWorkspace.receiptsCount.toLocaleString('ar')}</div>
                                <div><strong>Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª:</strong> {officeWorkspace.expensesCount.toLocaleString('ar')}</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className={infoPanelCls}>
                            <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">ÙÙˆØ§ØªÙŠØ± ØªØ­ØªØ§Ø¬ ØªØ­ØµÙŠÙ„Ù‹Ø§ Ø§Ù„Ø¢Ù†</div>
                            <div className="space-y-2">
                                {officeWorkspace.topOverdueInvoices.map((invoice) => (
                                    <button
                                        type="button"
                                        key={invoice.id}
                                        onClick={() => navigate('/invoices')}
                                        className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-right text-sm transition-colors hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900"
                                    >
                                        <span className="min-w-0">
                                            <span className="block font-bold text-slate-800 dark:text-slate-100">{invoice.tenantName}</span>
                                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{invoice.unitName} â€¢ {formatDate(invoice.dueDate)}</span>
                                        </span>
                                        <span className="font-extrabold text-rose-600 dark:text-rose-300">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0), currency)}</span>
                                    </button>
                                ))}
                                {!officeWorkspace.topOverdueInvoices.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù…ØªØ£Ø®Ø±Ø© Ø­Ø§Ù„ÙŠÙ‹Ø§.</div>}
                            </div>
                        </div>
                        <div className={infoPanelCls}>
                            <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">Ù…Ø³ØªØ­Ù‚Ø§Øª Ù…Ù„Ø§Ùƒ ØªØ­ØªØ§Ø¬ ØªØ³ÙˆÙŠØ©</div>
                            <div className="space-y-2">
                                {officeWorkspace.topOwnerBalances.map((owner) => (
                                    <button
                                        type="button"
                                        key={owner.ownerId}
                                        onClick={() => navigate(`/owner-ledger?ownerId=${owner.ownerId}`)}
                                        className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-right text-sm transition-colors hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900"
                                    >
                                        <span className="font-bold text-slate-800 dark:text-slate-100">{owner.ownerName}</span>
                                        <span className="font-extrabold text-blue-600 dark:text-blue-300">{formatCurrency(owner.net, currency)}</span>
                                    </button>
                                ))}
                                {!officeWorkspace.topOwnerBalances.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø±ØµØ¯Ø© Ù…ÙˆØ¬Ø¨Ø© ØªØ­ØªØ§Ø¬ ØªØ­ÙˆÙŠÙ„Ù‹Ø§ Ø§Ù„Ø¢Ù†.</div>}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Ø³Ø¬Ù„Ø§Øª ØªØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø©</div>
                        {officeWorkspace.maintenanceImpact.map((record) => (
                            <button
                                type="button"
                                key={record.id}
                                onClick={() => navigate('/maintenance')}
                                className="flex w-full items-center justify-between rounded-2xl bg-slate-50/90 px-3 py-2 text-right text-sm transition-colors hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                            >
                                <span className="min-w-0">
                                    <span className="block font-bold text-slate-800 dark:text-slate-100">{record.issueTitle}</span>
                                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{record.propertyName} â€¢ {record.unitName}</span>
                                </span>
                                <ArrowRightLeft size={15} className="text-slate-400" />
                            </button>
                        ))}
                        {!officeWorkspace.maintenanceImpact.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØµÙŠØ§Ù†Ø© Ø­Ø±Ø¬Ø© ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ø­Ø§Ù„ÙŠ.</div>}
                    </div>
                </Card>

                <Card className="p-4 sm:p-5">
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©</h3>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                            ÙÙˆØ§ØªÙŠØ± Ù…ØªØ£Ø®Ø±Ø©: {officeWorkspace.overdueInvoices.length.toLocaleString('ar')}
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            Ø·Ù„Ø¨Ø§Øª ØµÙŠØ§Ù†Ø© Ù…ÙØªÙˆØ­Ø© ØªØ¤Ø«Ø± Ù…Ø§Ù„ÙŠÙ‹Ø§: {officeWorkspace.openMaintenance.length.toLocaleString('ar')}
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            Ø§Ù„ØªØ¨ÙˆÙŠØ¨Ø§Øª Ø¨Ø§Ù„Ø£Ø³ÙÙ„ Ù…Ø§ Ø²Ø§Ù„Øª ØªÙ…Ø«Ù„ Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„ÙØ¹Ù„ÙŠØ© Ù„Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶ ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØ§Ù„ÙˆØ¯Ø§Ø¦Ø¹ ÙˆØªØ³ÙˆÙŠØ§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ.
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <Tabs 
                    tabs={[
                        { id: 'receipts', label: 'Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶' },
                        { id: 'expenses', label: 'Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª' },
                        { id: 'deposits', label: 'Ø§Ù„ÙˆØ¯Ø§Ø¦Ø¹ ÙˆØ§Ù„ØªØ£Ù…ÙŠÙ†' },
                        { id: 'settlements', label: 'ØªØ³ÙˆÙŠØ§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ' }
                    ]}
                    activeTab={activeTab}
                    onTabClick={(id) => setActiveTab(id as any)}
                />
                <div className="pt-6">
                    {activeTab === 'receipts' && <ReceiptsView />}
                    {activeTab === 'expenses' && <ExpensesView />}
                    {activeTab === 'deposits' && <DepositsView />}
                    {activeTab === 'settlements' && <OwnerSettlementsView />}
                </div>
            </Card>
        </div>
    );
};

const ReceiptsView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);

    const filteredReceipts = useMemo(() => {
        return db.receipts.filter(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return r.no.includes(searchTerm) || tenant?.name.includes(searchTerm);
        }).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.receipts, db.contracts, db.tenants, searchTerm]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className={sectionTitleCls}>Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶ ÙˆØ§Ù„ØªØ­ØµÙŠÙ„</h2>
                    <p className="mt-1 text-sm text-slate-500">Ø¥Ø¯Ø§Ø±Ø© Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶ ÙˆØ±Ø¨Ø·Ù‡Ø§ Ø¨Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø© ÙˆØ¥Ø±Ø³Ø§Ù„Ù‡Ø§ Ù„Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ†.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className={primaryButtonCls}>
                    <ReceiptIcon size={16} />
                    Ø¥Ø¶Ø§ÙØ© Ø³Ù†Ø¯ Ù‚Ø¨Ø¶
                </button>
            </div>
            <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯ Ø£Ùˆ Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±..." />
            {filteredReceipts.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯</Th>
                            <Th>Ø§Ù„ØªØ§Ø±ÙŠØ®</Th>
                            <Th>Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</Th>
                            <Th>Ø§Ù„Ù…Ø¨Ù„Øº</Th>
                            <Th>Ø§Ù„Ø­Ø§Ù„Ø©</Th>
                            <Th className="text-left">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredReceipts.map(r => {
                            const contract = db.contracts.find(c => c.id === r.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            return (
                                <Tr key={r.id} className={r.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                    <Td className="font-mono font-bold text-slate-800">{r.no}</Td>
                                    <Td className="whitespace-nowrap">{formatDateTime(r.dateTime)}</Td>
                                    <Td>{tenant?.name || 'â€”'}</Td>
                                    <Td className="font-bold text-emerald-600">{formatCurrency(r.amount, db.settings.currency)}</Td>
                                    <Td><StatusPill status={r.status}>{r.status === 'POSTED' ? 'Ù…Ø±Ø­Ù‘Ù„' : 'Ù…Ù„ØºÙŠ'}</StatusPill></Td>
                                    <Td className="text-left">
                                        <div className="flex justify-end">
                                            <ActionsMenu items={[
                                                EditAction(() => { setEditingReceipt(r); setIsEditModalOpen(true); }),
                                                PrintAction(() => setPrintingReceipt(r)),
                                                { label: 'Ø¥Ø±Ø³Ø§Ù„ ÙˆØ§ØªØ³Ø§Ø¨', icon: <MessageCircle size={16} />, onClick: () => setWhatsAppContext({ recipient: tenant, type: 'receipt', data: { receipt: r } }) },
                                                VoidAction(() => financeService.voidReceipt(r.id))
                                            ]} />
                                        </div>
                                    </Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </TableWrapper>
            ) : (
                <EmptyState icon={ReceiptIcon} title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ù†Ø¯Ø§Øª Ù‚Ø¨Ø¶" description="Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¶Ø§ÙØ© Ø£ÙˆÙ„ Ø³Ù†Ø¯ Ù‚Ø¨Ø¶ Ø£Ùˆ Ø¬Ø±Ù‘Ø¨ ØªØ¹Ø¯ÙŠÙ„ ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø¨Ø­Ø«." />
            )}
            {isAddModalOpen && <ReceiptAllocationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}
            {isEditModalOpen && <EditReceiptForm isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingReceipt(null); }} receipt={editingReceipt} />}
            {printingReceipt && (
                <PrintPreviewModal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="Ø·Ø¨Ø§Ø¹Ø© Ø³Ù†Ø¯ Ù‚Ø¨Ø¶" 
                    onExportPdf={() => {
                        if (!db || !printingReceipt) return;
                        const contract = db.contracts.find(c => c.id === printingReceipt.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportReceiptToPdf(printingReceipt, tenant, db.settings);
                    }}>
                    <ReceiptPrintable receipt={printingReceipt} settings={db.settings} />
                </PrintPreviewModal>
            )}
            {whatsAppContext && <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />}
        </div>
    );
};

const ExpensesView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [printingExpense, setPrintingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExpenses = useMemo(() => {
        return db.expenses.filter(e => e.no.includes(searchTerm) || e.category.includes(searchTerm) || e.notes.includes(searchTerm))
                         .sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.expenses, searchTerm]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className={sectionTitleCls}>Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</h2>
                    <p className="mt-1 text-sm text-slate-500">ØªØªØ¨Ø¹ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ© ÙˆØ±Ø¨Ø·Ù‡Ø§ Ø¨Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø© ÙˆØ³Ù†Ø¯Ø§Øª Ø§Ù„ØµØ±Ù.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className={primaryButtonCls}>
                    <Wallet size={16} />
                    Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ
                </button>
            </div>
            <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„Ù…ØµØ±ÙˆÙ Ø£Ùˆ Ø§Ù„ØªØµÙ†ÙŠÙ..." />
            {filteredExpenses.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯</Th>
                            <Th>Ø§Ù„ØªØ§Ø±ÙŠØ®</Th>
                            <Th>Ø§Ù„ØªØµÙ†ÙŠÙ</Th>
                            <Th>Ø§Ù„Ù…Ø¨Ù„Øº</Th>
                            <Th>Ø§Ù„Ø­Ø§Ù„Ø©</Th>
                            <Th className="text-left">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map(e => (
                            <Tr key={e.id} className={e.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                <Td className="font-mono font-bold text-slate-800">{e.no}</Td>
                                <Td className="whitespace-nowrap">{formatDateTime(e.dateTime)}</Td>
                                <Td>{e.category}</Td>
                                <Td className="font-bold text-rose-600">{formatCurrency(e.amount, db.settings.currency)}</Td>
                                <Td><StatusPill status={e.status}>{e.status === 'POSTED' ? 'Ù…Ø±Ø­Ù‘Ù„' : 'Ù…Ù„ØºÙŠ'}</StatusPill></Td>
                                <Td className="text-left">
                                  <div className="flex justify-end">
                                    <ActionsMenu items={[
                                        EditAction(() => { setEditingExpense(e); setIsModalOpen(true); }),
                                        PrintAction(() => setPrintingExpense(e)),
                                        VoidAction(() => financeService.voidExpense(e.id))
                                    ]} />
                                  </div>
                                </Td>
                            </Tr>
                        ))}
                    </tbody>
                </TableWrapper>
            ) : (
                <EmptyState icon={Wallet} title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ØµØ±ÙˆÙØ§Øª" description="Ù„Ù… ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø£ÙŠ Ù…ØµØ±ÙˆÙØ§Øª Ø¨Ø¹Ø¯ Ù„Ù‡Ø°Ù‡ Ø§Ù„ÙØªØ±Ø©." />
            )}
            {isModalOpen && <ExpenseForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />}
            
            {printingExpense && (
                <PrintPreviewModal 
                    isOpen={!!printingExpense} 
                    onClose={() => setPrintingExpense(null)} 
                    title="Ø·Ø¨Ø§Ø¹Ø© Ø³Ù†Ø¯ ØµØ±Ù" 
                    onExportPdf={() => {
                        if (!db || !printingExpense) return;
                        exportExpenseToPdf(printingExpense, db.settings);
                    }}
                >
                    <ExpensePrintable expense={printingExpense} settings={db.settings} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

const DepositsView: React.FC = () => {
    const { db, dataService, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className={sectionTitleCls}>Ø¥Ø¯Ø§Ø±Ø© Ù…Ø¨Ø§Ù„Øº Ø§Ù„ØªØ£Ù…ÙŠÙ†</h2>
                    <p className="mt-1 text-sm text-slate-500">Ø­Ø±ÙƒØ§Øª Ø§Ù„ÙˆØ¯ÙŠØ¹Ø© ÙˆØ§Ù„Ø®ØµÙˆÙ…Ø§Øª ÙˆØ§Ù„Ø¥Ø±Ø¬Ø§Ø¹Ø§Øª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ø¹Ù‚ÙˆØ¯ ÙˆØ§Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ†.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className={primaryButtonCls}>
                    <PiggyBank size={16} />
                    Ø­Ø±ÙƒØ© ÙˆØ¯ÙŠØ¹Ø© Ø¬Ø¯ÙŠØ¯Ø©
                </button>
            </div>
            {db.depositTxs.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>Ø§Ù„ØªØ§Ø±ÙŠØ®</Th>
                            <Th>Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</Th>
                            <Th>Ø§Ù„Ù†ÙˆØ¹</Th>
                            <Th>Ø§Ù„Ù…Ø¨Ù„Øº</Th>
                            <Th>Ø§Ù„Ø­Ø§Ù„Ø©</Th>
                            <Th className="text-left">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {db.depositTxs.map(tx => {
                            const contract = db.contracts.find(c => c.id === tx.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            const typeMap = {'DEPOSIT_IN': 'Ø¥ÙŠØ¯Ø§Ø¹ Ø¬Ø¯ÙŠØ¯', 'DEPOSIT_DEDUCT': 'Ø®ØµÙ… Ù„Ù„Ø¥ØµÙ„Ø§Ø­', 'DEPOSIT_RETURN': 'Ø¥Ø±Ø¬Ø§Ø¹ Ù…Ø³ØªØ­Ù‚Ø§Øª'};
                            return (
                                <Tr key={tx.id} className={tx.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                    <Td className="whitespace-nowrap">{formatDate(tx.date)}</Td>
                                    <Td>{tenant?.name || 'â€”'}</Td>
                                    <Td className="font-bold text-slate-800">{typeMap[tx.type]}</Td>
                                    <Td className="font-mono font-bold text-slate-800">{formatCurrency(tx.amount, db.settings.currency)}</Td>
                                    <Td><StatusPill status={tx.status}>{tx.status === 'POSTED' ? 'Ù…Ø±Ø­Ù‘Ù„' : 'Ù…Ù„ØºÙŠ'}</StatusPill></Td>
                                    <Td className="text-left">
                                      <div className="flex justify-end">
                                        {tx.status !== 'VOID' && <ActionsMenu items={[VoidAction(() => financeService.voidDepositTx(tx.id))]}/>}
                                      </div>
                                    </Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </TableWrapper>
            ) : (
                <EmptyState icon={PiggyBank} title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø±ÙƒØ§Øª ÙˆØ¯ÙŠØ¹Ø©" description="Ø£Ø¶Ù Ø£ÙˆÙ„ Ø­Ø±ÙƒØ© Ù„ØªØªØ¨Ø¹ Ù…Ø¨Ø§Ù„Øº Ø§Ù„ØªØ£Ù…ÙŠÙ† ÙˆØ§Ù„Ø®ØµÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ø¹Ù‚ÙˆØ¯." />
            )}
            {isModalOpen && <DepositTxForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const OwnerSettlementsView: React.FC = () => {
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSettlement, setEditingSettlement] = useState<OwnerSettlement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = useMemo(() => db.ownerSettlements.filter(s => {
        const owner = db.owners.find(o => o.id === s.ownerId);
        return s.no.includes(searchTerm) || owner?.name.includes(searchTerm);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [db.ownerSettlements, db.owners, searchTerm]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className={sectionTitleCls}>ØªØ³ÙˆÙŠØ§Øª ÙˆØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ</h2>
                    <p className="mt-1 text-sm text-slate-500">ØªØ­ÙˆÙŠÙ„ ØµØ§ÙÙŠ Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø§Øª Ù„Ù„Ù…Ù„Ø§Ùƒ Ù…Ø¹ ØªØªØ¨Ø¹ Ø§Ù„Ø­Ø§Ù„Ø© ÙˆØ§Ù„Ø¥Ø«Ø¨Ø§Øª Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className={primaryButtonCls}>
                    <Landmark size={16} />
                    Ø¥Ø¶Ø§ÙØ© ØªØ­ÙˆÙŠÙ„ Ù„Ù„Ù…Ø§Ù„Ùƒ
                </button>
            </div>
            <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„ØªØ³ÙˆÙŠØ© Ø£Ùˆ Ø§Ø³Ù… Ø§Ù„Ù…Ø§Ù„Ùƒ..." />
            {filtered.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>Ø§Ù„Ø±Ù‚Ù…</Th>
                            <Th>Ø§Ù„ØªØ§Ø±ÙŠØ®</Th>
                            <Th>Ø§Ù„Ù…Ø§Ù„Ùƒ</Th>
                            <Th>Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø­ÙˆÙ„</Th>
                            <Th>Ø§Ù„Ø­Ø§Ù„Ø©</Th>
                            <Th className="text-left">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(s => {
                            const owner = db.owners.find(o => o.id === s.ownerId);
                            return (
                                <Tr key={s.id} className={s.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                    <Td className="font-mono font-bold text-slate-800">{s.no}</Td>
                                    <Td className="whitespace-nowrap">{formatDate(s.date)}</Td>
                                    <Td>{owner?.name || 'â€”'}</Td>
                                    <Td className="font-bold text-blue-600">{formatCurrency(s.amount, db.settings.currency)}</Td>
                                    <Td><StatusPill status={s.status}>{s.status === 'POSTED' ? 'Ù…Ø±Ø­Ù‘Ù„' : 'Ù…Ù„ØºÙŠ'}</StatusPill></Td>
                                    <Td className="text-left">
                                      <div className="flex justify-end">
                                        <ActionsMenu items={[ EditAction(() => { setEditingSettlement(s); setIsModalOpen(true); }), VoidAction(() => financeService.voidOwnerSettlement(s.id)) ]} />
                                      </div>
                                    </Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </TableWrapper>
            ) : (
                <EmptyState icon={Landmark} title="Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ³ÙˆÙŠØ§Øª Ù…Ù„Ø§Ùƒ" description="Ø¹Ù†Ø¯ ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø§Øª Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø§Ù„Ùƒ Ø³ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙƒÙ„ Ø§Ù„ØªØ³ÙˆÙŠØ§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©." />
            )}
            {isModalOpen && <OwnerSettlementForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSettlement(null); }} settlement={editingSettlement} />}
        </div>
    );
};

const EditReceiptForm: React.FC<{ isOpen: boolean, onClose: () => void, receipt: Receipt | null }> = ({ isOpen, onClose, receipt }) => {
    const { db, dataService } = useApp();
    const [dateTime, setDateTime] = useState('');
    const [ref, setRef] = useState('');
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        if (receipt) {
            setDateTime(receipt.dateTime.slice(0, 16));
            setRef(receipt.ref);
            setNotes(receipt.notes);
        }
    }, [receipt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!receipt) return;
        dataService.update('receipts', receipt.id, { dateTime, ref, notes });
        onClose();
    };

    if (!receipt) return null;
    const contract = db.contracts.find(c=>c.id === receipt.contractId);
    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`ØªØ¹Ø¯ÙŠÙ„ Ø³Ù†Ø¯ Ù‚Ø¨Ø¶ #${receipt.no}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm"><strong>Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±:</strong> {tenant?.name}</p>
                    <p className="text-sm"><strong>Ø§Ù„Ù…Ø¨Ù„Øº:</strong> {formatCurrency(receipt.amount, db.settings.currency)}</p>
                </div>
                <p className="rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-700">Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø¨Ù„Øº Ø£Ùˆ Ø§Ù„Ø¹Ù‚Ø¯ Ù„Ø¶Ù…Ø§Ù† Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ©.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙˆÙ‚Øª</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required className={inputCls} /></div>
                    <div><label className={labelCls}>Ù…Ø±Ø¬Ø¹ / Ø±Ù‚Ù… Ø§Ù„Ø­ÙˆØ§Ù„Ø©</label><input value={ref} onChange={e=>setRef(e.target.value)} className={inputCls} /></div>
                </div>
                <div><label className={labelCls}>Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className={inputCls} /></div>
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className={ghostButtonCls}>Ø¥Ù„ØºØ§Ø¡</button><button type="submit" className={primaryButtonCls}>Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª</button></div>
            </form>
        </Modal>
    );
};

const ReceiptAllocationModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { db, financeService } = useApp();
    const [contractId, setContractId] = useState('');
    const [receiptData, setReceiptData] = useState({
        dateTime: new Date().toISOString().slice(0, 16),
        channel: 'CASH' as Receipt['channel'],
        amount: 0,
        ref: '',
        notes: ''
    });
    const [allocations, setAllocations] = useState<Map<string, number>>(new Map());

    const unpaidInvoices = useMemo(() => {
        if (!contractId) return [];
        return db.invoices
            .filter(inv => inv.contractId === contractId && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [contractId, db.invoices]);

    useEffect(() => {
        if (contractId && receiptData.amount > 0) {
            let remainingAmount = receiptData.amount;
            const newAllocations = new Map<string, number>();
            for (const invoice of unpaidInvoices) {
                const balance = (invoice.amount + (invoice.taxAmount || 0)) - invoice.paidAmount;
                const allocationAmount = Math.min(remainingAmount, balance);
                if (allocationAmount > 0) {
                    newAllocations.set(invoice.id, allocationAmount);
                    remainingAmount -= allocationAmount;
                }
                if (remainingAmount <= 0) break;
            }
            setAllocations(newAllocations);
        } else {
            setAllocations(new Map());
        }
    }, [contractId, receiptData.amount, unpaidInvoices]);


    const totalAllocated = useMemo(() => Array.from(allocations.values()).reduce((sum: number, amount: number) => sum + amount, 0), [allocations]);
    const remainingToAllocate = receiptData.amount - totalAllocated;
    const isBalanced = Math.abs(remainingToAllocate) < 0.001;
    
    const handleAllocationChange = (invoiceId: string, value: string) => {
        const newAllocations = new Map(allocations);
        newAllocations.set(invoiceId, Number(value) || 0);
        setAllocations(newAllocations);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (receiptData.amount <= 0 || !isBalanced) {
            toast.error("ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ³Ø§ÙˆÙŠ Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø®ØµØµ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù…Ø¨Ù„Øº Ø§Ù„Ø³Ù†Ø¯.");
            return;
        }
        try {
            const finalAllocations = Array.from(allocations.entries()).filter(([, amount]) => amount > 0).map(([invoiceId, amount]) => ({ invoiceId, amount }));
            await financeService.addReceiptWithAllocations({ contractId, ...receiptData }, finalAllocations);
            onClose();
        } catch (error) {
            console.error("Failed to add receipt with allocations:", error);
            toast.error(error instanceof Error ? error.message : "ÙØ´Ù„ Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø³Ù†Ø¯.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ø¥Ø¶Ø§ÙØ© Ø³Ù†Ø¯ Ù‚Ø¨Ø¶ ÙˆØªØ®ØµÙŠØµ Ø§Ù„Ø¯ÙØ¹Ø§Øª">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-3">
                    <div><label className="text-xs font-bold block mb-1">Ø§Ù„Ø¹Ù‚Ø¯</label><select value={contractId} onChange={e => setContractId(e.target.value)} required><option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ø¹Ù‚Ø¯ --</option>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}</select></div>
                    <div><label className="text-xs font-bold block mb-1">Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø³ØªÙ„Ù…</label><input type="number" value={receiptData.amount || ''} onChange={e=>setReceiptData({...receiptData, amount: Number(e.target.value)})} required /></div>
                    <div><label className="text-xs font-bold block mb-1">Ø§Ù„Ø·Ø±ÙŠÙ‚Ø©</label><select value={receiptData.channel} onChange={e=>setReceiptData({...receiptData, channel: e.target.value as any})}><option value="CASH">Ù†Ù‚Ø¯ÙŠ</option><option value="BANK">ØªØ­ÙˆÙŠÙ„</option><option value="POS">Ø´Ø¨ÙƒØ©</option></select></div>
                    <div className="md:col-span-3"><label className="text-xs font-bold block mb-1">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label><textarea value={receiptData.notes} onChange={e=>setReceiptData({...receiptData, notes: e.target.value})} rows={1}/></div>
                </div>

                {contractId && (
                    <div className="space-y-2">
                        <h3 className="border-b border-slate-100 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-700">ØªØ®ØµÙŠØµ Ø¹Ù„Ù‰ Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø©</h3>
                        {unpaidInvoices.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                                {unpaidInvoices.map(inv => (
                                    <div key={inv.id} className="grid grid-cols-4 items-center gap-4 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50/70 transition-colors">
                                        <div className="text-xs"><strong>#{inv.no}</strong><br/>{formatDate(inv.dueDate)}</div>
                                        <div className="text-xs text-red-500">Ù…Ø³ØªØ­Ù‚: {formatCurrency((inv.amount + (inv.taxAmount || 0)) - inv.paidAmount)}</div>
                                        <div className="col-span-2"><input type="number" step="0.01" value={allocations.get(inv.id) || ''} onChange={e => handleAllocationChange(inv.id, e.target.value)} placeholder="Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø®ØµØµ" className={`${inputCls} h-9 py-1.5`} /></div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù…Ø³ØªØ­Ù‚Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø¹Ù‚Ø¯ Ø­Ø§Ù„ÙŠØ§Ù‹.</p>}
                        
                        <div className={`grid grid-cols-3 gap-2 rounded-xl border p-3 text-xs font-bold ${isBalanced ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                            <div>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {formatCurrency(receiptData.amount)}</div>
                            <div>Ø§Ù„Ù…Ø®ØµØµ: {formatCurrency(totalAllocated)}</div>
                            <div>Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ: {formatCurrency(remainingToAllocate)}</div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className={ghostButtonCls}>Ø¥Ù„ØºØ§Ø¡</button><button type="submit" className={`${primaryButtonCls} disabled:cursor-not-allowed disabled:opacity-50`} disabled={!isBalanced || receiptData.amount <= 0}>Ø­ÙØ¸ Ø§Ù„Ø³Ù†Ø¯</button></div>
            </form>
        </Modal>
    );
};

const ExpenseForm: React.FC<{ isOpen: boolean, onClose: () => void, expense: Expense | null }> = ({ isOpen, onClose, expense }) => {
    const { db, dataService, financeService } = useApp();
    const [contractId, setContractId] = useState<string | null>(null);
    const [category, setCategory] = useState('ØµÙŠØ§Ù†Ø©');
    const [amount, setAmount] = useState(0);
    const [chargedTo, setChargedTo] = useState<Expense['chargedTo']>('OWNER');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [payee, setPayee] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (expense) {
            setContractId(expense.contractId); setCategory(expense.category); setAmount(expense.amount);
            setChargedTo(expense.chargedTo || 'OWNER'); setDateTime(expense.dateTime.slice(0, 16));
            setPayee(expense.payee || ''); setNotes(expense.notes || '');
        }
    }, [expense]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { contractId, dateTime, category, amount, status: 'POSTED' as const, chargedTo, ref: '', notes, payee };
        if (expense) {
            toast.error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ù…Ø±Ø­Ù„Ø©. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø¥Ù„ØºØ§Ø¡ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„.");
            return;
        }
        financeService.addExpense(data);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'ØªØ¹Ø¯ÙŠÙ„ Ù…ØµØ±ÙˆÙ' : 'Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ Ø¬Ø¯ÙŠØ¯'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Ø§Ù„ØªØµÙ†ÙŠÙ</label><input value={category} onChange={e=>setCategory(e.target.value)} required placeholder="Ù…Ø«Ø§Ù„: ØµÙŠØ§Ù†Ø©ØŒ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ØŒ Ø¹Ù…ÙˆÙ„Ø©" className={inputCls} /></div>
                    <div><label className={labelCls}>Ø§Ù„Ù…Ø¨Ù„Øº</label><input type="number" value={amount || ''} onChange={e=>setAmount(Number(e.target.value))} required className={inputCls} /></div>
                    <div><label className={labelCls}>ÙŠØ®ØµÙ… Ù…Ù†</label><select value={chargedTo} onChange={e=>setChargedTo(e.target.value as any)} className={inputCls}><option value="OWNER">Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø§Ù„Ùƒ</option><option value="OFFICE">Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙƒØªØ¨</option><option value="TENANT">Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</option></select></div>
                    <div><label className={labelCls}>Ø§Ù„Ø¹Ù‚Ø¯ Ø§Ù„Ù…Ø±ØªØ¨Ø· (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</label><select value={contractId || ''} onChange={e=>setContractId(e.target.value || null)} className={inputCls}><option value="">-- Ù…ØµØ±ÙˆÙ Ù…ÙƒØªØ¨ Ø¹Ø§Ù… --</option>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select></div>
                    <div><label className={labelCls}>ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…ØµØ±ÙˆÙ</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required className={inputCls} /></div>
                    <div><label className={labelCls}>Ø§Ù„Ù…Ø³ØªÙ„Ù… / Ø§Ù„Ø¬Ù‡Ø©</label><input value={payee} onChange={e=>setPayee(e.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„ÙÙ†ÙŠ Ø£Ùˆ Ø§Ù„Ø´Ø±ÙƒØ©" className={inputCls} /></div>
                </div>
                <div><label className={labelCls}>Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className={inputCls} /></div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className={ghostButtonCls}>Ø¥Ù„ØºØ§Ø¡</button><button type="submit" className={primaryButtonCls}>Ø­ÙØ¸ ÙˆØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙ</button></div>
            </form>
        </Modal>
    );
};

const DepositTxForm: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { db, dataService, financeService } = useApp();
    const [contractId, setContractId] = useState(db.contracts[0]?.id || '');
    const [type, setType] = useState<DepositTx['type']>('DEPOSIT_IN');
    const [amount, setAmount] = useState(0);
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        financeService.addDepositTx({ contractId, type, amount, date: new Date().toISOString().slice(0, 10), note, status: 'POSTED' });
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ø­Ø±ÙƒØ© Ù…Ø¨Ù„Øº ØªØ£Ù…ÙŠÙ† (ÙˆØ¯ÙŠØ¹Ø©)">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelCls}>Ø§Ù„Ø¹Ù‚Ø¯ / Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</label><select value={contractId} onChange={e=>setContractId(e.target.value)} required className={inputCls}>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select></div>
                <div><label className={labelCls}>Ù†ÙˆØ¹ Ø§Ù„Ø­Ø±ÙƒØ©</label><select value={type} onChange={e=>setType(e.target.value as any)} className={inputCls}><option value="DEPOSIT_IN">Ø¥ÙŠØ¯Ø§Ø¹ Ù…Ø¨Ù„Øº ØªØ£Ù…ÙŠÙ† Ø¬Ø¯ÙŠØ¯</option><option value="DEPOSIT_RETURN">Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„ØªØ£Ù…ÙŠÙ† Ù„Ù„Ù…Ø³ØªØ£Ø¬Ø±</option><option value="DEPOSIT_DEDUCT">Ø®ØµÙ… Ù…Ù† Ø§Ù„ØªØ£Ù…ÙŠÙ† Ù„Ù„ØµÙŠØ§Ù†Ø©</option></select></div>
                <div><label className={labelCls}>Ø§Ù„Ù…Ø¨Ù„Øº</label><input type="number" value={amount || ''} onChange={e=>setAmount(Number(e.target.value))} required placeholder="0.000" className={inputCls} /></div>
                <div><label className={labelCls}>Ø§Ù„Ø³Ø¨Ø¨ / Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: ØªØ£Ù…ÙŠÙ† Ø¹Ù‚Ø¯ Ø¬Ø¯ÙŠØ¯ØŒ Ø®ØµÙ… ØªÙ„ÙÙŠØ§Øª ØµØ¨Øº" className={inputCls} /></div>
                <button type="submit" className={`${primaryButtonCls} mt-4 w-full justify-center`}>ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø§Ù„ÙŠØ©</button>
            </form>
        </Modal>
    );
};

const OwnerSettlementForm: React.FC<{ isOpen: boolean, onClose: () => void, settlement: OwnerSettlement | null }> = ({ isOpen, onClose, settlement }) => {
    const { db, dataService, financeService } = useApp();
    const [ownerId, setOwnerId] = useState(db.owners[0]?.id || '');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');

    useEffect(() => { if (settlement) { setOwnerId(settlement.ownerId); setAmount(settlement.amount); setDate(settlement.date); setNotes(settlement.notes || ''); } }, [settlement]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ownerId, amount, date, method: 'BANK' as const, ref: '', notes, status: 'POSTED' as const };
        if (settlement) {
            toast.error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„Ù…Ø±Ø­Ù„Ø©. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø¥Ù„ØºØ§Ø¡ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„.");
            return;
        }
        financeService.addOwnerSettlement(data);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={settlement ? "ØªØ¹Ø¯ÙŠÙ„ ØªØ³ÙˆÙŠØ© Ø§Ù„Ù…Ø§Ù„Ùƒ" : "ØªØ­ÙˆÙŠÙ„ Ø±ØµÙŠØ¯ Ù„Ù„Ù…Ø§Ù„Ùƒ"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelCls}>Ø§Ù„Ù…Ø§Ù„Ùƒ</label><select value={ownerId} onChange={e=>setOwnerId(e.target.value)} required className={inputCls}>{db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                <div><label className={labelCls}>ØªØ§Ø±ÙŠØ® Ø§Ù„ØªØ­ÙˆÙŠÙ„</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} required className={inputCls} /></div>
                <div><label className={labelCls}>Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø­ÙˆÙ„</label><input type="number" value={amount || ''} onChange={e=>setAmount(Number(e.target.value))} required placeholder="Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…ÙˆØ¯Ø¹ ÙÙŠ Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø§Ù„Ùƒ" className={inputCls} /></div>
                <div><label className={labelCls}>Ø§Ù„Ø¨ÙŠØ§Ù† / Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: ØªØ­ÙˆÙŠÙ„ ØµØ§ÙÙŠ Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø´Ù‡Ø± Ù…Ø§ÙŠÙˆ" className={inputCls} /></div>
                <button type="submit" className={`${primaryButtonCls} mt-4 w-full justify-center`}>Ø­ÙØ¸ ÙˆØ¥Ø«Ø¨Ø§Øª Ø§Ù„ØªØ­ÙˆÙŠÙ„</button>
            </form>
        </Modal>
    );
};

export default Financials;
