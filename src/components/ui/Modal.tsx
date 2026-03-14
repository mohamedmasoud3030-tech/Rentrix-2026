import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm sm:max-w-md',
  md: 'max-w-md sm:max-w-lg md:max-w-[40rem]',
  lg: 'max-w-lg sm:max-w-2xl md:max-w-[52rem]',
  xl: 'max-w-xl sm:max-w-3xl md:max-w-[72rem]',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 px-3 py-3 backdrop-blur-lg" onClick={handleBackdropClick}>
      <div
        className={`modal-content relative w-full ${sizeMap[size]} overflow-hidden rounded-[22px] border border-white/80 bg-white/95 shadow-brand-lg transition-all duration-200 ease-out dark:border-slate-800 dark:bg-slate-950/95`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex-1">
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus:ring-slate-700"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-5.5rem)] overflow-y-auto px-4 py-3.5 dark:text-slate-200">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
