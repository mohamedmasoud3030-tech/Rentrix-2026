import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Building2, Edit, ExternalLink, FileText, Mail, Percent, Phone, Plus, Printer, Trash2, Users, Wallet, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Card from '../components/ui/Card';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import Modal from '../components/ui/Modal';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { formatCurrency, formatDate } from '../utils/helpers';

interface OwnerRow {
  id: string;
  name: string;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  national_id?: string | null;
  commission_type?: 'RATE' | 'FIXED' | null;
  commission_value?: number | null;
  notes?: string | null;
}

interface OwnerFormData {
  name: string;
  phone: string;
  email: string;
  national_id: string;
  commission_type: 'RATE' | 'FIXED';
  commission_value: number;
  notes: string;
}

const inputCls = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600';
const ghostButton = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const dangerButton = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-600';

const Owners: React.FC = () => {
  const navigate = useNavigate();
  const { db, ownerBalances, generateOwnerPortalLink } = useApp();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerRow | null>(null);
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerRow | null>(null);
  const [formData, setFormData] = useState<OwnerFormData>({ name: '', phone: '', email: '', national_id: '', commission_type: 'RATE', commission_value: 0, notes: '' });

  useEffect(() => { void fetchOwners(); }, []);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = ((data as OwnerRow[]) || []).map((owner) => ({ ...owner, email: owner.email ?? owner.phone2 ?? null }));
      setOwners(rows);
      setSelectedOwnerId((current) => current || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â¬Ã™â€žÃ˜Â¨ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™Æ’');
    } finally {
      setLoading(false);
    }
  };

  const selectedOwner = useMemo(() => owners.find((owner) => owner.id === selectedOwnerId) || null, [owners, selectedOwnerId]);
  const filteredOwners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return owners;
    return owners.filter((owner) => [owner.name, owner.phone, owner.email, owner.national_id, owner.notes].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [owners, searchTerm]);

  const ownerWorkspace = useMemo(() => {
    if (!selectedOwner) return null;
    const properties = db.properties.filter((property) => property.ownerId === selectedOwner.id);
    const propertyIds = new Set(properties.map((property) => property.id));
    const units = db.units.filter((unit) => propertyIds.has(unit.propertyId));
    const unitIds = new Set(units.map((unit) => unit.id));
    const contracts = db.contracts.filter((contract) => unitIds.has(contract.unitId));
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const receipts = db.receipts.filter((receipt) => contractIds.has(receipt.contractId) && receipt.status === 'POSTED');
    const invoices = db.invoices.filter((invoice) => contractIds.has(invoice.contractId));
    const expenses = db.expenses.filter((expense) => expense.status === 'POSTED' && (propertyIds.has(expense.propertyId || '') || unitIds.has(expense.unitId || '') || contractIds.has(expense.contractId || '')));
    const maintenance = db.maintenanceRecords.filter((record) => propertyIds.has(record.propertyId) || unitIds.has(record.unitId || ''));
    const settlements = db.ownerSettlements.filter((settlement) => settlement.ownerId === selectedOwner.id && settlement.status === 'POSTED');
    const balance = ownerBalances[selectedOwner.id];
    const utilityExpenses = expenses.filter((expense) => ['Ã™Æ’Ã™â€¡Ã˜Â±Ã˜Â¨Ã˜Â§Ã˜Â¡', 'Ã™â€¦Ã™Å Ã˜Â§Ã™â€¡', 'Ã˜Â¥Ã™â€ Ã˜ÂªÃ˜Â±Ã™â€ Ã˜Âª', 'utilities', 'electricity', 'water', 'internet'].some((term) => (expense.category || '').toLowerCase().includes(term.toLowerCase())));
    const overdueInvoices = invoices.filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now());
    const expiringContracts = contracts
      .filter((contract) => contract.status === 'ACTIVE')
      .filter((contract) => {
        const end = new Date(contract.end).getTime();
        return end >= Date.now() && end - Date.now() <= 30 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 5);
    return { properties, units, contracts, receipts, invoices, expenses, maintenance, settlements, balance, utilityExpenses, overdueInvoices, expiringContracts };
  }, [db, ownerBalances, selectedOwner]);

  const stats = useMemo(() => ({
    total: owners.length,
    withPhone: owners.filter((owner) => owner.phone).length,
    fixedContracts: owners.filter((owner) => owner.commission_type === 'FIXED').length,
    rateContracts: owners.filter((owner) => owner.commission_type !== 'FIXED').length,
  }), [owners]);

  const agreementLabel = (owner: OwnerRow) => owner.commission_type === 'FIXED' ? `Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â«Ã™â€¦Ã˜Â§Ã˜Â± Ã˜Â«Ã˜Â§Ã˜Â¨Ã˜Âª Ã¢â‚¬Â¢ ${formatCurrency(owner.commission_value || 0)}` : `Ã™â€ Ã˜Â³Ã˜Â¨Ã˜Â© Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã¢â‚¬Â¢ ${Number(owner.commission_value || 0).toFixed(1)}%`;

  const handleOpenModal = (owner?: OwnerRow) => {
    if (owner) {
      setEditingOwner(owner);
      setFormData({ name: owner.name, phone: owner.phone || '', email: owner.email || '', national_id: owner.national_id || '', commission_type: owner.commission_type || 'RATE', commission_value: Number(owner.commission_value || 0), notes: owner.notes || '' });
    } else {
      setEditingOwner(null);
      setFormData({ name: '', phone: '', email: '', national_id: '', commission_type: 'RATE', commission_value: 0, notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = { id: editingOwner?.id || crypto.randomUUID(), name: formData.name, phone: formData.phone || null, phone2: formData.email || null, national_id: formData.national_id || null, commission_type: formData.commission_type, commission_value: formData.commission_value, notes: formData.notes || null, created_at: Date.now(), updated_at: Date.now() };
      if (editingOwner) {
        const updatePayload = { ...payload } as any;
        delete updatePayload.id;
        delete updatePayload.created_at;
        const { error } = await supabase.from('owners').update(updatePayload).eq('id', editingOwner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('owners').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      await fetchOwners();
      toast.success(editingOwner ? 'Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’' : 'Ã˜ÂªÃ™â€¦ Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’');
    } catch (error: any) {
      toast.error(error.message || 'Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª');
    }
  };

  const handleDelete = async () => {
    if (!ownerToDelete) return;
    try {
      const { error } = await supabase.from('owners').delete().eq('id', ownerToDelete.id);
      if (error) throw error;
      setOwnerToDelete(null);
      await fetchOwners();
      toast.success('Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’');
    } catch (error: any) {
      toast.error(error.message || 'Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â°Ã™Â');
    }
  };

  return (
    <div className="app-page page-enter" dir="rtl">
      <PageHeader title="Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™Æ’" description="Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’ Ã˜ÂªÃ˜Â´Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™ÂÃ˜Å’ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜ÂªÃ˜Å’ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â©Ã˜Å’ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©Ã˜Å’ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ™â€ Ã˜Â¯Ã˜Â§Ã˜ÂªÃ˜Å’ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â© Ã™â€¦Ã™â€  Ã˜Â´Ã˜Â§Ã˜Â´Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â©.">
        <button onClick={() => handleOpenModal()} className={primaryButton}><Plus size={18} /> Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€¦Ã˜Â§Ã™â€žÃ™Æ’</button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™Æ’" value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<Phone size={18} />} color="emerald" title="Ã™â€¦Ã™â€žÃ™ÂÃ˜Â§Ã˜Âª Ã˜Â¨Ã™â€¡Ã˜Â§ Ã™â€¡Ã˜Â§Ã˜ÂªÃ™Â" value={stats.withPhone.toLocaleString('ar')} />
        <SummaryStatCard icon={<Wallet size={18} />} color="amber" title="Ã˜Â§Ã˜ÂªÃ™ÂÃ˜Â§Ã™â€š Ã˜Â«Ã˜Â§Ã˜Â¨Ã˜Âª" value={stats.fixedContracts.toLocaleString('ar')} />
        <SummaryStatCard icon={<Percent size={18} />} color="rose" title="Ã˜Â§Ã˜ÂªÃ™ÂÃ˜Â§Ã™â€š Ã™â€ Ã˜Â³Ã˜Â¨Ã˜Â©" value={stats.rateContracts.toLocaleString('ar')} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â¯Ã™â€žÃ™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™Æ’</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â£Ã™Å  Ã™â€¦Ã˜Â§Ã™â€žÃ™Æ’ Ã™â€žÃ˜Â¹Ã˜Â±Ã˜Â¶ Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜ÂµÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜ÂµÃ˜Â© Ã˜Â¨Ã™â€¡ Ã˜Â£Ã˜Â³Ã™ÂÃ™â€ž Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¯Ã™Ë†Ã™â€ž.</p>
          </div>
        </div>
        <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="Ã˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã™â€¦ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª..." />
        {loading ? <LoadingSpinner label="Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™Æ’..." /> : filteredOwners.length === 0 ? <EmptyState icon={Building2} title="Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬" description="Ã˜Â¬Ã˜Â±Ã™â€˜Ã˜Â¨ Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â­Ã˜Â« Ã˜Â£Ã™Ë† Ã˜Â£Ã˜Â¶Ã™Â Ã™â€¦Ã˜Â§Ã™â€žÃ™Æ’Ã™â€¹Ã˜Â§ Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã™â€¹Ã˜Â§." /> : (
          <TableWrapper>
            <thead className="bg-slate-50 dark:bg-slate-800/70"><tr><Th>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</Th><Th>Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â§Ã˜ÂµÃ™â€ž</Th><Th>Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ™ÂÃ˜Â§Ã™â€š</Th><Th>Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª</Th><Th>Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª</Th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOwners.map((owner) => (
                <Tr key={owner.id} className={`cursor-pointer ${selectedOwnerId === owner.id ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`} onClick={() => setSelectedOwnerId(owner.id)}>
                  <Td><div className="font-bold text-slate-800 dark:text-slate-100">{owner.name}</div><div className="text-xs text-slate-500">{owner.national_id || 'Ã™â€¡Ã™Ë†Ã™Å Ã˜Â© Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â³Ã˜Â¬Ã™â€žÃ˜Â©'}</div></Td>
                  <Td><div className="space-y-1 text-xs text-slate-500"><div className="flex items-center gap-1"><Phone size={12} /> {owner.phone || 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¡Ã˜Â§Ã˜ÂªÃ™Â'}</div><div className="flex items-center gap-1"><Mail size={12} /> {owner.email || 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯'}</div></div></Td>
                  <Td><div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{agreementLabel(owner)}</div></Td>
                  <Td className="max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300">{owner.notes || 'Ã¢â‚¬â€'}</Td>
                  <Td><div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/owner-ledger?ownerId=${owner.id}`); }} className="inline-flex rounded-xl bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"><Wallet size={16} /></button>
                    <button type="button" onClick={async (e) => { e.stopPropagation(); const link = await generateOwnerPortalLink(owner.id); await navigator.clipboard.writeText(link); window.open(link, '_blank', 'noopener,noreferrer'); }} className="inline-flex rounded-xl bg-violet-50 p-2 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300"><ExternalLink size={16} /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenModal(owner); }} className="inline-flex rounded-xl bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"><Edit size={16} /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setOwnerToDelete(owner); }} className="inline-flex rounded-xl bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"><Trash2 size={16} /></button>
                  </div></Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {selectedOwner && ownerWorkspace && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â±Ã™Å Ã™ÂÃ™Å Ã˜Å’ Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·Ã˜Â©Ã˜Å’ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â§Ã˜ÂªÃ˜Å’ Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate(`/owner-ledger?ownerId=${selectedOwner.id}`)} className={ghostButton}><Printer size={15} /> Ã˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ </button>
                <button type="button" onClick={() => navigate('/reports?tab=owners')} className={ghostButton}>Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™Æ’</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<Building2 size={18} />} color="blue" title="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª" value={ownerWorkspace.properties.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Users size={18} />} color="slate" title="Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª" value={ownerWorkspace.units.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<FileText size={18} />} color="amber" title="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯" value={ownerWorkspace.contracts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Wallet size={18} />} color="emerald" title="Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂµÃ™Å Ã˜Â¯" value={formatCurrency(ownerWorkspace.balance?.net || 0)} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â±Ã™Å Ã™ÂÃ™Å </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã™â€¦:</strong> {selectedOwner.name}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â:</strong> {selectedOwner.phone || 'Ã¢â‚¬â€'}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯:</strong> {selectedOwner.email || 'Ã¢â‚¬â€'}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ™ÂÃ˜Â§Ã™â€š:</strong> {agreementLabel(selectedOwner)}</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â©</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€žÃ˜Â§Ã˜Âª:</strong> {formatCurrency(ownerWorkspace.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™ÂÃ˜Â§Ã˜Âª:</strong> {formatCurrency(ownerWorkspace.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â³Ã™Ë†Ã™Å Ã˜Â§Ã˜Âª:</strong> {formatCurrency(ownerWorkspace.settlements.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div>
                  <div><strong>Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©:</strong> {ownerWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">Ã˜Â³Ã˜Â¬Ã™â€žÃ˜Â§Ã˜Âª Ã˜ÂªÃ˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©</div>
                <div className="space-y-2">
                  {ownerWorkspace.overdueInvoices.slice(0, 4).map((invoice) => (
                    <button
                      type="button"
                      key={invoice.id}
                      onClick={() => navigate('/invoices')}
                      className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-right text-sm dark:bg-slate-900/70"
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-800 dark:text-slate-100">{invoice.no || 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©'}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{formatDate(invoice.dueDate)}</span>
                      </span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-300">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0))}</span>
                    </button>
                  ))}
                  {!ownerWorkspace.overdueInvoices.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’.</div>}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">Ã˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã˜ÂªÃ™â€šÃ˜ÂªÃ˜Â±Ã˜Â¨ Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ™â€¡Ã˜Â§Ã˜Â¡</div>
                <div className="space-y-2">
                  {ownerWorkspace.expiringContracts.map((contract) => (
                    <button
                      type="button"
                      key={contract.id}
                      onClick={() => navigate('/contracts')}
                      className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-right text-sm dark:bg-slate-900/70"
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-800 dark:text-slate-100">{formatDate(contract.end)}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{db.tenants.find((tenant) => tenant.id === contract.tenantId)?.name || db.tenants.find((tenant) => tenant.id === contract.tenantId)?.fullName || 'Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯'}</span>
                      </span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-300">{formatCurrency(contract.rent || 0)}</span>
                    </button>
                  ))}
                  {!ownerWorkspace.expiringContracts.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â¨Ã˜Âª Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ™â€¡Ã˜Â§Ã˜Â¡ Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž 30 Ã™Å Ã™Ë†Ã™â€¦Ã™â€¹Ã˜Â§.</div>}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
                <div>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</div>
                <div>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª</div>
                <div>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯</div>
                <div>Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {ownerWorkspace.properties.map((property) => {
                  const propertyUnits = ownerWorkspace.units.filter((unit) => unit.propertyId === property.id);
                  const propertyContracts = ownerWorkspace.contracts.filter((contract) => propertyUnits.some((unit) => unit.id === contract.unitId));
                  return (
                    <div key={property.id} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-4 px-4 py-3 text-sm">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{property.name}</div>
                      <div className="text-slate-600 dark:text-slate-300">{propertyUnits.length.toLocaleString('ar')}</div>
                      <div className="text-slate-600 dark:text-slate-300">{propertyContracts.length.toLocaleString('ar')}</div>
                      <div><button type="button" onClick={() => navigate('/properties')} className="font-bold text-blue-600 dark:text-blue-300">Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€ž</button></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â©: {ownerWorkspace.invoices.filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now()).length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Å  Ã˜ÂªÃ™â€ Ã˜ÂªÃ™â€¡Ã™Å  Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž 30 Ã™Å Ã™Ë†Ã™â€¦Ã™â€¹Ã˜Â§: {ownerWorkspace.contracts.filter((contract) => contract.status === 'ACTIVE' && new Date(contract.end).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && new Date(contract.end).getTime() >= Date.now()).length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©: {ownerWorkspace.maintenance.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status)).length.toLocaleString('ar')}
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â«Ã˜Â§Ã˜Â¦Ã™â€š</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                  <div className="font-bold text-slate-700 dark:text-slate-200">Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™ÂÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª</span>
                      <strong>{formatCurrency(ownerWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â©</span>
                      <strong>{ownerWorkspace.overdueInvoices.length.toLocaleString('ar')}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â­Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â©</span>
                      <strong>{ownerWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <div className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</div>
                  <div className="space-y-2">
                    {ownerWorkspace.maintenance.slice(0, 4).map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70">
                        <span>{record.description || record.issueTitle || 'Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-300">{record.status}</span>
                      </div>
                    ))}
                    {!ownerWorkspace.maintenance.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·Ã˜Â© Ã˜Â¨Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’.</div>}
                  </div>
                </div>
                <AttachmentsManager entityType="owner" entityId={selectedOwner.id} />
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingOwner ? 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€¦Ã˜Â§Ã™â€žÃ™Æ’ Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯'} size="lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label className={labelCls}>Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</label><input className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
          <div><label className={labelCls}>Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â</label><input className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
          <div><label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å </label><input className={inputCls} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
          <div><label className={labelCls}>Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ™â€¡Ã™Ë†Ã™Å Ã˜Â© / Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€ž</label><input className={inputCls} value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} /></div>
          <div><label className={labelCls}>Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ™ÂÃ˜Â§Ã™â€š</label><select className={inputCls} value={formData.commission_type} onChange={(e) => setFormData({ ...formData, commission_type: e.target.value as 'RATE' | 'FIXED' })}><option value="RATE">Ã™â€ Ã˜Â³Ã˜Â¨Ã˜Â© Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â©</option><option value="FIXED">Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â«Ã™â€¦Ã˜Â§Ã˜Â± Ã˜Â«Ã˜Â§Ã˜Â¨Ã˜Âª</option></select></div>
          <div><label className={labelCls}>Ã˜Â§Ã™â€žÃ™â€šÃ™Å Ã™â€¦Ã˜Â©</label><input className={inputCls} type="number" step="0.1" value={formData.commission_value} onChange={(e) => setFormData({ ...formData, commission_value: Number(e.target.value) })} /></div>
          <div className="md:col-span-2"><label className={labelCls}>Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª</label><textarea className={`${inputCls} min-h-[110px]`} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" onClick={() => setIsModalOpen(false)} className={ghostButton}>Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡</button><button type="submit" className={primaryButton}>{editingOwner ? 'Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€žÃ˜Â§Ã˜Âª' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!ownerToDelete} onClose={() => setOwnerToDelete(null)} title="Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Ã˜Â³Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’ <strong>{ownerToDelete?.name || 'Ã¢â‚¬â€'}</strong> Ã™â€ Ã™â€¡Ã˜Â§Ã˜Â¦Ã™Å Ã™â€¹Ã˜Â§ Ã™â€¦Ã™â€  Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª.</p>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><button onClick={() => setOwnerToDelete(null)} className={ghostButton}>Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡</button><button onClick={handleDelete} className={dangerButton}>Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</button></div>
        </div>
      </Modal>
    </div>
  );
};

export default Owners;
