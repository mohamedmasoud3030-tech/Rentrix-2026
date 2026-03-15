import React from 'react';
import Modal from '../ui/Modal';
import FormSection from '../ui/FormSection';

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, invoice }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'تعديل فاتورة' : 'إضافة فاتورة'}>
      <form className="space-y-6">
        <FormSection title="بيانات الفاتورة" description="الحد الأدنى من البيانات الأساسية المستخدمة في هذه الواجهة.">
          <div>
            <label className="mb-2 block text-xs font-extrabold tracking-wide text-slate-500">رقم الفاتورة *</label>
            <input
              className="w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm text-slate-800 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
              placeholder="أدخل رقم الفاتورة"
              defaultValue={invoice?.no}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-extrabold tracking-wide text-slate-500">المبلغ *</label>
            <input
              className="w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm text-slate-800 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
              type="number"
              placeholder="أدخل المبلغ"
              defaultValue={invoice?.amount}
              required
            />
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            حفظ
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InvoiceForm;
