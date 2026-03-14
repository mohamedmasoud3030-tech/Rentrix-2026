
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { MaintenanceRecord, Expense, Invoice } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import ActionsMenu, { EditAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, formatDate } from '../utils/helpers';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { toast } from 'react-hot-toast';
import { Wrench, PlusCircle, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { MaintenancePrintable } from '../components/print/MaintenancePrintable';
import { exportMaintenanceRecordToPdf } from '../services/pdfService';
import ConfirmDialog from '../components/shared/ConfirmDialog';

// Use the shared TableWrapper to ensure a consistent table design across the app
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';

const primaryButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const warningButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-600';
const inputCls = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';

const displayUnitName = (unit?: { name?: string | null; unitNumber?: string | null } | null) => unit?.name || unit?.unitNumber || 'وحدة غير محددة';
const getChargedToLabel = (value?: string | null) => {
    switch (value) {
        case 'OWNER':
            return 'المالك';
        case 'TENANT':
            return 'المستأجر';
        case 'OFFICE':
            return 'المكتب';
        default:
            return 'غير محدد';
    }
};

const Maintenance: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [printingRecord, setPrintingRecord] = useState<MaintenanceRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecordId, setSelectedRecordId] = useState('');
    const [confirmState, setConfirmState] = useState<{ open: boolean; targetId?: string; busy?: boolean }>({ open: false });

    const handleOpenModal = (record: MaintenanceRecord | null = null) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingRecord(null);
        setIsModalOpen(false);
    };

    const requestDelete = (id: string) => {
        if (!db) return;
        const record = db.maintenanceRecords.find(r => r.id === id);
        if (record?.expenseId || record?.invoiceId) {
            toast.error('لا يمكن حذف طلب الصيانة لأنه مرتبط بحركة مالية.');
            return;
        }
        setConfirmState({ open: true, targetId: id, busy: false });
    };

    const handleDelete = async () => {
        if (!confirmState.targetId) return;
        try {
            setConfirmState((prev) => ({ ...prev, busy: true }));
            await dataService.remove('maintenanceRecords', confirmState.targetId);
            toast.success('تم حذف طلب الصيانة.');
        } catch (error: any) {
            toast.error(error?.message || 'تعذر حذف طلب الصيانة.');
        } finally {
            setConfirmState({ open: false, targetId: undefined, busy: false });
        }
    };

    const summaryData = useMemo(() => {
        if (!db) return { open: 0, aged: 0, unbilledCost: 0, newToday: 0 };
        const openTickets = db.maintenanceRecords.filter(r => r.status !== 'CLOSED');
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return {
            open: openTickets.length,
            aged: openTickets.filter(r => new Date(r.requestDate) < sevenDaysAgo).length,
            unbilledCost: db.maintenanceRecords
                .filter(r => (r.status === 'COMPLETED') && !r.expenseId && !r.invoiceId)
                .reduce((sum, r) => sum + r.cost, 0),
            newToday: db.maintenanceRecords.filter(r => r.requestDate === today).length,
        }
    }, [db]);

    const recordsWithDetails = useMemo(() => {
        if (!db) return [];
        const statusPriority: { [key in MaintenanceRecord['status']]: number } = { 'NEW': 1, 'OPEN': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'CLOSED': 4, 'CANCELLED': 5 };
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const normalizedSearch = searchTerm.trim().toLowerCase();

        return db.maintenanceRecords.filter(rec => {
            if (!normalizedSearch) return true;
            const unit = db.units.find(u => u.id === rec.unitId);
            const haystack = [rec.no, rec.issueTitle, rec.description, unit?.name, unit?.unitNumber]
                .filter((value): value is string => Boolean(value))
                .map((value) => value.toLowerCase())
                .join(' ');
            return haystack.includes(normalizedSearch);
        }).map(rec => ({
            ...rec,
            isAging: rec.status === 'NEW' && new Date(rec.requestDate) < threeDaysAgo
        })).sort((a,b) => statusPriority[a.status] - statusPriority[b.status] || new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime());
    }, [db, searchTerm]);

    const selectedRecord = useMemo(
        () => recordsWithDetails.find((record) => record.id === selectedRecordId) || recordsWithDetails[0] || null,
        [recordsWithDetails, selectedRecordId]
    );

    const maintenanceWorkspace = useMemo(() => {
        if (!selectedRecord) return null;
        const unit = db.units.find((item) => item.id === selectedRecord.unitId);
        const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;
        const activeContract = unit ? db.contracts.find((item) => item.unitId === unit.id && item.status === 'ACTIVE') : null;
        const tenant = activeContract ? db.tenants.find((item) => item.id === activeContract.tenantId) : null;
        const expense = selectedRecord.expenseId ? db.expenses.find((item) => item.id === selectedRecord.expenseId) : null;
        const invoice = selectedRecord.invoiceId ? db.invoices.find((item) => item.id === selectedRecord.invoiceId) : null;
        return { unit, property, activeContract, tenant, expense, invoice };
    }, [db.contracts, db.expenses, db.invoices, db.properties, db.tenants, db.units, selectedRecord]);
    
    const getStatusLabel = (status: MaintenanceRecord['status']) => {
        const map: { [key in MaintenanceRecord['status']]: string } = {
            NEW: 'جديد',
            OPEN: 'مفتوح',
            IN_PROGRESS: 'قيد التنفيذ',
            COMPLETED: 'مكتمل',
            CLOSED: 'مغلق',
            CANCELLED: 'ملغي',
        };
        return map[status] || status;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db.settings || !data.unitId || !data.description) { toast.error('الوحدة والوصف مطلوبان.'); return; }

        const unit = db.units.find(u => u.id === data.unitId);
        const propertyId = unit?.propertyId || data.propertyId || '';
        const issueTitle = (data.issueTitle || data.description || '').trim();
        const cost = Number(data.cost || 0);
        const status = data.status || 'NEW';
        const chargedTo = data.chargedTo || defaultChargedTo;

        if (!propertyId) { toast.error('يرجى اختيار وحدة مرتبطة بعقار.'); return; }
        if (!issueTitle) { toast.error('عنوان المشكلة مطلوب.'); return; }

        const shouldPostFinance = ['COMPLETED', 'CLOSED'].includes(status) && cost > 0 && !(record?.expenseId || record?.invoiceId);
        let createdFinance: { type: 'invoice' | 'expense'; id: string } | null = null;

        try {
            if (shouldPostFinance) {
                const activeContract = db.contracts.find(c => c.unitId === data.unitId && c.status === 'ACTIVE');
                if (chargedTo === 'TENANT') {
                    if (!activeContract) { throw new Error('لا يمكن تحميل التكلفة على المستأجر لعدم وجود عقد نشط.'); }
                    const newInvoice = await dataService.add('invoices', { contractId: activeContract.id, dueDate: new Date().toISOString().slice(0, 10), amount: cost, paidAmount: 0, status: 'UNPAID', type: 'MAINTENANCE', notes: `فاتورة صيانة: ${issueTitle}`.slice(0, 100) });
                    createdFinance = { type: 'invoice', id: newInvoice.id };
                } else {
                    const newExpense = await dataService.add('expenses', { contractId: activeContract?.id || null, dateTime: new Date().toISOString(), category: 'صيانة', amount: cost, ref: `صيانة للوحدة ${unit?.name || unit?.unitNumber || ''}`.trim(), notes: issueTitle, chargedTo, status: 'POSTED' });
                    createdFinance = { type: 'expense', id: newExpense.id };
                }
            }

            if (record) {
                if ((record.expenseId || record.invoiceId) && (record.status !== status || record.cost !== cost || record.chargedTo !== chargedTo)) {
                    toast.error('لا يمكن تعديل البيانات المالية لطلب مرتبط بحركة مالية. قم بإلغاء المصروف/الفاتورة أولاً.');
                    return;
                }

                const updates: Partial<MaintenanceRecord> = {
                    ...data,
                    propertyId,
                    issueTitle,
                    cost,
                    status,
                    chargedTo,
                    completedAt: ['COMPLETED', 'CLOSED'].includes(status) ? (record.completedAt || Date.now()) : null,
                };

                if (createdFinance) {
                    if (createdFinance.type === 'invoice') updates.invoiceId = createdFinance.id;
                    if (createdFinance.type === 'expense') updates.expenseId = createdFinance.id;
                    updates.completedAt = Date.now();
                }

                await dataService.update('maintenanceRecords', record.id, updates);
                toast.success('تم تحديث طلب الصيانة.');
            } else {
                const baseRecord: Partial<MaintenanceRecord> = {
                    ...data,
                    propertyId,
                    issueTitle,
                    cost,
                    status,
                    chargedTo,
                    completedAt: ['COMPLETED', 'CLOSED'].includes(status) ? Date.now() : null,
                };

                if (createdFinance) {
                    if (createdFinance.type === 'invoice') baseRecord.invoiceId = createdFinance.id;
                    if (createdFinance.type === 'expense') baseRecord.expenseId = createdFinance.id;
                }

                await dataService.add('maintenanceRecords', baseRecord as any);
                toast.success('تم إنشاء طلب الصيانة.');
            }
            onClose();
        } catch (error) {
            if (createdFinance) {
                try {
                    if (createdFinance.type === 'invoice') await dataService.remove('invoices', createdFinance.id);
                    if (createdFinance.type === 'expense') await dataService.remove('expenses', createdFinance.id);
                } catch (cleanupError) {
                    console.error('تعذر تنظيف الحركة المالية المرتبطة بطلب الصيانة:', cleanupError);
                }
            }
            const message = error instanceof Error ? error.message : 'فشل حفظ طلب الصيانة.';
            toast.error(message);
        }
    };
    
    if (!db.settings) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'تعديل طلب صيانة' : 'إضافة طلب صيانة'}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>الوحدة</label>
                        <select className={inputCls} name="unitId" value={data.unitId} onChange={handleChange} required>
                            {db.units.map(u => (
                                <option key={u.id} value={u.id}>
                                    {displayUnitName(u)} ({db.properties.find(p => p.id === u.propertyId)?.name})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>تاريخ الطلب</label>
                        <input className={inputCls} name="requestDate" type="date" value={data.requestDate} onChange={handleChange} required />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>عنوان المشكلة</label>
                    <input className={inputCls} name="issueTitle" value={data.issueTitle || ''} onChange={handleChange} required placeholder="مثال: تسريب في المطبخ" />
                </div>

                <div>
                    <label className={labelCls}>وصف الطلب</label>
                    <textarea className={`${inputCls} min-h-[110px]`} name="description" value={data.description} onChange={handleChange} required rows={3} placeholder="اكتب وصفاً واضحاً للمشكلة أو الأعمال المطلوبة" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className={labelCls}>الحالة</label>
                        <select className={inputCls} name="status" value={data.status} onChange={handleChange}>
                            <option value="NEW">جديد</option>
                            <option value="IN_PROGRESS">جارٍ التنفيذ</option>
                            <option value="COMPLETED">مكتمل</option>
                            <option value="CLOSED">مغلق</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>التكلفة</label>
                        <input className={inputCls} name="cost" type="number" value={data.cost ?? ''} onChange={handleChange} placeholder="0.000" min="0" step="0.001" />
                    </div>
                    <div>
                        <label className={labelCls}>تحميل التكلفة على</label>
                        <select className={inputCls} name="chargedTo" value={data.chargedTo} onChange={handleChange}>
                            <option value="OWNER">المالك</option>
                            <option value="OFFICE">المكتب</option>
                            <option value="TENANT">المستأجر</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button type="button" onClick={onClose} className={ghostButtonCls}>إلغاء</button>
                    <button type="submit" className={primaryButtonCls}>حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default Maintenance;





