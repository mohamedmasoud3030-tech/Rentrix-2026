
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
                        tenantName: tenant?.name || tenant?.fullName || 'مستأجر غير محدد',
                        unitName: unit?.name || unit?.unitNumber || 'وحدة غير محددة',
                    };
                })
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5),
            topOwnerBalances: Object.entries(ownerBalances || {})
                .map(([ownerId, balance]: [string, any]) => ({
                    ownerId,
                    ownerName: db.owners.find((owner) => owner.id === ownerId)?.name || 'مالك غير محدد',
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
                        issueTitle: record.issueTitle || record.description || 'طلب صيانة',
                        propertyName: property?.name || 'عقار غير محدد',
                        unitName: unit?.name || unit?.unitNumber || 'وحدة غير محددة',
                    };
                })
                .slice(0, 4),
        };
    }, [contractBalances, db.contracts, db.expenses, db.invoices, db.maintenanceRecords, db.ownerSettlements, db.owners, db.properties, db.receipts, db.tenants, db.units, ownerBalances]);
    
    return (
        <div className="space-y-6">
            <PageHeader title="الخزينة والمالية" description="إدارة السندات، المصروفات، والتحويلات المالية للملاك والمستأجرين." />
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setActiveTab('receipts')} className={quietActionCls}>
                    <ReceiptIcon size={15} />
                    سندات القبض
                </button>
                <button type="button" onClick={() => setActiveTab('expenses')} className={quietActionCls}>
                    <Wallet size={15} />
                    المصروفات
                </button>
                <button type="button" onClick={() => navigate('/invoices')} className={ghostButtonCls}>
                    <CreditCard size={15} />
                    الفواتير
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المقبوضات</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.receiptsTotal, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.receiptsCount.toLocaleString('ar')} سند قبض مرحل</div>
                </Card>
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المصروفات</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.expensesTotal, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.expensesCount.toLocaleString('ar')} مصروف مرحل</div>
                </Card>
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">مستحقات الملاك</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.ownerPayables, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.settlementsCount.toLocaleString('ar')} تسوية مالك مرحّلة</div>
                </Card>
                <Card className="p-5">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">متأخرات المستأجرين</div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(officeWorkspace.tenantReceivables, currency)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{officeWorkspace.overdueInvoices.length.toLocaleString('ar')} فاتورة متأخرة</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="p-6">
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل المكتب</h3>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الأداء المالي</div>
                            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                <div><strong>صافي التدفق:</strong> {formatCurrency(officeWorkspace.receiptsTotal - officeWorkspace.expensesTotal - officeWorkspace.settlementsTotal, currency)}</div>
                                <div><strong>تحويلات الملاك:</strong> {formatCurrency(officeWorkspace.settlementsTotal, currency)}</div>
                                <div><strong>العقود النشطة:</strong> {db.contracts.filter((item) => item.status === 'ACTIVE').length.toLocaleString('ar')}</div>
                                <div><strong>الملاك:</strong> {db.owners.length.toLocaleString('ar')}</div>
                            </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">التشغيل والتنبيهات</div>
                            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                <div><strong>فواتير متأخرة:</strong> {officeWorkspace.overdueInvoices.length.toLocaleString('ar')}</div>
                                <div><strong>صيانة مفتوحة:</strong> {officeWorkspace.openMaintenance.length.toLocaleString('ar')}</div>
                                <div><strong>سندات القبض:</strong> {officeWorkspace.receiptsCount.toLocaleString('ar')}</div>
                                <div><strong>المصروفات:</strong> {officeWorkspace.expensesCount.toLocaleString('ar')}</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className={infoPanelCls}>
                            <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">فواتير تحتاج تحصيلًا الآن</div>
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
                                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{invoice.unitName} • {formatDate(invoice.dueDate)}</span>
                                        </span>
                                        <span className="font-extrabold text-rose-600 dark:text-rose-300">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0), currency)}</span>
                                    </button>
                                ))}
                                {!officeWorkspace.topOverdueInvoices.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد فواتير متأخرة حاليًا.</div>}
                            </div>
                        </div>
                        <div className={infoPanelCls}>
                            <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">مستحقات ملاك تحتاج تسوية</div>
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
                                {!officeWorkspace.topOwnerBalances.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد أرصدة موجبة تحتاج تحويلًا الآن.</div>}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">سجلات تحتاج متابعة</div>
                        {officeWorkspace.maintenanceImpact.map((record) => (
                            <button
                                type="button"
                                key={record.id}
                                onClick={() => navigate('/maintenance')}
                                className="flex w-full items-center justify-between rounded-2xl bg-slate-50/90 px-3 py-2 text-right text-sm transition-colors hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                            >
                                <span className="min-w-0">
                                    <span className="block font-bold text-slate-800 dark:text-slate-100">{record.issueTitle}</span>
                                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{record.propertyName} • {record.unitName}</span>
                                </span>
                                <ArrowRightLeft size={15} className="text-slate-400" />
                            </button>
                        ))}
                        {!officeWorkspace.maintenanceImpact.length && <div className="text-sm text-slate-500 dark:text-slate-400">لا توجد طلبات صيانة حرجة في الوقت الحالي.</div>}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">تنبيهات الإدارة المالية</h3>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                            فواتير متأخرة: {officeWorkspace.overdueInvoices.length.toLocaleString('ar')}
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            طلبات صيانة مفتوحة تؤثر ماليًا: {officeWorkspace.openMaintenance.length.toLocaleString('ar')}
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            التبويبات بالأسفل ما زالت تمثل مسارات التشغيل الفعلية لسندات القبض والمصروفات والودائع وتسويات الملاك.
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <Tabs 
                    tabs={[
                        { id: 'receipts', label: 'سندات القبض' },
                        { id: 'expenses', label: 'المصروفات' },
                        { id: 'deposits', label: 'الودائع والتأمين' },
                        { id: 'settlements', label: 'تسويات الملاك' }
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
                    <h2 className={sectionTitleCls}>سجلات القبض والتحصيل</h2>
                    <p className="mt-1 text-sm text-slate-500">إدارة سندات القبض وربطها بالفواتير المستحقة وإرسالها للمستأجرين.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className={primaryButtonCls}>
                    <ReceiptIcon size={16} />
                    إضافة سند قبض
                </button>
            </div>
            <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث برقم السند أو اسم المستأجر..." />
            {filteredReceipts.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>رقم السند</Th>
                            <Th>التاريخ</Th>
                            <Th>المستأجر</Th>
                            <Th>المبلغ</Th>
                            <Th>الحالة</Th>
                            <Th className="text-left">إجراءات</Th>
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
                                    <Td>{tenant?.name || '—'}</Td>
                                    <Td className="font-bold text-emerald-600">{formatCurrency(r.amount, db.settings.currency)}</Td>
                                    <Td><StatusPill status={r.status}>{r.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></Td>
                                    <Td className="text-left">
                                        <div className="flex justify-end">
                                            <ActionsMenu items={[
                                                EditAction(() => { setEditingReceipt(r); setIsEditModalOpen(true); }),
                                                PrintAction(() => setPrintingReceipt(r)),
                                                { label: 'إرسال واتساب', icon: <MessageCircle size={16} />, onClick: () => setWhatsAppContext({ recipient: tenant, type: 'receipt', data: { receipt: r } }) },
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
                <EmptyState icon={ReceiptIcon} title="لا توجد سندات قبض" description="ابدأ بإضافة أول سند قبض أو جرّب تعديل كلمات البحث." />
            )}
            {isAddModalOpen && <ReceiptAllocationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}
            {isEditModalOpen && <EditReceiptForm isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingReceipt(null); }} receipt={editingReceipt} />}
            {printingReceipt && (
                <PrintPreviewModal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="طباعة سند قبض" 
                    onExportPdf={() => {
                        if (!db || !printingReceipt) return;
                        const contract = db.contracts.find(c => c.id === printingReceipt.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportReceiptToPdf(printingReceipt, tenant, db.settings);
                    }}>
                    <ReceiptPrintable receipt={printingReceipt} />
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
                    <h2 className={sectionTitleCls}>سجلات المصروفات</h2>
                    <p className="mt-1 text-sm text-slate-500">تتبع المصروفات التشغيلية وربطها بالحسابات المناسبة وسندات الصرف.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className={primaryButtonCls}>
                    <Wallet size={16} />
                    إضافة مصروف
                </button>
            </div>
            <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث بالمصروف أو التصنيف..." />
            {filteredExpenses.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>رقم السند</Th>
                            <Th>التاريخ</Th>
                            <Th>التصنيف</Th>
                            <Th>المبلغ</Th>
                            <Th>الحالة</Th>
                            <Th className="text-left">إجراءات</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map(e => (
                            <Tr key={e.id} className={e.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                <Td className="font-mono font-bold text-slate-800">{e.no}</Td>
                                <Td className="whitespace-nowrap">{formatDateTime(e.dateTime)}</Td>
                                <Td>{e.category}</Td>
                                <Td className="font-bold text-rose-600">{formatCurrency(e.amount, db.settings.currency)}</Td>
                                <Td><StatusPill status={e.status}>{e.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></Td>
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
                <EmptyState icon={Wallet} title="لا توجد مصروفات" description="لم يتم تسجيل أي مصروفات بعد لهذه الفترة." />
            )}
            {isModalOpen && <ExpenseForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />}
            
            {printingExpense && (
                <PrintPreviewModal 
                    isOpen={!!printingExpense} 
                    onClose={() => setPrintingExpense(null)} 
                    title="طباعة سند صرف" 
                    onExportPdf={() => {
                        if (!db || !printingExpense) return;
                        exportExpenseToPdf(printingExpense, db.settings);
                    }}
                >
                    <ExpensePrintable expense={printingExpense} />
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
                    <h2 className={sectionTitleCls}>إدارة مبالغ التأمين</h2>
                    <p className="mt-1 text-sm text-slate-500">حركات الوديعة والخصومات والإرجاعات المرتبطة بالعقود والمستأجرين.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className={primaryButtonCls}>
                    <PiggyBank size={16} />
                    حركة وديعة جديدة
                </button>
            </div>
            {db.depositTxs.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>التاريخ</Th>
                            <Th>المستأجر</Th>
                            <Th>النوع</Th>
                            <Th>المبلغ</Th>
                            <Th>الحالة</Th>
                            <Th className="text-left">إجراءات</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {db.depositTxs.map(tx => {
                            const contract = db.contracts.find(c => c.id === tx.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            const typeMap = {'DEPOSIT_IN': 'إيداع جديد', 'DEPOSIT_DEDUCT': 'خصم للإصلاح', 'DEPOSIT_RETURN': 'إرجاع مستحقات'};
                            return (
                                <Tr key={tx.id} className={tx.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                    <Td className="whitespace-nowrap">{formatDate(tx.date)}</Td>
                                    <Td>{tenant?.name || '—'}</Td>
                                    <Td className="font-bold text-slate-800">{typeMap[tx.type]}</Td>
                                    <Td className="font-mono font-bold text-slate-800">{formatCurrency(tx.amount, db.settings.currency)}</Td>
                                    <Td><StatusPill status={tx.status}>{tx.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></Td>
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
                <EmptyState icon={PiggyBank} title="لا توجد حركات وديعة" description="أضف أول حركة لتتبع مبالغ التأمين والخصومات المرتبطة بالعقود." />
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
                    <h2 className={sectionTitleCls}>تسويات وتحويلات الملاك</h2>
                    <p className="mt-1 text-sm text-slate-500">تحويل صافي المستحقات للملاك مع تتبع الحالة والإثبات المحاسبي.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className={primaryButtonCls}>
                    <Landmark size={16} />
                    إضافة تحويل للمالك
                </button>
            </div>
            <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث برقم التسوية أو اسم المالك..." />
            {filtered.length ? (
                <TableWrapper>
                    <thead className={tableHeadCls}>
                        <tr>
                            <Th>الرقم</Th>
                            <Th>التاريخ</Th>
                            <Th>المالك</Th>
                            <Th>المبلغ المحول</Th>
                            <Th>الحالة</Th>
                            <Th className="text-left">إجراءات</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(s => {
                            const owner = db.owners.find(o => o.id === s.ownerId);
                            return (
                                <Tr key={s.id} className={s.status === 'VOID' ? 'bg-slate-50/70 opacity-60 line-through' : ''}>
                                    <Td className="font-mono font-bold text-slate-800">{s.no}</Td>
                                    <Td className="whitespace-nowrap">{formatDate(s.date)}</Td>
                                    <Td>{owner?.name || '—'}</Td>
                                    <Td className="font-bold text-blue-600">{formatCurrency(s.amount, db.settings.currency)}</Td>
                                    <Td><StatusPill status={s.status}>{s.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</StatusPill></Td>
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
                <EmptyState icon={Landmark} title="لا توجد تسويات ملاك" description="عند تحويل المستحقات إلى المالك ستظهر هنا كل التسويات المالية." />
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
        <Modal isOpen={isOpen} onClose={onClose} title={`تعديل سند قبض #${receipt.no}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm"><strong>المستأجر:</strong> {tenant?.name}</p>
                    <p className="text-sm"><strong>المبلغ:</strong> {formatCurrency(receipt.amount, db.settings.currency)}</p>
                </div>
                <p className="rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-700">لا يمكن تعديل المبلغ أو العقد لضمان سلامة القيود المحاسبية.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>التاريخ والوقت</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required className={inputCls} /></div>
                    <div><label className={labelCls}>مرجع / رقم الحوالة</label><input value={ref} onChange={e=>setRef(e.target.value)} className={inputCls} /></div>
                </div>
                <div><label className={labelCls}>ملاحظات</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className={inputCls} /></div>
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className={ghostButtonCls}>إلغاء</button><button type="submit" className={primaryButtonCls}>حفظ التعديلات</button></div>
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
            toast.error("يجب أن يساوي المبلغ المخصص إجمالي مبلغ السند.");
            return;
        }
        try {
            const finalAllocations = Array.from(allocations.entries()).filter(([, amount]) => amount > 0).map(([invoiceId, amount]) => ({ invoiceId, amount }));
            await financeService.addReceiptWithAllocations({ contractId, ...receiptData }, finalAllocations);
            onClose();
        } catch (error) {
            console.error("Failed to add receipt with allocations:", error);
            toast.error(error instanceof Error ? error.message : "فشل إضافة السند.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة سند قبض وتخصيص الدفعات">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-3">
                    <div><label className="text-xs font-bold block mb-1">العقد</label><select value={contractId} onChange={e => setContractId(e.target.value)} required><option value="">-- اختر العقد --</option>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}</select></div>
                    <div><label className="text-xs font-bold block mb-1">المبلغ المستلم</label><input type="number" value={receiptData.amount || ''} onChange={e=>setReceiptData({...receiptData, amount: Number(e.target.value)})} required /></div>
                    <div><label className="text-xs font-bold block mb-1">الطريقة</label><select value={receiptData.channel} onChange={e=>setReceiptData({...receiptData, channel: e.target.value as any})}><option value="CASH">نقدي</option><option value="BANK">تحويل</option><option value="POS">شبكة</option></select></div>
                    <div className="md:col-span-3"><label className="text-xs font-bold block mb-1">ملاحظات</label><textarea value={receiptData.notes} onChange={e=>setReceiptData({...receiptData, notes: e.target.value})} rows={1}/></div>
                </div>

                {contractId && (
                    <div className="space-y-2">
                        <h3 className="border-b border-slate-100 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-700">تخصيص على الفواتير المستحقة</h3>
                        {unpaidInvoices.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                                {unpaidInvoices.map(inv => (
                                    <div key={inv.id} className="grid grid-cols-4 items-center gap-4 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50/70 transition-colors">
                                        <div className="text-xs"><strong>#{inv.no}</strong><br/>{formatDate(inv.dueDate)}</div>
                                        <div className="text-xs text-red-500">مستحق: {formatCurrency((inv.amount + (inv.taxAmount || 0)) - inv.paidAmount)}</div>
                                        <div className="col-span-2"><input type="number" step="0.01" value={allocations.get(inv.id) || ''} onChange={e => handleAllocationChange(inv.id, e.target.value)} placeholder="المبلغ المخصص" className={`${inputCls} h-9 py-1.5`} /></div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">لا توجد فواتير مستحقة لهذا العقد حالياً.</p>}
                        
                        <div className={`grid grid-cols-3 gap-2 rounded-xl border p-3 text-xs font-bold ${isBalanced ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                            <div>الإجمالي: {formatCurrency(receiptData.amount)}</div>
                            <div>المخصص: {formatCurrency(totalAllocated)}</div>
                            <div>المتبقي: {formatCurrency(remainingToAllocate)}</div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className={ghostButtonCls}>إلغاء</button><button type="submit" className={`${primaryButtonCls} disabled:cursor-not-allowed disabled:opacity-50`} disabled={!isBalanced || receiptData.amount <= 0}>حفظ السند</button></div>
            </form>
        </Modal>
    );
};

const ExpenseForm: React.FC<{ isOpen: boolean, onClose: () => void, expense: Expense | null }> = ({ isOpen, onClose, expense }) => {
    const { db, dataService, financeService } = useApp();
    const [contractId, setContractId] = useState<string | null>(null);
    const [category, setCategory] = useState('صيانة');
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
            toast.error("لا يمكن تعديل المصروفات المرحلة. يرجى الإلغاء وإعادة الإدخال.");
            return;
        }
        financeService.addExpense(data);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelCls}>التصنيف</label><input value={category} onChange={e=>setCategory(e.target.value)} required placeholder="مثال: صيانة، كهرباء، عمولة" className={inputCls} /></div>
                    <div><label className={labelCls}>المبلغ</label><input type="number" value={amount || ''} onChange={e=>setAmount(Number(e.target.value))} required className={inputCls} /></div>
                    <div><label className={labelCls}>يخصم من</label><select value={chargedTo} onChange={e=>setChargedTo(e.target.value as any)} className={inputCls}><option value="OWNER">حساب المالك</option><option value="OFFICE">حساب المكتب</option><option value="TENANT">حساب المستأجر</option></select></div>
                    <div><label className={labelCls}>العقد المرتبط (اختياري)</label><select value={contractId || ''} onChange={e=>setContractId(e.target.value || null)} className={inputCls}><option value="">-- مصروف مكتب عام --</option>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select></div>
                    <div><label className={labelCls}>تاريخ المصروف</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required className={inputCls} /></div>
                    <div><label className={labelCls}>المستلم / الجهة</label><input value={payee} onChange={e=>setPayee(e.target.value)} placeholder="اسم الفني أو الشركة" className={inputCls} /></div>
                </div>
                <div><label className={labelCls}>ملاحظات إضافية</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className={inputCls} /></div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className={ghostButtonCls}>إلغاء</button><button type="submit" className={primaryButtonCls}>حفظ وتسجيل المصروف</button></div>
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
        <Modal isOpen={isOpen} onClose={onClose} title="حركة مبلغ تأمين (وديعة)">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelCls}>العقد / المستأجر</label><select value={contractId} onChange={e=>setContractId(e.target.value)} required className={inputCls}>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select></div>
                <div><label className={labelCls}>نوع الحركة</label><select value={type} onChange={e=>setType(e.target.value as any)} className={inputCls}><option value="DEPOSIT_IN">إيداع مبلغ تأمين جديد</option><option value="DEPOSIT_RETURN">إرجاع التأمين للمستأجر</option><option value="DEPOSIT_DEDUCT">خصم من التأمين للصيانة</option></select></div>
                <div><label className={labelCls}>المبلغ</label><input type="number" value={amount || ''} onChange={e=>setAmount(Number(e.target.value))} required placeholder="0.000" className={inputCls} /></div>
                <div><label className={labelCls}>السبب / ملاحظات</label><input value={note} onChange={e=>setNote(e.target.value)} placeholder="مثال: تأمين عقد جديد، خصم تلفيات صبغ" className={inputCls} /></div>
                <button type="submit" className={`${primaryButtonCls} mt-4 w-full justify-center`}>تأكيد الحركة المالية</button>
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
            toast.error("لا يمكن تعديل التحويلات المرحلة. يرجى الإلغاء وإعادة الإدخال.");
            return;
        }
        financeService.addOwnerSettlement(data);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={settlement ? "تعديل تسوية المالك" : "تحويل رصيد للمالك"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelCls}>المالك</label><select value={ownerId} onChange={e=>setOwnerId(e.target.value)} required className={inputCls}>{db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                <div><label className={labelCls}>تاريخ التحويل</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} required className={inputCls} /></div>
                <div><label className={labelCls}>المبلغ المحول</label><input type="number" value={amount || ''} onChange={e=>setAmount(Number(e.target.value))} required placeholder="المبلغ المودع في حساب المالك" className={inputCls} /></div>
                <div><label className={labelCls}>البيان / ملاحظات</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="مثال: تحويل صافي إيرادات شهر مايو" className={inputCls} /></div>
                <button type="submit" className={`${primaryButtonCls} mt-4 w-full justify-center`}>حفظ وإثبات التحويل</button>
            </form>
        </Modal>
    );
};

export default Financials;
