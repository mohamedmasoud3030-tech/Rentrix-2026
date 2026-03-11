
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

// Use the shared TableWrapper to ensure a consistent table design across the app
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';

const Maintenance: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [printingRecord, setPrintingRecord] = useState<MaintenanceRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecordId, setSelectedRecordId] = useState('');

    const handleOpenModal = (record: MaintenanceRecord | null = null) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingRecord(null);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (!db) return;
        const record = db.maintenanceRecords.find(r => r.id === id);
        if (record?.expenseId || record?.invoiceId) {
            toast.error("لا يمكن حذف طلب الصيانة هذا لأنه مرتبط بحركة مالية.");
            return;
        }
        dataService.remove('maintenanceRecords', id);
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

        return db.maintenanceRecords.filter(rec => {
            const unit = db.units.find(u => u.id === rec.unitId);
            return rec.no.includes(searchTerm) || rec.description.includes(searchTerm) || (unit?.name || '').includes(searchTerm);
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
        const map: { [key in MaintenanceRecord['status']]: string } = { 'NEW': 'جديد', 'OPEN': 'مفتوح', 'IN_PROGRESS': 'قيد التنفيذ', 'COMPLETED': 'مكتمل', 'CLOSED': 'مغلق', 'CANCELLED': 'ملغي' };
        return map[status] || status;
    }
    
    if (!db.settings) return null;

    return (
        <div className="space-y-6">
            <PageHeader title="الصيانة والمتابعات" description="مساحة عمل لمتابعة الأعطال والتكلفة والتحويل إلى مصروف أو فاتورة وربطها بالعقار والوحدة." />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStatCard label="طلبات مفتوحة" value={summaryData.open} icon={<Wrench size={24}/>} color={summaryData.open > 0 ? 'warning' : 'success'}/>
                <SummaryStatCard label="طلبات متأخرة (> 7 أيام)" value={summaryData.aged} icon={<AlertTriangle size={24}/>} color={summaryData.aged > 0 ? 'danger' : 'success'}/>
                <SummaryStatCard label="طلبات جديدة اليوم" value={summaryData.newToday} icon={<Clock size={24}/>} color="info"/>
                <SummaryStatCard label="تكاليف غير مفوترة" value={formatCurrency(summaryData.unbilledCost)} icon={<DollarSign size={24}/>} color={summaryData.unbilledCost > 0 ? 'warning' : 'success'}/>
            </div>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">طلبات الصيانة (مرتبة حسب الأولوية)</h2>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center gap-2">
                        <PlusCircle size={16}/>
                        إضافة طلب صيانة
                    </button>
                </div>
                <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث برقم الطلب، الوصف، أو اسم الوحدة..." />
                
                {/* Use TableWrapper for consistent styling and responsive design */}
                {recordsWithDetails.length ? (
                  <TableWrapper>
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>#</Th>
                        <Th>الوحدة</Th>
                        <Th>تاريخ الطلب</Th>
                        <Th>التكلفة</Th>
                        <Th>الحالة</Th>
                        <Th className="text-left">إجراء سريع</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recordsWithDetails.map((rec) => {
                        const unit = db.units.find((u) => u.id === rec.unitId);
                        const property = unit ? db.properties.find((p) => p.id === unit.propertyId) : null;
                        // Highlight aged requests slightly using amber tint
                        const agingRowCls = rec.isAging ? 'bg-amber-50/50' : '';
                        return (
                          <Tr
                            key={rec.id}
                            className={`${agingRowCls} cursor-pointer group`}
                            onClick={() => setSelectedRecordId(rec.id)}
                          >
                            <Td className="font-mono font-bold text-slate-800">{rec.no}</Td>
                            <Td className="font-medium text-slate-800">
                              <div>{unit?.name}</div>
                              <div className="text-xs text-slate-500">{property?.name}</div>
                            </Td>
                            <Td>{formatDate(rec.requestDate)}</Td>
                            <Td>{formatCurrency(rec.cost)}</Td>
                            <Td>
                              <StatusPill status={rec.status}>{getStatusLabel(rec.status)}</StatusPill>
                            </Td>
                            <Td className="text-left">
                              <div className="flex items-center justify-end gap-2">
                                {rec.status === 'NEW' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dataService.update('maintenanceRecords', rec.id, { status: 'IN_PROGRESS' });
                                    }}
                                    className="btn btn-sm btn-secondary"
                                  >
                                    بدء العمل
                                  </button>
                                )}
                                {rec.status === 'COMPLETED' && rec.cost > 0 && !rec.expenseId && !rec.invoiceId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenModal(rec);
                                    }}
                                    className="btn btn-sm btn-primary"
                                  >
                                    إنشاء مصروف/فاتورة
                                  </button>
                                )}
                                <div
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ActionsMenu
                                    items={[
                                      EditAction(() => handleOpenModal(rec)),
                                      PrintAction(() => setPrintingRecord(rec)),
                                      DeleteAction(() => handleDelete(rec.id)),
                                    ]}
                                  />
                                </div>
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </TableWrapper>
                ) : (
                  <div className="text-center py-16">
                    <Wrench size={52} className="mx-auto text-slate-400" />
                    <h3 className="mt-4 text-xl font-semibold text-slate-800">لا توجد طلبات صيانة</h3>
                  </div>
                )}
            </Card>

            {selectedRecord && maintenanceWorkspace && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <Card className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مساحة عمل طلب الصيانة</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">متابعة الطلب المحدد وربطه بالعقار والوحدة والطرف المتحمل للتكلفة.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleOpenModal(selectedRecord)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800">
                                    تعديل
                                </button>
                                <button onClick={() => setPrintingRecord(selectedRecord)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600">
                                    طباعة
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryStatCard label="رقم الطلب" value={selectedRecord.no || '—'} icon={<Wrench size={18}/>} color="slate"/>
                            <SummaryStatCard label="التكلفة" value={formatCurrency(selectedRecord.cost)} icon={<DollarSign size={18}/>} color="blue"/>
                            <SummaryStatCard label="الحالة" value={getStatusLabel(selectedRecord.status)} icon={<Clock size={18}/>} color={['COMPLETED','CLOSED'].includes(selectedRecord.status) ? 'emerald' : 'amber'}/>
                            <SummaryStatCard label="التحميل" value={selectedRecord.chargedTo || '—'} icon={<AlertTriangle size={18}/>} color="rose"/>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الربط التشغيلي</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>العقار:</strong> {maintenanceWorkspace.property?.name || '—'}</div>
                                    <div><strong>الوحدة:</strong> {maintenanceWorkspace.unit?.name || '—'}</div>
                                    <div><strong>المستأجر الحالي:</strong> {maintenanceWorkspace.tenant?.name || '—'}</div>
                                    <div><strong>تاريخ الطلب:</strong> {formatDate(selectedRecord.requestDate)}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الأثر المالي</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>مصروف مرتبط:</strong> {maintenanceWorkspace.expense?.no || 'لا يوجد'}</div>
                                    <div><strong>فاتورة مرتبطة:</strong> {maintenanceWorkspace.invoice?.no || 'لا يوجد'}</div>
                                    <div><strong>الطرف المتحمل:</strong> {selectedRecord.chargedTo || '—'}</div>
                                    <div><strong>الوصف:</strong> {selectedRecord.description || '—'}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">تنبيهات الصيانة</h3>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                    {selectedRecord.isAging ? 'هذا الطلب متأخر ويحتاج متابعة تشغيلية.' : 'الطلب ضمن الإطار التشغيلي الحالي.'}
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                    {selectedRecord.status === 'COMPLETED' && !selectedRecord.expenseId && !selectedRecord.invoiceId ? 'الطلب مكتمل ولم يُحوّل بعد إلى فاتورة أو مصروف.' : 'الربط المالي للحالة الحالية سليم.'}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">المرفقات والطباعة</h3>
                            <div className="mt-4">
                                <AttachmentsManager entityType="MAINTENANCE" entityId={selectedRecord.id} />
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            <MaintenanceForm isOpen={isModalOpen} onClose={handleCloseModal} record={editingRecord} />
            {printingRecord && (
                <PrintPreviewModal
                    isOpen={!!printingRecord}
                    onClose={() => setPrintingRecord(null)}
                    title={`طباعة طلب صيانة #${printingRecord.no}`}
                    onExportPdf={() => {
                        if (!db.settings || !printingRecord) return;
                        const unit = db.units.find(u => u.id === printingRecord.unitId);
                        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : undefined;
                        exportMaintenanceRecordToPdf(printingRecord, unit, property, db.settings);
                    }}
                >
                    <MaintenancePrintable record={printingRecord} />
                </PrintPreviewModal>
            )}
        </div>
    );
};


const MaintenanceForm: React.FC<{ isOpen: boolean, onClose: () => void, record: MaintenanceRecord | null }> = ({ isOpen, onClose, record }) => {
    const { db, dataService } = useApp();
    const [data, setData] = useState<Partial<MaintenanceRecord>>({});
    const defaultChargedTo = db.settings?.maintenance?.defaultChargedTo || 'OWNER';

    useEffect(() => {
        if (!db.settings) return;
        if (record) setData(record);
        else setData({
            unitId: db.units[0]?.id || '',
            requestDate: new Date().toISOString().slice(0, 10),
            description: '',
            status: 'NEW',
            cost: 0,
            chargedTo: defaultChargedTo,
        });
    }, [record, isOpen, db, defaultChargedTo]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: ['cost'].includes(name) ? parseFloat(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db.settings || !data.unitId || !data.description) { toast.error("الوحدة والوصف مطلوبان."); return; }

        try {
            if (record) {
                if ((record.expenseId || record.invoiceId) && (record.status !== data.status || record.cost !== data.cost || record.chargedTo !== data.chargedTo)) {
                    toast.error("لا يمكن تعديل البيانات المالية لطلب مرتبط بحركة مالية. قم بإلغاء المصروف/الفاتورة أولاً.");
                    return;
                }
                const isNewlyCompleted = ['COMPLETED', 'CLOSED'].includes(data.status!) && !['COMPLETED', 'CLOSED'].includes(record.status) && data.cost! > 0;
                let updates = { ...data };

                if (isNewlyCompleted) {
                    const activeContract = db.contracts.find(c => c.unitId === data.unitId && c.status === 'ACTIVE');
                    if (data.chargedTo === 'TENANT') {
                        if (!activeContract) { toast.error("لا يمكن تحميل التكلفة على المستأجر لعدم وجود عقد نشط."); return; }
                        const newInvoice = await dataService.add('invoices', { contractId: activeContract.id, dueDate: new Date().toISOString().slice(0, 10), amount: data.cost!, paidAmount: 0, status: 'UNPAID', type: 'MAINTENANCE', notes: `فاتورة صيانة: ${data.description}`.slice(0, 100) });
                        if (newInvoice) { updates.invoiceId = newInvoice.id; updates.completedAt = Date.now(); }
                    } else { // OWNER or OFFICE
                        const newExpense = await dataService.add('expenses', { contractId: activeContract?.id || null, dateTime: new Date().toISOString(), category: 'صيانة', amount: data.cost!, ref: `صيانة للوحدة ${db.units.find(u => u.id === data.unitId)?.name}`, notes: data.description, chargedTo: data.chargedTo, status: 'POSTED' });
                        if (newExpense) { updates.expenseId = newExpense.id; updates.completedAt = Date.now(); }
                    }
                }
                dataService.update('maintenanceRecords', record.id, updates);
            } else {
                dataService.add('maintenanceRecords', data as any);
            }
            onClose();
        } catch (error) { toast.error(error instanceof Error ? error.message : "فشل حفظ طلب الصيانة."); }
    };
    
    if (!db.settings) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? "تعديل طلب صيانة" : "إضافة طلب صيانة"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select name="unitId" value={data.unitId} onChange={handleChange} required>{db.units.map(u => <option key={u.id} value={u.id}>{u.name} ({db.properties.find(p=>p.id === u.propertyId)?.name})</option>)}</select>
                    <input name="requestDate" type="date" value={data.requestDate} onChange={handleChange} required />
                 </div>
                 <textarea name="description" value={data.description} onChange={handleChange} required rows={3} placeholder="الوصف" />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select name="status" value={data.status} onChange={handleChange}><option value="NEW">جديد</option><option value="IN_PROGRESS">قيد التنفيذ</option><option value="COMPLETED">مكتمل</option><option value="CLOSED">مغلق</option></select>
                    <input name="cost" type="number" value={data.cost || ''} onChange={handleChange} placeholder="التكلفة"/>
                    <select name="chargedTo" value={data.chargedTo} onChange={handleChange}><option value="OWNER">المالك</option><option value="OFFICE">المكتب</option><option value="TENANT">المستأجر</option></select>
                 </div>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border"><button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button><button type="submit" className="btn btn-primary">حفظ</button></div>
            </form>
        </Modal>
    );
};

export default Maintenance;
