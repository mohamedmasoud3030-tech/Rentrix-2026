
import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface RiskRadarItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  onClick?: () => void;
}

const colorMap: Record<string, { dot: string; bg: string; text: string }> = {
  red:    { dot: 'bg-rose-500',    bg: 'bg-rose-50',   text: 'text-rose-600' },
  yellow: { dot: 'bg-amber-500',   bg: 'bg-amber-50',  text: 'text-amber-600' },
  green:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50',text: 'text-emerald-600' },
  blue:   { dot: 'bg-blue-500',    bg: 'bg-blue-50',   text: 'text-blue-600' },
};

const RiskRadarItem: React.FC<RiskRadarItemProps> = ({ icon, title, subtitle, color, onClick }) => {
  const c = colorMap[color] ?? colorMap.red;
  return (
    <div
      className="group px-5 py-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors duration-150"
      onClick={onClick}
    >
      {/* Icon badge */}
      <div className={`p-2 rounded-xl ${c.bg} ${c.text} flex-shrink-0`}>
        <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
          <p className="font-bold text-sm text-slate-800">{title}</p>
        </div>
        <p className="text-xs text-slate-500 leading-snug">{subtitle}</p>
      </div>

      {/* Arrow indicator */}
      <ChevronLeft size={16} className="text-slate-300 flex-shrink-0 group-hover:text-slate-500 transition-colors" />
    </div>
  );
};

export default RiskRadarItem;
