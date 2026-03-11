import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { User, Settings, Database, PermissionAction, ContractBalance, OwnerBalance, AccountBalance, TenantBalance, Governance } from '../types';
import { sanitizePhoneNumber } from '../utils/helpers';
import { supabase } from '../services/db';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { financeService } from '../services/financeService';
import { fetchUserProfile, initGoogleClient, signIn, signOut } from '../services/googleAuth';
import { loadFromDrive, syncToDrive } from '../services/driveSync';

const emptySettings: Settings = {
  company: { name: '', address: '', phone: '', email: '', logo: '', contractAlertDays: 30 },
  taxRate: 0,
  currency: 'OMR',
  accountMappings: {
    accountsReceivable: '',
    ownersPayable: '',
    paymentMethods: { CASH: '', BANK: '', CARD: '' },
    revenue: { RENT: '', OFFICE_COMMISSION: '' },
    expenseCategories: { MAINTENANCE: '', UTILITIES: '', default: '' },
  },
  invoiceGraceDays: 0,
  maxLateFees: 0,
};

const emptyGovernance: Governance = { isLocked: false, financialLockDate: null };

const emptyDb: Database = {
  settings: emptySettings,
  governance: emptyGovernance,
  auth: { users: [] },
  owners: [], properties: [], units: [], tenants: [], contracts: [],
  invoices: [], receipts: [], receiptAllocations: [], expenses: [],
  maintenanceRecords: [], depositTxs: [], auditLog: [],
  ownerSettlements: [], serials: {} as any, snapshots: [], accounts: [], journalEntries: [],
  autoBackups: [], ownerBalances: [], accountBalances: [], kpiSnapshots: [],
  contractBalances: [], tenantBalances: [], notificationTemplates: [],
  outgoingNotifications: [], appNotifications: [], leads: [], lands: [],
  commissions: [], missions: [], budgets: [], attachments: [], backups: [],
};

interface AppContextType {
  db: Database;
  currentUser: User | null;
  isReady: boolean;
  isReadOnly: boolean;
  refreshData: () => Promise<void>;
  contractBalances: Record<string, ContractBalance>;
  ownerBalances: Record<string, OwnerBalance>;
  accountBalances: Record<string, AccountBalance>;
  tenantBalances: Record<string, TenantBalance>;
  auth: {
    login: (u: string, p: string) => Promise<any>;
    logout: () => void;
    addUser: (user: any, pass: string) => Promise<any>;
    updateUser: (id: string, updates: any) => Promise<any>;
    changePassword: (id: string, newPass: string) => Promise<any>;
    forcePasswordReset: (id: string) => Promise<any>;
  };
  dataService: {
    add: (table: keyof Database, data: any) => Promise<any>;
    update: (table: keyof Database, id: string, data: any) => Promise<void>;
    remove: (table: keyof Database, id: string) => Promise<void>;
  };
  financeService: {
    addReceiptWithAllocations: (receipt: any, allocations: any) => Promise<void>;
    addExpense: (data: any) => Promise<void>;
    addInvoice: (data: any) => Promise<void>;
    addDepositTx: (data: any) => Promise<void>;
    addOwnerSettlement: (data: any) => Promise<void>;
    voidReceipt: (id: string) => Promise<void>;
    voidExpense: (id: string) => Promise<void>;
    voidInvoice: (id: string) => Promise<void>;
    generateMonthlyInvoices: () => Promise<number>;
    addManualJournalVoucher: (data: any) => Promise<void>;
    payoutCommission: (id: string) => Promise<void>;
    voidDepositTx: (id: string) => Promise<void>;
    voidOwnerSettlement: (id: string) => Promise<void>;
  };
  canAccess: (action: PermissionAction) => boolean;
  rebuildFinancials: () => Promise<void>;
  createBackup: () => Promise<string>;
  createSnapshot: (note: string) => Promise<void>;
  restoreBackup: (json: string) => Promise<void>;
  wipeData: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  updateGovernance: (updates: Partial<Governance>) => Promise<void>;
  generateOwnerPortalLink: (ownerId: string) => Promise<string>;
  generateNotifications: () => Promise<number>;
  sendWhatsApp: (phone: string, message: string) => void;
  googleUser: any | null;
  googleSignIn: () => void;
  googleSignOut: () => void;
  syncToGoogleDrive: () => Promise<void>;
  restoreFromGoogleDrive: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const FETCH_TABLES = [
  'settings', 'users', 'owners', 'properties', 'units', 'tenants', 'contracts',
  'invoices', 'receipts', 'receipt_allocations', 'expenses', 'maintenance_records',
  'deposit_txs', 'audit_log', 'governance', 'owner_settlements', 'serials',
  'snapshots', 'accounts', 'journal_entries', 'auto_backups', 'notification_templates',
  'outgoing_notifications', 'app_notifications', 'leads', 'lands', 'commissions',
  'missions', 'budgets', 'attachments',
] as const;

const RESET_TABLES = [
  'receipt_allocations', 'receipts', 'invoices', 'journal_entries', 'expenses',
  'deposit_txs', 'owner_settlements', 'maintenance_records', 'contracts', 'units',
  'properties', 'tenants', 'owners', 'attachments', 'budgets', 'missions',
  'commissions', 'lands', 'leads', 'outgoing_notifications', 'notification_templates',
  'app_notifications', 'snapshots', 'audit_log', 'auto_backups',
] as const;

const RESTORE_TABLES = [
  'owners', 'properties', 'units', 'tenants', 'contracts', 'invoices', 'receipts',
  'receipt_allocations', 'expenses', 'maintenance_records', 'deposit_txs',
  'owner_settlements', 'audit_log', 'snapshots', 'accounts', 'journal_entries',
  'auto_backups', 'notification_templates', 'outgoing_notifications', 'app_notifications',
  'leads', 'lands', 'commissions', 'missions', 'budgets', 'attachments',
] as const;

const SINGLETON_TABLES = ['settings', 'governance', 'serials'] as const;

const DEFAULT_SERIALS = {
  id: 1,
  receipt: 1000,
  expense: 1000,
  invoice: 1000,
  ownerSettlement: 1000,
  maintenance: 1000,
  lead: 1000,
  mission: 1000,
  journalEntry: 1000,
};

const GOOGLE_TOKEN_KEY = 'googleAccessToken';
const GOOGLE_USER_KEY = 'googleUserProfile';

const toCamelCaseStr = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const toSnakeCaseStr = (str: string) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toCamelCaseObj = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toCamelCaseObj);
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [toCamelCaseStr(key), toCamelCaseObj(value)]));
};

const toSnakeCaseObj = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toSnakeCaseObj);
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [toSnakeCaseStr(key), toSnakeCaseObj(value)]));
};

const isUuidLike = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{32,36}$/i.test(value);

const sortRowsByIdType = (rows: any[]) => {
  const uuidRows = rows.filter((row) => isUuidLike(row?.id));
  const nonUuidRows = rows.filter((row) => !isUuidLike(row?.id));
  return { uuidRows, nonUuidRows };
};

const calculateBalances = (data: any) => {
  const ownerMap = new Map<string, any>();
  const accMap = new Map<string, number>();
  const conMap = new Map<string, number>();
  const tenantMap = new Map<string, number>();

  (data.owners || []).forEach((o: any) => ownerMap.set(o.id, { ownerId: o.id, collections: 0, expenses: 0, settlements: 0, officeShare: 0, net: 0 }));

  const sourceToOwner = new Map<string, string>();
  const unitToProp = new Map<string, any>((data.units || []).map((u: any) => [u.id, (data.properties || []).find((p: any) => p.id === u.propertyId)]));
  const contractToOwner = new Map<string, string | undefined>((data.contracts || []).map((c: any) => [c.id, unitToProp.get(c.unitId)?.ownerId]));
  const contractToTenant = new Map<string, string | undefined>((data.contracts || []).map((c: any) => [c.id, c.tenantId]));

  (data.receipts || []).forEach((r: any) => {
    const ownerId = contractToOwner.get(r.contractId);
    if (ownerId) sourceToOwner.set(r.id, ownerId);
  });
  (data.expenses || []).forEach((e: any) => {
    if (!e.contractId) return;
    const ownerId = contractToOwner.get(e.contractId);
    if (ownerId) sourceToOwner.set(e.id, ownerId);
  });
  (data.ownerSettlements || []).forEach((s: any) => sourceToOwner.set(s.id, s.ownerId));

  const mappings = data.settings?.accountMappings || {};

  (data.journalEntries || []).forEach((je: any) => {
    const currentAccountBalance = accMap.get(je.accountId) || 0;
    accMap.set(je.accountId, currentAccountBalance + (je.type === 'DEBIT' ? je.amount : -je.amount));

    if (je.accountId === mappings.accountsReceivable && je.entityType === 'CONTRACT' && je.entityId) {
      const currentContractBalance = conMap.get(je.entityId) || 0;
      conMap.set(je.entityId, currentContractBalance + (je.type === 'DEBIT' ? je.amount : -je.amount));

      const tenantId = contractToTenant.get(je.entityId);
      if (tenantId) {
        const currentTenantBalance = tenantMap.get(tenantId) || 0;
        tenantMap.set(tenantId, currentTenantBalance + (je.type === 'DEBIT' ? je.amount : -je.amount));
      }
    }

    const ownerId = sourceToOwner.get(je.sourceId);
    if (!ownerId || !ownerMap.has(ownerId)) return;

    const balance = ownerMap.get(ownerId);
    if (je.accountId === mappings.ownersPayable) {
      const amount = je.type === 'CREDIT' ? je.amount : -je.amount;
      balance.net += amount;

      const isReceipt = (data.receipts || []).some((r: any) => r.id === je.sourceId);
      const isExpense = (data.expenses || []).some((e: any) => e.id === je.sourceId);
      const isSettlement = (data.ownerSettlements || []).some((s: any) => s.id === je.sourceId);

      if (isReceipt) balance.collections += je.type === 'CREDIT' ? je.amount : 0;
      else if (isExpense) balance.expenses += je.type === 'DEBIT' ? je.amount : 0;
      else if (isSettlement) balance.settlements += je.type === 'DEBIT' ? je.amount : 0;
    } else if (mappings.revenue && je.accountId === mappings.revenue.OFFICE_COMMISSION) {
      balance.officeShare += je.amount;
    }
  });

  return {
    ownerBalances: Array.from(ownerMap.values()),
    accountBalances: Array.from(accMap.entries()).map(([accountId, balance]) => ({ accountId, balance })),
    contractBalances: Array.from(conMap.entries()).map(([contractId, balance]) => {
      const contract = (data.contracts || []).find((current: any) => current.id === contractId);
      return { contractId, tenantId: contract?.tenantId || '', unitId: contract?.unitId || '', balance, depositBalance: 0, lastUpdatedAt: Date.now() };
    }),
    tenantBalances: Array.from(tenantMap.entries()).map(([tenantId, balance]) => ({ tenantId, balance })),
  };
};

const normalizeBackupPayload = (json: string) => {
  const parsed = JSON.parse(json);
  if (parsed?.data && typeof parsed.data === 'object') return parsed.data;
  return parsed;
};

const hydrateSettings = (rawSettings: any): Settings => {
  const company = rawSettings?.company || {};

  return {
    ...emptySettings,
    ...rawSettings,
    company: {
      ...emptySettings.company,
      ...company,
    },
    contractAlertDays: rawSettings?.contractAlertDays ?? company?.contractAlertDays ?? emptySettings.company.contractAlertDays,
    googleClientId: rawSettings?.googleClientId ?? company?.googleClientId ?? '',
    invoiceGraceDays: rawSettings?.invoiceGraceDays ?? company?.invoiceGraceDays ?? emptySettings.invoiceGraceDays,
    maxLateFees: rawSettings?.maxLateFees ?? company?.maxLateFees ?? emptySettings.maxLateFees,
  };
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Database>(emptyDb);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [googleUser, setGoogleUser] = useState<any | null>(() => {
    const cached = sessionStorage.getItem(GOOGLE_USER_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => sessionStorage.getItem(GOOGLE_TOKEN_KEY));

  const refreshData = useCallback(async () => {
    try {
      const allData: any = {};
      const results = await Promise.all(
        FETCH_TABLES.map(async (table) => {
          const { data, error } = await supabase.from(table).select('*');
          return { table, data, error };
        })
      );

      for (const { table, data, error } of results) {
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          allData[toCamelCaseStr(table)] = [];
          continue;
        }
        allData[toCamelCaseStr(table)] = (data || []).map(toCamelCaseObj);
      }

      allData.settings = hydrateSettings(allData.settings[0] || emptySettings);
      allData.governance = allData.governance[0] || emptyGovernance;
      allData.serials = allData.serials[0] || DEFAULT_SERIALS;
      allData.auth = { users: allData.users || [] };

      const { ownerBalances, accountBalances, contractBalances, tenantBalances } = calculateBalances(allData);
      allData.ownerBalances = ownerBalances;
      allData.accountBalances = accountBalances;
      allData.contractBalances = contractBalances;
      allData.tenantBalances = tenantBalances;
      allData.backups = (allData.autoBackups || []).map((backup: any) => ({
        id: String(backup.id),
        date: backup.ts,
        name: backup.status || 'نسخة احتياطية',
        url: backup.url || null,
      }));

      setDb(allData);

      const currentUserId = sessionStorage.getItem('currentUserId');
      const user = allData.auth.users.find((entry: User) => entry.id === currentUserId) || null;
      setCurrentUser(user);
      setIsReady(true);
    } catch (error) {
      console.error('Fatal: Could not load data from Supabase.', error);
      toast.error('فشل تحميل بيانات التطبيق. يرجى المحاولة مرة أخرى.');
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const clientId = db.settings?.googleClientId || db.settings?.company?.googleClientId;
    initGoogleClient(async (tokenResponse: any) => {
      if (!tokenResponse?.access_token) {
        toast.error('تعذر إتمام تسجيل الدخول إلى Google.');
        return;
      }

      sessionStorage.setItem(GOOGLE_TOKEN_KEY, tokenResponse.access_token);
      setGoogleAccessToken(tokenResponse.access_token);
      const profile = await fetchUserProfile(tokenResponse.access_token);
      if (profile) {
        sessionStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(profile));
        setGoogleUser(profile);
        toast.success('تم ربط Google Drive بنجاح.');
      }
    }, clientId || '');
  }, [db.settings?.googleClientId, db.settings?.company?.googleClientId]);

  const contractBalances = useMemo(() => Object.fromEntries((db.contractBalances || []).map((balance) => [balance.contractId, balance])), [db.contractBalances]);
  const ownerBalances = useMemo(() => Object.fromEntries((db.ownerBalances || []).map((balance) => [balance.ownerId, balance])), [db.ownerBalances]);
  const accountBalances = useMemo(() => Object.fromEntries((db.accountBalances || []).map((balance) => [balance.accountId, balance])), [db.accountBalances]);
  const tenantBalances = useMemo(() => Object.fromEntries((db.tenantBalances || []).map((balance) => [balance.tenantId, balance])), [db.tenantBalances]);

  const isReadOnly = useMemo(() => {
    if (!currentUser || !db.governance) return true;
    if (currentUser.role === 'ADMIN') return false;
    return db.governance.isLocked;
  }, [currentUser, db.governance]);

  const canAccess = useCallback((action: PermissionAction): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'MANAGER') {
      const managerAllowed: PermissionAction[] = ['VIEW_DASHBOARD', 'MANAGE_PROPERTIES', 'MANAGE_CONTRACTS', 'MANAGE_FINANCIALS', 'VIEW_REPORTS'];
      return managerAllowed.includes(action);
    }
    const userAllowed: PermissionAction[] = ['VIEW_DASHBOARD', 'MANAGE_PROPERTIES', 'MANAGE_CONTRACTS'];
    return userAllowed.includes(action);
  }, [currentUser]);

  const deleteAllRows = useCallback(async (table: string) => {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }, []);

  const replaceTableRows = useCallback(async (table: string, rows: any[]) => {
    await deleteAllRows(table);
    if (!rows.length) return;
    const snakeRows = toSnakeCaseObj(rows);
    const normalizedRows = Array.isArray(snakeRows) ? snakeRows : [snakeRows];
    const { uuidRows, nonUuidRows } = sortRowsByIdType(normalizedRows);

    if (nonUuidRows.length) {
      const strippedRows = nonUuidRows.map((row) => {
        const nextRow = { ...row };
        delete nextRow.id;
        return nextRow;
      });
      const { error } = await supabase.from(table).insert(strippedRows);
      if (error) throw error;
    }

    if (uuidRows.length) {
      const { error } = await supabase.from(table).insert(uuidRows);
      if (error) throw error;
    }
  }, [deleteAllRows]);

  const updateSettings = async (updates: Partial<Settings>) => {
    const nextSettings = hydrateSettings({ ...db.settings, ...updates, updatedAt: Date.now() });
    const payload = toSnakeCaseObj({
      id: 1,
      company: {
        ...nextSettings.company,
        contractAlertDays: nextSettings.contractAlertDays,
        googleClientId: nextSettings.googleClientId,
        invoiceGraceDays: nextSettings.invoiceGraceDays,
        maxLateFees: nextSettings.maxLateFees,
      },
      taxRate: nextSettings.taxRate,
      currency: nextSettings.currency,
      accountMappings: nextSettings.accountMappings,
      updatedAt: nextSettings.updatedAt,
    });
    const { error } = await supabase.from('settings').upsert(payload);
    if (error) {
      toast.error('تعذر حفظ الإعدادات.');
      throw error;
    }
    await refreshData();
    toast.success('تم حفظ الإعدادات بنجاح.');
  };

  const updateGovernance = async (updates: Partial<Governance>) => {
    const nextGovernance = { ...db.governance, ...updates, updatedAt: Date.now() };
    const payload = toSnakeCaseObj(nextGovernance);
    const { error } = await supabase.from('governance').upsert({ id: 1, ...payload });
    if (error) {
      toast.error('تعذر حفظ إعدادات الحوكمة.');
      throw error;
    }
    await refreshData();
    toast.success('تم تحديث الحوكمة المالية.');
  };

  const createBackup = async () => {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      exportedBy: currentUser?.username || 'system',
      data: {
        settings: db.settings,
        governance: db.governance,
        serials: db.serials,
        owners: db.owners,
        properties: db.properties,
        units: db.units,
        tenants: db.tenants,
        contracts: db.contracts,
        invoices: db.invoices,
        receipts: db.receipts,
        receiptAllocations: db.receiptAllocations,
        expenses: db.expenses,
        maintenanceRecords: db.maintenanceRecords,
        depositTxs: db.depositTxs,
        ownerSettlements: db.ownerSettlements,
        snapshots: db.snapshots,
        accounts: db.accounts,
        journalEntries: db.journalEntries,
        autoBackups: db.autoBackups,
        notificationTemplates: db.notificationTemplates,
        outgoingNotifications: db.outgoingNotifications,
        appNotifications: db.appNotifications,
        leads: db.leads,
        lands: db.lands,
        commissions: db.commissions,
        missions: db.missions,
        budgets: db.budgets,
        attachments: db.attachments,
      },
    };

    await supabase.from('auto_backups').insert({ ts: Date.now(), url: null, status: 'LOCAL_EXPORT' });
    await refreshData();
    return JSON.stringify(payload, null, 2);
  };

  const createSnapshot = async (note: string) => {
    const toastId = toast.loading('جارٍ إنشاء نقطة الاستعادة...');
    try {
      await supabase.from('snapshots').insert({ id: crypto.randomUUID(), ts: Date.now(), note, data: db });
      await refreshData();
      toast.success('تم إنشاء نقطة الاستعادة بنجاح.', { id: toastId });
    } catch (error) {
      toast.error('فشل إنشاء نقطة الاستعادة.', { id: toastId });
      throw error;
    }
  };

  const restoreBackup = async (json: string) => {
    const toastId = toast.loading('جارٍ استعادة النسخة الاحتياطية...');
    try {
      const backupData = normalizeBackupPayload(json);

      for (const table of RESET_TABLES) {
        await deleteAllRows(table);
      }

      const settingsPayload = toSnakeCaseObj(backupData.settings || db.settings || emptySettings);
      const governancePayload = toSnakeCaseObj(backupData.governance || db.governance || emptyGovernance);
      const serialsPayload = toSnakeCaseObj(backupData.serials || db.serials || DEFAULT_SERIALS);

      await supabase.from('settings').upsert({ id: 1, ...settingsPayload });
      await supabase.from('governance').upsert({ id: 1, ...governancePayload });
      await supabase.from('serials').upsert({ id: 1, ...serialsPayload });

      const tableKeyMap: Record<string, string> = {
        owners: 'owners',
        properties: 'properties',
        units: 'units',
        tenants: 'tenants',
        contracts: 'contracts',
        invoices: 'invoices',
        receipts: 'receipts',
        receipt_allocations: 'receiptAllocations',
        expenses: 'expenses',
        maintenance_records: 'maintenanceRecords',
        deposit_txs: 'depositTxs',
        owner_settlements: 'ownerSettlements',
        audit_log: 'auditLog',
        snapshots: 'snapshots',
        accounts: 'accounts',
        journal_entries: 'journalEntries',
        auto_backups: 'autoBackups',
        notification_templates: 'notificationTemplates',
        outgoing_notifications: 'outgoingNotifications',
        app_notifications: 'appNotifications',
        leads: 'leads',
        lands: 'lands',
        commissions: 'commissions',
        missions: 'missions',
        budgets: 'budgets',
        attachments: 'attachments',
      };

      for (const table of RESTORE_TABLES) {
        const key = tableKeyMap[table];
        const rows = Array.isArray(backupData[key]) ? backupData[key] : [];
        await replaceTableRows(table, rows);
      }

      await refreshData();
      toast.success('تمت استعادة النسخة الاحتياطية بنجاح.', { id: toastId });
    } catch (error) {
      console.error('Restore backup failed', error);
      toast.error('فشلت استعادة النسخة الاحتياطية.', { id: toastId });
      throw error;
    }
  };

  const wipeData = async () => {
    const toastId = toast.loading('جارٍ مسح بيانات التشغيل...');
    try {
      for (const table of RESET_TABLES) {
        await deleteAllRows(table);
      }

      await supabase.from('governance').upsert({ id: 1, is_locked: false, financial_lock_date: null, updated_at: Date.now() });
      await supabase.from('serials').upsert(toSnakeCaseObj(DEFAULT_SERIALS));
      await refreshData();
      toast.success('تم مسح بيانات التشغيل وإعادة ضبط النظام.', { id: toastId });
    } catch (error) {
      console.error('Wipe data failed', error);
      toast.error('تعذر مسح بيانات النظام.', { id: toastId });
      throw error;
    }
  };

  const generateOwnerPortalLink = async (ownerId: string): Promise<string> => {
    const baseUrl = window.location.href.split('#')[0];
    const token = btoa(`${ownerId}:${Date.now()}`);
    await dataService.update('owners', ownerId, { portalToken: token }, currentUser);
    await refreshData();
    return `${baseUrl}#/portal/${ownerId}?auth=${token}`;
  };

  const googleSignIn = () => {
    if (!(db.settings?.googleClientId || db.settings?.company?.googleClientId)) {
      toast.error('أدخل Google Client ID أولاً من إعدادات النظام.');
      return;
    }
    signIn();
  };

  const googleSignOut = () => {
    signOut(googleAccessToken || '');
    sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
    sessionStorage.removeItem(GOOGLE_USER_KEY);
    setGoogleAccessToken(null);
    setGoogleUser(null);
    toast.success('تم تسجيل الخروج من Google Drive.');
  };

  const syncToGoogleDrive = async () => {
    if (!googleAccessToken) {
      toast.error('يرجى تسجيل الدخول إلى Google أولاً.');
      return;
    }

    const toastId = toast.loading('جارٍ مزامنة النسخة الاحتياطية مع Google Drive...');
    try {
      const backupJson = await createBackup();
      await syncToDrive(normalizeBackupPayload(backupJson), googleAccessToken);
      await supabase.from('auto_backups').insert({ ts: Date.now(), url: 'google-drive', status: 'GOOGLE_DRIVE_SYNCED' });
      await refreshData();
      toast.success('تمت مزامنة النسخة الاحتياطية مع Google Drive.', { id: toastId });
    } catch (error) {
      console.error('Google sync failed', error);
      toast.error('تعذرت مزامنة Google Drive.', { id: toastId });
      throw error;
    }
  };

  const restoreFromGoogleDrive = async () => {
    if (!googleAccessToken) {
      toast.error('يرجى تسجيل الدخول إلى Google أولاً.');
      return;
    }

    const json = await loadFromDrive(googleAccessToken);
    await restoreBackup(json);
  };

  const value: AppContextType = {
    db,
    currentUser,
    isReady,
    isReadOnly,
    refreshData,
    contractBalances,
    ownerBalances,
    accountBalances,
    tenantBalances,
    auth: {
      login: async (username, password) => {
        const result = await authService.login(username, password);
        if (result.ok) await refreshData();
        return result;
      },
      logout: () => authService.logout(),
      addUser: (user, pass) => authService.addUser(user, pass).finally(refreshData),
      updateUser: (id, updates) => authService.updateUser(id, updates).finally(refreshData),
      changePassword: (id, newPass) => authService.changePassword(id, newPass).finally(refreshData),
      forcePasswordReset: (id) => authService.forcePasswordReset(id).finally(refreshData),
    },
    dataService: {
      add: (table, data) => dataService.add(table, data, currentUser, db.settings).finally(refreshData),
      update: (table, id, data) => dataService.update(table, id, data, currentUser).finally(refreshData),
      remove: (table, id) => dataService.remove(table, id, currentUser).finally(refreshData),
    },
    financeService: {
      addReceiptWithAllocations: (receipt, allocations) => financeService.addReceiptWithAllocations(receipt, allocations, currentUser, db.settings).finally(refreshData),
      addExpense: (data) => financeService.addExpense(data, currentUser, db.settings).finally(refreshData),
      addInvoice: (data) => financeService.addInvoice(data, currentUser, db.settings).finally(refreshData),
      addDepositTx: (data) => financeService.addDepositTx(data, currentUser, db.settings).finally(refreshData),
      addOwnerSettlement: (data) => financeService.addOwnerSettlement(data, currentUser, db.settings).finally(refreshData),
      voidReceipt: (id) => financeService.voidReceipt(id, currentUser).finally(refreshData),
      voidExpense: (id) => financeService.voidExpense(id, currentUser).finally(refreshData),
      voidInvoice: (id) => financeService.voidInvoice(id, currentUser).finally(refreshData),
      voidDepositTx: (id) => financeService.voidDepositTx(id, currentUser).finally(refreshData),
      voidOwnerSettlement: (id) => financeService.voidOwnerSettlement(id, currentUser).finally(refreshData),
      generateMonthlyInvoices: () => financeService.generateMonthlyInvoices(currentUser, db.settings).finally(refreshData),
      addManualJournalVoucher: (data: any) => financeService.addManualJournalVoucher(data, currentUser).finally(refreshData),
      payoutCommission: (id: string) => financeService.payoutCommission(id, currentUser, db.settings).finally(refreshData),
    },
    canAccess,
    rebuildFinancials: async () => {
      const toastId = toast.loading('جارٍ تحديث القيود والمؤشرات المالية...');
      try {
        await refreshData();
        toast.success('تم تحديث البيانات المالية.', { id: toastId });
      } catch (error) {
        toast.error('فشل تحديث البيانات المالية.', { id: toastId });
      }
    },
    createBackup,
    createSnapshot,
    restoreBackup,
    wipeData,
    updateSettings,
    updateGovernance,
    generateOwnerPortalLink,
    generateNotifications: () => financeService.generateNotifications(db.settings).finally(refreshData),
    sendWhatsApp: (phone, message) => {
      const cleanPhone = sanitizePhoneNumber(phone);
      if (!cleanPhone) {
        toast.error('رقم الهاتف غير صالح');
        return;
      }
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    },
    googleUser,
    googleSignIn,
    googleSignOut,
    syncToGoogleDrive,
    restoreFromGoogleDrive,
  };

  if (!isReady) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse">جارٍ تحضير النظام...</p>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
