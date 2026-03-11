// ============================================================
// Rentrix ERP — Single Source of Truth for All Types
// Frontend uses camelCase. Snake_case mapping lives in services.
// ============================================================

// ─────────────────────────────────────────
// 1. AUTH & USERS
// ─────────────────────────────────────────

export type UserRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'EMPLOYEE';

export type PermissionAction =
  | 'VIEW_DASHBOARD'
  | 'MANAGE_OWNERS'
  | 'MANAGE_PROPERTIES'
  | 'MANAGE_TENANTS'
  | 'MANAGE_CONTRACTS'
  | 'MANAGE_FINANCIALS'
  | 'MANAGE_MAINTENANCE'
  | 'VIEW_REPORTS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_USERS'
  | 'VIEW_ACCOUNTING'
  | 'MANAGE_BUDGET'
  | 'MANAGE_LEADS'
  | 'MANAGE_MISSIONS';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  mustChange: boolean;
  createdAt: number;
}

// ─────────────────────────────────────────
// 2. APP SETTINGS & GOVERNANCE
// ─────────────────────────────────────────

export interface AccountMappings {
  accountsReceivable: string;
  ownersPayable: string;
  paymentMethods: {
    CASH: string;
    BANK: string;
    CARD: string;
    [key: string]: string;
  };
  revenue: {
    RENT: string;
    OFFICE_COMMISSION: string;
    [key: string]: string;
  };
  expenseCategories: {
    MAINTENANCE: string;
    UTILITIES: string;
    default: string;
    [key: string]: string;
  };
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  logoDataUrl?: string;
  googleClientId?: string;
  contractAlertDays?: number;
}

export interface Settings {
  id?: number;
  company: CompanyInfo;
  taxRate: number;
  currency: string;
  accountMappings: AccountMappings;
  contractAlertDays?: number;
  googleClientId?: string;
  updatedAt?: number;
  invoiceGraceDays?: number;
  maxLateFees?: number;
  maintenance?: {
    [key: string]: any;
  };
}

export interface Governance {
  id?: number;
  isLocked: boolean;
  financialLockDate: string | null;
  updatedAt?: number;
}

export interface Serials {
  id?: number;
  receipt: number;
  expense: number;
  invoice: number;
  ownerSettlement: number;
  maintenance: number;
  lead: number;
  mission: number;
  journalEntry: number;
}

// ─────────────────────────────────────────
// 3. PROPERTY MANAGEMENT
// ─────────────────────────────────────────

export interface Owner {
  id: string;
  name: string;
  phone: string | null;
  phone2: string | null;
  nationalId: string | null;
  email?: string | null;
  ownerType: 'INDIVIDUAL' | 'COMPANY';
  commissionType: 'RATE' | 'FIXED' | null;
  commissionValue: number;
  commissionRate?: number; // alias used in some pages
  notes: string | null;
  portalToken: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  propertyType: 'BUILDING' | 'VILLA' | 'APARTMENT' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'LAND' | 'OTHER';
  address: string | null;
  city: string | null;
  district: string | null;
  totalUnits: number | null;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;          // derived from unit_number in UI
  unitNumber: string;
  type: string;          // alias for unit_type used in UI
  unitType: 'APARTMENT' | 'STUDIO' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'ROOM' | 'OTHER';
  floor: number | null;
  areaSqm: number | null;
  roomsCount: number | null;
  bathroomsCount: number | null;
  rentDefault: number | null;   // alias for expected_rent used in UI
  expectedRent: number | null;
  status: 'VACANT' | 'RENTED' | 'MAINTENANCE';
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Tenant {
  id: string;
  name: string;         // alias for full_name used across all pages
  fullName: string;
  phone: string | null;
  phone2: string | null;
  nationalId: string | null;
  idNo?: string | null;
  national_id?: string | null;   // legacy alias used in Tenants.tsx
  email: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'BLACKLIST';
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────
// 4. CONTRACTS
// ─────────────────────────────────────────

export interface Contract {
  id: string;
  unitId: string;
  tenantId: string;
  rent: number;
  dueDay: number;
  start: string;        // ISO date string — maps to start_date in DB
  end: string;          // ISO date string — maps to end_date in DB
  deposit: number;      // maps to deposit_amount in DB
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | 'ENDED' | 'SUSPENDED';
  notes: string | null;
  createdAt: number;
  updatedAt: number;

  /**
   * The type of agreement the owner has chosen for this contract.
   *
   * 'FIXED' means the owner is guaranteed a fixed monthly investment amount regardless of rent collected.
   * 'PERCENTAGE' means the owner receives a percentage of the total rent collected (management fee).
   * This field is optional for backwards compatibility with existing contracts.
   */
  ownerAgreementType?: 'FIXED' | 'PERCENTAGE';

  /**
   * The value associated with the owner agreement type. For 'FIXED' it represents the fixed monthly
   * investment amount paid to the owner. For 'PERCENTAGE' it represents the percentage (0-100) of
   * total rent that will be paid as a management fee to the owner. This field is optional for
   * backwards compatibility.
   */
  ownerAgreementValue?: number;
}

// ─────────────────────────────────────────
// 5. FINANCIALS
// ─────────────────────────────────────────

export interface Invoice {
  id: string;
  no: string | null;
  contractId: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'OVERDUE';
  type: 'RENT' | 'MAINTENANCE' | 'DEPOSIT' | 'OTHER';
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  voidedAt: number | null;
}

export interface Receipt {
  id: string;
  no: string | null;
  contractId: string;
  dateTime: string;
  status: 'POSTED' | 'VOID';
  amount: number;
  channel: 'CASH' | 'BANK' | 'CARD' | string;
  ref: string | null;
  notes: string | null;
  createdAt: number;
  voidedAt: number | null;
}

export interface ReceiptAllocation {
  id: string;
  receiptId: string;
  invoiceId: string;
  amount: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  no: string | null;
  propertyId: string | null;
  unitId: string | null;
  contractId: string | null;
  dateTime: string;
  amount: number;
  category: string;
  chargedTo: 'OWNER' | 'OFFICE' | 'TENANT';
  status: 'POSTED' | 'VOID';
  notes: string | null;
  payee?: string | null;
  ref?: string | null;
  createdAt: number;
  voidedAt: number | null;
}

export interface DepositTx {
  id: string;
  contractId: string;
  amount: number;
  type: 'COLLECTION' | 'REFUND' | 'FORFEIT' | 'DEPOSIT_IN' | 'DEPOSIT_RETURN' | 'DEPOSIT_DEDUCT';
  date: string;
  status: 'POSTED' | 'VOID';
  createdAt: number;
}

export interface OwnerSettlement {
  id: string;
  no: string | null;
  ownerId: string;
  amount: number;
  date: string;
  method: string | null;
  notes?: string | null;
  status: 'POSTED' | 'VOID';
  createdAt: number;
}

// ─────────────────────────────────────────
// 6. ACCOUNTING
// ─────────────────────────────────────────

export interface Account {
  id: string;
  no: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId: string | null;
  isParent?: boolean;   // computed in UI
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  no: string | null;
  date: string;
  accountId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  sourceId: string | null;
  entityType: string | null;
  entityId: string | null;
  notes?: string | null;
  createdAt: number;
}

// ─────────────────────────────────────────
// 7. CALCULATED BALANCES (computed, never stored)
// ─────────────────────────────────────────

export interface ContractBalance {
  contractId: string;
  tenantId: string;
  unitId: string;
  balance: number;
  depositBalance: number;
  lastUpdatedAt: number;
}

export interface OwnerBalance {
  ownerId: string;
  collections: number;
  expenses: number;
  settlements: number;
  officeShare: number;
  net: number;
}

export interface AccountBalance {
  accountId: string;
  balance: number;
}

export interface TenantBalance {
  tenantId: string;
  balance: number;
}

export interface AgedDebt {
  tenantName: string;
  totalDue: number;
  current: number;
  thirtyPlus: number;
  sixtyPlus: number;
  ninetyPlus: number;
}

// ─────────────────────────────────────────
// 8. OPERATIONS
// ─────────────────────────────────────────

export interface MaintenanceRecord {
  id: string;
  no: string | null;
  propertyId: string;
  unitId: string | null;
  issueTitle: string;
  description: string | null;
  cost: number;
  status: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
  requestDate: string;
  chargedTo: 'OWNER' | 'OFFICE' | 'TENANT' | null;
  expenseId: string | null;
  invoiceId: string | null;
  completedAt: number | null;
  createdAt: number;
}

export interface AuditLogEntry {
  id: number;
  ts: number;
  userId: string | null;
  username: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  note: string | null;
}

export interface Snapshot {
  id: number;
  ts: number;
  note: string | null;
  data: any;
}

export interface AutoBackup {
  id: number;
  ts: number;
  url: string | null;
  status: string | null;
}

export interface Backup {
  id?: string;
  date?: string | number;
  name?: string;
  size?: number;
  url?: string | null;
}

// ─────────────────────────────────────────
// 9. NOTIFICATIONS & COMMUNICATION
// ─────────────────────────────────────────

export interface NotificationTemplate {
  id: string;
  name: string | null;
  content: string | null;
  type: string | null;
}

export interface OutgoingNotification {
  id: string;
  recipient: string | null;
  recipientName?: string | null;
  recipientContact?: string | null;
  message: string | null;
  status: string | null;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string | null;
  title: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: number;
}

// ─────────────────────────────────────────
// 10. LEADS, LANDS & COMMERCIAL
// ─────────────────────────────────────────

export interface Lead {
  id: string;
  no: string | null;
  name: string;
  phone: string | null;
  email?: string | null;
  source: string | null;
  desiredUnitType?: string | null;
  status: string | null;
  notes: string | null;
  createdAt: number;
}

export interface Land {
  id: string;
  name: string;
  plotNo?: string | null;
  location: string | null;
  area: number | null;
  price: number | null;
  status: string | null;
  createdAt: number;
}

export interface Commission {
  id: string;
  entityType: string | null;
  entityId: string | null;
  type: string | null;
  amount: number | null;
  dealValue: number | null;
  percentage: number | null;
  status: string | null;
  staffId: string | null;
  paidAt: number | null;
  createdAt: number;
}

// ─────────────────────────────────────────
// 11. TASKS & MISSIONS
// ─────────────────────────────────────────

export interface Mission {
  id: string;
  no: string | null;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  date?: string | null;
  time?: string | null;
  leadId?: string | null;
  ownerId?: string | null;
  resultSummary?: string | null;
  notes?: string | null;
  status: string | null;
  createdAt: number;
}

// ─────────────────────────────────────────
// 12. BUDGET
// ─────────────────────────────────────────

export interface BudgetItem {
  id: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  monthlyAmounts: number[]; // array of 12 values
}

export interface Budget {
  id: string;
  year: number;
  items: BudgetItem[];
  createdAt: number;
}

// ─────────────────────────────────────────
// 13. ATTACHMENTS
// ─────────────────────────────────────────

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: number;
}

// ─────────────────────────────────────────
// 14. DATA INTEGRITY
// ─────────────────────────────────────────

export interface AuditIssue {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'ERROR' | 'WARNING' | 'INFO';
  entity?: string;
  entityId?: string;
  entityType?: string;
  entityIdentifier?: string;
  title?: string;
  description: string;
  recommendation?: string;
  resolutionPath?: string;
}

// ─────────────────────────────────────────
// 15. DATABASE — single shape for entire app state
// ─────────────────────────────────────────

export interface Database {
  settings: Settings;
  governance: Governance;
  serials: Serials;
  auth: { users: User[] };
  owners: Owner[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  contracts: Contract[];
  invoices: Invoice[];
  receipts: Receipt[];
  receiptAllocations: ReceiptAllocation[];
  expenses: Expense[];
  depositTxs: DepositTx[];
  ownerSettlements: OwnerSettlement[];
  maintenanceRecords: MaintenanceRecord[];
  auditLog: AuditLogEntry[];
  snapshots: Snapshot[];
  autoBackups: AutoBackup[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  notificationTemplates: NotificationTemplate[];
  outgoingNotifications: OutgoingNotification[];
  appNotifications: AppNotification[];
  leads: Lead[];
  lands: Land[];
  commissions: Commission[];
  missions: Mission[];
  budgets: Budget[];
  attachments: Attachment[];
  backups: Backup[];
  // Calculated balances (populated by AppContext after fetch)
  ownerBalances: OwnerBalance[];
  accountBalances: AccountBalance[];
  contractBalances: ContractBalance[];
  tenantBalances: TenantBalance[];
  kpiSnapshots: any[];
}

export type Color = "blue" | "info" | "success" | "warning" | "danger" | "emerald" | "amber" | "rose" | "slate" | "red";
