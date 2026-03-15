import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BadgeDollarSign, Building2, History, KeyRound, Lock, ShieldCheck, UserCog, Users, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Modal from '../components/ui/Modal';
import WorkspaceSection from '../components/ui/WorkspaceSection';
import FormSection from '../components/ui/FormSection';

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
    <div className="space-y-8" dir="rtl">
      <PageHeader title="إعدادات النظام" description="إدارة هوية المؤسسة والسياسات المالية وقواعد العمل ومسار النسخ الاحتياطي من شاشة موحدة." />

      <WorkspaceSection title="تصنيفات الإعدادات" description="تنظيم إعدادات المؤسسة والمالية والنسخ الاحتياطي في أقسام واضحة.">
        <Tabs
          variant="pill"
          tabs={[
            { id: 'access', label: 'الوصول' },
            { id: 'company', label: 'المؤسسة' },
            { id: 'financial', label: 'المالية والقفل' },
            { id: 'backup', label: 'النسخ الاحتياطي' },
            { id: 'rules', label: 'قواعد النظام' },
          ]}
          activeTab={activeTab}
          onTabClick={(id) => setActiveTab(id as typeof activeTab)}
        />

        {activeTab === 'access' && <AccessSettings />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'financial' && <FinancialSettings />}
        {activeTab === 'backup' && <BackupSettings />}
        {activeTab === 'rules' && <RulesSettings />}
      </WorkspaceSection>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Users size={18} />} color="blue" title="إجمالي المستخدمين" value={stats.total.toLocaleString('ar')} />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="rose" title="مديرو النظام" value={stats.admins.toLocaleString('ar')} />
        <SummaryStatCard icon={<KeyRound size={18} />} color="amber" title="تحتاج تغيير كلمة المرور" value={stats.mustChange.toLocaleString('ar')} />
        <SummaryStatCard icon={<UserCog size={18} />} color="slate" title="أنماط الصلاحيات" value={stats.roles.toLocaleString('ar')} />
      </div>

      <WorkspaceSection title="إدارة الوصول" description="متابعة صلاحيات المستخدمين وإدارة الحسابات من مركز الموارد البشرية.">
        <div className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          تم توحيد إدارة المستخدمين داخل صفحة الموارد البشرية لمنع تكرار التدفق. من هنا يمكنك مراجعة الحالة العامة ثم الانتقال إلى الإدارة التفصيلية.
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => navigate('/hr')} className={buttonPrimary}>
            فتح إدارة المستخدمين
          </button>
        </div>
      </WorkspaceSection>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Building2 size={18} />} color="blue" title="اسم المؤسسة" value={data.name || 'غير محدد'} subtext="يستخدم في التقارير والمطبوعات" />
        <SummaryStatCard icon={<Wallet size={18} />} color="slate" title="العملة" value={settings?.currency || 'OMR'} subtext="العملة الافتراضية للنظام" />
        <SummaryStatCard icon={<BadgeDollarSign size={18} />} color="emerald" title="ضريبة القيمة المضافة" value={`${settings?.taxRate || 0}%`} subtext="تطبق في الفواتير إن وجدت" />
        <SummaryStatCard icon={<ShieldCheck size={18} />} color="amber" title="تكامل Google Drive" value={data.googleClientId ? 'مفعل' : 'غير مكتمل'} subtext="يتطلب Google Client ID" />
      </div>

      <FormSection title="هوية المؤسسة" description="البيانات الأساسية التي تظهر في التقارير والمستندات الرسمية.">
        <div>
          <label className={labelCls}>اسم المؤسسة</label>
          <input className={inputCls} value={data.name || ''} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>البريد الإلكتروني</label>
          <input className={inputCls} value={data.email || ''} onChange={(e) => setData({ ...data, email: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>الهاتف الرئيسي</label>
          <input className={inputCls} value={data.phone || ''} onChange={(e) => setData({ ...data, phone: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>العنوان</label>
          <input className={inputCls} value={data.address || ''} onChange={(e) => setData({ ...data, address: e.target.value })} />
        </div>
      </FormSection>
      <FormSection title="الهوية البصرية والربط" description="إعدادات الشعار وربط Google Drive." columns={2}>
        <div>
          <label className={labelCls}>Google Client ID</label>
          <input className={inputCls} value={data.googleClientId || ''} onChange={(e) => setData({ ...data, googleClientId: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>رابط أو بيانات الشعار</label>
          <input className={inputCls} value={data.logoDataUrl || data.logo || ''} onChange={(e) => setData({ ...data, logoDataUrl: e.target.value, logo: e.target.value })} />
        </div>
      </FormSection>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} className={buttonPrimary}>حفظ بيانات المؤسسة</button>
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
      toast.error('يرجى تحديد تاريخ قفل الفترة.');
      return;
    }

    await updateGovernance({ financialLockDate: lockDate, isLocked: true });
    toast.success('تم تحديث تاريخ قفل الفترة المالية.');
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryStatCard icon={<BadgeDollarSign size={18} />} color="emerald" title="العملة الأساسية" value={currency} subtext="العملة التشغيلية الحالية" />
        <SummaryStatCard icon={<Wallet size={18} />} color="blue" title="الضريبة" value={`${taxRate}%`} subtext="النسبة الافتراضية على الفواتير" />
        <SummaryStatCard icon={<Lock size={18} />} color="amber" title="قفل الفترة" value={lockDate || 'غير مقفل'} subtext={governance?.isLocked ? 'الحركات السابقة مقفلة' : 'لم يتم تفعيل القفل'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.9fr]">
        <WorkspaceSection title="الإعدادات المالية" description="العملة والضرائب والتنبيهات التشغيلية المرتبطة بالعقود.">
          <FormSection title="العملة والضريبة" description="القيم الأساسية التي تُستخدم في الفواتير والتقارير.">
            <div>
              <label className={labelCls}>العملة الأساسية</label>
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="OMR">ريال عماني (OMR)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>نسبة الضريبة (%)</label>
              <input className={inputCls} type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
          </FormSection>
          <FormSection title="تنبيهات العقود" description="إعدادات تفعيل التنبيه قبل انتهاء العقود.">
            <div>
              <label className={labelCls}>تنبيه انتهاء العقود (بالأيام)</label>
              <input className={inputCls} type="number" min="1" value={contractAlertDays} onChange={(e) => setContractAlertDays(Number(e.target.value))} />
            </div>
          </FormSection>
          <div className="flex justify-end">
            <button type="button" onClick={handleSave} className={buttonPrimary}>حفظ الإعدادات المالية</button>
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          title="قفل الفترة المحاسبية"
          description="عند تفعيل القفل لن يتمكن المستخدمون من إضافة أو تعديل الحركات المالية السابقة لهذا التاريخ."
          className="border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>
            <div className="text-sm leading-6 text-amber-800/80 dark:text-amber-200/80">
              تأكد من مراجعة جميع القيود المالية قبل الإقفال.
            </div>
          </div>
          <div className="mt-5">
            <label className={labelCls}>إقفال جميع الحركات حتى تاريخ</label>
            <input className={inputCls} type="date" value={lockDate || ''} onChange={(e) => setLockDate(e.target.value)} />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => updateGovernance({ financialLockDate: null, isLocked: false })} className={buttonSecondary}>إلغاء القفل</button>
            <button type="button" onClick={() => setConfirmOpen(true)} className={buttonDanger}>تأكيد القفل</button>
          </div>
        </WorkspaceSection>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="تأكيد قفل الفترة المحاسبية">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            سيتم منع تعديل أي حركة مالية قبل أو في تاريخ <strong>{lockDate || '—'}</strong>.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setConfirmOpen(false)} className={buttonSecondary}>إلغاء</button>
            <button type="button" onClick={handleLock} className={buttonDanger}>تأكيد القفل</button>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Wallet size={18} />} color="blue" title="آخر نسخة احتياطية" value={lastBackup ? new Date(lastBackup.date || Date.now()).toLocaleDateString('ar') : '—'} subtext="تاريخ آخر ملف نسخ احتياطي" />
        <SummaryStatCard icon={<History size={18} />} color="emerald" title="عدد النسخ" value={db?.backups?.length?.toLocaleString('ar') || '0'} subtext="إجمالي الملفات المحفوظة" />
      </div>
      <WorkspaceSection title="مركز النسخ الاحتياطي والاستعادة" description="إدارة النسخ والربط مع Google Drive من صفحة النسخ الاحتياطي الرئيسية.">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          تم توحيد عمليات النسخ والاستعادة والمسح والربط مع Google Drive داخل صفحة النسخ الاحتياطي الفعلية فقط. لا توجد أزرار شكلية هنا.
        </div>
        <div className="mt-4">
          <button type="button" className={buttonPrimary} onClick={() => navigate('/backup')}>
            فتح صفحة النسخ الاحتياطي
          </button>
        </div>
      </WorkspaceSection>
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
    toast.success('تم تحديث قواعد النظام بنجاح');
  };

  return (
    <div className="space-y-6">
      <FormSection title="قواعد الفواتير" description="السياسات التي تتحكم في الغرامات وفترة السماح." columns={2}>
        <div>
          <label className={labelCls}>فترة السماح على الفواتير</label>
          <input className={inputCls} type="number" min={0} value={invoiceGraceDays} onChange={(e) => setInvoiceGraceDays(Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>الحد الأقصى لغرامات التأخير (%)</label>
          <input className={inputCls} type="number" min={0} max={100} value={maxLateFees} onChange={(e) => setMaxLateFees(Number(e.target.value))} />
        </div>
      </FormSection>
      <div className="flex justify-end">
        <button type="button" className={buttonPrimary} onClick={handleSave}>حفظ قواعد النظام</button>
      </div>
    </div>
  );
};

export default SettingsPage;
