import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BadgeDollarSign, Building2, History, KeyRound, Lock, ShieldCheck, UserCog, Users, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Modal from '../components/ui/Modal';

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelCls = 'mb-2 block text-xs font-extrabold tracking-wide text-slate-500 dark:text-slate-300';
const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-sky-700 hover:shadow-md';
const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-900';
const buttonDanger =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-rose-600 hover:shadow-md';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'access' | 'company' | 'financial' | 'backup' | 'rules'>('access');

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader title="Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦" description="Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã™â€¡Ã™Ë†Ã™Å Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¤Ã˜Â³Ã˜Â³Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã™Ë†Ã™â€šÃ™Ë†Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€ž Ã™Ë†Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å  Ã™â€¦Ã™â€  Ã˜Â´Ã˜Â§Ã˜Â´Ã˜Â© Ã™â€¦Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©." />

      <Card className="space-y-4 p-4 sm:p-5 md:p-6">
        <Tabs
          variant="pill"
          tabs={[
            { id: 'access', label: 'Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž' },
            { id: 'company', label: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¤Ã˜Â³Ã˜Â³Ã˜Â©' },
            { id: 'financial', label: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ™â€ž' },
            { id: 'backup', label: 'Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å ' },
            { id: 'rules', label: 'Ã™â€šÃ™Ë†Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦' },
          ]}
          activeTab={activeTab}
          onTabClick={(id) => setActiveTab(id as typeof activeTab)}
        />

        {activeTab === 'access' && <AccessSettings />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'financial' && <FinancialSettings />}
        {activeTab === 'backup' && <BackupSettings />}
        {activeTab === 'rules' && <RulesSettings />}
      </Card>
    </div>
  );
};

const AccessSettings: React.FC = () => {
  const navigate = useNavigate();
  const { db } = useApp();
  const users = db.auth?.users || [];

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      mustChange: users.filter((user) => user.mustChange).length,
      roles: new Set(users.map((user) => user.role)).size,
    }),
    [users]
  );

  return (
    <div className="app-page page-enter">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Å Ã™â€ " value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="rose" title="Ã™â€¦Ã˜Â¯Ã™Å Ã˜Â±Ã™Ë† Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦" value={stats.admins.toLocaleString('ar')} />
        <SummaryStatCard icon={<KeyRound size={18} />} color="amber" title="Ã˜ÂªÃ˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â± Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±" value={stats.mustChange.toLocaleString('ar')} />
        <SummaryStatCard icon={<UserCog size={18} />} color="slate" title="Ã˜Â£Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â· Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â§Ã˜Âª" value={stats.roles.toLocaleString('ar')} />
      </div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/88 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.10)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ™Ë†Ã˜Â­Ã™Å Ã˜Â¯ Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Å Ã™â€  Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜Â§Ã˜Â±Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â´Ã˜Â±Ã™Å Ã˜Â© Ã™â€žÃ™â€¦Ã™â€ Ã˜Â¹ Ã˜ÂªÃ™Æ’Ã˜Â±Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¯Ã™ÂÃ™â€š. Ã™â€¦Ã™â€  Ã™â€¡Ã™â€ Ã˜Â§ Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã™â€¦Ã˜Â© Ã˜Â«Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ˜Â§Ã™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜ÂµÃ™Å Ã™â€žÃ™Å Ã˜Â©.
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => navigate('/hr')} className={buttonPrimary}>
            Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Å Ã™â€ 
          </button>
        </div>
      </div>
    </div>
  );
};

const CompanySettings: React.FC = () => {
  const { db, updateSettings } = useApp();
  const settings = db.settings;
  const [data, setData] = useState<any>({
    ...(settings?.company || {}),
    googleClientId: settings?.googleClientId || settings?.company?.googleClientId || '',
  });

  useEffect(() => {
    setData({
      ...(settings?.company || {}),
      googleClientId: settings?.googleClientId || settings?.company?.googleClientId || '',
    });
  }, [settings]);

  const handleSave = async () => {
    const companyPayload = {
      ...data,
      logo: data.logoDataUrl || data.logo || '',
      logoDataUrl: data.logoDataUrl || data.logo || '',
      googleClientId: data.googleClientId || '',
    };
    await updateSettings({ company: companyPayload, googleClientId: data.googleClientId || '' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Building2 size={18} />} color="blue" title="Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¤Ã˜Â³Ã˜Â³Ã˜Â©" value={data.name || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯'} subtext="Ã™Å Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã˜Â¨Ã™Ë†Ã˜Â¹Ã˜Â§Ã˜Âª" />
        <SummaryStatCard icon={<Wallet size={18} />} color="slate" title="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â©" value={settings?.currency || 'OMR'} subtext="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â§Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¶Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦" />
        <SummaryStatCard icon={<BadgeDollarSign size={18} />} color="emerald" title="Ã˜Â¶Ã˜Â±Ã™Å Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ™â€šÃ™Å Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â©" value={`${settings?.taxRate || 0}%`} subtext="Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™â€š Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã˜Â¥Ã™â€  Ã™Ë†Ã˜Â¬Ã˜Â¯Ã˜Âª" />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="amber" title="Ã˜ÂªÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€ž Google Drive" value={data.googleClientId ? 'Ã™â€¦Ã™ÂÃ˜Â¹Ã™â€ž' : 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž'} subtext="Ã™Å Ã˜ÂªÃ˜Â·Ã™â€žÃ˜Â¨ Google Client ID" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¤Ã˜Â³Ã˜Â³Ã˜Â©</label>
          <input className={inputCls} value={data.name || ''} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å </label>
          <input className={inputCls} value={data.email || ''} onChange={(e) => setData({ ...data, email: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â§Ã˜ÂªÃ™Â Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¦Ã™Å Ã˜Â³Ã™Å </label>
          <input className={inputCls} value={data.phone || ''} onChange={(e) => setData({ ...data, phone: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€ </label>
          <input className={inputCls} value={data.address || ''} onChange={(e) => setData({ ...data, address: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Google Client ID</label>
          <input className={inputCls} value={data.googleClientId || ''} onChange={(e) => setData({ ...data, googleClientId: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â£Ã™Ë† Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â¹Ã˜Â§Ã˜Â±</label>
          <input className={inputCls} value={data.logoDataUrl || data.logo || ''} onChange={(e) => setData({ ...data, logoDataUrl: e.target.value, logo: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} className={buttonPrimary}>Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¤Ã˜Â³Ã˜Â³Ã˜Â©</button>
      </div>
    </div>
  );
};

const FinancialSettings: React.FC = () => {
  const { db, updateSettings, updateGovernance } = useApp();
  const settings = db.settings;
  const governance = db.governance;
  const [taxRate, setTaxRate] = useState(settings?.taxRate || 0);
  const [currency, setCurrency] = useState(settings?.currency || 'OMR');
  const [contractAlertDays, setContractAlertDays] = useState(settings?.contractAlertDays || settings?.company?.contractAlertDays || 30);
  const [lockDate, setLockDate] = useState(governance?.financialLockDate || '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setTaxRate(settings?.taxRate || 0);
    setCurrency(settings?.currency || 'OMR');
    setContractAlertDays(settings?.contractAlertDays || settings?.company?.contractAlertDays || 30);
  }, [settings]);

  useEffect(() => {
    setLockDate(governance?.financialLockDate || '');
  }, [governance]);

  const handleSave = async () => {
    const baseCompany = settings?.company || { name: '', address: '', phone: '', email: '', logo: '' };
    await updateSettings({ taxRate, currency, contractAlertDays, company: { ...baseCompany, contractAlertDays } });
  };

  const handleLock = async () => {
    if (!lockDate) {
      toast.error('Ã™Å Ã˜Â±Ã˜Â¬Ã™â€° Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯ Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã™â€šÃ™ÂÃ™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â±Ã˜Â©.');
      return;
    }

    await updateGovernance({ financialLockDate: lockDate, isLocked: true });
    toast.success('Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã™â€šÃ™ÂÃ™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â©.');
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryStatCard icon={<BadgeDollarSign size={18} />} color="emerald" title="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â§Ã˜Â³Ã™Å Ã˜Â©" value={currency} subtext="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©" />
        <SummaryStatCard icon={<Wallet size={18} />} color="blue" title="Ã˜Â§Ã™â€žÃ˜Â¶Ã˜Â±Ã™Å Ã˜Â¨Ã˜Â©" value={`${taxRate}%`} subtext="Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â§Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¶Ã™Å Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â±" />
        <SummaryStatCard icon={<Lock size={18} />} color="amber" title="Ã™â€šÃ™ÂÃ™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â±Ã˜Â©" value={lockDate || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™â€šÃ™ÂÃ™â€ž'} subtext={governance?.isLocked ? 'Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¨Ã™â€šÃ˜Â© Ã™â€¦Ã™â€šÃ™ÂÃ™â€žÃ˜Â©' : 'Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ™â€ž'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/88 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.10)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â§Ã˜Â³Ã™Å Ã˜Â©</label>
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="OMR">Ã˜Â±Ã™Å Ã˜Â§Ã™â€ž Ã˜Â¹Ã™â€¦Ã˜Â§Ã™â€ Ã™Å  (OMR)</option>
                <option value="SAR">Ã˜Â±Ã™Å Ã˜Â§Ã™â€ž Ã˜Â³Ã˜Â¹Ã™Ë†Ã˜Â¯Ã™Å  (SAR)</option>
                <option value="EGP">Ã˜Â¬Ã™â€ Ã™Å Ã™â€¡ Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Å  (EGP)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Ã™â€ Ã˜Â³Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¶Ã˜Â±Ã™Å Ã˜Â¨Ã˜Â© (%)</label>
              <input className={inputCls} type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡ Ã˜Â§Ã™â€ Ã˜ÂªÃ™â€¡Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯ (Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â£Ã™Å Ã˜Â§Ã™â€¦)</label>
              <input className={inputCls} type="number" min="1" value={contractAlertDays} onChange={(e) => setContractAlertDays(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSave} className={buttonPrimary}>Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â©</button>
          </div>
        </div>

        <div className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-[0_18px_40px_rgba(251,191,36,0.10)] dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-900 dark:text-amber-200">Ã™â€šÃ™ÂÃ™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â§Ã˜Â³Ã˜Â¨Ã™Å Ã˜Â©</h2>
              <p className="mt-1 text-sm leading-6 text-amber-800/80 dark:text-amber-200/80">
                Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ™â€ž Ã™â€žÃ™â€  Ã™Å Ã˜ÂªÃ™â€¦Ã™Æ’Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Ë†Ã™â€  Ã™â€¦Ã™â€  Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â£Ã™Ë† Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¨Ã™â€šÃ˜Â© Ã™â€žÃ™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â®.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <label className={labelCls}>Ã˜Â¥Ã™â€šÃ™ÂÃ˜Â§Ã™â€ž Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â­Ã˜ÂªÃ™â€° Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â®</label>
            <input className={inputCls} type="date" value={lockDate || ''} onChange={(e) => setLockDate(e.target.value)} />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => updateGovernance({ financialLockDate: null, isLocked: false })} className={buttonSecondary}>Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ™â€ž</button>
            <button type="button" onClick={() => setConfirmOpen(true)} className={buttonDanger}>Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ™â€ž</button>
          </div>
        </div>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã™â€šÃ™ÂÃ™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â§Ã˜Â³Ã˜Â¨Ã™Å Ã˜Â©">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Ã˜Â³Ã™Å Ã˜ÂªÃ™â€¦ Ã™â€¦Ã™â€ Ã˜Â¹ Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â£Ã™Å  Ã˜Â­Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â£Ã™Ë† Ã™ÂÃ™Å  Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® <strong>{lockDate || 'Ã¢â‚¬â€'}</strong>.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setConfirmOpen(false)} className={buttonSecondary}>Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡</button>
            <button type="button" onClick={handleLock} className={buttonDanger}>Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ™â€ž</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const BackupSettings: React.FC = () => {
  const navigate = useNavigate();
  const { db } = useApp();
  const lastBackup = db?.backups?.[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Wallet size={18} />} color="blue" title="Ã˜Â¢Ã˜Â®Ã˜Â± Ã™â€ Ã˜Â³Ã˜Â®Ã˜Â© Ã˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å Ã˜Â©" value={lastBackup ? new Date(lastBackup.date || Date.now()).toLocaleDateString('ar') : 'Ã¢â‚¬â€'} subtext="Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã˜Â¢Ã˜Â®Ã˜Â± Ã™â€¦Ã™â€žÃ™Â Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å " />
        <SummaryStatCard icon={<History size={18} />} color="emerald" title="Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â®" value={db?.backups?.length?.toLocaleString('ar') || '0'} subtext="Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™ÂÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©" />
      </div>
      <div className="rounded-[28px] border border-slate-200/70 bg-white/88 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.10)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-xl font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å  Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â©</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ™Ë†Ã˜Â­Ã™Å Ã˜Â¯ Ã˜Â¹Ã™â€¦Ã™â€žÃ™Å Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â­ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¨Ã˜Â· Ã™â€¦Ã˜Â¹ Google Drive Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å  Ã˜Â§Ã™â€žÃ™ÂÃ˜Â¹Ã™â€žÃ™Å Ã˜Â© Ã™ÂÃ™â€šÃ˜Â·. Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â£Ã˜Â²Ã˜Â±Ã˜Â§Ã˜Â± Ã˜Â´Ã™Æ’Ã™â€žÃ™Å Ã˜Â© Ã™â€¡Ã™â€ Ã˜Â§.
        </p>
        <button type="button" className={buttonPrimary} onClick={() => navigate('/backup')}>
          Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â·Ã™Å 
        </button>
      </div>
    </div>
  );
};

const RulesSettings: React.FC = () => {
  const { db, updateSettings } = useApp();
  const [invoiceGraceDays, setInvoiceGraceDays] = useState<number>(db.settings?.invoiceGraceDays || 5);
  const [maxLateFees, setMaxLateFees] = useState<number>(db.settings?.maxLateFees || 10);

  useEffect(() => {
    setInvoiceGraceDays(db.settings?.invoiceGraceDays || 5);
    setMaxLateFees(db.settings?.maxLateFees || 10);
  }, [db.settings]);

  const handleSave = async () => {
    await updateSettings({ invoiceGraceDays, maxLateFees });
    toast.success('Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã™â€šÃ™Ë†Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦ Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/88 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.10)] dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â³Ã™â€¦Ã˜Â§Ã˜Â­ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â±</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã™Å Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã™â€¦Ã™Ë†Ã˜Â­ Ã˜Â¨Ã™â€¡Ã˜Â§ Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â­Ã™â€šÃ˜Â§Ã™â€š Ã™â€šÃ˜Â¨Ã™â€ž Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã˜ÂºÃ˜Â±Ã˜Â§Ã™â€¦Ã˜Â© Ã˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â±.</p>
          <input className={inputCls} type="number" min={0} value={invoiceGraceDays} onChange={(e) => setInvoiceGraceDays(Number(e.target.value))} />
        </div>
        <div className="rounded-[28px] border border-slate-200/70 bg-white/88 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.10)] dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€šÃ˜ÂµÃ™â€° Ã™â€žÃ˜ÂºÃ˜Â±Ã˜Â§Ã™â€¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â± (%)</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Ã™â€ Ã˜Â³Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂºÃ˜Â±Ã˜Â§Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€šÃ˜ÂµÃ™Ë†Ã™â€° Ã˜Â§Ã™â€žÃ˜ÂªÃ™Å  Ã™Å Ã™â€¦Ã™Æ’Ã™â€  Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€šÃ™â€¡Ã˜Â§ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â§Ã˜Âª.</p>
          <input className={inputCls} type="number" min={0} max={100} value={maxLateFees} onChange={(e) => setMaxLateFees(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" className={buttonPrimary} onClick={handleSave}>Ã˜Â­Ã™ÂÃ˜Â¸ Ã™â€šÃ™Ë†Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦</button>
      </div>
    </div>
  );
};

export default SettingsPage;
