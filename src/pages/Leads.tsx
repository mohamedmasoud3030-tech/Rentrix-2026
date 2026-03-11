import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Lead } from '../types';
import Card from '../components/ui/Card';
import ActionsMenu, { DeleteAction, EditAction } from '../components/shared/ActionsMenu';
import { UserPlus, MessageCircle, Phone, Mail, UserCheck, Filter, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { toast } from 'react-hot-toast';
import LeadForm from '../components/forms/LeadForm';
import StatusPill from '../components/ui/StatusPill';
import PageHeader from '../components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Modal from '../components/ui/Modal';

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600';
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

const Leads: React.FC = () => {
  const { db, dataService } = useApp();
  const navigate = useNavigate();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);

  const leads = db.leads || [];

  const stats = useMemo(() => ({
    total: leads.length,
    open: leads.filter((lead) => lead.status !== 'CLOSED').length,
    interested: leads.filter((lead) => lead.status === 'INTERESTED').length,
    converted: leads.filter((lead) => lead.status === 'CLOSED').length,
  }), [leads]);

  const statusOptions = useMemo(() => ['all', ...Array.from(new Set(leads.map((lead) => lead.status || 'NEW')))], [leads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === 'all' || (lead.status || 'NEW') === statusFilter;
      const haystack = [lead.name, lead.phone, lead.email, lead.notes, lead.source, lead.no, lead.desiredUnitType].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [leads, search, statusFilter]);

  const handleConvertToTenant = async () => {
    if (!leadToConvert) return;
    const lead = leadToConvert;
    const newTenant = await dataService.add('tenants', {
      name: lead.name,
      fullName: lead.name,
      phone: lead.phone,
      idNo: '',
      nationalId: '',
      email: lead.email || null,
      status: 'ACTIVE',
      notes: `تم التحويل من عميل محتمل. الملاحظات السابقة: ${lead.notes || '—'}`,
    });

    if (newTenant) {
      await dataService.update('leads', lead.id, { status: 'CLOSED' });
      toast.success('تم إنشاء ملف المستأجر بنجاح. جاري تحويلك إلى إنشاء العقد...');
      setLeadToConvert(null);
      navigate(`/contracts?action=add&tenantId=${newTenant.id}`);
    }
  };

  const getStatusLabel = (status: Lead['status']) => {
    const map: Record<string, string> = {
      NEW: 'جديد',
      CONTACTED: 'تم التواصل',
      INTERESTED: 'مهتم',
      NOT_INTERESTED: 'غير مهتم',
      CLOSED: 'تم التحويل / مغلق',
    };
    return map[status || 'NEW'] || (status || 'جديد');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="العملاء المحتملون والفرص" description="متابعة دورة المبيعات من أول تواصل وحتى التحويل إلى مستأجر أو عقد جديد.">
        <button onClick={() => { setEditingLead(null); setIsFormModalOpen(true); }} className={primaryButton}>
          <UserPlus size={18} /> إضافة فرصة جديدة
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="إجمالي الفرص" value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<Sparkles size={18} />} color="amber" title="فرص نشطة" value={stats.open.toLocaleString('ar')} />
        <SummaryStatCard icon={<MessageCircle size={18} />} color="emerald" title="مهتمون حاليًا" value={stats.interested.toLocaleString('ar')} />
        <SummaryStatCard icon={<CheckCircle2 size={18} />} color="slate" title="تم تحويلهم" value={stats.converted.toLocaleString('ar')} />
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">لوحة متابعة العملاء المحتملين</h2>
            <p className="mt-1 text-sm text-slate-500">فلترة وبحث سريع مع تحويل مباشر إلى ملف مستأجر عند جاهزية الإغلاق.</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'كل الحالات' : getStatusLabel(option)}</option>
              ))}
            </select>
          </div>
        </div>

        <SearchFilterBar value={search} onSearch={setSearch} placeholder="ابحث بالاسم، الهاتف، الحالة، المصدر، أو الملاحظات..." />

        {filteredLeads.length === 0 ? (
          <EmptyState icon={Users} title="لا توجد نتائج مطابقة" description="جرّب تغيير الفلاتر أو أضف فرصة جديدة إلى خط المبيعات." />
        ) : (
          <TableWrapper>
            <thead className="bg-slate-50">
              <tr>
                <Th>الاسم</Th>
                <Th>التواصل</Th>
                <Th>الاهتمام / المصدر</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <Tr key={lead.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Users size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{lead.name}</div>
                        <div className="text-xs text-slate-500">#{lead.no || '—'}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1"><Phone size={12} /> {lead.phone || 'لا يوجد هاتف'}</div>
                      {lead.email && <div className="flex items-center gap-1"><Mail size={12} /> {lead.email}</div>}
                    </div>
                  </Td>
                  <Td>
                    <div className="space-y-1">
                      <div className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{lead.desiredUnitType || 'اهتمام غير محدد'}</div>
                      <div className="text-xs text-slate-500">المصدر: {lead.source || 'غير محدد'}</div>
                    </div>
                  </Td>
                  <Td><StatusPill status={lead.status || 'NEW'}>{getStatusLabel(lead.status)}</StatusPill></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      {lead.status !== 'CLOSED' && (
                        <button onClick={() => setLeadToConvert(lead)} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100">
                          <UserCheck size={12} /> تحويل إلى مستأجر
                        </button>
                      )}
                      <ActionsMenu
                        items={[
                          EditAction(() => { setEditingLead(lead); setIsFormModalOpen(true); }),
                          { label: 'مراسلة واتساب', icon: <MessageCircle size={16} />, onClick: () => setWhatsAppContext({ recipient: lead, type: 'lead', data: { lead } }) },
                          DeleteAction(() => dataService.remove('leads', lead.id)),
                        ]}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {isFormModalOpen && <LeadForm isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} lead={editingLead} />}
      {whatsAppContext && <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />}
      <Modal isOpen={!!leadToConvert} onClose={() => setLeadToConvert(null)} title="تأكيد تحويل الفرصة إلى مستأجر">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">سيتم إنشاء ملف مستأجر جديد باسم <strong>{leadToConvert?.name || '—'}</strong> ثم تحويلك مباشرة إلى شاشة إنشاء العقد.</p>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setLeadToConvert(null)} className={secondaryButton}>إلغاء</button>
            <button type="button" onClick={handleConvertToTenant} className={primaryButton}>تأكيد التحويل</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Leads;
