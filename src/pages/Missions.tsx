import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Mission } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { DeleteAction, EditAction } from '../components/shared/ActionsMenu';
import { Calendar, CheckCircle2, Circle, ClipboardList, Clock, PlusCircle, Briefcase, CheckCheck, Ban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import StatusPill from '../components/ui/StatusPill';
import EmptyState from '../components/ui/EmptyState';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { formatDate } from '../utils/helpers';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-xs font-bold text-slate-600';
const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600';
const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

const Missions: React.FC = () => {
  const { db, dataService } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [search, setSearch] = useState('');

  const missions = db.missions || [];
  const leadsMap = useMemo(() => new Map((db.leads || []).map((lead) => [lead.id, lead.name])), [db.leads]);
  const ownersMap = useMemo(() => new Map((db.owners || []).map((owner) => [owner.id, owner.name])), [db.owners]);

  const sortedMissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...missions]
      .filter((mission) => {
        const relatedTo = mission.leadId ? leadsMap.get(mission.leadId) : mission.ownerId ? ownersMap.get(mission.ownerId) : '';
        const haystack = [mission.title, mission.notes, mission.resultSummary, mission.date, mission.time, relatedTo].filter(Boolean).join(' ').toLowerCase();
        return !term || haystack.includes(term);
      })
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [missions, search, leadsMap, ownersMap]);

  const stats = useMemo(() => ({
    total: missions.length,
    planned: missions.filter((mission) => mission.status === 'PLANNED').length,
    completed: missions.filter((mission) => mission.status === 'COMPLETED').length,
    cancelled: missions.filter((mission) => mission.status === 'CANCELLED').length,
  }), [missions]);

  const handleOpenModal = (mission: Mission | null = null) => {
    setEditingMission(mission);
    setIsModalOpen(true);
  };

  const getStatusLabel = (status: Mission['status']) => {
    const map: Record<string, string> = { PLANNED: 'مخطط لها', COMPLETED: 'مكتملة', CANCELLED: 'ملغاة' };
    return map[status || 'PLANNED'] || (status || 'مخطط لها');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="إدارة المهام والزيارات" description="جدولة المعاينات الميدانية والمهام التشغيلية وربطها بالعملاء والملاك.">
        <button onClick={() => handleOpenModal()} className={buttonPrimary}><PlusCircle size={18} /> مهمة جديدة</button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<ClipboardList size={18} />} color="blue" title="إجمالي المهام" value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<Briefcase size={18} />} color="amber" title="مخطط لها" value={stats.planned.toLocaleString('ar')} />
        <SummaryStatCard icon={<CheckCheck size={18} />} color="emerald" title="مكتملة" value={stats.completed.toLocaleString('ar')} />
        <SummaryStatCard icon={<Ban size={18} />} color="slate" title="ملغاة" value={stats.cancelled.toLocaleString('ar')} />
      </div>

      <Card className="p-6">
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-slate-800">سجل المهام المجدولة</h2>
          <p className="mt-1 text-sm text-slate-500">ابحث بالعنوان أو الجهة المرتبطة أو تاريخ الزيارة لمتابعة العمل اليومي للفريق.</p>
        </div>

        <SearchFilterBar value={search} onSearch={setSearch} placeholder="ابحث بعنوان المهمة، الجهة المرتبطة، أو الملاحظات..." />

        {sortedMissions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="لا توجد مهام مطابقة" description="أضف مهمة جديدة أو غيّر عبارة البحث لإظهار النتائج." />
        ) : (
          <TableWrapper>
            <thead className="bg-slate-50">
              <tr>
                <Th>المهمة</Th>
                <Th>الموعد</Th>
                <Th>مرتبطة بـ</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMissions.map((mission) => {
                const relatedTo = mission.leadId ? `عميل: ${leadsMap.get(mission.leadId)}` : mission.ownerId ? `مالك: ${ownersMap.get(mission.ownerId)}` : 'مهمة عامة';
                return (
                  <Tr key={mission.id} className={mission.status === 'COMPLETED' ? 'opacity-70' : ''}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${mission.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : mission.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                          {mission.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{mission.title}</div>
                          {mission.resultSummary && <div className="text-xs text-slate-500 line-clamp-2">{mission.resultSummary}</div>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-bold text-slate-700"><Calendar size={12} /> {formatDate(mission.date)}</div>
                        <div className="flex items-center gap-1"><Clock size={12} /> {mission.time || '—'}</div>
                      </div>
                    </Td>
                    <Td className="text-sm font-medium text-slate-600">{relatedTo}</Td>
                    <Td><StatusPill status={mission.status || 'PLANNED'}>{getStatusLabel(mission.status)}</StatusPill></Td>
                    <Td>
                      <div className="flex justify-end">
                        <ActionsMenu items={[EditAction(() => handleOpenModal(mission)), DeleteAction(() => dataService.remove('missions', mission.id))]} />
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {isModalOpen && <MissionForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mission={editingMission} />}
    </div>
  );
};

const MissionForm: React.FC<{ isOpen: boolean; onClose: () => void; mission: Mission | null }> = ({ isOpen, onClose, mission }) => {
  const { db, dataService } = useApp();
  const [data, setData] = useState<Partial<Mission>>({});

  useEffect(() => {
    if (mission) setData(mission);
    else setData({ title: '', date: new Date().toISOString().slice(0, 10), time: '10:00', status: 'PLANNED', leadId: null, ownerId: null, resultSummary: '' });
  }, [mission, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value === 'null' ? null : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title) {
      toast.error('عنوان المهمة مطلوب.');
      return;
    }
    if (mission) dataService.update('missions', mission.id, data);
    else dataService.add('missions', data as any);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mission ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>عنوان المهمة <span className="text-rose-500">*</span></label>
          <input className={inputCls} name="title" value={data.title || ''} onChange={handleChange} placeholder="مثال: زيارة ميدانية لعقار أو متابعة صيانة" required />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>التاريخ</label>
            <input className={inputCls} type="date" name="date" value={data.date || ''} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelCls}>الوقت</label>
            <input className={inputCls} type="time" name="time" value={data.time || ''} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>ربط بعميل محتمل</label>
            <select className={inputCls} name="leadId" value={data.leadId || 'null'} onChange={handleChange}>
              <option value="null">-- لا يوجد --</option>
              {(db.leads || []).map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>ربط بمالك</label>
            <select className={inputCls} name="ownerId" value={data.ownerId || 'null'} onChange={handleChange}>
              <option value="null">-- لا يوجد --</option>
              {(db.owners || []).map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>الحالة</label>
          <select className={inputCls} name="status" value={data.status || 'PLANNED'} onChange={handleChange}>
            <option value="PLANNED">مخطط لها</option>
            <option value="COMPLETED">مكتملة</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
        </div>
        {data.status === 'COMPLETED' && (
          <div>
            <label className={labelCls}>ملخص النتائج</label>
            <textarea className={`${inputCls} min-h-[96px]`} name="resultSummary" value={data.resultSummary || ''} onChange={handleChange} placeholder="ماذا حدث خلال المهمة؟ وما التوصية التالية؟" />
          </div>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={buttonSecondary}>إلغاء</button>
          <button type="submit" className={buttonPrimary}>حفظ المهمة</button>
        </div>
      </form>
    </Modal>
  );
};

export default Missions;
