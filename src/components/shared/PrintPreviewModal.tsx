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
  'px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors';
const primaryButton =
  'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors';

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, onExportPdf, children }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="min-h-[400px] rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors">
            <Printer size={16} />
            طباعة
          </button>
          {onExportPdf && (
            <button onClick={onExportPdf} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
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