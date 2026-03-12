import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Bell,
  Briefcase,
  Building2,
  Calculator,
  ChevronRight,
  FileBarChart2,
  FileText,
  HardDriveDownload,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../contexts/AppContext';

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'الرئيسية',
    items: [{ label: 'لوحة القيادة', path: '/', icon: <LayoutDashboard size={18} /> }],
  },
  {
    label: 'العقارات',
    items: [
      { label: 'العقارات والوحدات', path: '/properties', icon: <Building2 size={18} /> },
      { label: 'الملاك', path: '/owners', icon: <UserCheck size={18} /> },
      { label: 'المستأجرون', path: '/tenants', icon: <Users size={18} /> },
    ],
  },
  {
    label: 'العقود',
    items: [
      { label: 'العقود', path: '/contracts', icon: <FileText size={18} /> },
      { label: 'الفواتير', path: '/invoices', icon: <Receipt size={18} /> },
    ],
  },
  {
    label: 'المالية',
    items: [
      { label: 'الخزينة والمالية', path: '/financials', icon: <Wallet size={18} /> },
      { label: 'المحاسبة', path: '/accounting', icon: <Calculator size={18} /> },
    ],
  },
  {
    label: 'التشغيل',
    items: [
      { label: 'الصيانة', path: '/maintenance', icon: <Wrench size={18} /> },
      { label: 'المهام والزيارات', path: '/tasks', icon: <Briefcase size={18} /> },
      { label: 'العملاء والفرص', path: '/leads', icon: <MessageSquare size={18} /> },
    ],
  },
  {
    label: 'التحليلات',
    items: [
      { label: 'التقارير', path: '/reports', icon: <FileBarChart2 size={18} /> },
      { label: 'الإشعارات', path: '/notifications', icon: <Bell size={18} /> },
      { label: 'سجل التدقيق', path: '/audit', icon: <ShieldCheck size={18} /> },
    ],
  },
  {
    label: 'النظام',
    items: [
      { label: 'النسخ الاحتياطي', path: '/backup', icon: <HardDriveDownload size={18} /> },
      { label: 'الإعدادات', path: '/settings', icon: <Settings size={18} /> },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { label: 'الرئيسية', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'العقود', path: '/contracts', icon: <FileText size={20} /> },
  { label: 'المالية', path: '/financials', icon: <Wallet size={20} /> },
  { label: 'الصيانة', path: '/maintenance', icon: <Wrench size={20} /> },
  { label: 'الإعدادات', path: '/settings', icon: <Settings size={20} /> },
];

const routeLabels: Record<string, string> = {
  '/': 'لوحة القيادة',
  '/owners': 'الملاك',
  '/properties': 'العقارات والوحدات',
  '/tenants': 'المستأجرون',
  '/contracts': 'العقود',
  '/financials': 'الخزينة والمالية',
  '/invoices': 'الفواتير',
  '/accounting': 'المحاسبة',
  '/maintenance': 'الصيانة',
  '/tasks': 'المهام والزيارات',
  '/leads': 'العملاء والفرص',
  '/notifications': 'الإشعارات',
  '/audit': 'سجل التدقيق',
  '/audit/integrity': 'فحص سلامة البيانات',
  '/backup': 'النسخ الاحتياطي',
  '/settings': 'الإعدادات',
  '/reports': 'مركز التقارير',
  '/system': 'النظام',
  '/hr': 'المستخدمون',
};

const AppShell: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { db, refreshData } = useApp();
  const pendingNotifications = (db.outgoingNotifications || []).filter((item) => item.status === 'PENDING').length;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) navigate('/login');
    };

    void checkAuth();
  }, [navigate]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const currentLabel = useMemo(() => routeLabels[location.pathname] || 'لوحة القيادة', [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/login');
  };

  const handleRefreshNotifications = async () => {
    await refreshData();
    toast.success('تم تحديث البيانات والإشعارات');
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground" dir="rtl">
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-slate-200/70 bg-[linear-gradient(180deg,#fbfcfe_0%,#f5f8fb_48%,#eef3f8_100%)] shadow-[0_30px_70px_rgba(15,23,42,0.12)] transition-transform duration-300 dark:border-slate-800 dark:bg-[linear-gradient(180deg,#152131_0%,#192737_48%,#1b2b3d_100%)] dark:shadow-[0_30px_70px_rgba(2,6,23,0.34)] ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div className="flex h-24 items-center justify-between border-b border-slate-200/70 px-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-500 text-white shadow-brand">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-base font-black text-slate-900 dark:text-white">Rentrix ERP</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">منصة إدارة الأملاك والتشغيل العقاري</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-[22px] border border-white/90 bg-white/82 p-3.5 shadow-brand backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 dark:text-slate-500">المسار اليومي</p>
            <p className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100">تشغيل أكثر كثافة</p>
            <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-400">
              تنقل سريع بين السجلات والعقود والفواتير والتقارير بدون صفحات مشتتة.
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-black tracking-[0.22em] text-slate-400 dark:text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-bold transition-all duration-150 ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-brand ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/10'
                          : 'text-slate-600 hover:bg-white/75 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/7 dark:hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-2xl ${isActive ? 'bg-sky-50 text-sky-600 dark:bg-sky-400/15 dark:text-sky-200' : 'text-slate-400 group-hover:bg-white group-hover:text-slate-700 dark:group-hover:bg-white/7 dark:group-hover:text-white'}`}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight size={14} className="text-sky-500 dark:text-sky-200" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mb-16 border-t border-slate-200/70 p-3 dark:border-slate-800 lg:mb-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-bold text-slate-500 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/75 dark:bg-white/5">
              <LogOut size={18} />
            </span>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center border-b border-white/70 bg-white/82 px-4 py-2.5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/78 lg:px-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="ml-3 rounded-2xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0 flex-1 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 dark:text-slate-500">تشغيل عقاري ومحاسبي مترابط</p>
              <h2 className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-slate-50 lg:text-base">{currentLabel}</h2>
            </div>
            <div className="hidden lg:flex lg:items-center lg:gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium">متصل</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshNotifications}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="تحديث الإشعارات"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="الإشعارات"
            >
              <Bell size={15} />
              {pendingNotifications > 0 && (
                <span className="absolute -left-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingNotifications > 99 ? '99+' : pendingNotifications}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-15 items-center justify-around border-t border-slate-200/70 bg-white/92 px-2 backdrop-blur-xl shadow-[0_-12px_32px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950/88 lg:hidden">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <NavLink key={item.path} to={item.path} className="flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-1">
              <div className={`rounded-2xl p-1.5 transition-all duration-150 ${isActive ? 'bg-slate-950 shadow-brand dark:bg-primary' : ''}`}>
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
              </div>
              <span className={`text-[10px] font-black transition-colors ${isActive ? 'text-slate-950 dark:text-primary' : 'text-slate-400'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default AppShell;
