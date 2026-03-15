import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  BadgeDollarSign,
  Bell,
  Briefcase,
  Building2,
  Calculator,
  ChevronLeft,
  FileBarChart2,
  FileText,
  HardDriveDownload,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  MapPinned,
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
  Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../contexts/AppContext';
import CommandPalette, { CommandItem } from '../shared/CommandPalette';
import { PermissionAction, UserRole } from '../../types';
import {
  applyBrandTheme,
  getStoredTheme,
  hexToRgba,
  resolveBrandingFromSettings,
  setStoredTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
} from '../../utils/branding';

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: PermissionAction;
  roles?: UserRole[];
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
      { label: 'الأراضي', path: '/lands', icon: <MapPinned size={18} /> },
      { label: 'الخريطة العقارية', path: '/map', icon: <MapPinned size={18} /> },
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
      { label: 'العمولات', path: '/commissions', icon: <BadgeDollarSign size={18} /> },
      { label: 'المحاسبة', path: '/accounting', icon: <Calculator size={18} />, permission: 'VIEW_ACCOUNTING' },
      { label: 'كشف حساب المالك', path: '/owner-ledger', icon: <FileText size={18} /> },
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
      { label: 'سلامة البيانات', path: '/audit/integrity', icon: <ShieldCheck size={18} />, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'النظام',
    items: [
      { label: 'الإعدادات', path: '/settings', icon: <Settings size={18} />, permission: 'MANAGE_SETTINGS' },
      { label: 'النسخ الاحتياطي', path: '/backup', icon: <HardDriveDownload size={18} /> },
      { label: 'النظام', path: '/system', icon: <Settings size={18} />, permission: 'MANAGE_SETTINGS' },
      { label: 'المستخدمون (HR)', path: '/hr', icon: <Users size={18} />, roles: ['ADMIN'] },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { label: 'الرئيسية', path: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'العقود', path: '/contracts', icon: <FileText size={18} /> },
  { label: 'المالية', path: '/financials', icon: <Wallet size={18} /> },
  { label: 'الصيانة', path: '/maintenance', icon: <Wrench size={18} /> },
  { label: 'التقارير', path: '/reports', icon: <FileBarChart2 size={18} /> },
];

const routeLabels: Record<string, string> = {
  '/': 'لوحة القيادة',
  '/owners': 'الملاك',
  '/properties': 'العقارات والوحدات',
  '/lands': 'الأراضي',
  '/map': 'الخريطة العقارية',
  '/tenants': 'المستأجرون',
  '/contracts': 'العقود',
  '/financials': 'الخزينة والمالية',
  '/commissions': 'العمولات',
  '/invoices': 'الفواتير',
  '/accounting': 'المحاسبة',
  '/owner-ledger': 'كشف حساب المالك',
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

const quickActions: NavItem[] = [
  { label: 'عقد جديد', path: '/contracts?new=1', icon: <FileText size={15} /> },
  { label: 'فاتورة جديدة', path: '/invoices?new=1', icon: <Receipt size={15} /> },
  { label: 'مهمة ميدانية', path: '/tasks?new=1', icon: <Briefcase size={15} /> },
  { label: 'تذكرة صيانة', path: '/maintenance?new=1', icon: <Wrench size={15} /> },
];

const AppShell: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme('light'));
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { db, refreshData, canAccess, currentUser } = useApp();
  const pendingNotifications = (db.outgoingNotifications || []).filter((item) => item.status === 'PENDING').length;
  const brand = useMemo(() => resolveBrandingFromSettings(db.settings), [db.settings]);
  const logoUrl = brand.logoUrl || db.settings?.company?.logoDataUrl || db.settings?.company?.logo || '';
  const iconSurfaceStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${hexToRgba(brand.primaryColor, 0.88)} 0%, ${brand.primaryColor} 58%, ${hexToRgba(brand.primaryColor, 0.7)} 100%)`,
    }),
    [brand.primaryColor],
  );

  useEffect(() => {
    applyBrandTheme(theme, brand.primaryColor);
    setStoredTheme(theme);
  }, [brand.primaryColor, theme]);

  useEffect(() => {
    const storedTheme = typeof window === 'undefined' ? null : window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!storedTheme && brand.defaultTheme !== theme) {
      setTheme(brand.defaultTheme);
    }
  }, [brand.defaultTheme, theme]);

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

  useEffect(() => {
    document.title = `${currentLabel} | ${brand.appName}`;
  }, [brand.appName, currentLabel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const canViewItem = useCallback((item: NavItem) => {
    if (item.roles?.length) return !!currentUser && item.roles.includes(currentUser.role);
    if (item.permission) return canAccess(item.permission);
    return true;
  }, [canAccess, currentUser]);

  const visibleNavGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({ ...group, items: group.items.filter(canViewItem) }))
        .filter((group) => group.items.length > 0),
    [canViewItem],
  );

  const visibleBottomNavItems = useMemo(() => bottomNavItems.filter(canViewItem), [canViewItem]);
  const visibleQuickActions = useMemo(() => quickActions.filter(canViewItem), [canViewItem]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const commandItems: CommandItem[] = useMemo(() => {
    const navItems = visibleNavGroups.flatMap((group) => group.items.map((item) => ({ ...item, badge: group.label })));
    const quick = visibleQuickActions.map((item) => ({ ...item, badge: 'إجراء سريع' }));
    const extraRoutes: CommandItem[] = [
      { label: 'الأراضي', path: '/lands', icon: null as any, badge: 'العقارات' },
      { label: 'الخريطة العقارية', path: '/map', icon: null as any, badge: 'العقارات' },
      { label: 'العمولات', path: '/commissions', icon: null as any, badge: 'المالية' },
      { label: 'كشف حساب المالك', path: '/owner-ledger', icon: null as any, badge: 'المالية' },
      { label: 'فحص سلامة البيانات', path: '/audit/integrity', icon: null as any, badge: 'التحليلات' },
    ].filter(canViewItem);

    const deduped = new Map<string, CommandItem>();
    [...quick, ...navItems, ...extraRoutes].forEach((item) => {
      if (!deduped.has(item.path)) deduped.set(item.path, item);
    });

    return Array.from(deduped.values());
  }, [canViewItem, visibleNavGroups, visibleQuickActions]);

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
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[20rem] flex-col border-l border-slate-200/70 bg-[linear-gradient(180deg,#fcfdff_0%,#f6f9fd_34%,#eef4fb_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.14)] transition-transform duration-300 dark:border-slate-800 dark:bg-[linear-gradient(180deg,#131e2d_0%,#182434_44%,#1b2a3b_100%)] dark:shadow-[0_30px_80px_rgba(2,6,23,0.42)] ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[18px] text-white shadow-brand" style={iconSurfaceStyle}>
              {logoUrl ? <img src={logoUrl} alt={brand.companyName} className="h-full w-full object-cover" /> : <Building2 size={18} />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{brand.appName}</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{brand.tagline}</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-3">
          <div className="rounded-[24px] border border-white/90 bg-white/84 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 dark:text-slate-500">{brand.companyName}</p>
            <p className="mt-2 text-base font-black text-slate-900 dark:text-slate-100">{brand.reportHeaderText}</p>
            <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-400">
              {brand.tagline}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {visibleNavGroups.map((group) => (
            <section key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="mb-2 flex w-full items-center justify-between rounded-[14px] px-2 py-1 text-[10px] font-black tracking-[0.22em] text-slate-400 transition hover:bg-white/70 dark:text-slate-500 dark:hover:bg-white/5"
              >
                <span>{group.label}</span>
                <ChevronLeft size={12} className={`transition-transform ${collapsedGroups[group.label] ? '-rotate-90' : ''}`} />
              </button>

              <div className={`space-y-1 ${collapsedGroups[group.label] ? 'hidden' : 'block'}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.98))] text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(15,23,42,0.72))] dark:text-white dark:ring-white/10'
                          : 'text-slate-600 hover:bg-white/86 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/7 dark:hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-2xl ${
                            isActive
                              ? 'bg-sky-50 text-sky-600 shadow-sm dark:bg-sky-400/15 dark:text-sky-200'
                              : 'text-slate-400 group-hover:bg-white group-hover:text-slate-700 dark:group-hover:bg-white/7 dark:group-hover:text-white'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {isActive ? <ChevronLeft size={14} className="text-sky-500 dark:text-sky-200" /> : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="mb-16 border-t border-slate-200/70 p-3 dark:border-slate-800 lg:mb-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/75 dark:bg-white/5">
              <LogOut size={17} />
            </span>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/70 px-3 py-3 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 sm:px-4 lg:px-6">
          <div className="flex items-start gap-3 rounded-[30px] border border-slate-200/80 bg-white/84 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/78 sm:px-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 dark:text-slate-500">مسار تشغيلي موحد</p>
                    <h2 className="truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[1.05rem]">{currentLabel}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">مسار سريع</span>
                      <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">تصفية فورية</span>
                      <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">عرض/تصدير</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 lg:inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium">متصل</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                      <button
                        type="button"
                        onClick={handleRefreshNotifications}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="تحديث البيانات"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCommandOpen(true)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="لوحة الأوامر (Ctrl/Cmd + K)"
                      >
                        <Menu size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/notifications')}
                        className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="الإشعارات"
                      >
                        <Bell size={15} />
                        {pendingNotifications > 0 ? (
                          <span className="absolute -left-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {pendingNotifications > 99 ? '99+' : pendingNotifications}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
                      >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {visibleQuickActions.map((action) => (
                    <button
                      key={action.path}
                      onClick={() => navigate(action.path)}
                      className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96))] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-brand dark:border-slate-700 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.86),rgba(51,65,85,0.9))]"
                    >
                      <Plus size={14} />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/70 bg-white/90 px-2 py-2 backdrop-blur-xl shadow-[0_-10px_24px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950/88 lg:hidden">
        {visibleBottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <NavLink key={item.path} to={item.path} className="flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5">
              <div className={`rounded-2xl p-2 transition-all ${isActive ? 'bg-slate-950 shadow-sm dark:bg-primary' : 'bg-slate-100/80 dark:bg-slate-900/60'}`}>
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
              </div>
              <span className={`text-[10px] font-black transition-colors ${isActive ? 'text-slate-950 dark:text-primary' : 'text-slate-400'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <CommandPalette
        isOpen={isCommandOpen}
        items={commandItems}
        onClose={() => setIsCommandOpen(false)}
        onSelect={(item) => navigate(item.path)}
      />
    </div>
  );
};

export default AppShell;

