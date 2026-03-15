import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  MapPinned,
  Menu,
  MessageSquare,
  Moon,
  PanelRightClose,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
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

const SHELL_COLLAPSE_KEY = 'rentrix-shell-collapsed';

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

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'مدير النظام',
  MANAGER: 'مدير المكتب',
  ACCOUNTANT: 'المحاسبة',
  EMPLOYEE: 'مستخدم تشغيلي',
};

const AppShell: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SHELL_COLLAPSE_KEY) === '1';
  });
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
      background: `linear-gradient(135deg, ${hexToRgba(brand.primaryColor, 0.88)} 0%, ${brand.primaryColor} 58%, ${hexToRgba(brand.primaryColor, 0.72)} 100%)`,
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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SHELL_COLLAPSE_KEY, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

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

  const canViewItem = useCallback(
    (item: NavItem) => {
      if (item.roles?.length) return !!currentUser && item.roles.includes(currentUser.role);
      if (item.permission) return canAccess(item.permission);
      return true;
    },
    [canAccess, currentUser],
  );

  const visibleNavGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({ ...group, items: group.items.filter(canViewItem) }))
        .filter((group) => group.items.length > 0),
    [canViewItem],
  );

  const visibleBottomNavItems = useMemo(() => bottomNavItems.filter(canViewItem), [canViewItem]);

  const currentNavMeta = useMemo(() => {
    for (const group of visibleNavGroups) {
      for (const item of group.items) {
        const isExact = location.pathname === item.path;
        const isNested = item.path !== '/' && location.pathname.startsWith(`${item.path}/`);
        if (isExact || isNested) {
          return { label: item.label, group: group.label, path: item.path };
        }
      }
    }
    return { label: routeLabels[location.pathname] || 'لوحة القيادة', group: 'الرئيسية', path: location.pathname };
  }, [location.pathname, visibleNavGroups]);

  const currentLabel = currentNavMeta.label;

  useEffect(() => {
    document.title = `${currentLabel} | ${brand.appName}`;
  }, [brand.appName, currentLabel]);

  const breadcrumbs = useMemo(() => {
    const items = [{ label: 'الرئيسية', path: '/' }];
    if (currentNavMeta.group !== 'الرئيسية') items.push({ label: currentNavMeta.group });
    if (location.pathname !== '/') items.push({ label: currentNavMeta.label });
    return items;
  }, [currentNavMeta, location.pathname]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const commandItems: CommandItem[] = useMemo(() => {
    const navItems = visibleNavGroups.flatMap((group) => group.items.map((item) => ({ ...item, badge: group.label })));
    const deduped = new Map<string, CommandItem>();

    navItems.forEach((item) => {
      if (!deduped.has(item.path)) deduped.set(item.path, item);
    });

    return Array.from(deduped.values());
  }, [visibleNavGroups]);

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
      {isSidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} /> : null}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex border-l border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,248,245,0.98))] shadow-[0_30px_70px_rgba(15,23,42,0.08)] transition-all duration-300 dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.98))] dark:shadow-[0_30px_70px_rgba(2,6,23,0.42)] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} ${isSidebarCollapsed ? 'w-[5.75rem] lg:w-[5.75rem]' : 'w-[18.75rem] lg:w-[18.75rem]'} lg:relative lg:translate-x-0`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-200/80 p-3 dark:border-slate-800/80">
            <div className="rounded-[26px] border border-slate-200/80 bg-white/92 p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/84">
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} gap-3`}>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] text-white shadow-brand" style={iconSurfaceStyle}>
                    {logoUrl ? <img src={logoUrl} alt={brand.companyName} className="h-full w-full object-cover" /> : <Building2 size={18} />}
                  </div>
                  {!isSidebarCollapsed ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-white">{brand.appName}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{brand.tagline}</p>
                    </div>
                  ) : null}
                </div>

                {!isSidebarCollapsed ? (
                  <div className="hidden items-center gap-1 lg:flex">
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      title="طي الشريط الجانبي"
                    >
                      <PanelRightClose size={16} />
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
                >
                  <X size={18} />
                </button>
              </div>

              {!isSidebarCollapsed ? (
                <div className="mt-3 rounded-[22px] border border-slate-200/75 bg-slate-50/90 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/55">
                  <p className="text-[10px] font-extrabold tracking-[0.16em] text-slate-400 dark:text-slate-500">هوية المكتب</p>
                  <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100">{brand.companyName}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{roleLabels[currentUser?.role || 'EMPLOYEE']}</div>
                </div>
              ) : (
                <div className="mt-3 hidden justify-center lg:flex">
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title="توسيع الشريط الجانبي"
                  >
                    <ChevronLeft size={16} className="rotate-180" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {visibleNavGroups.map((group) => (
              <section key={group.label} className="space-y-1.5">
                {!isSidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="mb-1 flex w-full items-center justify-between px-2 py-1 text-[10px] font-extrabold tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    <span>{group.label}</span>
                    <ChevronLeft size={12} className={`transition-transform ${collapsedGroups[group.label] ? '-rotate-90' : ''}`} />
                  </button>
                ) : (
                  <div className="px-2">
                    <div className="h-px rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
                  </div>
                )}

                <div className={`space-y-1 ${!isSidebarCollapsed && collapsedGroups[group.label] ? 'hidden' : 'block'}`}>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      title={item.label}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-bold transition-all ${
                          isSidebarCollapsed ? 'justify-center px-0' : ''
                        } ${
                          isActive
                            ? 'bg-slate-950 text-white shadow-sm dark:bg-primary/15 dark:text-sky-100'
                            : 'text-slate-600 hover:bg-white/92 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] transition-all ${
                              isActive
                                ? 'bg-white/12 text-white dark:bg-sky-500/10 dark:text-sky-100'
                                : 'bg-slate-100/85 text-slate-500 group-hover:bg-slate-950/5 group-hover:text-slate-900 dark:bg-slate-900/90 dark:text-slate-300 dark:group-hover:bg-slate-800 dark:group-hover:text-white'
                            }`}
                          >
                            {item.icon}
                          </span>
                          {!isSidebarCollapsed ? (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {isActive ? <ChevronLeft size={14} className="text-current" /> : null}
                            </>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </section>
            ))}
          </nav>

          <div className="border-t border-slate-200/80 p-3 dark:border-slate-800/80">
            <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between gap-3'} rounded-[22px] border border-slate-200/80 bg-white/92 p-2.5 dark:border-slate-800/80 dark:bg-slate-900/84`}>
              <button
                type="button"
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${isSidebarCollapsed ? 'w-10' : 'px-3'}`}
                title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {!isSidebarCollapsed ? <span>{theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span> : null}
              </button>

              <button
                onClick={handleLogout}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 ${isSidebarCollapsed ? 'w-10' : 'px-3'}`}
                title="تسجيل الخروج"
              >
                <LogOut size={16} />
                {!isSidebarCollapsed ? <span>تسجيل الخروج</span> : null}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 lg:px-6">
          <div className="rounded-[30px] border border-slate-200/85 bg-white/90 px-4 py-4 shadow-brand backdrop-blur-xl dark:border-slate-800/85 dark:bg-slate-900/88">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-slate-200/80 bg-slate-50 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
                >
                  <Menu size={18} />
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    {breadcrumbs.map((item, index) => (
                      <React.Fragment key={`${item.label}-${index}`}>
                        {index > 0 ? <ChevronLeft size={12} className="text-slate-300 dark:text-slate-600" /> : null}
                        {item.path ? (
                          <button type="button" onClick={() => navigate(item.path!)} className="transition-colors hover:text-slate-700 dark:hover:text-slate-300">
                            {item.label}
                          </button>
                        ) : (
                          <span>{item.label}</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-[1.45rem] font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[1.65rem]">{currentLabel}</h1>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-300">
                      <Sparkles size={12} />
                      {currentNavMeta.group}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    مساحة عمل يومية أكثر تنظيمًا ووضوحًا، مع تنقّل مؤسسي هادئ يدعم العمل المكتبي المكثف.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCommandOpen(true)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Menu size={15} />
                  الأوامر
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ctrl K</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshNotifications}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  title="تحديث البيانات"
                >
                  <RefreshCw size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/notifications')}
                  className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  title="الإشعارات"
                >
                  <Bell size={15} />
                  {pendingNotifications > 0 ? (
                    <span className="absolute -left-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingNotifications > 99 ? '99+' : pendingNotifications}
                    </span>
                  ) : null}
                </button>

                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-sm font-bold text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-slate-300 lg:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  متصل
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 pb-5 pt-4 sm:px-4 lg:px-6">
          <Outlet />
        </main>
      </div>

      <div className="fixed bottom-3 left-3 right-3 z-40 rounded-[26px] border border-slate-200/85 bg-white/92 px-2 py-2 shadow-brand backdrop-blur-xl dark:border-slate-800/85 dark:bg-slate-950/88 lg:hidden">
        <div className="flex items-center justify-around gap-1">
          {visibleBottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <NavLink key={item.path} to={item.path} className="flex min-w-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5">
                <div className={`rounded-2xl p-2.5 transition-all ${isActive ? 'bg-slate-950 shadow-sm dark:bg-primary/18' : 'bg-slate-100/85 dark:bg-slate-900/80'}`}>
                  <span className={isActive ? 'text-white dark:text-sky-100' : 'text-slate-400'}>{item.icon}</span>
                </div>
                <span className={`text-[10px] font-black transition-colors ${isActive ? 'text-slate-950 dark:text-sky-100' : 'text-slate-400'}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
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
