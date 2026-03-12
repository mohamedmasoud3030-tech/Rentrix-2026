import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'جاري التحميل...' }) => {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/70 px-6 py-12 text-center text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/55">
      <div className="flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
