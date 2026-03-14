import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Pencil,
  RefreshCcw,
  Shield,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import { useApp } from '../contexts/AppContext';
import { User, UserRole } from '../types';
import { formatDate } from '../utils/helpers';

type UserFormState = {
  username: string;
  role: UserRole;
  mustChange: boolean;
  password: string;
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900';
const labelCls = 'mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300';

const roleMeta: Record<UserRole, { label: string; cls: string }> = {
  ADMIN: { label: 'مدير النظام', cls: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
  MANAGER: { label: 'مدير', cls: 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
  ACCOUNTANT: { label: 'محاسب', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  EMPLOYEE: { label: 'موظف', cls: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' },
};

const emptyForm: UserFormState = {
  username: '',
  role: 'EMPLOYEE',
  mustChange: true,
  password: '',
};

const HR: React.FC = () => {
  const { db, auth, canAccess, currentUser } = useApp();
  const users = useMemo(() => [...(db.auth?.users || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [db.auth?.users]);
  const canManageUsers = canAccess('MANAGE_USERS');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingResetUser, setPendingResetUser] = useState<User | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const totalUsers = users.length;
  const elevatedUsers = users.filter((u) => u.role === 'ADMIN' || u.role === 'MANAGER').length;
  const pendingReset = users.filter((u) => u.mustChange).length;

  const openAddModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      role: user.role,
      mustChange: user.mustChange,
      password: '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error('يرجى إدخال اسم المستخدم');
      return;
    }

    if (!editingUser && form.password.trim().length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      setIsSaving(true);

      if (editingUser) {
        await auth.updateUser(editingUser.id, {
          username: form.username.trim(),
          role: form.role,
          mustChange: form.mustChange,
        });

        if (form.password.trim()) {
          if (editingUser.id === currentUser?.id) {
            await auth.changePassword(editingUser.id, form.password.trim());
          } else {
            toast('تغيير كلمة مرور مستخدم آخر يتم عبر فرض إعادة التعيين فقط.', { icon: 'ℹ️' });
          }
        }

        toast.success('تم تحديث بيانات المستخدم');
      } else {
        const result = await auth.addUser(
          {
            username: form.username.trim(),
            role: form.role,
            mustChange: form.mustChange,
          },
          form.password.trim()
        );

        if (!result?.ok) {
          toast.error(result?.msg || 'فشل إنشاء المستخدم');
          return;
        }

        toast.success('تم إنشاء المستخدم بنجاح');
      }

      closeModal();
    } catch {
      toast.error('تعذر حفظ المستخدم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceReset = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('لا يمكنك فرض إعادة تعيين كلمة المرور لنفسك من هنا');
      return;
    }
    setPendingResetUser(user);
  };

  const confirmForceReset = async () => {
    if (!pendingResetUser) return;

    try {
      setIsResetting(true);
      await auth.forcePasswordReset(pendingResetUser.id);
      toast.success('تم فرض إعادة تعيين كلمة المرور بنجاح.');
      setPendingResetUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فرض إعادة تعيين كلمة المرور.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الموارد البشرية وإدارة المستخدمين"
        description="إدارة حسابات المستخدمين والأدوار وسياسات كلمات المرور داخل النظام."
      >
        {canManageUsers && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
          >
            <UserPlus size={16} />
            إضافة مستخدم
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<Users size={20} />} label="إجمالي المستخدمين" value={String(totalUsers)} tone="blue" />
        <StatCard icon={<Shield size={20} />} label="إداريون ومديرون" value={String(elevatedUsers)} tone="violet" />
        <StatCard icon={<KeyRound size={20} />} label="بحاجة لتغيير كلمة المرور" value={String(pendingReset)} tone="amber" />
      </div>

      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">مصفوفة المستخدمين</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              تحديث الأدوار وفرض إعادة تعيين كلمات المرور عند الحاجة. تغيير كلمة المرور المباشر متاح فقط للمستخدم الحالي.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">المستخدم الحالي</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{currentUser?.username || '—'}</p>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Users size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">لا يوجد مستخدمون بعد</h3>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">ابدأ بإنشاء أول مستخدم إداري أو محاسب لإدارة التشغيل اليومي داخل النظام.</p>
          </div>
        ) : (
          <TableWrapper>
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr>
                <Th>المستخدم</Th>
                <Th>الدور</Th>
                <Th>الحالة</Th>
                <Th>تاريخ الإنشاء</Th>
                <Th>الإجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white dark:divide-slate-800 dark:bg-transparent">
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        <UserCog size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{user.username}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${roleMeta[user.role].cls}`}>
                      {roleMeta[user.role].label}
                    </span>
                  </Td>
                  <Td>
                    {user.mustChange ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <AlertTriangle size={12} />
                        يحتاج تغيير كلمة المرور
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 size={12} />
                        جاهز
                      </span>
                    )}
                  </Td>
                  <Td className="text-slate-600 dark:text-slate-300">{formatDate(user.createdAt || Date.now())}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      {canManageUsers && (
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pencil size={13} />
                          تعديل
                        </button>
                      )}
                      {canManageUsers && (
                        <button
                          onClick={() => handleForceReset(user)}
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                        >
                          <RefreshCcw size={13} />
                          فرض إعادة تعيين
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InsightCard
            icon={<Shield size={18} />}
            title="حوكمة الوصول"
            description="إدارة صلاحيات الأدوار يجب أن تتماشى مع التشغيل المالي والعقاري الفعلي، خصوصًا للمحاسبة والإعدادات الحساسة."
          />
          <InsightCard
            icon={<KeyRound size={18} />}
            title="سياسة كلمات المرور"
            description="إعادة تعيين كلمات مرور المستخدمين الآخرين تتم عبر الوسم mustChange فقط. التغيير المباشر متاح للمستخدم الحالي داخل جلسته."
          />
          <InsightCard
            icon={<Users size={18} />}
            title="جاهزية تشغيلية"
            description="أصبحت الشاشة مرتبطة فعليًا بإنشاء المستخدمين وتحديثهم وفرض إعادة التعيين دون كسر جلسة المدير الحالي."
          />
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>اسم المستخدم <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              className={inputCls}
              placeholder="مثال: manager أو accountant@rentrix.local"
            />
          </div>

          <div>
            <label className={labelCls}>الدور الوظيفي</label>
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
              className={inputCls}
            >
              <option value="ADMIN">مدير النظام</option>
              <option value="MANAGER">مدير</option>
              <option value="ACCOUNTANT">محاسب</option>
              <option value="EMPLOYEE">موظف</option>
            </select>
          </div>

          {(!editingUser || editingUser.id === currentUser?.id) && (
            <div>
              <label className={labelCls}>{editingUser ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'} {!editingUser && <span className="text-rose-500">*</span>}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className={inputCls}
                placeholder={editingUser ? 'اتركها فارغة إذا لا تريد تغييرها' : '6 أحرف على الأقل'}
              />
            </div>
          )}

          {editingUser && editingUser.id !== currentUser?.id && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              كلمة مرور المستخدم الآخر لا تُغير مباشرة من هذه الشاشة. استخدم زر "فرض إعادة تعيين".
            </div>
          )}

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.mustChange}
              onChange={(e) => setForm((prev) => ({ ...prev, mustChange: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500/20"
            />
            إلزام المستخدم بتغيير كلمة المرور عند الدخول
          </label>

          <div className="flex gap-3 pt-2">
            <button
              onClick={closeModal}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'جاري الحفظ...' : editingUser ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingResetUser}
        title="تأكيد فرض إعادة التعيين"
        message={`سيُطلب من المستخدم "${pendingResetUser?.username || ''}" تغيير كلمة المرور عند تسجيل الدخول التالي.`}
        confirmLabel="تأكيد"
        cancelLabel="إلغاء"
        loading={isResetting}
        onConfirm={confirmForceReset}
        onCancel={() => {
          if (isResetting) return;
          setPendingResetUser(null);
        }}
      />
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: 'blue' | 'violet' | 'amber' }> = ({
  icon,
  label,
  value,
  tone,
}) => {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[tone]}`}>{icon}</div>
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </Card>
  );
};

const InsightCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">{icon}</div>
    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

export default HR;
