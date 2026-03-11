
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
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { InvoicePrintable } from '../components/print/InvoicePrintable';
import { exportInvoiceToPdf } from '../services/pdfService';

// Use the shared table components to unify styling
import TableWrapper from '../components/ui/TableWrapper';

const Invoices: React.FC = () => {
    const { db, financeService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

    const filters = [ { key: 'all', label: 'الكل' }, { key: 'unpaid', label: 'غير مدفوعة' }, { key: 'overdue', label: 'متأخرة' }, { key: 'paid', label: 'مدفوعة' }];
    const [activeFilter, setActiveFilter] = useState('all');

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
        return filteredInvoices
            .map(inv => ({ ...inv, tenant: db.tenants.find(t => t.id === db.contracts.find(c => c.id === inv.contractId)?.tenantId), unit: db.units.find(u => u.id === db.contracts.find(c=>c.id === inv.contractId)?.unitId)}))
            .sort((a, b) => {
                if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
                if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
                return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            });
    }, [db, activeFilter]);

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
        <div className="space-y-6">
            <PageHeader title="الفواتير والمطالبات المالية" description="مساحة عمل للفوترة والتحصيل وربط الفاتورة بالمستأجر والعقد والوحدة." />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStatCard label="إجمالي المتأخرات" value={formatCurrency(summaryData.overdueAmount)} icon={<AlertTriangle size={24}/>} color="danger"/>
                <SummaryStatCard label="عدد الفواتير المتأخرة" value={summaryData.overdueCount} icon={<Hash size={24}/>} color="danger"/>
                <SummaryStatCard label="مستحق (غير متأخر)" value={formatCurrency(summaryData.unpaidAmount)} icon={<DollarSign size={24}/>} color="warning"/>
                <SummaryStatCard label="متوسط أيام التأخير" value={summaryData.avgOverdueDays.toFixed(0)} icon={<Clock size={24}/>} color="warning"/>
            </div>
            <Card>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold">الفواتير والمطالبات المالية</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className="btn btn-secondary flex items-center gap-2"><PlusCircle size={16} /> إضافة فاتورة</button>
                        <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn btn-primary flex items-center gap-2">
                            {isMonthlyLoading && <RefreshCw size={16} className="animate-spin" />} {isMonthlyLoading ? 'جاري...' : 'إصدار الفواتير الآلي'}
                        </button>
                    </div>
                </div>
                <div className="border-b border-border mb-4">
                    <nav className="-mb-px flex space-x-4"><>{filters.map(f => (<button key={f.key} onClick={()=>handleFilterChange(f.key)} className={`${activeFilter === f.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>{f.label}</button>))}</></nav>
                </div>
                <div>
                    {/* Wrap table with TableWrapper for consistent styling */}
                    <TableWrapper>
                        <thead>
                            <tr>
                                <th>#</th><th>المستأجر / الوحدة</th><th>النوع</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th><th className="text-left">إجراء سريع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoicesWithDetails.map(inv => {
                                const balance = inv.amount + (inv.taxAmount || 0) - inv.paidAmount;
                                return (
                                <tr key={inv.id} onClick={() => setSelectedInvoiceId(inv.id)} className={`group cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-blue-50/70 dark:bg-blue-500/10' : ''} ${inv.status === 'PAID' ? 'opacity-60' : ''} ${inv.status === 'OVERDUE' ? 'bg-danger-foreground' : ''}`}>
                                    <td data-label="#" className="font-mono text-xs">{inv.no}</td>
                                    <td data-label="المستأجر / الوحدة"><div className="font-bold">{inv.tenant?.name}</div><div className="text-[10px] text-muted-foreground">{inv.unit?.name}</div></td>
                                    <td data-label="النوع" className="text-xs">{inv.type}</td>
                                    <td data-label="تاريخ الاستحقاق" className="text-xs">{formatDate(inv.dueDate)}</td>
                                    <td data-label="المبلغ"><div className="font-mono font-bold">{formatCurrency(inv.amount + (inv.taxAmount || 0))}</div>{balance > 0 && <div className="text-[9px] text-danger">متبقي: {formatCurrency(balance)}</div>}</td>
                                    <td data-label="الحالة"><StatusPill status={inv.status}>{getInvoiceStatusLabel(inv.status)}</StatusPill></td>
                                    <td data-label="إجراء سريع" className="text-left">
                                        <div className="flex items-center justify-end gap-2">
                                            {inv.status !== 'PAID' && (
                                                <button 
                                                    onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${inv.id}`)}
                                                    className="btn btn-sm btn-success flex items-center gap-1 text-[10px]"
                                                >
                                                    <DollarSign size={12}/> تحصيل
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
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </TableWrapper>
                     {invoicesWithDetails.length === 0 && (<div className="text-center py-16"><ReceiptText size={52} className="mx-auto text-muted" /><h3 className="mt-4 text-xl font-semibold text-heading">لا توجد فواتير</h3></div>)}
                </div>
                <InvoiceForm isOpen={isModalOpen} onClose={() => {setEditingInvoice(null); setIsModalOpen(false);}} invoice={editingInvoice} />
            </Card>
            {selectedInvoice && invoiceWorkspace && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.06fr_0.94fr]">
                    <Card className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل الفاتورة</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">متابعة حالة السداد وربط الفاتورة بالعقد والمستأجر والوحدة والتحصيل.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedInvoice.status !== 'PAID' && (
                                    <button onClick={() => navigate(`/financials?tab=receipts&action=add&invoiceId=${selectedInvoice.id}`)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600">
                                        <DollarSign size={14}/>
                                        تحصيل
                                    </button>
                                )}
                                <button onClick={() => setPrintingInvoice(selectedInvoice)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800">
                                    <ReceiptText size={14}/>
                                    طباعة
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryStatCard label="رقم الفاتورة" value={selectedInvoice.no || '—'} icon={<Hash size={18}/>} color="slate"/>
                            <SummaryStatCard label="المبلغ" value={formatCurrency(selectedInvoice.amount + (selectedInvoice.taxAmount || 0))} icon={<DollarSign size={18}/>} color="blue"/>
                            <SummaryStatCard label="المتبقي" value={formatCurrency(invoiceWorkspace.balance)} icon={<AlertTriangle size={18}/>} color={invoiceWorkspace.balance > 0 ? 'rose' : 'emerald'}/>
                            <SummaryStatCard label="الحالة" value={getInvoiceStatusLabel(selectedInvoice.status)} icon={<CheckCircle2 size={18}/>} color={selectedInvoice.status === 'PAID' ? 'emerald' : 'amber'}/>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الربط التشغيلي</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>المستأجر:</strong> {selectedInvoice.tenant?.name || '—'}</div>
                                    <div><strong>الوحدة:</strong> {selectedInvoice.unit?.name || '—'}</div>
                                    <div><strong>العقار:</strong> {invoiceWorkspace.property?.name || '—'}</div>
                                    <div><strong>المالك:</strong> {invoiceWorkspace.owner?.name || '—'}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الاستحقاق والتحصيل</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>الاستحقاق:</strong> {formatDate(selectedInvoice.dueDate)}</div>
                                    <div><strong>المدفوع:</strong> {formatCurrency(selectedInvoice.paidAmount)}</div>
                                    <div><strong>السندات المرتبطة:</strong> {invoiceWorkspace.receipts.length.toLocaleString('ar')}</div>
                                    <div><strong>نوع الفاتورة:</strong> {selectedInvoice.type}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">تنبيهات الفاتورة</h3>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                    {invoiceWorkspace.balance > 0 && new Date(selectedInvoice.dueDate).getTime() < Date.now() ? 'الفاتورة متأخرة وتحتاج متابعة فورية.' : 'لا توجد حالة تأخير حرجة على هذه الفاتورة.'}
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                    يمكن الانتقال مباشرة إلى التحصيل أو الطباعة أو السجل المالي من نفس الصفحة.
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">المستندات والطباعة</h3>
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
                    title={`طباعة فاتورة #${printingInvoice.no}`}
                    onExportPdf={() => {
                        if (!db || !printingInvoice) return;
                        const contract = db.contracts.find(c => c.id === printingInvoice.contractId);
                        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : undefined;
                        exportInvoiceToPdf(printingInvoice, tenant, contract, db.settings);
                    }}
                >
                    <InvoicePrintable invoice={printingInvoice} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

export default Invoices;
