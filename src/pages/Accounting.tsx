import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Account, AccountBalance, JournalEntry } from '../types';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import TableWrapper, { Th, Td, Tr } from '../components/ui/TableWrapper';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { formatCurrency, formatDate } from '../utils/helpers';
import { calculateBalanceSheetData, calculateIncomeStatementData } from '../services/accountingService';
import {
  BookOpen,
  Calculator,
  BarChart3,
  PlusCircle,
  Scale,
  Landmark,
  Users2,
  Wallet,
  Building2,
  Pencil,
  ArrowUpRight,
  FileBarChart2,
  Printer,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelCls = 'mb-2 block text-xs font-extrabold tracking-wide text-slate-500 dark:text-slate-300';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-sky-700 hover:shadow-md';
const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-900';
const smallButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-900';

type TabId = 'overview' | 'chart' | 'journal' | 'balances' | 'analysis';
type PartyBalanceRow = { id: string; name: string; balance: number };

const Accounting: React.FC = () => {
  const navigate = useNavigate();
  const { db, accountBalances } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const handlePrint = () => {
    window.print();
  };

  const accountBalancesMap = accountBalances as Record<string, AccountBalance>;
  const entries = useMemo(
    () => [...(db.journalEntries || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [db.journalEntries]
  );
  const debitTotal = useMemo(
    () => entries.filter((e) => e.type === 'DEBIT').reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [entries]
  );
  const creditTotal = useMemo(
    () => entries.filter((e) => e.type === 'CREDIT').reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [entries]
  );
  const ownerBalanceRows = useMemo<PartyBalanceRow[]>(
    () =>
      (db.ownerBalances || []).map((item) => ({
        id: item.ownerId,
        name: db.owners.find((owner) => owner.id === item.ownerId)?.name || 'مالك غير معروف',
        balance: Number(item.net || 0),
      })),
    [db.ownerBalances, db.owners]
  );
  const tenantBalanceRows = useMemo<PartyBalanceRow[]>(
    () =>
      (db.tenantBalances || []).map((item) => ({
        id: item.tenantId,
        name: db.tenants.find((tenant) => tenant.id === item.tenantId)?.name || 'مستأجر غير معروف',
        balance: Number(item.balance || 0),
      })),
    [db.tenantBalances, db.tenants]
  );
  const accountsCount = db.accounts?.length || 0;
  const activeOwners = ownerBalanceRows.filter((o) => Math.abs(Number(o.balance || 0)) > 0.001).length;
  const activeTenants = tenantBalanceRows.filter((t) => Math.abs(Number(t.balance || 0)) > 0.001).length;
  const imbalance = Math.abs(debitTotal - creditTotal);

  return (
    <div className="space-y-6">
      <PageHeader
        title="المحاسبة العامة"
        description="مركز محاسبي موحد لإدارة الحسابات، قيود اليومية، أرصدة الأطراف، والتحليل المالي للمكتب."
      >
        <button onClick={handlePrint} className={ghostButton}>
          <Printer size={16} /> طباعة
        </button>
        <button onClick={() => navigate('/reports?tab=trial_balance')} className={ghostButton}>
          <FileBarChart2 size={16} /> ميزان المراجعة
        </button>
        <button onClick={() => navigate('/reports?tab=income_statement')} className={primaryButton}>
          <ArrowUpRight size={16} /> التقارير المحاسبية
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryStatCard icon={<BookOpen size={18} />} color="blue" title="الحسابات المحاسبية" value={accountsCount.toLocaleString('ar')} subtext="دليل حسابات موحد للشركة" />
        <SummaryStatCard icon={<Scale size={18} />} color="emerald" title="إجمالي المدين" value={formatCurrency(debitTotal)} subtext="إجمالي قيود المدين الحالية" />
        <SummaryStatCard icon={<Wallet size={18} />} color="rose" title="إجمالي الدائن" value={formatCurrency(creditTotal)} subtext="إجمالي قيود الدائن الحالية" />
        <SummaryStatCard icon={<Users2 size={18} />} color="amber" title="أرصدة مفتوحة" value={`${activeOwners + activeTenants}`} subtext={`ملاك ${activeOwners} • مستأجرون ${activeTenants}`} />
        <SummaryStatCard icon={<Landmark size={18} />} color={imbalance < 0.001 ? 'emerald' : 'rose'} title="اتزان اليومية" value={imbalance < 0.001 ? 'متزن' : formatCurrency(imbalance)} subtext={imbalance < 0.001 ? 'لا يوجد فرق بين المدين والدائن' : 'فرق يحتاج مراجعة'} />
      </div>

      <Card className="p-6">
        <Tabs
          variant="pill"
          tabs={[
            { id: 'overview', label: 'نظرة عامة', icon: <Landmark size={16} /> },
            { id: 'chart', label: 'دليل الحسابات', icon: <BarChart3 size={16} /> },
            { id: 'journal', label: 'اليومية', icon: <BookOpen size={16} /> },
            { id: 'balances', label: 'الأطراف', icon: <Calculator size={16} /> },
            { id: 'analysis', label: 'التحليل', icon: <Wallet size={16} /> },
          ]}
          activeTab={activeTab}
          onTabClick={(id) => setActiveTab(id as TabId)}
        />

        <div className="pt-6">
          {activeTab === 'overview' && <OverviewTab accountBalancesMap={accountBalancesMap} journalEntries={entries} debitTotal={debitTotal} creditTotal={creditTotal} />}
          {activeTab === 'chart' && <ChartTab accountBalancesMap={accountBalancesMap} />}
          {activeTab === 'journal' && <JournalTab />}
          {activeTab === 'balances' && <BalancesTab ownerBalances={ownerBalanceRows} tenantBalances={tenantBalanceRows} />}
          {activeTab === 'analysis' && <AnalysisTab onOpenReports={(tab) => navigate(`/reports?tab=${tab}`)} />}
        </div>
      </Card>
    </div>
  );
};

const OverviewTab: React.FC<{
  accountBalancesMap: Record<string, AccountBalance>;
  journalEntries: JournalEntry[];
  debitTotal: number;
  creditTotal: number;
}> = ({ accountBalancesMap, journalEntries, debitTotal, creditTotal }) => {
  const { db } = useApp();
  const accounts = useMemo(() => [...(db.accounts || [])].sort((a, b) => String(a.no || '').localeCompare(String(b.no || ''))), [db.accounts]);
  const topAccounts = useMemo(() => {
    return accounts
      .map((account) => ({
        ...account,
        balance: Number(accountBalancesMap[account.id]?.balance || 0),
      }))
      .filter((row) => Math.abs(row.balance) > 0.001)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 8);
  }, [accounts, accountBalancesMap]);

  const grouped = useMemo(() => {
    const result: Record<string, number> = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 };
    accounts.forEach((account) => {
      if (account.type && result[account.type] !== undefined) {
        result[account.type] += Number(accountBalancesMap[account.id]?.balance || 0);
      }
    });
    return result;
  }, [accounts, accountBalancesMap]);

  const latestEntries = journalEntries.slice(0, 10);
  const maxMagnitude = Math.max(1, ...Object.values(grouped).map((value) => Math.abs(value)));
  const trialDiff = Math.abs(debitTotal - creditTotal);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Scale size={18} /></div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">ملخص المراكز المحاسبية</h3>
              <p className="text-sm text-slate-500">صورة مختصرة لأرصدة الدليل المحاسبي حسب النوع.</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: 'ASSET', label: 'الأصول', color: 'bg-blue-500' },
              { key: 'LIABILITY', label: 'الالتزامات', color: 'bg-rose-500' },
              { key: 'EQUITY', label: 'حقوق الملكية', color: 'bg-indigo-500' },
              { key: 'REVENUE', label: 'الإيرادات', color: 'bg-emerald-500' },
              { key: 'EXPENSE', label: 'المصروفات', color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.key} className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
                  <span>{item.label}</span>
                  <span>{formatCurrency(grouped[item.key])}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(Math.abs(grouped[item.key]) / maxMagnitude) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><FileBarChart2 size={18} /></div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">مؤشرات الإغلاق المحاسبي</h3>
              <p className="text-sm text-slate-500">متابعة سريعة لسلامة اليومية وتوزيع الحركة على الحسابات.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">اتزان اليومية</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${trialDiff < 0.001 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {trialDiff < 0.001 ? 'متزن' : 'يحتاج مراجعة'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/90 p-3 shadow-sm dark:bg-slate-950/60">
                  <div className="text-xs font-bold text-slate-500">إجمالي المدين</div>
                  <div className="mt-1 font-extrabold text-emerald-600">{formatCurrency(debitTotal)}</div>
                </div>
                <div className="rounded-2xl bg-white/90 p-3 shadow-sm dark:bg-slate-950/60">
                  <div className="text-xs font-bold text-slate-500">إجمالي الدائن</div>
                  <div className="mt-1 font-extrabold text-rose-600">{formatCurrency(creditTotal)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-sm font-bold text-slate-600">نشاط الحسابات</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/90 p-3 shadow-sm dark:bg-slate-950/60">
                  <div className="text-xs font-bold text-slate-500">حسابات متحركة</div>
                  <div className="mt-1 font-extrabold text-slate-800">{topAccounts.length}</div>
                </div>
                <div className="rounded-2xl bg-white/90 p-3 shadow-sm dark:bg-slate-950/60">
                  <div className="text-xs font-bold text-slate-500">آخر القيود</div>
                  <div className="mt-1 font-extrabold text-slate-800">{latestEntries.length}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><BarChart3 size={18} /></div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">أكبر الحسابات تأثيرًا</h3>
              <p className="text-sm text-slate-500">الحسابات ذات أعلى أرصدة فعلية حاليًا للمراجعة السريعة.</p>
            </div>
          </div>
          {topAccounts.length === 0 ? (
            <EmptyState icon={BookOpen} title="لا توجد أرصدة بعد" description="ستظهر الحسابات الأعلى عندما تبدأ الحركة المالية على الحسابات." />
          ) : (
            <div className="space-y-3">
              {topAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                  <div>
                    <p className="font-bold text-slate-800">{account.name}</p>
                    <p className="text-xs font-mono text-slate-500">{account.no} • {account.type}</p>
                  </div>
                  <div className={`text-sm font-extrabold ${account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(account.balance)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen size={18} /></div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">آخر القيود المسجلة</h3>
              <p className="text-sm text-slate-500">آخر عشر حركات يومية لمراجعة سريعة قبل الدخول إلى دفتر اليومية الكامل.</p>
            </div>
          </div>
          {latestEntries.length === 0 ? (
            <EmptyState icon={BookOpen} title="لا توجد قيود حتى الآن" description="ابدأ بالتسجيل المالي أو أضف قيدًا يدويًا جديدًا." />
          ) : (
            <div className="space-y-3">
              {latestEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{entry.no || 'قيد بدون رقم'} • {formatDate(entry.date)}</p>
                      <p className="text-xs text-slate-500">{entry.notes || entry.sourceId || 'بدون وصف إضافي'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${entry.type === 'DEBIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {entry.type === 'DEBIT' ? 'مدين' : 'دائن'} • {formatCurrency(entry.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ChartOfAccountsMini />
    </div>
  );
};

const ChartTab: React.FC<{ accountBalancesMap: Record<string, AccountBalance> }> = ({ accountBalancesMap }) => {
  const { db, dataService } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const accounts = useMemo(() => [...(db.accounts || [])].sort((a, b) => String(a.no || '').localeCompare(String(b.no || ''))), [db.accounts]);
  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; items: Array<Account & { balance: number }> }> = {
      ASSET: { label: 'الأصول', items: [] },
      LIABILITY: { label: 'الالتزامات', items: [] },
      EQUITY: { label: 'حقوق الملكية', items: [] },
      REVENUE: { label: 'الإيرادات', items: [] },
      EXPENSE: { label: 'المصروفات', items: [] },
    };
    accounts.forEach((account) => groups[account.type]?.items.push({ ...account, balance: Number(accountBalancesMap[account.id]?.balance || 0) }));
    return groups;
  }, [accounts, accountBalancesMap]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return grouped;
    const clone: typeof grouped = {
      ASSET: { ...grouped.ASSET, items: [] },
      LIABILITY: { ...grouped.LIABILITY, items: [] },
      EQUITY: { ...grouped.EQUITY, items: [] },
      REVENUE: { ...grouped.REVENUE, items: [] },
      EXPENSE: { ...grouped.EXPENSE, items: [] },
    };
    Object.entries(grouped).forEach(([key, group]) => {
      clone[key as keyof typeof clone].items = group.items.filter((account) =>
        [account.no, account.name, account.type].join(' ').toLowerCase().includes(term)
      );
    });
    return clone;
  }, [grouped, searchTerm]);

  const openCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">دليل الحسابات</h3>
          <p className="text-sm text-slate-500">إدارة الحسابات المحاسبية وربطها بتحليل الأرصدة الفعلية.</p>
        </div>
        <button onClick={openCreate} className={primaryButton}><PlusCircle size={16} /> إضافة حساب</button>
      </div>
      <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث برقم الحساب أو اسمه أو نوعه..." />
      <div className="space-y-6">
        {Object.entries(filteredGroups).map(([key, group]) => (
          <Card key={key} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">{group.label}</h3>
                <p className="text-sm text-slate-500">عرض تحليلي لدليل الحسابات وأرصدة كل حساب.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{group.items.length} حساب</span>
            </div>
            {group.items.length === 0 ? (
              <EmptyState icon={BookOpen} title="لا توجد حسابات" description="لم يتم إنشاء حسابات ضمن هذا التصنيف بعد أو لا توجد نتائج مطابقة للبحث." />
            ) : (
              <TableWrapper>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>الرقم</Th>
                    <Th>اسم الحساب</Th>
                    <Th>الرصيد</Th>
                    <Th>النوع</Th>
                    <Th>الإجراءات</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.items.map((account) => (
                    <Tr key={account.id} className={account.isParent ? 'bg-slate-50/70' : ''}>
                      <Td className="font-mono">{account.no}</Td>
                      <Td>
                        <div className="font-semibold text-slate-800" style={{ paddingRight: account.parentId ? '1.25rem' : 0 }}>{account.name}</div>
                        {account.parentId && <div className="mt-1 text-[11px] text-slate-400">حساب فرعي</div>}
                      </Td>
                      <Td className={account.balance >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>{formatCurrency(account.balance)}</Td>
                      <Td>{group.label}</Td>
                      <Td>
                        <button onClick={() => openEdit(account)} className={smallButton}><Pencil size={14} /> تعديل</button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            )}
          </Card>
        ))}
      </div>
      {isModalOpen && (
        <AccountFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          account={editingAccount}
          accounts={accounts}
          onSave={async (payload, id) => {
            if (id) {
              await dataService.update('accounts', id, payload);
            } else {
              await dataService.add('accounts', payload);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

const JournalTab: React.FC = () => {
  const { db, financeService } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const accountsMap = useMemo(() => new Map((db.accounts || []).map((acc) => [acc.id, acc.name])), [db.accounts]);
  const journalEntries = useMemo(() => [...(db.journalEntries || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [db.journalEntries]);
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return journalEntries;
    return journalEntries.filter((entry) =>
      [entry.no, entry.sourceId, entry.notes, accountsMap.get(entry.accountId)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [journalEntries, searchTerm, accountsMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">دفتر اليومية العام</h3>
          <p className="text-sm text-slate-500">قيود اليومية المرتبطة بالفواتير والمصروفات والعمليات اليدوية.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={primaryButton}><PlusCircle size={16} /> إضافة قيد يدوي</button>
      </div>
      <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder="بحث برقم القيد أو الحساب أو المرجع..." />
      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="لا توجد قيود يومية" description="ابدأ بالحركات المالية أو أضف قيدًا يدويًا جديدًا." />
      ) : (
        <TableWrapper>
          <thead className="bg-slate-50">
            <tr>
              <Th>التاريخ</Th>
              <Th>رقم القيد</Th>
              <Th>الحساب</Th>
              <Th>مدين</Th>
              <Th>دائن</Th>
              <Th>المرجع</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((entry) => (
              <Tr key={entry.id}>
                <Td>{formatDate(entry.date)}</Td>
                <Td className="font-mono font-bold text-slate-800">{entry.no}</Td>
                <Td>{accountsMap.get(entry.accountId) || 'حساب غير معروف'}</Td>
                <Td className="font-mono text-emerald-600">{entry.type === 'DEBIT' ? formatCurrency(entry.amount) : '—'}</Td>
                <Td className="font-mono text-rose-600">{entry.type === 'CREDIT' ? formatCurrency(entry.amount) : '—'}</Td>
                <Td className="text-xs text-slate-500">{entry.sourceId || entry.notes || '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
      {isModalOpen && <ManualJournalVoucherForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={financeService.addManualJournalVoucher} />}
    </div>
  );
};

const BalancesTab: React.FC<{ ownerBalances: PartyBalanceRow[]; tenantBalances: PartyBalanceRow[] }> = ({ ownerBalances, tenantBalances }) => {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'owners' | 'tenants'>('owners');
  const [searchTerm, setSearchTerm] = useState('');
  const balances = subTab === 'owners' ? ownerBalances : tenantBalances;
  const icon = subTab === 'owners' ? <Building2 size={16} /> : <Users2 size={16} />;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return balances;
    return balances.filter((item) => item.name.toLowerCase().includes(term));
  }, [balances, searchTerm]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">أرصدة الأطراف</h3>
          <p className="text-sm text-slate-500">أرصدة الملاك والمستأجرين مع مؤشرات واضحة وروابط مباشرة إلى التقارير.</p>
        </div>
        <button onClick={() => navigate(`/reports?tab=${subTab === 'owners' ? 'owner' : 'tenant'}`)} className={ghostButton}>
          <FileBarChart2 size={16} /> فتح التقرير الكامل
        </button>
      </div>

      <Tabs
        variant="pill"
        tabs={[
          { id: 'owners', label: 'أرصدة الملاك', icon: <Building2 size={16} />, count: ownerBalances.length },
          { id: 'tenants', label: 'أرصدة المستأجرين', icon: <Users2 size={16} />, count: tenantBalances.length },
        ]}
        activeTab={subTab}
        onTabClick={(id) => setSubTab(id as 'owners' | 'tenants')}
      />

      <SearchFilterBar value={searchTerm} onSearch={setSearchTerm} placeholder={subTab === 'owners' ? 'بحث باسم المالك...' : 'بحث باسم المستأجر...'} />

      {filtered.length === 0 ? (
        <EmptyState icon={subTab === 'owners' ? Building2 : Users2} title="لا توجد أرصدة حالية" description="ستظهر البيانات هنا بمجرد وجود تحصيلات، فواتير أو مصروفات مرتبطة بالطرف." />
      ) : (
        <TableWrapper>
          <thead className="bg-slate-50">
            <tr>
              <Th>{subTab === 'owners' ? 'المالك' : 'المستأجر'}</Th>
              <Th>الوصف</Th>
              <Th>الرصيد</Th>
              <Th>الحالة</Th>
              <Th>الإجراء</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const balance = Number(item.balance || 0);
              const statusText = balance > 0 ? 'له رصيد' : balance < 0 ? 'عليه رصيد' : 'متوازن';
              const statusCls = balance > 0 ? 'bg-emerald-50 text-emerald-700' : balance < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700';
              return (
                <Tr key={item.id}>
                  <Td>
                    <div className="flex items-center gap-2 font-semibold text-slate-800">{icon}{item.name}</div>
                  </Td>
                  <Td className="text-sm text-slate-500">{subTab === 'owners' ? 'كشف حساب المالك قبل/بعد العمولة' : 'كشف حساب المستأجر من الفواتير والتحصيلات'}</Td>
                  <Td className={balance >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>{formatCurrency(balance)}</Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusCls}`}>{statusText}</span>
                  </Td>
                  <Td>
                    <button onClick={() => navigate(`/reports?tab=${subTab === 'owners' ? 'owner' : 'tenant'}`)} className={smallButton}>فتح الكشف</button>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrapper>
      )}
    </div>
  );
};

const AnalysisTab: React.FC<{ onOpenReports: (tab: 'income_statement' | 'owner' | 'tenant' | 'aging' | 'trial_balance') => void }> = ({ onOpenReports }) => {
  const { db } = useApp();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }, []);
  const endOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }, []);

  const incomeStatement = useMemo(() => calculateIncomeStatementData(db, startOfMonth, endOfMonth), [db, startOfMonth, endOfMonth]);
  const balanceSheet = useMemo(() => calculateBalanceSheetData(db, asOfDate), [db, asOfDate]);
  const monthlyFlow = useMemo(() => {
    const labels = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const currentYear = new Date().getFullYear();
    return labels.map((label, monthIndex) => {
      const inflow = (db.receipts || []).filter((row) => {
        const d = new Date(row.dateTime);
        return row.status === 'POSTED' && d.getFullYear() === currentYear && d.getMonth() === monthIndex;
      }).reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const outflow = (db.expenses || []).filter((row) => {
        const d = new Date(row.dateTime);
        return row.status === 'POSTED' && d.getFullYear() === currentYear && d.getMonth() === monthIndex;
      }).reduce((sum, row) => sum + Number(row.amount || 0), 0);
      return { label, inflow, outflow, net: inflow - outflow };
    });
  }, [db.receipts, db.expenses]);
  const maxMovement = Math.max(1, ...monthlyFlow.flatMap((row) => [row.inflow, row.outflow, Math.abs(row.net)]));
  const trialDiff = Math.abs((db.journalEntries || []).filter((entry) => entry.type === 'DEBIT').reduce((sum, entry) => sum + Number(entry.amount || 0), 0) - (db.journalEntries || []).filter((entry) => entry.type === 'CREDIT').reduce((sum, entry) => sum + Number(entry.amount || 0), 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={<Wallet size={18} />} color="emerald" title="إجمالي الإيرادات" value={formatCurrency(incomeStatement.totalRevenue)} subtext="خلال الشهر الحالي" />
        <SummaryStatCard icon={<Calculator size={18} />} color="rose" title="إجمالي المصروفات" value={formatCurrency(incomeStatement.totalExpense)} subtext="خلال الشهر الحالي" />
        <SummaryStatCard icon={<Landmark size={18} />} color={incomeStatement.netIncome >= 0 ? 'blue' : 'rose'} title="صافي الدخل" value={formatCurrency(incomeStatement.netIncome)} subtext="إيراد ناقص مصروف" />
        <SummaryStatCard icon={<Scale size={18} />} color={trialDiff < 0.001 ? 'emerald' : 'amber'} title="فرق ميزان المراجعة" value={trialDiff < 0.001 ? '0.00' : formatCurrency(trialDiff)} subtext={trialDiff < 0.001 ? 'القيود متوازنة' : 'بحاجة إلى مراجعة'} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">حركة الإيرادات والمصروفات</h3>
              <p className="text-sm text-slate-500">عرض شهري سريع يساعد في قراءة أداء المكتب ومراقبة الاتجاه العام.</p>
            </div>
            <button onClick={() => onOpenReports('income_statement')} className={ghostButton}>فتح التقرير</button>
          </div>
          <div className="space-y-4">
            {monthlyFlow.map((row) => (
              <div key={row.label} className="space-y-2 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                  <span>{row.label}</span>
                  <span className={row.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(row.net)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500"><span>الإيراد</span><span>{formatCurrency(row.inflow)}</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${(row.inflow / maxMovement) * 100}%` }} /></div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500"><span>المصروف</span><span>{formatCurrency(row.outflow)}</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-500" style={{ width: `${(row.outflow / maxMovement) * 100}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-slate-800">ملخص المركز المالي</h3>
            <p className="text-sm text-slate-500">لقطة سريعة من الميزانية العمومية حتى التاريخ المحدد.</p>
          </div>
          <div className="mb-4">
            <label className={labelCls}>حتى تاريخ</label>
            <input className={inputCls} type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
          <div className="space-y-3">
            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-bold text-slate-500">إجمالي الأصول</div>
              <div className="mt-1 text-xl font-extrabold text-blue-700">{formatCurrency(balanceSheet.totalAssets)}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-bold text-slate-500">إجمالي الالتزامات</div>
              <div className="mt-1 text-xl font-extrabold text-rose-700">{formatCurrency(balanceSheet.totalLiabilities)}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-bold text-slate-500">حقوق الملكية</div>
              <div className="mt-1 text-xl font-extrabold text-indigo-700">{formatCurrency(balanceSheet.totalEquity)}</div>
            </div>
            <button onClick={() => onOpenReports('trial_balance')} className={`${primaryButton} w-full`}>
              <ArrowUpRight size={16} /> فتح ميزان المراجعة
            </button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-extrabold text-slate-800">اختصارات التقارير المحاسبية</h3>
          <p className="text-sm text-slate-500">انتقل مباشرة إلى تقارير الأرباح والخسائر، الميزانية، وكشوف الحساب التفصيلية.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: 'الأرباح والخسائر', desc: 'إيراد ومصروف وصافي الدخل', tab: 'income_statement' as const, color: 'bg-emerald-50 text-emerald-700' },
            { title: 'ميزان المراجعة', desc: 'مطابقة المدين والدائن', tab: 'trial_balance' as const, color: 'bg-slate-100 text-slate-700' },
            { title: 'كشف حساب الملاك', desc: 'قبل وبعد خصم العمولة', tab: 'owner' as const, color: 'bg-amber-50 text-amber-700' },
            { title: 'كشف حساب المستأجرين', desc: 'الرصيد والعقود النشطة', tab: 'tenant' as const, color: 'bg-blue-50 text-blue-700' },
            { title: 'أعمار الذمم', desc: 'تحليل التأخير في التحصيل', tab: 'aging' as const, color: 'bg-rose-50 text-rose-700' },
          ].map((item) => (
            <button key={item.tab} onClick={() => onOpenReports(item.tab)} className="flex min-h-[110px] w-full items-start justify-between rounded-2xl border border-slate-100 p-4 text-right transition-colors hover:bg-slate-50">
              <div>
                <div className="font-bold text-slate-800">{item.title}</div>
                <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.color}`}>فتح</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

const ChartOfAccountsMini: React.FC = () => {
  const { db } = useApp();
  const accountTypeCounts = useMemo(() => {
    const result: Record<string, number> = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 };
    (db.accounts || []).forEach((account) => {
      result[account.type] += 1;
    });
    return result;
  }, [db.accounts]);

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-slate-800">توزيع دليل الحسابات</h3>
        <p className="text-sm text-slate-500">تقسيم دليل الحسابات حسب التصنيف لتسهيل المراجعة المحاسبية.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { key: 'ASSET', label: 'أصول', color: 'bg-blue-50 text-blue-700' },
          { key: 'LIABILITY', label: 'التزامات', color: 'bg-rose-50 text-rose-700' },
          { key: 'EQUITY', label: 'ملكية', color: 'bg-indigo-50 text-indigo-700' },
          { key: 'REVENUE', label: 'إيرادات', color: 'bg-emerald-50 text-emerald-700' },
          { key: 'EXPENSE', label: 'مصروفات', color: 'bg-amber-50 text-amber-700' },
        ].map((item) => (
          <div key={item.key} className={`rounded-2xl p-4 ${item.color}`}>
            <p className="text-xs font-bold">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{accountTypeCounts[item.key]}</p>
            <p className="mt-1 text-xs">حسابات مسجلة</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const AccountFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  accounts: Account[];
  onSave: (payload: Partial<Account>, id?: string) => Promise<void>;
}> = ({ isOpen, onClose, account, accounts, onSave }) => {
  const [no, setNo] = useState(account?.no || '');
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<Account['type']>(account?.type || 'ASSET');
  const [parentId, setParentId] = useState<string>(account?.parentId || '');
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo(() => accounts.filter((item) => item.id !== account?.id && item.type === type), [accounts, account?.id, type]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!no.trim() || !name.trim()) {
      toast.error('رقم الحساب واسم الحساب مطلوبان.');
      return;
    }
    try {
      setSaving(true);
      await onSave({ no: no.trim(), name: name.trim(), type, parentId: parentId || null }, account?.id);
      toast.success(account ? 'تم تحديث الحساب.' : 'تم إنشاء الحساب.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تعديل حساب محاسبي' : 'إضافة حساب محاسبي'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>رقم الحساب</label>
            <input className={inputCls} value={no} onChange={(e) => setNo(e.target.value)} placeholder="مثال: 1101" required />
          </div>
          <div>
            <label className={labelCls}>اسم الحساب</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الصندوق" required />
          </div>
          <div>
            <label className={labelCls}>نوع الحساب</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as Account['type'])}>
              <option value="ASSET">أصول</option>
              <option value="LIABILITY">التزامات</option>
              <option value="EQUITY">حقوق ملكية</option>
              <option value="REVENUE">إيرادات</option>
              <option value="EXPENSE">مصروفات</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>الحساب الأب (اختياري)</label>
            <select className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">بدون حساب أب</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.no} — {item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          استخدم الحساب الأب لإنشاء دليل حسابات هرمي مرتب. الحسابات الفرعية ترث طبيعة الحساب من التصنيف المختار.
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={ghostButton}>إلغاء</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'جارٍ الحفظ...' : account ? 'حفظ التعديلات' : 'إضافة الحساب'}</button>
        </div>
      </form>
    </Modal>
  );
};

const ManualJournalVoucherForm: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: any) => Promise<void> }> = ({ isOpen, onClose, onSubmit }) => {
  const { db } = useApp();
  const accounts = useMemo(() => db.accounts || [], [db.accounts]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ accountId: string; debit: number; credit: number }>>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 },
  ]);

  const handleLineChange = (index: number, field: string, value: any) => {
    const next = [...lines];
    (next[index] as any)[field] = field === 'accountId' ? value : Number(value);
    setLines(next);
  };
  const addLine = () => setLines((prev) => [...prev, { accountId: '', debit: 0, credit: 0 }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));
  const totals = useMemo(() => lines.reduce((acc, line) => ({ debit: acc.debit + Number(line.debit || 0), credit: acc.credit + Number(line.credit || 0) }), { debit: 0, credit: 0 }), [lines]);
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.001 && totals.debit > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isBalanced) {
      toast.error('القيد غير متوازن.');
      return;
    }
    await onSubmit({ date, notes, lines: lines.filter((line) => line.accountId && (line.debit > 0 || line.credit > 0)) });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إنشاء قيد يومية يدوي" size="xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>تاريخ القيد</label>
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>وصف العملية</label>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="سبب أو وصف القيد" required />
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70 md:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <label className={labelCls}>الحساب</label>
                <select className={inputCls} value={line.accountId} onChange={(e) => handleLineChange(index, 'accountId', e.target.value)} required>
                  <option value="">اختر الحساب</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.no} — {account.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>مدين</label>
                <input className={inputCls} type="number" step="0.001" value={line.debit || ''} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>دائن</label>
                <input className={inputCls} type="number" step="0.001" value={line.credit || ''} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} />
              </div>
              <div className="flex items-end">
                {lines.length > 2 && (
                  <button type="button" onClick={() => removeLine(index)} className={ghostButton}>حذف</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-white/88 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-sm text-slate-500">إجمالي المدين: <span className="font-bold text-emerald-600">{formatCurrency(totals.debit)}</span> • إجمالي الدائن: <span className="font-bold text-rose-600">{formatCurrency(totals.credit)}</span></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{isBalanced ? 'القيد متوازن' : 'القيد غير متوازن'}</span>
        </div>

        <div className="flex justify-between border-t border-slate-100 pt-4">
          <button type="button" onClick={addLine} className={ghostButton}>إضافة سطر</button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={ghostButton}>إلغاء</button>
            <button type="submit" className={primaryButton}>حفظ القيد</button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default Accounting;
