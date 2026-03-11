import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'جاري التحميل...' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
};

export default LoadingSpinner;
