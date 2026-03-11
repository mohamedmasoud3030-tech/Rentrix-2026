import React, { useMemo, useState } from 'react';
import { ExternalLink, Link2, Paperclip, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../services/db';
import type { Attachment } from '../../types';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { formatDateTime } from '../../utils/helpers';

interface AttachmentsManagerProps {
  entityType: string;
  entityId: string;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-2 block text-sm font-medium text-slate-700';
const ghostButton =
  'px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors';
const primaryButton =
  'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors';
const dangerButton =
  'px-4 py-2 text-sm font-medium text-white bg-rose-600 border border-transparent rounded-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors';

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ entityType, entityId }) => {
  const { db, dataService } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const attachments = useMemo(
    () => (db.attachments || []).filter((attachment) => attachment.entityType === entityType && attachment.entityId === entityId),
    [db.attachments, entityId, entityType],
  );

  const handleAdd = async () => {
    if (!fileUrl.trim()) {
      toast.error('يرجى إدخال رابط المرفق.');
      return;
    }
    const inferredName = fileName.trim() || fileUrl.split('/').pop() || 'مرفق جديد';
    await dataService.add('attachments', {
      entityType,
      entityId,
      fileName: inferredName,
      fileUrl: fileUrl.trim(),
    });
    setFileName('');
    setFileUrl('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800">المرفقات والروابط</h4>
          <p className="mt-1 text-xs text-slate-500">أضف روابط الملفات المهمة المتعلقة بهذا السجل لتبقى متاحة دائمًا للفريق.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className={primaryButton}>
          <PlusCircle size={16} /> إضافة مرفق
        </button>
      </div>

      {attachments.length === 0 ? (
        <EmptyState icon={Paperclip} title="لا توجد مرفقات بعد" description="أضف عقداً ممسوحًا أو فاتورة أو رابط ملف محفوظ في التخزين السحابي." />
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Link2 size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{attachment.fileName || 'مرفق بدون اسم'}</div>
                  <div className="mt-1 text-xs text-slate-500">أضيف في {formatDateTime(attachment.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {attachment.fileUrl && (
                  <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className={ghostButton}>
                    <ExternalLink size={15} /> فتح الرابط
                  </a>
                )}
                <button onClick={() => setAttachmentToDelete(attachment)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100">
                  <Trash2 size={15} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة مرفق أو رابط" size="md">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>اسم المرفق</label>
            <input className={inputCls} value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="مثال: نسخة العقد الموقعة" />
          </div>
          <div>
            <label className={labelCls}>الرابط</label>
            <input className={inputCls} value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => setIsAddModalOpen(false)} className={ghostButton}>إلغاء</button>
            <button onClick={handleAdd} className={primaryButton}>حفظ المرفق</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!attachmentToDelete} onClose={() => setAttachmentToDelete(null)} title="تأكيد حذف المرفق" size="sm">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">هل أنت متأكد من الحذف؟</h3>
              <p className="text-sm text-slate-600">سيتم حذف المرفق نهائيًا</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              سيتم حذف المرفق <strong className="font-semibold text-slate-900">{attachmentToDelete?.fileName || '—'}</strong> من هذا السجل. 
              لا يمكن التراجع عن هذه العملية.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button 
              onClick={() => setAttachmentToDelete(null)} 
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={async () => {
                if (!attachmentToDelete) return;
                const { error } = await supabase.from('attachments').delete().eq('id', attachmentToDelete.id);
                if (error) { toast.error('تعذر حذف المرفق.'); return; }
                toast.success('تم حذف المرفق.');
                setAttachmentToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 border border-transparent rounded-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors"
            >
              حذف المرفق
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttachmentsManager;