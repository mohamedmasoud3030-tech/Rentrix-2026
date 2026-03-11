
import React from 'react';
import { MoreHorizontal, Edit, Trash, Printer } from 'lucide-react';

interface ActionItem {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
}

interface ActionsMenuProps {
  items: ActionItem[];
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({ items }) => {
  return (
    <div className="flex gap-2">
      {items.map((item, i) => (
        <button 
          key={i} 
          onClick={item.onClick} 
          className={`p-2 rounded-lg hover:bg-neutral/10 transition-colors ${item.variant === 'danger' ? 'text-red-600' : 'text-slate-600'}`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
};

export const EditAction = (onClick: () => void): ActionItem => ({ label: 'تعديل', onClick, icon: <Edit size={16}/> });
export const DeleteAction = (onClick: () => void): ActionItem => ({ label: 'حذف', onClick, icon: <Trash size={16}/>, variant: 'danger' });
export const PrintAction = (onClick: () => void): ActionItem => ({ label: 'طباعة', onClick, icon: <Printer size={16}/> });
export const VoidAction = (onClick: () => void): ActionItem => ({ label: 'إلغاء', onClick, icon: <Trash size={16}/>, variant: 'danger' });

export default ActionsMenu;
