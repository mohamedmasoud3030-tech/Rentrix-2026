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
      toast.error('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ ÙˆØµÙ ÙˆØ§Ø¶Ø­ Ù„Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©.');
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
    <div className="app-page page-enter" dir="rtl">
      <PageHeader title="Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ ÙˆÙ†Ù‚Ø§Ø· Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©" description="Ù…ØªØ§Ø¨Ø¹Ø© Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø­Ø±Ø¬Ø© ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù… ÙˆØ¥Ù†Ø´Ø§Ø¡ Ù†Ù‚Ø§Ø· Ø±Ø¬ÙˆØ¹ Ø¢Ù…Ù†Ø© Ù‚Ø¨Ù„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ù…Ù‡Ù…Ø©.">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/audit/integrity')} className={ghostButton}>
            <Stethoscope size={18} />
            ÙØ­Øµ Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className={primaryButton}>
            <PlusCircle size={18} />
            Ø¥Ù†Ø´Ø§Ø¡ Ù†Ù‚Ø·Ø© Ø§Ø³ØªØ¹Ø§Ø¯Ø©
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<History size={18} />} color="blue" title="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø£Ø­Ø¯Ø§Ø« Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚" value={stats.events.toLocaleString('ar')} />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="emerald" title="Ù†Ù‚Ø§Ø· Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©" value={stats.snapshots.toLocaleString('ar')} />
        <SummaryStatCard icon={<Search size={18} />} color="amber" title="Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† Ø§Ù„Ù†Ø´Ø·ÙˆÙ†" value={stats.users.toLocaleString('ar')} />
        <SummaryStatCard icon={<AlertTriangle size={18} />} color="rose" title="Ø£Ø­Ø¯Ø§Ø« Ø­Ø³Ø§Ø³Ø©" value={stats.destructive.toLocaleString('ar')} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Ù†Ù‚Ø§Ø· Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ù†Ø¸Ø§Ù…</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ø£Ù†Ø´Ø¦ Ù†Ù‚Ø·Ø© Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø«Ù‚ÙŠÙ„Ø© Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ø±Ø¬ÙˆØ¹ Ø§Ù„ÙƒØ§Ù…Ù„ Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©.</p>
          </div>
        </div>

        {db.snapshots.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ù‚Ø§Ø· Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù…Ø­ÙÙˆØ¸Ø©" description="Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ù†Ù‚Ø·Ø© Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¬Ø¯ÙŠØ¯Ø© Ù‚Ø¨Ù„ ØªÙ†ÙÙŠØ° Ø¹Ù…Ù„ÙŠØ§Øª Ø­Ø³Ø§Ø³Ø© Ø£Ùˆ ØªØºÙŠÙŠØ±Ø§Øª ÙƒØ¨ÙŠØ±Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª." />
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
                  Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù†Ù‚Ø·Ø©
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/70">
          <div className="min-w-[240px] flex-1">
            <label className={labelCls}>Ø¨Ø­Ø« Ø¨Ø§Ù„Ù…Ø¹Ø±Ù‘Ù Ø£Ùˆ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label>
            <input className={inputCls} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø£Ùˆ Ù…Ø¹Ø±Ù Ø§Ù„ÙƒÙŠØ§Ù†..." />
          </div>
          <div className="min-w-[180px]">
            <label className={labelCls}>ÙÙ„ØªØ±Ø© Ø¨Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</label>
            <select className={inputCls} value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user === 'all' ? 'ÙƒÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†' : user}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className={labelCls}>ÙÙ„ØªØ±Ø© Ø¨Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</label>
            <select className={inputCls} value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action === 'all' ? 'ÙƒÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : action}
                </option>
              ))}
            </select>
          </div>
          {(searchTerm || selectedUser !== 'all' || selectedAction !== 'all') && (
            <button onClick={resetFilters} className={ghostButton}>
              <XCircle size={16} />
              ØªØµÙÙŠØ© Ø§Ù„ÙÙ„Ø§ØªØ±
            </button>
          )}
        </div>

        {filteredLog.length === 0 ? (
          <EmptyState icon={Search} title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù…Ø·Ø§Ø¨Ù‚Ø©" description="ØºÙŠÙ‘Ø± Ø§Ù„ÙÙ„Ø§ØªØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø£Ùˆ Ø§Ù…Ø³Ø­ Ø§Ù„Ø¨Ø­Ø« Ù„Ø¹Ø±Ø¶ ÙƒÙ„ Ø³Ø¬Ù„Ø§Øª Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚." />
        ) : (
          <TableWrapper>
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr>
                <Th>Ø§Ù„ÙˆÙ‚Øª</Th>
                <Th>Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</Th>
                <Th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</Th>
                <Th>Ø§Ù„ÙƒÙŠØ§Ù†</Th>
                <Th>Ø§Ù„Ù…Ø¹Ø±Ù‘Ù</Th>
                <Th>Ù…Ù„Ø§Ø­Ø¸Ø§Øª</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLog.slice(0, 200).map((log) => (
                <Tr key={log.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(new Date(log.ts).toISOString())}</Td>
                  <Td>{log.username}</Td>
                  <Td className={`font-mono font-bold ${getActionClass(log.action)}`}>{log.action}</Td>
                  <Td>{log.entity}</Td>
                  <Td className="font-mono text-xs" title={log.entityId || ''}>{log.entityId ? `${String(log.entityId).slice(0, 8)}...` : 'â€”'}</Td>
                  <Td className="max-w-[320px] text-sm leading-6 text-slate-600 dark:text-slate-300">{log.note || 'â€”'}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Ø¥Ù†Ø´Ø§Ø¡ Ù†Ù‚Ø·Ø© Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¬Ø¯ÙŠØ¯Ø©" size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ÙˆØµÙ Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©</label>
            <input className={inputCls} value={snapshotNote} onChange={(e) => setSnapshotNote(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: Ù‚Ø¨Ù„ Ø¥Ù‚ÙØ§Ù„ Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ" autoFocus />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button onClick={() => setIsCreateModalOpen(false)} className={ghostButton}>Ø¥Ù„ØºØ§Ø¡</button>
            <button onClick={handleCreateSnapshot} className={primaryButton}>Ø­ÙØ¸ Ø§Ù„Ù†Ù‚Ø·Ø©</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!snapshotToRestore} onClose={() => setSnapshotToRestore(null)} title="ØªØ£ÙƒÙŠØ¯ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù†Ù‚Ø·Ø© Ø³Ø§Ø¨Ù‚Ø©" size="md">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            Ø£Ù†Øª Ø¹Ù„Ù‰ ÙˆØ´Ùƒ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ù†Ø¸Ø§Ù… Ø¥Ù„Ù‰ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„ØªÙŠ ÙƒØ§Ù† Ø¹Ù„ÙŠÙ‡Ø§ Ø¹Ù†Ø¯ Ø§Ù„Ù†Ù‚Ø·Ø©:
            <strong className="mx-1 text-slate-800 dark:text-slate-100">{snapshotToRestore?.note || 'â€”'}</strong>
            Ø¨ØªØ§Ø±ÙŠØ® {snapshotToRestore ? formatDateTime(new Date(snapshotToRestore.ts).toISOString()) : 'â€”'}.
          </p>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button onClick={() => setSnapshotToRestore(null)} className={ghostButton}>Ø¥Ù„ØºØ§Ø¡</button>
            <button onClick={handleRestore} className={dangerButton}>Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù†Ù‚Ø·Ø©</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLog;
