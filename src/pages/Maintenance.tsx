
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

const primaryButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const warningButtonCls = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-600';
const inputCls = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';

const displayUnitName = (unit?: { name?: string | null; unitNumber?: string | null } | null) => unit?.name || unit?.unitNumber || 'Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯Ã˜Â©';
const getChargedToLabel = (value?: string | null) => {
    switch (value) {
        case 'OWNER':
            return 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’';
        case 'TENANT':
            return 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±';
        case 'OFFICE':
            return 'Ã˜Â§Ã™â€žÃ™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨';
        default:
            return 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯';
    }
};

const Maintenance: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [printingRecord, setPrintingRecord] = useState<MaintenanceRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecordId, setSelectedRecordId] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | MaintenanceRecord['status']>('ALL');

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
            toast.error("Ã™â€žÃ˜Â§ Ã™Å Ã™â€¦Ã™Æ’Ã™â€  Ã˜Â­Ã˜Â°Ã™Â Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¡Ã˜Â°Ã˜Â§ Ã™â€žÃ˜Â£Ã™â€ Ã™â€¡ Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â· Ã˜Â¨Ã˜Â­Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â©.");
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
            if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
            const unit = db.units.find(u => u.id === rec.unitId);
            return rec.no.includes(searchTerm) || rec.description.includes(searchTerm) || (unit?.name || '').includes(searchTerm);
        }).map(rec => ({
            ...rec,
            isAging: rec.status === 'NEW' && new Date(rec.requestDate) < threeDaysAgo
        })).sort((a,b) => statusPriority[a.status] - statusPriority[b.status] || new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime());
    }, [db, searchTerm, statusFilter]);

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
        const map: { [key in MaintenanceRecord['status']]: string } = { 'NEW': 'Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯', 'OPEN': 'Ã™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­', 'IN_PROGRESS': 'Ã™â€šÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã™ÂÃ™Å Ã˜Â°', 'COMPLETED': 'Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž', 'CLOSED': 'Ã™â€¦Ã˜ÂºÃ™â€žÃ™â€š', 'CANCELLED': 'Ã™â€¦Ã™â€žÃ˜ÂºÃ™Å ' };
        return map[status] || status;
    }
    
    const activeFilterChips = [
        ...(searchTerm ? [{ key: 'search', label: "\u0628\u062d\u062b: " }] : []),
        ...(statusFilter !== 'ALL' ? [{ key: 'status', label: "\u0627\u0644\u062d\u0627\u0644\u0629: " }] : []),
    ];

    if (!db.settings) return null;

    return (
        <div className="app-page page-enter" dir="rtl">
            <PageHeader title="Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Âª" description="Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¹Ã˜Â·Ã˜Â§Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Ë†Ã™Å Ã™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™Â Ã˜Â£Ã™Ë† Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã™Ë†Ã˜Â±Ã˜Â¨Ã˜Â·Ã™â€¡Ã˜Â§ Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryStatCard label="Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©" value={summaryData.open} icon={<Wrench size={24}/>} color={summaryData.open > 0 ? 'warning' : 'success'}/>
                <SummaryStatCard label="Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â© (> 7 Ã˜Â£Ã™Å Ã˜Â§Ã™â€¦)" value={summaryData.aged} icon={<AlertTriangle size={24}/>} color={summaryData.aged > 0 ? 'danger' : 'success'}/>
                <SummaryStatCard label="Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦" value={summaryData.newToday} icon={<Clock size={24}/>} color="info"/>
                <SummaryStatCard label="Ã˜ÂªÃ™Æ’Ã˜Â§Ã™â€žÃ™Å Ã™Â Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™ÂÃ™Ë†Ã˜ÂªÃ˜Â±Ã˜Â©" value={formatCurrency(summaryData.unbilledCost)} icon={<DollarSign size={24}/>} color={summaryData.unbilledCost > 0 ? 'warning' : 'success'}/>
            </div>
            <Card className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© (Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â© Ã˜Â­Ã˜Â³Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜Â£Ã™Ë†Ã™â€žÃ™Ë†Ã™Å Ã˜Â©)</h2>
                    <button onClick={() => handleOpenModal()} className={primaryButtonCls}>
                        <PlusCircle size={16}/>
                        Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©
                    </button>
                </div>                <SearchFilterBar
                    value={searchTerm}
                    onSearch={setSearchTerm}
                    placeholder={'\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0623\u0648 \u0627\u0644\u0648\u0635\u0641 \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0648\u062d\u062f\u0629...'}
                    rightSlot={
                        <select className={`${inputCls} min-w-[180px]`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | MaintenanceRecord['status'])}>
                            <option value="ALL">{'\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a'}</option>
                            <option value="NEW">{'\u062c\u062f\u064a\u062f'}</option>
                            <option value="OPEN">{'\u0645\u0641\u062a\u0648\u062d'}</option>
                            <option value="IN_PROGRESS">{'\u0642\u064a\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630'}</option>
                            <option value="COMPLETED">{'\u0645\u0643\u062a\u0645\u0644'}</option>
                            <option value="CLOSED">{'\u0645\u063a\u0644\u0642'}</option>
                            <option value="CANCELLED">{'\u0645\u0644\u063a\u064a'}</option>
                        </select>
                    }
                    filterChips={activeFilterChips}
                    onRemoveChip={(key) => {
                        if (key === 'search') setSearchTerm('');
                        if (key === 'status') setStatusFilter('ALL');
                    }}
                    onClearAll={activeFilterChips.length ? () => { setSearchTerm(''); setStatusFilter('ALL'); } : undefined}
                />
                
                {/* Use TableWrapper for consistent styling and responsive design */}
                {recordsWithDetails.length ? (
                  <TableWrapper>
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>#</Th>
                        <Th>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</Th>
                        <Th>Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨</Th>
                        <Th>Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â©</Th>
                        <Th>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</Th>
                        <Th className="text-left">Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡ Ã˜Â³Ã˜Â±Ã™Å Ã˜Â¹</Th>
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
                              <div>{displayUnitName(unit)}</div>
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
                                    className={warningButtonCls}
                                  >
                                    Ã˜Â¨Ã˜Â¯Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€ž
                                  </button>
                                )}
                                {rec.status === 'COMPLETED' && rec.cost > 0 && !rec.expenseId && !rec.invoiceId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenModal(rec);
                                    }}
                                    className={primaryButtonCls}
                                  >
                                    Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™Â/Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©
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
                    <h3 className="mt-4 text-xl font-semibold text-slate-800">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</h3>
                  </div>
                )}
            </Card>

            {selectedRecord && maintenanceWorkspace && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <Card className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯ Ã™Ë†Ã˜Â±Ã˜Â¨Ã˜Â·Ã™â€¡ Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â­Ã™â€¦Ã™â€ž Ã™â€žÃ™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â©.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleOpenModal(selectedRecord)} className={ghostButtonCls}>
                                    Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž
                                </button>
                                <button onClick={() => setPrintingRecord(selectedRecord)} className={primaryButtonCls}>
                                    Ã˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â©
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryStatCard label="Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨" value={selectedRecord.no || 'Ã¢â‚¬â€'} icon={<Wrench size={18}/>} color="slate"/>
                            <SummaryStatCard label="Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â©" value={formatCurrency(selectedRecord.cost)} icon={<DollarSign size={18}/>} color="blue"/>
                            <SummaryStatCard label="Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©" value={getStatusLabel(selectedRecord.status)} icon={<Clock size={18}/>} color={['COMPLETED','CLOSED'].includes(selectedRecord.status) ? 'emerald' : 'amber'}/>
                            <SummaryStatCard label="Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž" value={getChargedToLabel(selectedRecord.chargedTo)} icon={<AlertTriangle size={18}/>} color="rose"/>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å </div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±:</strong> {maintenanceWorkspace.property?.name || 'Ã¢â‚¬â€'}</div>
                                    <div><strong>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©:</strong> {displayUnitName(maintenanceWorkspace.unit)}</div>
                                    <div><strong>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å :</strong> {maintenanceWorkspace.tenant?.name || maintenanceWorkspace.tenant?.fullName || 'Ã¢â‚¬â€'}</div>
                                    <div><strong>Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨:</strong> {formatDate(selectedRecord.requestDate)}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â«Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å </div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    <div><strong>Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™Â Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·:</strong> {maintenanceWorkspace.expense?.no || 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯'}</div>
                                    <div><strong>Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·Ã˜Â©:</strong> {maintenanceWorkspace.invoice?.no || 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯'}</div>
                                    <div><strong>Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â­Ã™â€¦Ã™â€ž:</strong> {getChargedToLabel(selectedRecord.chargedTo)}</div>
                                    <div><strong>Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Â:</strong> {selectedRecord.description || 'Ã¢â‚¬â€'}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-4" dir="rtl">
                        <Card className="p-4 sm:p-5">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</h3>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                    {selectedRecord.isAging ? 'Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨ Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â± Ã™Ë†Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å Ã˜Â©.' : 'Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨ Ã˜Â¶Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â·Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å .'}
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                    {selectedRecord.status === 'COMPLETED' && !selectedRecord.expenseId && !selectedRecord.invoiceId ? 'Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨ Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž Ã™Ë†Ã™â€žÃ™â€¦ Ã™Å Ã™ÂÃ˜Â­Ã™Ë†Ã™â€˜Ã™â€ž Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â¥Ã™â€žÃ™â€° Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â£Ã™Ë† Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™Â.' : 'Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã™â€žÃ™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã˜Â³Ã™â€žÃ™Å Ã™â€¦.'}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 sm:p-5">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™ÂÃ™â€šÃ˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â©</h3>
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
                    title={`Ã˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â© Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© #${printingRecord.no}`}
                    onExportPdf={() => {
                        if (!db.settings || !printingRecord) return;
                        const unit = db.units.find(u => u.id === printingRecord.unitId);
                        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : undefined;
                        exportMaintenanceRecordToPdf(printingRecord, unit, property, db.settings);
                    }}
                >
                    <MaintenancePrintable record={printingRecord} settings={db.settings} />
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
        if (!db.settings || !data.unitId || !data.description) { toast.error("Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Â Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨Ã˜Â§Ã™â€ ."); return; }

        try {
            if (record) {
                if ((record.expenseId || record.invoiceId) && (record.status !== data.status || record.cost !== data.cost || record.chargedTo !== data.chargedTo)) {
                    toast.error("Ã™â€žÃ˜Â§ Ã™Å Ã™â€¦Ã™Æ’Ã™â€  Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨ Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â· Ã˜Â¨Ã˜Â­Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â©. Ã™â€šÃ™â€¦ Ã˜Â¨Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™Â/Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹.");
                    return;
                }
                const isNewlyCompleted = ['COMPLETED', 'CLOSED'].includes(data.status!) && !['COMPLETED', 'CLOSED'].includes(record.status) && data.cost! > 0;
                let updates = { ...data };

                if (isNewlyCompleted) {
                    const activeContract = db.contracts.find(c => c.unitId === data.unitId && c.status === 'ACTIVE');
                    if (data.chargedTo === 'TENANT') {
                        if (!activeContract) { toast.error("Ã™â€žÃ˜Â§ Ã™Å Ã™â€¦Ã™Æ’Ã™â€  Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã™â€žÃ˜Â¹Ã˜Â¯Ã™â€¦ Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯ Ã˜Â¹Ã™â€šÃ˜Â¯ Ã™â€ Ã˜Â´Ã˜Â·."); return; }
                        const newInvoice = await dataService.add('invoices', { contractId: activeContract.id, dueDate: new Date().toISOString().slice(0, 10), amount: data.cost!, paidAmount: 0, status: 'UNPAID', type: 'MAINTENANCE', notes: `Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©: ${data.description}`.slice(0, 100) });
                        if (newInvoice) { updates.invoiceId = newInvoice.id; updates.completedAt = Date.now(); }
                    } else { // OWNER or OFFICE
                        const newExpense = await dataService.add('expenses', { contractId: activeContract?.id || null, dateTime: new Date().toISOString(), category: 'Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©', amount: data.cost!, ref: `Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™â€žÃ™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© ${db.units.find(u => u.id === data.unitId)?.name}`, notes: data.description, chargedTo: data.chargedTo, status: 'POSTED' });
                        if (newExpense) { updates.expenseId = newExpense.id; updates.completedAt = Date.now(); }
                    }
                }
                dataService.update('maintenanceRecords', record.id, updates);
            } else {
                dataService.add('maintenanceRecords', data as any);
            }
            onClose();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Ã™ÂÃ˜Â´Ã™â€ž Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©."); }
    };
    
    const activeFilterChips = [
        ...(searchTerm ? [{ key: 'search', label: "\u0628\u062d\u062b: " }] : []),
        ...(statusFilter !== 'ALL' ? [{ key: 'status', label: "\u0627\u0644\u062d\u0627\u0644\u0629: " }] : []),
    ];

    if (!db.settings) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? "Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©" : "Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©"}>
            <form onSubmit={handleSubmit} className="space-y-5">
                 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</label>
                        <select className={inputCls} name="unitId" value={data.unitId} onChange={handleChange} required>
                            {db.units.map(u => <option key={u.id} value={u.id}>{displayUnitName(u)} ({db.properties.find(p=>p.id === u.propertyId)?.name})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨</label>
                        <input className={inputCls} name="requestDate" type="date" value={data.requestDate} onChange={handleChange} required />
                    </div>
                 </div>
                 <div>
                    <label className={labelCls}>Ã™Ë†Ã˜ÂµÃ™Â Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨</label>
                    <textarea className={`${inputCls} min-h-[110px]`} name="description" value={data.description} onChange={handleChange} required rows={3} placeholder="Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã™Ë†Ã˜ÂµÃ™ÂÃ™â€¹Ã˜Â§ Ã™Ë†Ã˜Â§Ã˜Â¶Ã˜Â­Ã™â€¹Ã˜Â§ Ã™â€žÃ™â€žÃ™â€¦Ã˜Â´Ã™Æ’Ã™â€žÃ˜Â© Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¹Ã™â€¦Ã˜Â§Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨Ã˜Â©" />
                 </div>
                 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</label>
                        <select className={inputCls} name="status" value={data.status} onChange={handleChange}><option value="NEW">Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯</option><option value="IN_PROGRESS">Ã™â€šÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã™ÂÃ™Å Ã˜Â°</option><option value="COMPLETED">Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž</option><option value="CLOSED">Ã™â€¦Ã˜ÂºÃ™â€žÃ™â€š</option></select>
                    </div>
                    <div>
                        <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â©</label>
                        <input className={inputCls} name="cost" type="number" value={data.cost || ''} onChange={handleChange} placeholder="0.000"/>
                    </div>
                    <div>
                        <label className={labelCls}>Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â© Ã˜Â¹Ã™â€žÃ™â€°</label>
                        <select className={inputCls} name="chargedTo" value={data.chargedTo} onChange={handleChange}><option value="OWNER">Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</option><option value="OFFICE">Ã˜Â§Ã™â€žÃ™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨</option><option value="TENANT">Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±</option></select>
                    </div>
                 </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" onClick={onClose} className={ghostButtonCls}>Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡</button><button type="submit" className={primaryButtonCls}>Ã˜Â­Ã™ÂÃ˜Â¸</button></div>
            </form>
        </Modal>
    );
};

export default Maintenance;
