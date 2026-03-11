import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ChevronLeft, Info, RefreshCw, SearchCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { AuditIssue } from '../types';
import { runDataIntegrityAudit } from '../services/auditEngine';

const toneMap = {
  ERROR: {
    icon: <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-300" />,
    cls: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
    title: 'أخطاء حرجة',
  },
  WARNING: {
    icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300" />,
    cls: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
    title: 'تحذيرات',
  },
  INFO: {
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />,
    cls: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200',
    title: 'معلومات تشخيصية',
  },
} as const;

const DataIntegrityAudit: React.FC = () => {
  const { db } = useApp();
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const grouped = useMemo(
    () => ({
      ERROR: issues.filter((issue) => issue.severity === 'ERROR'),
      WARNING: issues.filter((issue) => issue.severity === 'WARNING'),
      INFO: issues.filter((issue) => issue.severity === 'INFO'),
    }),
    [issues]
  );

  const handleRunAudit = () => {
    setIsLoading(true);

    setTimeout(() => {
      if (!db) {
        toast.error('البيانات غير جاهزة بعد، يرجى المحاولة مرة أخرى.');
        setIsLoading(false);
        return;
      }

      const result = runDataIntegrityAudit(db);
      setIssues(result);
      setLastRun(new Date());
      setIsLoading(false);
    }, 350);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="فحص سلامة البيانات"
        description="تشخيص العلاقات المكسورة ومشكلات التدفق المالي والأسباب المحتملة لفراغ التقارير أو تعطل بعض الشاشات."
      >
        <button
          onClick={handleRunAudit}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'جاري الفحص...' : 'بدء فحص النظام'}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="إجمالي النتائج" value={issues.length.toLocaleString('ar')} />
        <SummaryCard label="الأخطاء الحرجة" value={grouped.ERROR.length.toLocaleString('ar')} tone="rose" />
        <SummaryCard label="التحذيرات" value={grouped.WARNING.length.toLocaleString('ar')} tone="amber" />
      </div>

      <Card className="p-6">
        {!lastRun ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <SearchCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">الأداة جاهزة للفحص</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                اضغط على زر الفحص للحصول على قائمة فعلية بالمشكلات المرتبطة بالبيانات والعلاقات والمحاسبة.
              </p>
            </div>
          </div>
        ) : issues.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">لا توجد مشكلات مكتشفة</div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              آخر فحص تم في {lastRun.toLocaleTimeString('ar')} ويبدو أن سلامة البيانات جيدة حاليًا.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              آخر فحص تم في {lastRun.toLocaleTimeString('ar')} وتم العثور على {issues.length.toLocaleString('ar')} نتيجة.
            </p>

            {(['ERROR', 'WARNING', 'INFO'] as const).map((severity) =>
              grouped[severity].length > 0 ? (
                <div key={severity} className="space-y-3">
                  <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{toneMap[severity].title}</h2>
                  {grouped[severity].map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; tone?: 'slate' | 'rose' | 'amber' }> = ({ label, value, tone = 'slate' }) => {
  const cls = {
    slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  };

  return (
    <Card className="p-5">
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-bold ${cls[tone]}`}>{label}</div>
      <div className="mt-4 text-3xl font-extrabold text-slate-800 dark:text-slate-100">{value}</div>
    </Card>
  );
};

const IssueCard: React.FC<{ issue: AuditIssue }> = ({ issue }) => (
  <div className={`rounded-2xl border p-4 ${toneMap[issue.severity].cls}`}>
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{toneMap[issue.severity].icon}</div>
      <div className="flex-1 space-y-2">
        <h3 className="text-base font-extrabold">{issue.title}</h3>
        <p className="text-sm leading-7">{issue.description}</p>
        {issue.entityIdentifier && (
          <div className="rounded-xl bg-white/60 px-3 py-2 text-xs font-mono dark:bg-slate-900/40">
            السجل المتأثر: {issue.entityIdentifier} {issue.entityId ? `(ID: ${issue.entityId.slice(0, 8)}...)` : ''}
          </div>
        )}
      </div>
      {issue.resolutionPath && (
        <Link
          to={issue.resolutionPath}
          className="inline-flex items-center gap-1 rounded-xl border border-current/20 px-3 py-2 text-xs font-bold"
        >
          الانتقال
          <ChevronLeft size={14} />
        </Link>
      )}
    </div>
  </div>
);

export default DataIntegrityAudit;
