import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { OutgoingNotification } from '../types';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { sanitizePhoneNumber } from '../utils/helpers';
import {
  Send,
  MessageSquare,
  Copy,
  Check,
  Trash2,
  Phone,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatusPill from '../components/ui/StatusPill';

const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200';
const subtleBtn =
  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800';

const CommunicationHub: React.FC = () => {
  const { db, generateNotifications, dataService } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const notifications = useMemo(
    () => [...(db.outgoingNotifications || [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [db.outgoingNotifications]
  );

  const pendingCount = notifications.filter((item) => item.status === 'PENDING').length;
  const sentCount = notifications.filter((item) => item.status === 'SENT').length;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const count = await generateNotifications();
      toast.success(`تم توليد ${count} إشعار جديد.`);
    } catch (error) {
      toast.error(`فشل توليد الإشعارات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرسالة.');
  };

  const handleMarkAsSent = async (id: string) => {
    await dataService.update('outgoingNotifications', id, { status: 'SENT' });
    toast.success('تم تحديث حالة الإشعار.');
  };

  const handleSendWhatsApp = async (notification: OutgoingNotification) => {
    const phone = sanitizePhoneNumber(notification.recipientContact || notification.recipient);
    if (!phone) {
      toast.error('رقم هاتف المستلم غير صالح.');
      return;
    }
    const text = encodeURIComponent(notification.message);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    await handleMarkAsSent(notification.id);
  };

  const handleDelete = async (id: string) => {
    await dataService.remove('outgoingNotifications', id);
    toast.success('تم حذف الإشعار.');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="مركز التواصل"
        description="توليد ومراجعة وإرسال الإشعارات الجاهزة للمستأجرين والعملاء مع متابعة حالة التسليم."
      >
        <button onClick={handleGenerate} disabled={isLoading} className={primaryBtn}>
          <Sparkles size={16} />
          {isLoading ? 'جاري التوليد...' : 'توليد الإشعارات'}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">إجمالي الرسائل</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{notifications.length.toLocaleString('ar')}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">جاهز للإرسال</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{pendingCount.toLocaleString('ar')}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">تم الإرسال</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{sentCount.toLocaleString('ar')}</p>
        </Card>
      </div>

      <Card className="p-6 md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">قائمة الإشعارات</h2>
            <p className="mt-1 text-sm text-slate-500">رسائل التذكير والتنبيه التي يمكن إرسالها مباشرة أو نسخها ومشاركتها يدويًا.</p>
          </div>
          {isLoading && <LoadingSpinner label="جاري تحليل العقود والفواتير..." />}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="لا توجد إشعارات حاليًا"
            description="اضغط على زر توليد الإشعارات لالتقاط الفواتير المتأخرة والعقود القريبة من الانتهاء."
            action={
              <button onClick={handleGenerate} disabled={isLoading} className={primaryBtn}>
                <Sparkles size={16} />
                توليد الآن
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const recipient = notification.recipientName || notification.recipient || 'مستلم غير محدد';
              const recipientContact = notification.recipientContact || notification.recipient || '—';
              return (
                <div key={notification.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusPill status={notification.status === 'SENT' ? 'PAID' : 'PENDING'}>
                          {notification.status === 'SENT' ? 'تم الإرسال' : 'جاهز للإرسال'}
                        </StatusPill>
                        <span className="text-base font-bold text-slate-800">{recipient}</span>
                        <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                          <Phone size={14} />
                          {recipientContact}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <CalendarClock size={14} />
                          {notification.createdAt ? new Date(notification.createdAt).toLocaleString('ar') : 'بدون تاريخ'}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm">
                        {notification.message}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 lg:w-64 lg:flex-col lg:items-stretch">
                      <button onClick={() => handleSendWhatsApp(notification)} className={primaryBtn}>
                        <Send size={16} />
                        إرسال عبر واتساب
                      </button>
                      {notification.status === 'PENDING' && (
                        <button onClick={() => handleMarkAsSent(notification.id)} className={secondaryBtn}>
                          <Check size={16} />
                          تأشير كمرسل
                        </button>
                      )}
                      <button onClick={() => handleCopy(notification.message)} className={subtleBtn}>
                        <Copy size={16} />
                        نسخ الرسالة
                      </button>
                      <button onClick={() => handleDelete(notification.id)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
                        <Trash2 size={16} />
                        حذف الإشعار
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CommunicationHub;
