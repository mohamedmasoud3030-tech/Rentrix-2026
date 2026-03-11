import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowUpFromLine,
  BellRing,
  Database,
  ExternalLink,
  FileClock,
  HardDrive,
  RefreshCcw,
  Route,
  Settings2,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900';
const labelCls = 'mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300';

const System: React.FC = () => {
  const {
    db,
    updateSettings,
    createBackup,
    createSnapshot,
    rebuildFinancials,
    generateNotifications,
    syncToGoogleDrive,
    googleUser,
  } = useApp();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState(db.settings?.company?.name || '');
  const [contractAlertDays, setContractAlertDays] = useState(
    String(db.settings?.contractAlertDays ?? db.settings?.company?.contractAlertDays ?? 30)
  );
  const [snapshotNote, setSnapshotNote] = useState('');
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const actionCards = [
    { title: 'الإعدادات العامة', description: 'ملف الشركة والسياسات الأساسية وقواعد العمل', icon: <Settings2 size={18} />, onClick: () => navigate('/settings') },
    { title: 'سجل التدقيق', description: 'متابعة الأحداث الإدارية والمالية ونقاط الاستعادة', icon: <FileClock size={18} />, onClick: () => navigate('/audit') },
    { title: 'فحص سلامة البيانات', description: 'تشخيص العلاقات المكسورة وأسباب فراغ التقارير', icon: <ShieldCheck size={18} />, onClick: () => navigate('/audit/integrity') },
    { title: 'النسخ الاحتياطي', description: 'التصدير والاستعادة والمزامنة مع Google Drive', icon: <HardDrive size={18} />, onClick: () => navigate('/backup') },
    { title: 'خريطة العقارات', description: 'قراءة سريعة للتوزيع الجغرافي والإشغال', icon: <Route size={18} />, onClick: () => navigate('/map') },
  ];

  const quickOps = [
    {
      label: 'إنشاء نسخة احتياطية',
      tone: 'blue',
      icon: <ArrowUpFromLine size={16} />,
      action: async () => {
        const json = await createBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rentrix-backup-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('تم إنشاء النسخة الاحتياطية');
      },
    },
    {
      label: 'إعادة بناء المؤشرات المالية',
      tone: 'amber',
      icon: <RefreshCcw size={16} />,
      action: async () => {
        await rebuildFinancials();
      },
    },
    {
      label: 'توليد الإشعارات',
      tone: 'violet',
      icon: <BellRing size={16} />,
      action: async () => {
        const generated = await generateNotifications();
        toast.success(`تم توليد ${generated} إشعار/إشعارات`);
      },
    },
    {
      label: 'مزامنة Google Drive',
      tone: 'emerald',
      icon: <HardDrive size={16} />,
      action: async () => {
        await syncToGoogleDrive();
      },
    },
  ];

  const handleSaveBasics = async () => {
    try {
      setIsSavingSettings(true);
      await updateSettings({
        company: {
          ...db.settings.company,
          name: companyName,
          contractAlertDays: Number(contractAlertDays || 30),
        },
        contractAlertDays: Number(contractAlertDays || 30),
      });
      toast.success('تم تحديث الإعدادات الأساسية');
    } catch {
      toast.error('تعذر حفظ الإعدادات الأساسية');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مركز تحكم النظام"
        description="واجهة تشغيلية سريعة للوصول إلى الإعدادات والفحص والنسخ الاحتياطي وأدوات الصيانة الإدارية."
      >
        <button
          onClick={() => setIsSnapshotOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          <Database size={16} />
          إنشاء نقطة استعادة
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MiniMetric icon={<Database size={18} />} label="الجداول المحمّلة" value="30" tone="blue" />
        <MiniMetric icon={<ShieldCheck size={18} />} label="الحوكمة المالية" value={db.governance?.isLocked ? 'مقفلة' : 'مفتوحة'} tone={db.governance?.isLocked ? 'amber' : 'emerald'} />
        <MiniMetric icon={<HardDrive size={18} />} label="النسخ التلقائية" value={String(db.autoBackups?.length || 0)} tone="violet" />
        <MiniMetric icon={<BellRing size={18} />} label="الإشعارات المعلقة" value={String((db.outgoingNotifications || []).filter((n) => n.status !== 'SENT').length)} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">اختصارات تشغيلية</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أهم الإجراءات الإدارية اليومية في مكان واحد.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {quickOps.map((item) => (
              <QuickActionCard key={item.label} {...item} />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">حالة البيئة</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">متابعة جاهزية الخدمات المتصلة بالنظام.</p>
          </div>
          <div className="space-y-3">
            <EnvRow label="Supabase" value="متصل" tone="emerald" />
            <EnvRow label="النسخ الاحتياطي التلقائي" value={db.autoBackups?.length ? 'مفعّل' : 'غير متوفر'} tone={db.autoBackups?.length ? 'blue' : 'amber'} />
            <EnvRow label="Google Drive" value={googleUser ? 'متصل' : 'غير متصل'} tone={googleUser ? 'emerald' : 'rose'} />
            <EnvRow label="الحوكمة المالية" value={db.governance?.isLocked ? 'مفعّلة' : 'غير مفعّلة'} tone={db.governance?.isLocked ? 'amber' : 'blue'} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">إعدادات تشغيلية سريعة</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">تعديلات سريعة على اسم الشركة وسياسة التنبيه قبل الرجوع إلى شاشة الإعدادات الكاملة.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>اسم الشركة</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="اسم الشركة كما يظهر في العقود والتقارير" />
            </div>
            <div>
              <label className={labelCls}>أيام تنبيه انتهاء العقد</label>
              <input type="number" min={1} value={contractAlertDays} onChange={(e) => setContractAlertDays(e.target.value)} className={inputCls} placeholder="مثال: 30" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p>إذا كانت الحوكمة المالية مفعّلة، فاحرص على تحديث تاريخ الإقفال من شاشة الإعدادات الكاملة قبل أي معالجة مالية مؤرخة.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleSaveBasics}
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Settings2 size={16} />
              {isSavingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ExternalLink size={16} />
              فتح الإعدادات الكاملة
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">بوابة الأدوات الإدارية</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">روابط داخلية سريعة إلى الشاشات الإدارية المهمة.</p>
          </div>
          <div className="space-y-3">
            {actionCards.map((card) => (
              <button
                key={card.title}
                onClick={card.onClick}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                  {card.icon}
                </div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{card.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{card.description}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Modal isOpen={isSnapshotOpen} onClose={() => setIsSnapshotOpen(false)} title="إنشاء نقطة استعادة">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ملاحظة نقطة الاستعادة <span className="text-rose-500">*</span></label>
            <textarea
              value={snapshotNote}
              onChange={(e) => setSnapshotNote(e.target.value)}
              className={`${inputCls} min-h-[120px] resize-y`}
              placeholder="مثال: قبل إقفال الشهر المالي أو قبل ترحيل العقود الجديدة"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsSnapshotOpen(false)} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              إلغاء
            </button>
            <button
              onClick={async () => {
                if (!snapshotNote.trim()) {
                  toast.error('يرجى كتابة ملاحظة توضّح هدف نقطة الاستعادة');
                  return;
                }
                await createSnapshot(snapshotNote.trim());
                setSnapshotNote('');
                setIsSnapshotOpen(false);
              }}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              إنشاء الآن
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const MiniMetric: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' }> = ({
  icon,
  label,
  value,
  tone,
}) => {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[tone]}`}>{icon}</div>
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </Card>
  );
};

const QuickActionCard: React.FC<{ label: string; tone: string; icon: React.ReactNode; action: () => Promise<void> | void }> = ({
  label,
  tone,
  icon,
  action,
}) => {
  const toneMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 dark:hover:bg-blue-500/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 dark:hover:bg-amber-500/20',
    violet: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20 dark:hover:bg-violet-500/20',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20',
  };

  return (
    <button onClick={() => void action()} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-right transition-colors ${toneMap[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-slate-800">{icon}</div>
        <span className="text-sm font-extrabold">{label}</span>
      </div>
      <Wrench size={16} />
    </button>
  );
};

const EnvRow: React.FC<{ label: string; value: string; tone: 'blue' | 'emerald' | 'rose' | 'amber' }> = ({ label, value, tone }) => {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneMap[tone]}`}>{value}</span>
    </div>
  );
};

export default System;
