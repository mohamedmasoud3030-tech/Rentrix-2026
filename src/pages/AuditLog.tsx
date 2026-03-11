import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, History, PlusCircle, RotateCcw, Search, ShieldCheck, Stethoscope, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import type { Snapshot } from '../types';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import { formatDateTime } from '../utils/helpers';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900';
const labelCls = 'mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600';
const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600';

const getActionClass = (action: string) => {
  if (action.includes('CREATE') || action.includes('LOGIN')) return 'text-emerald-600 dark:text-emerald-300';
  if (action.includes('UPDATE') || action.includes('SNAPSHOT')) return 'text-blue-600 dark:text-blue-300';
  if (action.includes('DELETE') || action.includes('VOID') || action.includes('WIPE')) return 'text-rose-600 dark:text-rose-300';
  if (action.includes('LOCK') || action.includes('READ_ONLY')) return 'text-amber-600 dark:text-amber-300';
  return 'text-slate-500 dark:text-slate-400';
};

const AuditLog: React.FC = () => {
  const { db, createSnapshot, restoreBackup } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [snapshotNote, setSnapshotNote] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<Snapshot | null>(null);

  const uniqueUsers = useMemo(() => ['all', ...Array.from(new Set(db.auditLog.map((log) => log.username)))], [db.auditLog]);
  const uniqueActions = useMemo(() => ['all', ...Array.from(new Set(db.auditLog.map((log) => log.action)))], [db.auditLog]);

  const filteredLog = useMemo(() => {
    return db.auditLog
      .filter((log) => {
        const matchesSearch =
          searchTerm === '' ||
          (log.entityId && log.entityId.includes(searchTerm)) ||
          (log.note || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = selectedUser === 'all' || log.username === selectedUser;
        const matchesAction = selectedAction === 'all' || log.action === selectedAction;
        return matchesSearch && matchesUser && matchesAction;
      })
      .sort((a, b) => b.ts - a.ts);
  }, [db.auditLog, searchTerm, selectedUser, selectedAction]);

  const stats = useMemo(
    () => ({
      snapshots: db.snapshots.length,
      events: db.auditLog.length,
      users: uniqueUsers.filter((user) => user !== 'all').length,
      destructive: db.auditLog.filter((log) => /DELETE|VOID|WIPE/.test(log.action)).length,
    }),
    [db.auditLog, db.snapshots.length, uniqueUsers]
  );

  const handleCreateSnapshot = async () => {
    if (!snapshotNote.trim()) {
      toast.error('يرجى إدخال وصف واضح لنقطة الاستعادة.');
      return;
    }
    await createSnapshot(snapshotNote.trim());
    setSnapshotNote('');
    setIsCreateModalOpen(false);
  };

  const handleRestore = async () => {
    if (!snapshotToRestore) return;
    await restoreBackup(JSON.stringify(snapshotToRestore.data));
    setSnapshotToRestore(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedUser('all');
    setSelectedAction('all');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="سجل التدقيق ونقاط الاستعادة" description="متابعة جميع العمليات الحرجة في النظام وإنشاء نقاط رجوع آمنة قبل التعديلات المهمة.">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/audit/integrity')} className={ghostButton}>
            <Stethoscope size={18} />
            فحص سلامة البيانات
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className={primaryButton}>
            <PlusCircle size={18} />
            إنشاء نقطة استعادة
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<History size={18} />} color="blue" title="إجمالي أحداث التدقيق" value={stats.events.toLocaleString('ar')} />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="emerald" title="نقاط الاستعادة" value={stats.snapshots.toLocaleString('ar')} />
        <SummaryStatCard icon={<Search size={18} />} color="amber" title="المستخدمون النشطون" value={stats.users.toLocaleString('ar')} />
        <SummaryStatCard icon={<AlertTriangle size={18} />} color="rose" title="أحداث حساسة" value={stats.destructive.toLocaleString('ar')} />
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">نقاط استعادة النظام</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أنشئ نقطة استعادة قبل العمليات الثقيلة لتتمكن من الرجوع الكامل عند الحاجة.</p>
          </div>
        </div>

        {db.snapshots.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="لا توجد نقاط استعادة محفوظة" description="ابدأ بإنشاء نقطة استعادة جديدة قبل تنفيذ عمليات حساسة أو تغييرات كبيرة على البيانات." />
        ) : (
          <div className="space-y-3">
            {db.snapshots.map((snapshot) => (
              <div key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{snapshot.note}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(new Date(snapshot.ts).toISOString())}</div>
                </div>
                <button onClick={() => setSnapshotToRestore(snapshot)} className={dangerButton}>
                  <RotateCcw size={16} />
                  استعادة هذه النقطة
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/70">
          <div className="min-w-[240px] flex-1">
            <label className={labelCls}>بحث بالمعرّف أو الملاحظات</label>
            <input className={inputCls} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ابحث في الملاحظات أو معرف الكيان..." />
          </div>
          <div className="min-w-[180px]">
            <label className={labelCls}>فلترة بالمستخدم</label>
            <select className={inputCls} value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user === 'all' ? 'كل المستخدمين' : user}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className={labelCls}>فلترة بالإجراء</label>
            <select className={inputCls} value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action === 'all' ? 'كل الإجراءات' : action}
                </option>
              ))}
            </select>
          </div>
          {(searchTerm || selectedUser !== 'all' || selectedAction !== 'all') && (
            <button onClick={resetFilters} className={ghostButton}>
              <XCircle size={16} />
              تصفية الفلاتر
            </button>
          )}
        </div>

        {filteredLog.length === 0 ? (
          <EmptyState icon={Search} title="لا توجد نتائج مطابقة" description="غيّر الفلاتر الحالية أو امسح البحث لعرض كل سجلات التدقيق." />
        ) : (
          <TableWrapper>
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr>
                <Th>الوقت</Th>
                <Th>المستخدم</Th>
                <Th>الإجراء</Th>
                <Th>الكيان</Th>
                <Th>المعرّف</Th>
                <Th>ملاحظات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLog.slice(0, 200).map((log) => (
                <Tr key={log.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(new Date(log.ts).toISOString())}</Td>
                  <Td>{log.username}</Td>
                  <Td className={`font-mono font-bold ${getActionClass(log.action)}`}>{log.action}</Td>
                  <Td>{log.entity}</Td>
                  <Td className="font-mono text-xs" title={log.entityId || ''}>{log.entityId ? `${String(log.entityId).slice(0, 8)}...` : '—'}</Td>
                  <Td className="max-w-[320px] text-sm leading-6 text-slate-600 dark:text-slate-300">{log.note || '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="إنشاء نقطة استعادة جديدة" size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>وصف نقطة الاستعادة</label>
            <input className={inputCls} value={snapshotNote} onChange={(e) => setSnapshotNote(e.target.value)} placeholder="مثال: قبل إقفال الشهر المالي" autoFocus />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button onClick={() => setIsCreateModalOpen(false)} className={ghostButton}>إلغاء</button>
            <button onClick={handleCreateSnapshot} className={primaryButton}>حفظ النقطة</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!snapshotToRestore} onClose={() => setSnapshotToRestore(null)} title="تأكيد استعادة نقطة سابقة" size="md">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            أنت على وشك استعادة النظام إلى الحالة التي كان عليها عند النقطة:
            <strong className="mx-1 text-slate-800 dark:text-slate-100">{snapshotToRestore?.note || '—'}</strong>
            بتاريخ {snapshotToRestore ? formatDateTime(new Date(snapshotToRestore.ts).toISOString()) : '—'}.
          </p>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button onClick={() => setSnapshotToRestore(null)} className={ghostButton}>إلغاء</button>
            <button onClick={handleRestore} className={dangerButton}>استعادة هذه النقطة</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLog;
