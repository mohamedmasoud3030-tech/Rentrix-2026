import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Tenant } from '../types';
import { AlertTriangle, Edit, FileText, Mail, Phone, Plus, Printer, Receipt, ShieldCheck, Trash2, User, Users, Wallet, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Card from '../components/ui/Card';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { formatCurrency, formatDate } from '../utils/helpers';

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelCls = 'mb-2 block text-xs font-extrabold tracking-wide text-slate-500 dark:text-slate-300';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-sky-700 hover:shadow-md';
const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-900';
const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-rose-600 hover:shadow-md';

const statusLabelMap: Record<string, string> = {
  ACTIVE: 'Ã™â€ Ã˜Â´Ã˜Â·',
  INACTIVE: 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€ Ã˜Â´Ã˜Â·',
  BLACKLISTED: 'Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â³Ã™Ë†Ã˜Â¯Ã˜Â§Ã˜Â¡',
  BLACKLIST: 'Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â³Ã™Ë†Ã˜Â¯Ã˜Â§Ã˜Â¡',
};

const normalizeTenants = (rows: any[]): Tenant[] =>
  (rows || []).map((tenant) => ({
    ...tenant,
    name: tenant.name || tenant.full_name || '',
    fullName: tenant.fullName || tenant.full_name || tenant.name || '',
    national_id: tenant.national_id || tenant.nationalId || null,
    nationalId: tenant.nationalId || tenant.national_id || null,
    status: tenant.status || 'ACTIVE',
  }));

const Tenants: React.FC = () => {
  const navigate = useNavigate();
  const { db, refreshData, contractBalances, tenantBalances } = useApp();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED',
    notes: '',
  });

  useEffect(() => {
    void fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = normalizeTenants((data as Tenant[]) || []);
      setTenants(rows);
      setSelectedTenantId((current) => current || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â¬Ã™â€žÃ˜Â¨ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã™â€ ');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      blacklisted: tenants.filter((tenant) => tenant.status === 'BLACKLISTED').length,
      withEmail: tenants.filter((tenant) => tenant.email).length,
    }),
    [tenants]
  );

  const filteredTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.phone, tenant.email, tenant.national_id, tenant.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [tenants, searchTerm]);

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === selectedTenantId) || null, [selectedTenantId, tenants]);

  const tenantWorkspace = useMemo(() => {
    if (!selectedTenant) return null;
    const contracts = db.contracts.filter((contract) => contract.tenantId === selectedTenant.id);
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const units = contracts
      .map((contract) => db.units.find((unit) => unit.id === contract.unitId))
      .filter(Boolean);
    const properties = units
      .map((unit) => db.properties.find((property) => property?.id === unit?.propertyId))
      .filter(Boolean);
    const invoices = db.invoices.filter((invoice) => contractIds.has(invoice.contractId));
    const receipts = db.receipts.filter((receipt) => contractIds.has(receipt.contractId));
    const maintenance = db.maintenanceRecords.filter((record) => units.some((unit) => unit?.id === record.unitId));
    const overdueInvoices = invoices.filter(
      (invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now(),
    );
    const utilityExpenses = db.expenses.filter(
      (expense) =>
        (contractIds.has(expense.contractId || '') || units.some((unit) => unit?.id === expense.unitId)) &&
        ['Ã™Æ’Ã™â€¡Ã˜Â±Ã˜Â¨Ã˜Â§Ã˜Â¡', 'Ã™â€¦Ã™Å Ã˜Â§Ã™â€¡', 'Ã˜Â¥Ã™â€ Ã˜ÂªÃ˜Â±Ã™â€ Ã˜Âª', 'utilities', 'electricity', 'water', 'internet'].some((term) => (expense.category || '').toLowerCase().includes(term.toLowerCase())),
    );

    return {
      contracts,
      units,
      properties,
      invoices,
      receipts,
      maintenance,
      overdueInvoices,
      utilityExpenses,
      balance: tenantBalances[selectedTenant.id]?.balance || contracts.reduce((sum, contract) => sum + Number(contractBalances[contract.id]?.balance || 0), 0),
    };
  }, [contractBalances, db.contracts, db.expenses, db.invoices, db.maintenanceRecords, db.properties, db.receipts, db.units, selectedTenant, tenantBalances]);

  const handleOpenModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        phone: tenant.phone || '',
        email: tenant.email || '',
        national_id: tenant.national_id || tenant.nationalId || '',
        status: tenant.status === 'BLACKLIST' ? 'BLACKLISTED' : tenant.status || 'ACTIVE',
        notes: tenant.notes || '',
      });
    } else {
      setEditingTenant(null);
      setFormData({ name: '', phone: '', email: '', national_id: '', status: 'ACTIVE', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        id: editingTenant?.id || crypto.randomUUID(),
        full_name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        national_id: formData.national_id || null,
        notes: formData.notes || null,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      if (editingTenant) {
        const updatePayload = { ...payload };
        delete (updatePayload as any).id;
        delete (updatePayload as any).created_at;
        const { error } = await supabase.from('tenants').update(updatePayload).eq('id', editingTenant.id);
        if (error) throw error;
        toast.success('Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­');
      } else {
        const { error } = await supabase.from('tenants').insert([payload]);
        if (error) throw error;
        toast.success('Ã˜ÂªÃ™â€¦Ã˜Âª Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­');
      }

      setIsModalOpen(false);
      await refreshData();
      await fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª');
    }
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', tenantToDelete.id);
      if (error) throw error;
      toast.success('Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­');
      setTenantToDelete(null);
      await refreshData();
      await fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â°Ã™Â');
    }
  };

  return (
    <div className="app-page page-enter" dir="rtl">
      <PageHeader title="Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã™â€ " description="Ã™â€¦Ã™â€žÃ™ÂÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã™â€ Ã˜Å’ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â§Ã˜ÂµÃ™â€žÃ˜Å’ Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã˜Å’ Ã™Ë†Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã˜Â¬Ã˜Â§Ã™â€¡Ã˜Â²Ã™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¨Ã˜Â· Ã™â€¦Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž.">
        <button onClick={() => handleOpenModal()} className={primaryButton}>
          <Plus size={18} />
          Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã™â€ " value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="emerald" title="Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Ë†Ã™â€  Ã™â€ Ã˜Â´Ã˜Â·Ã™Ë†Ã™â€ " value={stats.active.toLocaleString('ar')} />
        <SummaryStatCard icon={<Trash2 size={18} />} color="rose" title="Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â³Ã™Ë†Ã˜Â¯Ã˜Â§Ã˜Â¡" value={stats.blacklisted.toLocaleString('ar')} />
        <SummaryStatCard icon={<Mail size={18} />} color="amber" title="Ã™â€¦Ã™â€žÃ™ÂÃ˜Â§Ã˜Âª Ã˜Â¨Ã™â€¡Ã˜Â§ Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯" value={stats.withEmail.toLocaleString('ar')} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã™â€ </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ã™Ë†Ã˜Â§Ã˜Â¬Ã™â€¡Ã˜Â© Ã˜Â£Ã™Ë†Ã˜Â¶Ã˜Â­ Ã™â€žÃ™â€žÃ˜Â¨Ã˜Â­Ã˜Â«Ã˜Å’ Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©Ã˜Å’ Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â±Ã™Å Ã˜Â¹ Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â§Ã˜ÂµÃ™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¡Ã™Ë†Ã™Å Ã˜Â©.</p>
          </div>
        </div>

        <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="Ã˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã™â€¦ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¡Ã™Ë†Ã™Å Ã˜Â© Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª..." />

        {loading ? (
          <LoadingSpinner label="Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã™â€ ..." />
        ) : filteredTenants.length === 0 ? (
          <EmptyState icon={Users} title="Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã™â€¦Ã˜Â·Ã˜Â§Ã˜Â¨Ã™â€šÃ˜Â©" description="Ã˜Â¬Ã˜Â±Ã™â€˜Ã˜Â¨ Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â­Ã˜Â« Ã˜Â£Ã™Ë† Ã˜Â£Ã˜Â¶Ã™Â Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±Ã™â€¹Ã˜Â§ Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã™â€¹Ã˜Â§ Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th className="w-1/3">Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±</Th>
                <Th className="w-1/4">Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â§Ã˜ÂµÃ™â€ž</Th>
                <Th className="w-1/6">Ã˜Â§Ã™â€žÃ™â€¡Ã™Ë†Ã™Å Ã˜Â©</Th>
                <Th className="w-1/6">Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</Th>
                <Th className="w-1/6 text-center">Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª</Th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <Tr key={tenant.id} className={selectedTenantId === tenant.id ? 'bg-sky-50/70 dark:bg-sky-500/10' : ''} onClick={() => setSelectedTenantId(tenant.id)}>
                  <Td>
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{tenant.name}</div>
                        <div className="text-xs text-slate-500">#{tenant.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        {tenant.phone || 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¡Ã˜Â§Ã˜ÂªÃ™Â'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        {tenant.email || 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯'}
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-sm text-slate-600 dark:text-slate-300">{tenant.national_id || tenant.nationalId || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â³Ã˜Â¬Ã™â€žÃ˜Â©'}</Td>
                  <Td>
                    <StatusPill status={tenant.status || 'ACTIVE'}>{statusLabelMap[tenant.status || 'ACTIVE'] || tenant.status || 'Ã™â€ Ã˜Â´Ã˜Â·'}</StatusPill>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(tenant)}
                        className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700 transition-all duration-150 hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                        title="Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setTenantToDelete(tenant)}
                        className="inline-flex items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 transition-all duration-150 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                        title="Ã˜Â­Ã˜Â°Ã™Â"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {selectedTenant && tenantWorkspace && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã™â€¦Ã™Ë†Ã˜Â­Ã˜Â¯ Ã™â€žÃ™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ™â€ Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜Â³Ã˜Â¬Ã™â€ž Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/financials')} className={ghostButton}>
                  <Receipt size={15} />
                  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž
                </button>
                <button type="button" onClick={() => navigate('/contracts')} className={ghostButton}>
                  <FileText size={15} />
                  Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard icon={<FileText size={18} />} color="blue" title="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯" value={tenantWorkspace.contracts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Receipt size={18} />} color="emerald" title="Ã˜Â§Ã™â€žÃ˜Â¯Ã™ÂÃ˜Â¹Ã˜Â§Ã˜Âª" value={tenantWorkspace.receipts.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<AlertTriangle size={18} />} color="amber" title="Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â©" value={tenantWorkspace.overdueInvoices.length.toLocaleString('ar')} />
              <SummaryStatCard icon={<Wallet size={18} />} color="rose" title="Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂµÃ™Å Ã˜Â¯" value={formatCurrency(tenantWorkspace.balance, db.settings?.currency || 'OMR')} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â±Ã™Å Ã™ÂÃ™Å </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã™â€¦:</strong> {selectedTenant.name}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â:</strong> {selectedTenant.phone || 'Ã¢â‚¬â€'}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯:</strong> {selectedTenant.email || 'Ã¢â‚¬â€'}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©:</strong> {statusLabelMap[selectedTenant.status || 'ACTIVE'] || 'Ã™â€ Ã˜Â´Ã˜Â·'}</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·Ã˜Â©</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div><strong>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª:</strong> {tenantWorkspace.units.length.toLocaleString('ar')}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª:</strong> {tenantWorkspace.properties.length.toLocaleString('ar')}</div>
                  <div><strong>Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©:</strong> {tenantWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div>
                  <div><strong>Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜ÂµÃ™â€ž:</strong> {formatCurrency(tenantWorkspace.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0), db.settings?.currency || 'OMR')}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
                <div>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â¯ / Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</div>
                <div>Ã˜Â§Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â±Ã˜Â©</div>
                <div>Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂµÃ™Å Ã˜Â¯</div>
                <div>Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {tenantWorkspace.contracts.map((contract) => {
                  const unit = db.units.find((item) => item.id === contract.unitId);
                  const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;
                  const balance = contractBalances[contract.id]?.balance || 0;
                  return (
                    <div key={contract.id} className="grid grid-cols-[1fr_0.9fr_0.8fr_0.8fr] gap-4 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{unit?.name || unit?.unitNumber || 'Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{property?.name || 'Ã˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯'}</div>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">{formatDate(contract.start)} - {formatDate(contract.end)}</div>
                      <div className={balance > 0 ? 'font-bold text-rose-600 dark:text-rose-300' : 'font-bold text-emerald-600 dark:text-emerald-300'}>
                        {formatCurrency(balance, db.settings?.currency || 'OMR')}
                      </div>
                      <div>
                        <button type="button" onClick={() => navigate(`/contracts?contractId=${contract.id}`)} className="font-bold text-sky-600 dark:text-sky-300">
                          Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€ž
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Âª</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â©: {tenantWorkspace.overdueInvoices.length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  Ã˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã˜ÂªÃ™â€ Ã˜ÂªÃ™â€¡Ã™Å  Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž 30 Ã™Å Ã™Ë†Ã™â€¦Ã™â€¹Ã˜Â§: {tenantWorkspace.contracts.filter((contract) => contract.status === 'ACTIVE' && new Date(contract.end).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && new Date(contract.end).getTime() >= Date.now()).length.toLocaleString('ar')}
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©: {tenantWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ™â€ Ã˜Â¯Ã˜Â§Ã˜Âª</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                  <div className="font-bold text-slate-700 dark:text-slate-200">Ã˜ÂªÃ˜ÂªÃ˜Â¨Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™ÂÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª</span>
                      <strong>{formatCurrency(tenantWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), db.settings?.currency || 'OMR')}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                      <span>Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â©</span>
                      <strong>{tenantWorkspace.overdueInvoices.length.toLocaleString('ar')}</strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <Wrench size={15} />
                    Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Âª
                  </div>
                  <div className="space-y-2">
                    {tenantWorkspace.maintenance.slice(0, 4).map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/70">
                        <span>{record.issueTitle || record.description || 'Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-300">{record.status}</span>
                      </div>
                    ))}
                    {!tenantWorkspace.maintenance.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·Ã˜Â© Ã˜Â¨Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±.</div>}
                  </div>
                </div>
                <AttachmentsManager entityType="TENANT" entityId={selectedTenant.id} />
                <button type="button" onClick={() => navigate('/reports?tab=tenants')} className={`${ghostButton} w-full`}>
                  <Printer size={15} />
                  Ã˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â© Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant ? 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>
                Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± <span className="text-rose-500">*</span>
              </label>
              <input className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€ž" required />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â</label>
              <input className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+968 9999 9999" />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å </label>
              <input className={inputCls} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="tenant@example.com" />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ™â€¡Ã™Ë†Ã™Å Ã˜Â©</label>
              <input className={inputCls} value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} placeholder="Ã˜Â§Ã™â€žÃ™â€¡Ã™Ë†Ã™Å Ã˜Â© Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€šÃ˜Â§Ã™â€¦Ã˜Â©" />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</label>
              <select className={inputCls} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' })}>
                <option value="ACTIVE">Ã™â€ Ã˜Â´Ã˜Â·</option>
                <option value="INACTIVE">Ã˜ÂºÃ™Å Ã˜Â± Ã™â€ Ã˜Â´Ã˜Â·</option>
                <option value="BLACKLISTED">Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â³Ã™Ë†Ã˜Â¯Ã˜Â§Ã˜Â¡</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª</label>
            <textarea className={`${inputCls} min-h-[120px]`} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ™Å Ã˜Â© Ã˜Â¹Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â£Ã™Ë† Ã˜ÂªÃ™ÂÃ˜Â¶Ã™Å Ã™â€žÃ˜Â§Ã˜ÂªÃ™â€¡" />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <button type="button" onClick={() => setIsModalOpen(false)} className={ghostButton}>
              Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡
            </button>
            <button type="submit" className={primaryButton}>
              {editingTenant ? 'Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€žÃ˜Â§Ã˜Âª' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!tenantToDelete} onClose={() => setTenantToDelete(null)} title="Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Ã™â€¡Ã™â€ž Ã˜Â£Ã™â€ Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â°Ã™ÂÃ˜Å¸</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Ã˜Â³Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã™â€ Ã™â€¡Ã˜Â§Ã˜Â¦Ã™Å Ã™â€¹Ã˜Â§ Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€ž.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Ã˜Â³Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± <strong className="font-semibold text-slate-900 dark:text-white">{tenantToDelete?.name || 'Ã¢â‚¬â€'}</strong> Ã™â€¦Ã™â€  Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã™â€ Ã™â€¡Ã˜Â§Ã˜Â¦Ã™Å Ã™â€¹Ã˜Â§.
              Ã˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã™â€¦Ã™â€  Ã˜Â¹Ã˜Â¯Ã™â€¦ Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯ Ã˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ Ã™ÂÃ˜Â¹Ã˜Â§Ã™â€žÃ˜Â© Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â·Ã˜Â© Ã˜Â¨Ã™â€¡ Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <button onClick={() => setTenantToDelete(null)} className={ghostButton}>
              Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡
            </button>
            <button onClick={handleDelete} className={dangerButton}>
              Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tenants;
