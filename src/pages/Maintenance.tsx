import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Clock, DollarSign, PlusCircle, Wrench } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { MaintenanceRecord } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import StatusPill from '../components/ui/StatusPill';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import ActionsMenu, { DeleteAction, EditAction, PrintAction } from '../components/shared/ActionsMenu';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { MaintenancePrintable } from '../components/print/MaintenancePrintable';
import { exportMaintenanceRecordToPdf } from '../services/pdfService';
import { formatCurrency, formatDate } from '../utils/helpers';

const primaryButtonCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButtonCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const warningButtonCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-600';
const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';

type MaintenanceRecordWithMeta = MaintenanceRecord & { isAging: boolean };

const displayUnitName = (unit?: { name?: string | null; unitNumber?: string | null } | null) =>
  unit?.name || unit?.unitNumber || 'وحدة غير محددة';

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

const getStatusLabel = (status: MaintenanceRecord['status']) => {
  const map: Record<MaintenanceRecord['status'], string> = {
    NEW: 'جديد',
    OPEN: 'مفتوح',
    IN_PROGRESS: 'قيد التنفيذ',
    COMPLETED: 'مكتمل',
    CLOSED: 'مغلق',
    CANCELLED: 'ملغي',
  };

  return map[status] || status;
};

const Maintenance: React.FC = () => {
  const { db, dataService } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [printingRecord, setPrintingRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MaintenanceRecord['status']>('ALL');
  const [confirmState, setConfirmState] = useState<{ open: boolean; targetId?: string; busy?: boolean }>({
    open: false,
  });

  const handleOpenModal = (record: MaintenanceRecord | null = null) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingRecord(null);
    setIsModalOpen(false);
  };

  const requestDelete = (id: string) => {
    const record = db.maintenanceRecords.find((item) => item.id === id);
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

  const handleMoveToProgress = async (recordId: string) => {
    try {
      await dataService.update('maintenanceRecords', recordId, { status: 'IN_PROGRESS' });
      toast.success('تم تحديث حالة الطلب إلى قيد التنفيذ.');
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحديث حالة الطلب.');
    }
  };

  const summaryData = useMemo(() => {
    const openTickets = db.maintenanceRecords.filter((record) => !['CLOSED', 'CANCELLED'].includes(record.status));
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return {
      open: openTickets.length,
      aged: openTickets.filter((record) => record.requestDate && new Date(record.requestDate) < sevenDaysAgo).length,
      unbilledCost: db.maintenanceRecords
        .filter((record) => ['COMPLETED', 'CLOSED'].includes(record.status) && !record.expenseId && !record.invoiceId)
        .reduce((sum, record) => sum + Number(record.cost || 0), 0),
      newToday: db.maintenanceRecords.filter((record) => record.requestDate === today).length,
    };
  }, [db.maintenanceRecords]);

  const recordsWithDetails = useMemo<MaintenanceRecordWithMeta[]>(() => {
    const statusPriority: Record<MaintenanceRecord['status'], number> = {
      NEW: 1,
      OPEN: 2,
      IN_PROGRESS: 3,
      COMPLETED: 4,
      CLOSED: 5,
      CANCELLED: 6,
    };
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return db.maintenanceRecords
      .filter((record) => {
        if (statusFilter !== 'ALL' && record.status !== statusFilter) return false;
        if (!normalizedSearch) return true;

        const unit = db.units.find((item) => item.id === record.unitId);
        const haystack = [
          record.no,
          record.issueTitle,
          record.description,
          unit?.name,
          unit?.unitNumber,
          getChargedToLabel(record.chargedTo),
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase())
          .join(' ');

        return haystack.includes(normalizedSearch);
      })
      .map((record) => ({
        ...record,
        isAging: ['NEW', 'OPEN'].includes(record.status) && Boolean(record.requestDate) && new Date(record.requestDate) < threeDaysAgo,
      }))
      .sort((a, b) => {
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime();
      });
  }, [db.maintenanceRecords, db.units, searchTerm, statusFilter]);

  useEffect(() => {
    if (!recordsWithDetails.length) {
      setSelectedRecordId('');
      return;
    }

    if (!selectedRecordId || !recordsWithDetails.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(recordsWithDetails[0].id);
    }
  }, [recordsWithDetails, selectedRecordId]);

  const selectedRecord = useMemo(
    () => recordsWithDetails.find((record) => record.id === selectedRecordId) || null,
    [recordsWithDetails, selectedRecordId]
  );

  const maintenanceWorkspace = useMemo(() => {
    if (!selectedRecord) return null;

    const unit = selectedRecord.unitId ? db.units.find((item) => item.id === selectedRecord.unitId) : null;
    const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : db.properties.find((item) => item.id === selectedRecord.propertyId) || null;
    const activeContract = unit ? db.contracts.find((item) => item.unitId === unit.id && item.status === 'ACTIVE') : null;
    const tenant = activeContract ? db.tenants.find((item) => item.id === activeContract.tenantId) : null;
    const expense = selectedRecord.expenseId ? db.expenses.find((item) => item.id === selectedRecord.expenseId) : null;
    const invoice = selectedRecord.invoiceId ? db.invoices.find((item) => item.id === selectedRecord.invoiceId) : null;

    return { unit, property, activeContract, tenant, expense, invoice };
  }, [db.contracts, db.expenses, db.invoices, db.properties, db.tenants, db.units, selectedRecord]);

  const activeFilterChips = [
    ...(searchTerm ? [{ key: 'search', label: `بحث: ${searchTerm}` }] : []),
    ...(statusFilter !== 'ALL' ? [{ key: 'status', label: `الحالة: ${getStatusLabel(statusFilter)}` }] : []),
  ];

  return (
    <div className="app-page page-enter" dir="rtl">
      <PageHeader
        title="الصيانة والمتابعات"
        description="مساحة تشغيلية لمتابعة الأعطال، وربطها بالعقار والوحدة، وترحيل أثرها المالي بشكل صحيح."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard label="طلبات مفتوحة" value={summaryData.open} icon={<Wrench size={24} />} color={summaryData.open > 0 ? 'warning' : 'success'} />
        <SummaryStatCard label="طلبات متأخرة" value={summaryData.aged} icon={<AlertTriangle size={24} />} color={summaryData.aged > 0 ? 'danger' : 'success'} />
        <SummaryStatCard label="طلبات جديدة اليوم" value={summaryData.newToday} icon={<Clock size={24} />} color="info" />
        <SummaryStatCard label="تكاليف غير مرحّلة" value={formatCurrency(summaryData.unbilledCost, db.settings?.currency || 'OMR')} icon={<DollarSign size={24} />} color={summaryData.unbilledCost > 0 ? 'warning' : 'success'} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">طلبات الصيانة</h2>
          <button type="button" onClick={() => handleOpenModal()} className={primaryButtonCls}>
            <PlusCircle size={16} />
            إضافة طلب صيانة
          </button>
        </div>

        <SearchFilterBar
          value={searchTerm}
          onSearch={setSearchTerm}
          placeholder="ابحث برقم الطلب أو العنوان أو اسم الوحدة"
          rightSlot={
            <select
              className={`${inputCls} min-w-[180px]`}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | MaintenanceRecord['status'])}
            >
              <option value="ALL">كل الحالات</option>
              <option value="NEW">جديد</option>
              <option value="OPEN">مفتوح</option>
              <option value="IN_PROGRESS">قيد التنفيذ</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="CLOSED">مغلق</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          }
          filterChips={activeFilterChips}
          onRemoveChip={(key) => {
            if (key === 'search') setSearchTerm('');
            if (key === 'status') setStatusFilter('ALL');
          }}
          onClearAll={activeFilterChips.length ? () => { setSearchTerm(''); setStatusFilter('ALL'); } : undefined}
        />

        {recordsWithDetails.length ? (
          <TableWrapper>
            <thead className="bg-slate-50/80 dark:bg-slate-800/80">
              <tr>
                <Th>رقم الطلب</Th>
                <Th>العنوان</Th>
                <Th>الوحدة</Th>
                <Th>تاريخ الطلب</Th>
                <Th>التكلفة</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recordsWithDetails.map((record) => {
                const unit = record.unitId ? db.units.find((item) => item.id === record.unitId) : null;
                const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : db.properties.find((item) => item.id === record.propertyId) || null;

                return (
                  <Tr
                    key={record.id}
                    className={`${record.isAging ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''} cursor-pointer`}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <Td className="font-mono font-bold text-slate-800 dark:text-slate-100">{record.no || '—'}</Td>
                    <Td>
                      <div className="font-bold text-slate-800 dark:text-slate-100">{record.issueTitle || 'بدون عنوان'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{record.description || 'لا توجد ملاحظات إضافية'}</div>
                    </Td>
                    <Td>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{displayUnitName(unit)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{property?.name || 'عقار غير محدد'}</div>
                    </Td>
                    <Td>{formatDate(record.requestDate)}</Td>
                    <Td>{formatCurrency(record.cost || 0, db.settings?.currency || 'OMR')}</Td>
                    <Td>
                      <StatusPill status={record.status}>{getStatusLabel(record.status)}</StatusPill>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        {record.status === 'NEW' ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMoveToProgress(record.id);
                            }}
                            className={warningButtonCls}
                          >
                            بدء العمل
                          </button>
                        ) : null}

                        <div onClick={(event) => event.stopPropagation()}>
                          <ActionsMenu
                            items={[
                              EditAction(() => handleOpenModal(record)),
                              PrintAction(() => setPrintingRecord(record)),
                              DeleteAction(() => requestDelete(record.id)),
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
          <div className="py-16 text-center">
            <Wrench size={52} className="mx-auto text-slate-400" />
            <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">لا توجد طلبات صيانة</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">أضف أول طلب صيانة للبدء في المتابعة.</p>
          </div>
        )}
      </Card>

      {selectedRecord && maintenanceWorkspace ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">ملف طلب الصيانة</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">متابعة التشغيلي والمالي والسياق المرتبط بالطلب المحدد.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => handleOpenModal(selectedRecord)} className={ghostButtonCls}>
                  تعديل
                </button>
                <button type="button" onClick={() => setPrintingRecord(selectedRecord)} className={primaryButtonCls}>
                  طباعة
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard label="رقم الطلب" value={selectedRecord.no || '—'} icon={<Wrench size={18} />} color="slate" />
              <SummaryStatCard label="التكلفة" value={formatCurrency(selectedRecord.cost || 0, db.settings?.currency || 'OMR')} icon={<DollarSign size={18} />} color="blue" />
              <SummaryStatCard label="الحالة" value={getStatusLabel(selectedRecord.status)} icon={<Clock size={18} />} color={['COMPLETED', 'CLOSED'].includes(selectedRecord.status) ? 'emerald' : 'amber'} />
              <SummaryStatCard label="التحميل" value={getChargedToLabel(selectedRecord.chargedTo)} icon={<AlertTriangle size={18} />} color="rose" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الربط التشغيلي</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>العقار:</strong> {maintenanceWorkspace.property?.name || '—'}</div>
                  <div><strong>الوحدة:</strong> {displayUnitName(maintenanceWorkspace.unit)}</div>
                  <div><strong>المستأجر الحالي:</strong> {maintenanceWorkspace.tenant?.name || maintenanceWorkspace.tenant?.fullName || '—'}</div>
                  <div><strong>تاريخ الطلب:</strong> {formatDate(selectedRecord.requestDate)}</div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">الأثر المالي</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>مصروف مرتبط:</strong> {maintenanceWorkspace.expense?.no || 'لا يوجد'}</div>
                  <div><strong>فاتورة مرتبطة:</strong> {maintenanceWorkspace.invoice?.no || 'لا يوجد'}</div>
                  <div><strong>الطرف المتحمل:</strong> {getChargedToLabel(selectedRecord.chargedTo)}</div>
                  <div><strong>الوصف:</strong> {selectedRecord.description || '—'}</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">تنبيهات الصيانة</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  {selectedRecord.isAging ? 'هذا الطلب متأخر ويحتاج متابعة تشغيلية عاجلة.' : 'الطلب ضمن الإطار التشغيلي الحالي.'}
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  {['COMPLETED', 'CLOSED'].includes(selectedRecord.status) && !selectedRecord.expenseId && !selectedRecord.invoiceId
                    ? 'الطلب مكتمل ولكن أثره المالي لم يُرحّل بعد.'
                    : 'الربط المالي للحالة الحالية سليم.'}
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">المرفقات والطباعة</h3>
              <div className="mt-4">
                <AttachmentsManager entityType="MAINTENANCE" entityId={selectedRecord.id} />
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      <MaintenanceForm isOpen={isModalOpen} onClose={handleCloseModal} record={editingRecord} />

      {printingRecord ? (
        <PrintPreviewModal
          isOpen={!!printingRecord}
          onClose={() => setPrintingRecord(null)}
          title={`طباعة طلب صيانة #${printingRecord.no || printingRecord.id.slice(0, 8)}`}
          onExportPdf={() => {
            if (!printingRecord || !db.settings) return;
            const unit = printingRecord.unitId ? db.units.find((item) => item.id === printingRecord.unitId) : undefined;
            const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : db.properties.find((item) => item.id === printingRecord.propertyId);
            exportMaintenanceRecordToPdf(printingRecord, unit, property, db.settings);
          }}
        >
          <MaintenancePrintable record={printingRecord} settings={db.settings} />
        </PrintPreviewModal>
      ) : null}

      <ConfirmDialog
        isOpen={confirmState.open}
        title="تأكيد حذف طلب الصيانة"
        message="سيتم حذف الطلب نهائيًا إذا لم يكن مرتبطًا بحركة مالية. هل تريد المتابعة؟"
        confirmLabel="حذف الطلب"
        cancelLabel="إلغاء"
        loading={!!confirmState.busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, targetId: undefined, busy: false })}
      />
    </div>
  );
};

const MaintenanceForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  record: MaintenanceRecord | null;
}> = ({ isOpen, onClose, record }) => {
  const { db, dataService } = useApp();
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({});
  const defaultChargedTo = db.settings?.maintenance?.defaultChargedTo || 'OWNER';

  useEffect(() => {
    if (!isOpen) return;

    if (record) {
      setFormData(record);
      return;
    }

    setFormData({
      unitId: db.units[0]?.id || null,
      propertyId: db.units[0]?.propertyId || '',
      requestDate: new Date().toISOString().slice(0, 10),
      issueTitle: '',
      description: '',
      status: 'NEW',
      cost: 0,
      chargedTo: defaultChargedTo,
      expenseId: null,
      invoiceId: null,
      completedAt: null,
    });
  }, [db.units, defaultChargedTo, isOpen, record]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (name === 'unitId') {
      const selectedUnit = db.units.find((item) => item.id === value);
      setFormData((prev) => ({
        ...prev,
        unitId: value,
        propertyId: selectedUnit?.propertyId || prev.propertyId || '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === 'cost' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.unitId || !formData.description) {
      toast.error('الوحدة والوصف مطلوبان.');
      return;
    }

    const unit = db.units.find((item) => item.id === formData.unitId);
    const propertyId = unit?.propertyId || formData.propertyId || '';
    const issueTitle = (formData.issueTitle || formData.description || '').trim();
    const cost = Number(formData.cost || 0);
    const status = formData.status || 'NEW';
    const chargedTo = formData.chargedTo || defaultChargedTo;

    if (!propertyId) {
      toast.error('يرجى اختيار وحدة مرتبطة بعقار.');
      return;
    }

    if (!issueTitle) {
      toast.error('عنوان المشكلة مطلوب.');
      return;
    }

    const shouldPostFinance =
      ['COMPLETED', 'CLOSED'].includes(status) &&
      cost > 0 &&
      !(record?.expenseId || record?.invoiceId);

    let createdFinance: { type: 'invoice' | 'expense'; id: string } | null = null;

    try {
      if (shouldPostFinance) {
        const activeContract = db.contracts.find((item) => item.unitId === formData.unitId && item.status === 'ACTIVE');

        if (chargedTo === 'TENANT') {
          if (!activeContract) {
            throw new Error('لا يمكن تحميل التكلفة على المستأجر لعدم وجود عقد نشط.');
          }

          const newInvoice = await dataService.add('invoices', {
            contractId: activeContract.id,
            dueDate: new Date().toISOString().slice(0, 10),
            amount: cost,
            paidAmount: 0,
            status: 'UNPAID',
            type: 'MAINTENANCE',
            notes: `فاتورة صيانة: ${issueTitle}`.slice(0, 100),
          });

          createdFinance = { type: 'invoice', id: newInvoice.id };
        } else {
          const newExpense = await dataService.add('expenses', {
            propertyId,
            unitId: formData.unitId,
            contractId: activeContract?.id || null,
            dateTime: new Date().toISOString(),
            category: 'صيانة',
            amount: cost,
            chargedTo,
            status: 'POSTED',
            ref: `صيانة للوحدة ${unit?.name || unit?.unitNumber || ''}`.trim(),
            notes: issueTitle,
          });

          createdFinance = { type: 'expense', id: newExpense.id };
        }
      }

      if (record) {
        if (
          (record.expenseId || record.invoiceId) &&
          (record.status !== status || Number(record.cost || 0) !== cost || record.chargedTo !== chargedTo)
        ) {
          toast.error('لا يمكن تعديل البيانات المالية لطلب مرتبط بحركة مالية. ألغِ المصروف أو الفاتورة أولًا.');
          return;
        }

        const updates: Partial<MaintenanceRecord> = {
          ...formData,
          propertyId,
          issueTitle,
          cost,
          status,
          chargedTo,
          completedAt: ['COMPLETED', 'CLOSED'].includes(status) ? record.completedAt || Date.now() : null,
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
          ...formData,
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

        await dataService.add('maintenanceRecords', baseRecord);
        toast.success('تم إنشاء طلب الصيانة.');
      }

      onClose();
    } catch (error: any) {
      if (createdFinance) {
        try {
          if (createdFinance.type === 'invoice') await dataService.remove('invoices', createdFinance.id);
          if (createdFinance.type === 'expense') await dataService.remove('expenses', createdFinance.id);
        } catch (cleanupError) {
          console.error('تعذر تنظيف الحركة المالية المرتبطة بطلب الصيانة:', cleanupError);
        }
      }

      toast.error(error?.message || 'فشل حفظ طلب الصيانة.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={record ? 'تعديل طلب صيانة' : 'إضافة طلب صيانة'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>الوحدة</label>
            <select className={inputCls} name="unitId" value={formData.unitId || ''} onChange={handleChange} required>
              {db.units.map((unit) => {
                const property = db.properties.find((item) => item.id === unit.propertyId);
                return (
                  <option key={unit.id} value={unit.id}>
                    {displayUnitName(unit)} ({property?.name || 'عقار غير محدد'})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelCls}>تاريخ الطلب</label>
            <input className={inputCls} name="requestDate" type="date" value={formData.requestDate || ''} onChange={handleChange} required />
          </div>
        </div>

        <div>
          <label className={labelCls}>عنوان المشكلة</label>
          <input
            className={inputCls}
            name="issueTitle"
            value={formData.issueTitle || ''}
            onChange={handleChange}
            required
            placeholder="مثال: تسريب في المطبخ"
          />
        </div>

        <div>
          <label className={labelCls}>وصف الطلب</label>
          <textarea
            className={`${inputCls} min-h-[110px]`}
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            required
            rows={3}
            placeholder="اكتب وصفًا واضحًا للمشكلة أو الأعمال المطلوبة"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>الحالة</label>
            <select className={inputCls} name="status" value={formData.status || 'NEW'} onChange={handleChange}>
              <option value="NEW">جديد</option>
              <option value="OPEN">مفتوح</option>
              <option value="IN_PROGRESS">قيد التنفيذ</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="CLOSED">مغلق</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>التكلفة</label>
            <input
              className={inputCls}
              name="cost"
              type="number"
              value={formData.cost ?? ''}
              onChange={handleChange}
              placeholder="0.000"
              min="0"
              step="0.001"
            />
          </div>

          <div>
            <label className={labelCls}>تحميل التكلفة على</label>
            <select className={inputCls} name="chargedTo" value={formData.chargedTo || defaultChargedTo} onChange={handleChange}>
              <option value="OWNER">المالك</option>
              <option value="OFFICE">المكتب</option>
              <option value="TENANT">المستأجر</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className={ghostButtonCls}>
            إلغاء
          </button>
          <button type="submit" className={primaryButtonCls}>
            حفظ
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Maintenance;
