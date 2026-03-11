
import React from 'react';
import Modal from '../ui/Modal';

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, invoice }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'تعديل فاتورة' : 'إضافة فاتورة'}>
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">رقم الفاتورة *</label>
          <input 
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            placeholder="أدخل رقم الفاتورة"
            defaultValue={invoice?.no}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">المبلغ *</label>
          <input 
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            type="number" 
            placeholder="أدخل المبلغ"
            defaultValue={invoice?.amount}
            required
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <button 
            type="button" 
            onClick={onClose} 
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button 
            type="submit" 
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            حفظ
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InvoiceForm;