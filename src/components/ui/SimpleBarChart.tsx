import React from 'react';
import { formatCurrency } from '../../utils/helpers';

type SimpleBarChartItem = {
  label: string;
  value: number;
  color?: string;
};

interface SimpleBarChartProps {
  data: SimpleBarChartItem[];
  height?: number;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, height = 180 }) => {
  if (!data?.length) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
        لا توجد بيانات للرسم البياني
      </div>
    );
  }

  const maxAbsValue = Math.max(
    1,
    ...data.map((item) => Math.abs(Number.isFinite(item.value) ? item.value : 0)),
  );

  return (
    <div className="space-y-4" style={{ minHeight: `${height}px` }}>
      {data.map((item) => {
        const safeValue = Number.isFinite(item.value) ? item.value : 0;
        const percent = Math.max(0, Math.min(100, (Math.abs(safeValue) / maxAbsValue) * 100));
        const barWidth = safeValue === 0 ? 0 : Math.max(percent, 6);
        const barColor = item.color ?? (safeValue >= 0 ? 'bg-blue-500' : 'bg-amber-500');

        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              <span className={`text-xs font-bold ${safeValue >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {formatCurrency(safeValue)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${barWidth}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleBarChart;
