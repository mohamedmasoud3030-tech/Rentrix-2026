import React, { useState } from 'react';
import { Edit, Printer, Trash } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface ActionConfirmConfig {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ActionItem {
  label: string;
  onClick: () => void | Promise<void>;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  confirm?: ActionConfirmConfig;
}

interface ActionsMenuProps {
  items: ActionItem[];
}

const dangerButtonCls =
  'p-2 rounded-lg text-red-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10';
const defaultButtonCls =
  'p-2 rounded-lg text-slate-600 transition-colors hover:bg-neutral/10 dark:text-slate-300 dark:hover:bg-slate-800';

const ActionsMenu: React.FC<ActionsMenuProps> = ({ items }) => {
  const [pendingItem, setPendingItem] = useState<ActionItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const executeItem = async (item: ActionItem) => {
    try {
      setIsRunning(true);
      await item.onClick();
    } catch (error) {
      console.error('Action menu item failed:', error);
    } finally {
      setIsRunning(false);
      setPendingItem(null);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            onClick={() => {
              if (item.confirm) {
                setPendingItem(item);
                return;
              }
              void executeItem(item);
            }}
            className={item.variant === 'danger' ? dangerButtonCls : defaultButtonCls}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!pendingItem}
        title={pendingItem?.confirm?.title}
        message={pendingItem?.confirm?.message || 'هل أنت متأكد من تنفيذ هذا الإجراء؟'}
        confirmLabel={pendingItem?.confirm?.confirmLabel}
        cancelLabel={pendingItem?.confirm?.cancelLabel}
        loading={isRunning}
        onConfirm={() => {
          if (!pendingItem) return;
          void executeItem(pendingItem);
        }}
        onCancel={() => {
          if (isRunning) return;
          setPendingItem(null);
        }}
      />
    </>
  );
};

type DangerActionOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const EditAction = (onClick: () => void | Promise<void>): ActionItem => ({
  label: 'تعديل',
  onClick,
  icon: <Edit size={16} />,
});

export const DeleteAction = (
  onClick: () => void | Promise<void>,
  options: DangerActionOptions = {},
): ActionItem => ({
  label: 'حذف',
  onClick,
  icon: <Trash size={16} />,
  variant: 'danger',
  confirm: {
    title: options.title || 'تأكيد الحذف',
    message: options.message || 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع بعد التنفيذ.',
    confirmLabel: options.confirmLabel || 'حذف',
    cancelLabel: options.cancelLabel || 'إلغاء',
  },
});

export const PrintAction = (onClick: () => void | Promise<void>): ActionItem => ({
  label: 'طباعة',
  onClick,
  icon: <Printer size={16} />,
});

export const VoidAction = (
  onClick: () => void | Promise<void>,
  options: DangerActionOptions = {},
): ActionItem => ({
  label: 'إلغاء',
  onClick,
  icon: <Trash size={16} />,
  variant: 'danger',
  confirm: {
    title: options.title || 'تأكيد الإلغاء',
    message: options.message || 'هل أنت متأكد من إلغاء هذا القيد؟',
    confirmLabel: options.confirmLabel || 'إلغاء القيد',
    cancelLabel: options.cancelLabel || 'تراجع',
  },
});

export default ActionsMenu;
