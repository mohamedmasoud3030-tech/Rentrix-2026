import React from 'react';
import Modal from '../ui/Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-70';
const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'تأكيد الإجراء',
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="space-y-5">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={ghostBtn}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={primaryBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
