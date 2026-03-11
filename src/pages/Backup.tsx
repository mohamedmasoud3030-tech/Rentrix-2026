import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { exportToJson } from '../services/backupService';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import {
  Download,
  Upload,
  AlertTriangle,
  Trash2,
  Cloud,
  RefreshCw,
  HardDriveDownload,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l6.19 5.238C39.999 35.937 44 30.413 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const sectionTitleCls = 'text-lg font-extrabold text-slate-800';
const sectionTextCls = 'text-sm leading-6 text-slate-500';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60';
const warningBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60';
const dangerBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60';
const fileInputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 file:ml-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-600 hover:file:bg-blue-100';

const CloudBackupManager: React.FC = () => {
  const { db, googleUser, googleSignIn, googleSignOut, syncToGoogleDrive, restoreFromGoogleDrive } = useApp();
  const settings = db.settings;
  const googleClientId = settings.googleClientId || settings.company?.googleClientId;
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  if (!googleClientId) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={Cloud}
          title="المزامنة السحابية غير مفعلة"
          description="أضف Google Client ID من صفحة النظام لتفعيل النسخ الاحتياطي على Google Drive وربط الحساب السحابي."
          action={
            <NavLink to="/system" className={secondaryBtn}>
              الانتقال إلى النظام
            </NavLink>
          }
        />
      </Card>
    );
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncToGoogleDrive();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreFromGoogleDrive();
      setIsRestoreModalOpen(false);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Cloud size={22} />
          </div>
          <div>
            <h3 className={sectionTitleCls}>المزامنة السحابية مع Google Drive</h3>
            <p className={sectionTextCls}>احتفظ بنسخة احتياطية مشفرة وآمنة في حسابك السحابي، مع إمكانية الاستعادة عند الحاجة.</p>
          </div>
        </div>

        {googleUser ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4">
              <img src={googleUser.picture} alt="profile" className="h-12 w-12 rounded-full ring-2 ring-white" />
              <div>
                <p className="font-bold text-slate-800">{googleUser.name}</p>
                <p className="text-sm text-slate-500">{googleUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button onClick={handleSync} disabled={isSyncing} className={secondaryBtn}>
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
              </button>
              <button onClick={() => setIsRestoreModalOpen(true)} disabled={isRestoring} className={warningBtn}>
                <Download size={16} />
                {isRestoring ? 'جاري الاستعادة...' : 'استعادة من Drive'}
              </button>
            </div>

            <button onClick={googleSignOut} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              تسجيل الخروج من جوجل
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className={sectionTextCls}>سجّل الدخول بحساب Google لتمكين النسخ الاحتياطي السحابي التلقائي واستعادة الملفات المخزنة من Drive.</p>
            <button onClick={googleSignIn} className={secondaryBtn}>
              <GoogleIcon />
              تسجيل الدخول مع جوجل
            </button>
          </div>
        )}
      </Card>

      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="استعادة من Google Drive">
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            ستتم استعادة آخر نسخة احتياطية محفوظة في Google Drive واستبدال بيانات النظام الحالية بها. تأكد من أخذ نسخة محلية قبل المتابعة.
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsRestoreModalOpen(false)} className={secondaryBtn}>
              إلغاء
            </button>
            <button onClick={handleConfirmRestore} disabled={isRestoring} className={warningBtn}>
              <Download size={16} />
              {isRestoring ? 'جاري الاستعادة...' : 'تأكيد الاستعادة'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const BackupManager: React.FC = () => {
  const { createBackup, restoreBackup, wipeData } = useApp();
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const handleBackup = async () => {
    const data = await createBackup();
    exportToJson(JSON.parse(data), `Rentrix_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    toast.success('تم تنزيل النسخة الاحتياطية بنجاح.');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.error('الرجاء اختيار ملف نسخة احتياطية أولاً.');
      return;
    }

    setIsRestoring(true);
    try {
      const fileContent = await restoreFile.text();
      await restoreBackup(fileContent);
      setIsRestoreModalOpen(false);
      setRestoreFile(null);
    } catch {
      toast.error('فشل استعادة النسخة الاحتياطية. تأكد من أن الملف صحيح.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWipe = async () => {
    setIsWiping(true);
    try {
      await wipeData();
      setIsWipeModalOpen(false);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="النسخ الاحتياطي واستعادة البيانات"
        description="إدارة النسخ المحلية والسحابية، واستعادة البيانات، وتأمين النظام قبل أي تغييرات جوهرية."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CloudBackupManager />

        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <HardDriveDownload size={22} />
            </div>
            <div>
              <h3 className={sectionTitleCls}>نسخة احتياطية محلية</h3>
              <p className={sectionTextCls}>نزّل نسخة JSON كاملة من بياناتك إلى جهازك للاحتفاظ بها أو أرشفتها خارج النظام.</p>
            </div>
          </div>
          <button onClick={handleBackup} className={primaryBtn}>
            <Download size={16} />
            تنزيل نسخة احتياطية الآن
          </button>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Upload size={22} />
            </div>
            <div>
              <h3 className={sectionTitleCls}>استعادة من ملف محلي</h3>
              <p className={sectionTextCls}>استرجع بيانات النظام من ملف JSON تم تنزيله سابقًا من نفس النظام.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input type="file" accept=".json" onChange={handleFileSelect} className={fileInputCls} />
            <button onClick={() => setIsRestoreModalOpen(true)} disabled={!restoreFile} className={warningBtn}>
              <Upload size={16} />
              بدء الاستعادة
            </button>
          </div>

          {restoreFile ? (
            <p className="mt-3 text-sm text-slate-500">الملف المختار: <span className="font-semibold text-slate-700">{restoreFile.name}</span></p>
          ) : (
            <p className="mt-3 text-sm text-slate-400">اختر ملف JSON صالح لتمكين زر الاستعادة.</p>
          )}
        </Card>
      </div>

      <Card className="border-rose-200 bg-rose-50/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-rose-700">منطقة الخطر</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-rose-700/80">
                حذف جميع البيانات يعيد النظام إلى حالته الأولية ويحذف العقود والفواتير والمستخدمين والسجلات نهائيًا. يُنصح بأخذ نسخة احتياطية قبل تنفيذ هذا الإجراء.
              </p>
            </div>
          </div>
          <button onClick={() => setIsWipeModalOpen(true)} className={dangerBtn}>
            <Trash2 size={16} />
            إعادة تعيين النظام بالكامل
          </button>
        </div>
      </Card>

      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="تأكيد استعادة البيانات">
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            سيتم حذف جميع البيانات الحالية واستبدالها بمحتويات الملف المحدد. تأكد من أن الملف صحيح ويخص نفس النظام قبل المتابعة.
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsRestoreModalOpen(false)} className={secondaryBtn}>
              إلغاء
            </button>
            <button onClick={handleRestore} disabled={!restoreFile || isRestoring} className={warningBtn}>
              <Upload size={16} />
              {isRestoring ? 'جاري الاستعادة...' : 'تأكيد الاستعادة'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isWipeModalOpen} onClose={() => setIsWipeModalOpen(false)} title="تأكيد حذف جميع البيانات">
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
            هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف البيانات التشغيلية بالكامل وإعادة تهيئة النظام من الصفر.
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsWipeModalOpen(false)} className={secondaryBtn}>
              إلغاء
            </button>
            <button onClick={handleWipe} disabled={isWiping} className={dangerBtn}>
              <Trash2 size={16} />
              {isWiping ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BackupManager;
