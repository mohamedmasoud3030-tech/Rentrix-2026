import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Phone, Send, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import { sendWhatsAppMessage, templates } from '../../services/whatsappService';
import { sanitizePhoneNumber } from '../../utils/helpers';
import { toast } from 'react-hot-toast';

interface WhatsAppComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: any;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-2 block text-sm font-medium text-slate-700';
const ghostButton =
  'px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors';
const primaryButton =
  'px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors';

function buildSuggestedMessage(context: any): string {
  const recipientName = context?.recipient?.name || 'العميل';
  if (context?.type === 'receipt' && context?.data?.receipt) {
    const receipt = context.data.receipt;
    return templates.receipt(receipt.no || '—', Number(receipt.amount || 0));
  }
  if (context?.type === 'tenant' && context?.data?.tenant) {
    return templates.welcome(recipientName, context?.data?.tenant?.unitName || 'الوحدة');
  }
  if (context?.type === 'lead') {
    return `مرحباً ${recipientName}، يسعدنا التواصل معك بخصوص اهتمامك بالعقار. هل يناسبك تحديد موعد للمعاينة أو مكالمة سريعة اليوم؟`;
  }
  return `مرحباً ${recipientName}،

نود التواصل معك بخصوص معاملتك في Rentrix. يرجى الرد على هذه الرسالة أو التواصل معنا عند الحاجة.`;
}

export const WhatsAppComposerModal: React.FC<WhatsAppComposerModalProps> = ({ isOpen, onClose, context }) => {
  const recipientName = context?.recipient?.name || context?.recipientName || 'العميل';
  const recipientPhone = useMemo(() => sanitizePhoneNumber(context?.recipient?.phone || context?.recipientContact || context?.recipient || ''), [context]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMessage(buildSuggestedMessage(context));
    }
  }, [context, isOpen]);

  const handleSend = () => {
    if (!recipientPhone) {
      toast.error('لا يوجد رقم واتساب صالح لهذا المستلم.');
      return;
    }
    if (!message.trim()) {
      toast.error('يرجى كتابة الرسالة قبل الإرسال.');
      return;
    }
    sendWhatsAppMessage(recipientPhone, message.trim());
    toast.success('تم فتح واتساب بالرسالة الجاهزة.');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إرسال رسالة واتساب" size="lg">
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
              <MessageCircle size={20} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="font-semibold text-slate-900">{recipientName}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={16} />
                <span>{recipientPhone || 'لا يوجد رقم متاح'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Sparkles size={12} />
                <span>{context?.type === 'receipt' ? 'رسالة سند قبض' : context?.type === 'lead' ? 'رسالة فرصة' : 'رسالة عامة'}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>نص الرسالة</label>
          <textarea
            className={`${inputCls} min-h-[180px] leading-relaxed`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="اكتب رسالتك هنا..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <button onClick={onClose} className={ghostButton}>إلغاء</button>
          <button onClick={handleSend} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors">
            <Send size={16} />
            فتح واتساب وإرسال
          </button>
        </div>
      </div>
    </Modal>
  );
};