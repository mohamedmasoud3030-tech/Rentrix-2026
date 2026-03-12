import React from 'react';
import { Download, Printer } from 'lucide-react';
import Modal from '../ui/Modal';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onExportPdf?: () => void;
  children: React.ReactNode;
}

const ghostButton =
  'inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200';
const primaryButton =
  'inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, onExportPdf, children }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-6">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="min-h-[400px] rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
          <button onClick={() => window.print()} className={ghostButton}>
            <Printer size={16} />
            طباعة
          </button>
          {onExportPdf && (
            <button onClick={onExportPdf} className={primaryButton}>
              <Download size={16} />
              تصدير PDF
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PrintPreviewModal;
