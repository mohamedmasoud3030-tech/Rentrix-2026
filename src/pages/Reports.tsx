import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Download,
  FileBarChart2,
  Printer,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import Tabs from '../components/ui/Tabs';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import ReportDocumentLayout, {
  ReportLayoutColumn,
  ReportLayoutMetadataItem,
  ReportLayoutSummaryItem,
} from '../components/print/ReportDocumentLayout';
import {
  exportIncomeStatementToPdf,
  exportOwnerLedgerToPdf,
  exportStructuredReportToPdf,
  exportTenantStatementToPdf,
  exportTrialBalanceToPdf,
} from '../services/pdfService';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Owner, Settings } from '../types';

type ReportTab = 'financial' | 'properties' | 'tenants' | 'owners' | 'operations';
type PrintRow = Record<string, string>;

interface ActiveReportConfig {
  title: string;
  metadata: ReportLayoutMetadataItem[];
  summary: ReportLayoutSummaryItem[];
  columns: ReportLayoutColumn[];
  rows: PrintRow[];
  onExport: () => void;
  notes?: string[];
}

const reportTabs = [
  { id: 'financial', label: 'التقارير المالية' },
  { id: 'properties', label: 'تقارير العقارات' },
  { id: 'tenants', label: 'تقارير المستأجرين' },
  { id: 'owners', label: 'كشف حساب المالك' },
  { id: 'operations', label: 'الملخصات التشغيلية' },
];

const currencyValue = (value: number, currency: string) => formatCurrency(Number(value || 0), currency);

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { db, ownerBalances, contractBalances } = useApp();
  const currency = db.settings?.currency || 'OMR';
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const overview = useMemo(() => {
    const now = Date.now();
    const overdueInvoices = db.invoices.filter((invoice) => {
      if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
      return new Date(invoice.dueDate).getTime() < now;
    });

    const expiringContracts = db.contracts.filter((contract) => {
      if (contract.status !== 'ACTIVE') return false;
      const endDate = contract.endDate || contract.end;
      const daysLeft = Math.ceil((new Date(endDate).getTime() - now) / 86400000);
      return daysLeft >= 0 && daysLeft <= 45;
    });

    const openMaintenance = db.maintenanceRecords.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status));
    const totalRevenue = db.receipts.filter((receipt) => receipt.status === 'POSTED').reduce((sum, receipt) => sum + (receipt.amount || 0), 0);

    return {
      overdueInvoices,
      expiringContracts,
      openMaintenance,
      totalRevenue,
    };
  }, [db]);

  const propertyRows = useMemo(() => {
    return db.properties.map((property) => {
      const units = db.units.filter((unit) => unit.propertyId === property.id);
      const unitIds = new Set(units.map((unit) => unit.id));
      const activeContracts = db.contracts.filter((contract) => unitIds.has(contract.unitId) && contract.status === 'ACTIVE');
      const revenue = activeContracts.reduce((sum, contract) => sum + (contract.rent || 0), 0);
      const occupiedUnits = units.filter((unit) => unit.status === 'RENTED').length;
      const occupancyRate = units.length ? Math.round((occupiedUnits / units.length) * 100) : 0;

      return {
        property,
        unitsCount: units.length,
        activeContractsCount: activeContracts.length,
        revenue,
        occupancyRate,
      };
    });
  }, [db]);

  const tenantRows = useMemo(() => {
    const now = Date.now();
    return db.tenants.map((tenant) => {
      const contracts = db.contracts.filter((contract) => contract.tenantId === tenant.id);
      const contractIds = new Set(contracts.map((contract) => contract.id));
      const overdueInvoices = db.invoices.filter((invoice) => {
        if (!contractIds.has(invoice.contractId)) return false;
        if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
        return new Date(invoice.dueDate).getTime() < now;
      });
      const balance = overdueInvoices.reduce((sum, invoice) => sum + Math.max((invoice.amount || 0) + (invoice.taxAmount || 0) - (invoice.paidAmount || 0), 0), 0);

      return {
        tenant,
        contractsCount: contracts.length,
        overdueCount: overdueInvoices.length,
        balance,
      };
    });
  }, [db]);

  const financialRows = useMemo(() => {
    const outstanding = db.invoices
      .filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status))
      .reduce((sum, invoice) => sum + Math.max((invoice.amount || 0) + (invoice.taxAmount || 0) - (invoice.paidAmount || 0), 0), 0);

    const receipts = db.receipts.filter((receipt) => receipt.status === 'POSTED');
    const expenses = db.expenses.filter((expense) => expense.status === 'POSTED');
    const ownerSettlements = db.ownerSettlements.filter((settlement) => settlement.status === 'POSTED');

    return [
      {
        label: 'إجمالي التحصيلات',
        value: currencyValue(receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0), currency),
        status: `${receipts.length.toLocaleString('ar')} سند محصل`,
      },
      {
        label: 'إجمالي المصروفات',
        value: currencyValue(expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0), currency),
        status: `${expenses.length.toLocaleString('ar')} قيد مصروف`,
      },
      {
        label: 'الفواتير المفتوحة',
        value: currencyValue(outstanding, currency),
        status: `${db.invoices.filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)).length.toLocaleString('ar')} فاتورة`,
      },
      {
        label: 'تسويات الملاك',
        value: currencyValue(ownerSettlements.reduce((sum, settlement) => sum + (settlement.amount || 0), 0), currency),
        status: `${ownerSettlements.length.toLocaleString('ar')} حركة تسوية`,
      },
    ];
  }, [db, currency]);

  const operationRows = useMemo(() => {
    const now = Date.now();
    const expiringContracts = db.contracts.filter((contract) => {
      if (contract.status !== 'ACTIVE') return false;
      const endDate = contract.endDate || contract.end;
      const daysLeft = Math.ceil((new Date(endDate).getTime() - now) / 86400000);
      return daysLeft >= 0 && daysLeft <= 45;
    });

    return [
      { label: 'طلبات الصيانة المفتوحة', value: overview.openMaintenance.length.toLocaleString('ar') },
      { label: 'العقود القريبة من الانتهاء', value: expiringContracts.length.toLocaleString('ar') },
      { label: 'الفواتير المتأخرة', value: overview.overdueInvoices.length.toLocaleString('ar') },
      { label: 'الوحدات الشاغرة', value: db.units.filter((unit) => unit.status === 'VACANT').length.toLocaleString('ar') },
    ];
  }, [db, overview]);

  const ownerRows = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();

    return db.owners
      .map((owner) => {
        const properties = db.properties.filter((property) => property.ownerId === owner.id);
        const propertyIds = new Set(properties.map((property) => property.id));
        const units = db.units.filter((unit) => propertyIds.has(unit.propertyId));
        const unitIds = new Set(units.map((unit) => unit.id));
        const contracts = db.contracts.filter((contract) => unitIds.has(contract.unitId));
        const contractIds = new Set(contracts.map((contract) => contract.id));
        const overdueInvoices = db.invoices.filter((invoice) => {
          if (!contractIds.has(invoice.contractId)) return false;
          if (!['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) return false;
          return new Date(invoice.dueDate).getTime() < Date.now();
        });
        const maintenance = db.maintenanceRecords.filter((record) => propertyIds.has(record.propertyId));
        const balance = ownerBalances[owner.id];

        return {
          owner,
          properties,
          units,
          contracts,
          overdueInvoices,
          maintenance,
          balance,
        };
      })
      .filter((row) => {
        if (!q) return true;
        return [row.owner.name, row.owner.phone, row.owner.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      });
  }, [db, ownerBalances, ownerSearch]);

  const selectedOwnerRow = useMemo(() => ownerRows.find((row) => row.owner.id === selectedOwnerId) || ownerRows[0] || null, [ownerRows, selectedOwnerId]);

  const ownerStatementEntries = useMemo(() => {
    if (!selectedOwnerRow) return [];

    const collections = db.receipts
      .filter((receipt) => selectedOwnerRow.contracts.some((contract) => contract.id === receipt.contractId) && receipt.status !== 'VOID')
      .map((receipt) => ({
        id: `receipt-${receipt.id}`,
        date: receipt.dateTime,
        type: 'تحصيل إيجار',
        description: receipt.notes || `سند قبض رقم ${receipt.no || receipt.id.slice(0, 8)}`,
        credit: receipt.amount || 0,
        debit: 0,
      }));

    const expenses = db.expenses
      .filter((expense) => {
        if (expense.status === 'VOID') return false;
        if (expense.contractId && selectedOwnerRow.contracts.some((contract) => contract.id === expense.contractId)) return true;
        if (expense.propertyId && selectedOwnerRow.properties.some((property) => property.id === expense.propertyId)) return true;
        return !!expense.unitId && selectedOwnerRow.units.some((unit) => unit.id === expense.unitId);
      })
      .map((expense) => ({
        id: `expense-${expense.id}`,
        date: expense.dateTime,
        type: 'مصروف / تحميل',
        description: expense.notes || expense.category || 'مصروف',
        credit: 0,
        debit: expense.amount || 0,
      }));

    const settlements = db.ownerSettlements
      .filter((settlement) => settlement.ownerId === selectedOwnerRow.owner.id)
      .map((settlement) => ({
        id: `settlement-${settlement.id}`,
        date: settlement.date,
        type: 'تسوية مالك',
        description: settlement.notes || `تحويل رقم ${settlement.no || settlement.id.slice(0, 8)}`,
        credit: 0,
        debit: settlement.amount || 0,
      }));

    return [...collections, ...expenses, ...settlements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((entry, index, list) => {
        const balance = list.slice(0, list.length - index).reduce((sum, item) => sum + item.credit - item.debit, 0);
        return { ...entry, balance };
      });
  }, [db, selectedOwnerRow]);

  const activeReport = useMemo<ActiveReportConfig | null>(() => {
    const reportDateLabel = `حتى تاريخ ${formatDate(new Date().toISOString())}`;

    if (activeTab === 'financial') {
      const totalOutstanding = db.invoices
        .filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status))
        .reduce((sum, invoice) => sum + Math.max((invoice.amount || 0) + (invoice.taxAmount || 0) - (invoice.paidAmount || 0), 0), 0);
      const totalExpenses = db.expenses.filter((expense) => expense.status === 'POSTED').reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalCollections = db.receipts.filter((receipt) => receipt.status === 'POSTED').reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
      const rows = financialRows.map((row) => ({ label: row.label, value: row.value, status: row.status }));

      return {
        title: 'التقارير المالية',
        metadata: [
          { label: 'اسم التقرير', value: 'ملخص مالي تنفيذي' },
          { label: 'الفترة', value: reportDateLabel },
          { label: 'العملة', value: currency },
          { label: 'عدد القيود', value: (db.receipts.length + db.expenses.length + db.ownerSettlements.length).toLocaleString('ar') },
        ],
        summary: [
          { label: 'إجمالي التحصيل', value: currencyValue(totalCollections, currency) },
          { label: 'إجمالي المصروفات', value: currencyValue(totalExpenses, currency) },
          { label: 'الرصيد المفتوح', value: currencyValue(totalOutstanding, currency) },
        ],
        columns: [
          { key: 'label', label: 'المؤشر' },
          { key: 'value', label: 'القيمة', align: 'left' },
          { key: 'status', label: 'ملاحظة' },
        ],
        rows,
        onExport: () =>
          exportIncomeStatementToPdf(
            {
              title: 'التقارير المالية',
              metadata: [
                { label: 'اسم التقرير', value: 'ملخص مالي تنفيذي' },
                { label: 'الفترة', value: reportDateLabel },
                { label: 'العملة', value: currency },
              ],
              summary: [
                { label: 'إجمالي التحصيل', value: currencyValue(totalCollections, currency) },
                { label: 'إجمالي المصروفات', value: currencyValue(totalExpenses, currency) },
                { label: 'الرصيد المفتوح', value: currencyValue(totalOutstanding, currency) },
              ],
              rows,
              notes: ['يعرض التقرير آخر المؤشرات المالية المجمعة من النظام دون تغيير في منطق المعالجة المحاسبية.'],
            },
            db.settings as Settings,
            reportDateLabel,
          ),
        notes: ['يشمل التقرير التحصيلات، المصروفات، والفواتير المفتوحة حتى تاريخ الطباعة.'],
      };
    }

    if (activeTab === 'properties') {
      const rows = propertyRows.map((row) => ({
        property: row.property.name,
        units: row.unitsCount.toLocaleString('ar'),
        contracts: row.activeContractsCount.toLocaleString('ar'),
        revenue: currencyValue(row.revenue, currency),
      }));

      return {
        title: 'تقارير العقارات',
        metadata: [
          { label: 'اسم التقرير', value: 'أداء العقارات' },
          { label: 'عدد العقارات', value: propertyRows.length.toLocaleString('ar') },
          { label: 'الفترة', value: reportDateLabel },
        ],
        summary: [
          { label: 'إجمالي العقارات', value: propertyRows.length.toLocaleString('ar') },
          { label: 'إجمالي الوحدات', value: db.units.length.toLocaleString('ar') },
          { label: 'إجمالي الإيراد النشط', value: currencyValue(propertyRows.reduce((sum, row) => sum + row.revenue, 0), currency) },
        ],
        columns: [
          { key: 'property', label: 'العقار' },
          { key: 'units', label: 'الوحدات', align: 'left' },
          { key: 'contracts', label: 'العقود النشطة', align: 'left' },
          { key: 'revenue', label: 'الإيراد', align: 'left' },
        ],
        rows,
        onExport: () =>
          exportTrialBalanceToPdf(
            {
              metadata: [
                { label: 'اسم التقرير', value: 'أداء العقارات' },
                { label: 'عدد العقارات', value: propertyRows.length.toLocaleString('ar') },
              ],
              summary: [
                { label: 'إجمالي العقارات', value: propertyRows.length.toLocaleString('ar') },
                { label: 'إجمالي الوحدات', value: db.units.length.toLocaleString('ar') },
                { label: 'إجمالي الإيراد النشط', value: currencyValue(propertyRows.reduce((sum, row) => sum + row.revenue, 0), currency) },
              ],
              rows,
            },
            db.settings as Settings,
            reportDateLabel,
          ),
        notes: ['يعرض التقرير أداء كل عقار من حيث عدد الوحدات والعقود النشطة والإيراد الحالي.'],
      };
    }

    if (activeTab === 'tenants') {
      const rows = tenantRows.map((row) => ({
        tenant: row.tenant.name,
        contracts: row.contractsCount.toLocaleString('ar'),
        overdue: row.overdueCount.toLocaleString('ar'),
        balance: currencyValue(row.balance, currency),
      }));

      return {
        title: 'تقارير المستأجرين',
        metadata: [
          { label: 'اسم التقرير', value: 'وضع المستأجرين' },
          { label: 'عدد المستأجرين', value: tenantRows.length.toLocaleString('ar') },
          { label: 'الفترة', value: reportDateLabel },
        ],
        summary: [
          { label: 'إجمالي المستأجرين', value: tenantRows.length.toLocaleString('ar') },
          { label: 'المستأخرات المفتوحة', value: tenantRows.reduce((sum, row) => sum + row.overdueCount, 0).toLocaleString('ar') },
          { label: 'إجمالي الرصيد المفتوح', value: currencyValue(tenantRows.reduce((sum, row) => sum + row.balance, 0), currency) },
        ],
        columns: [
          { key: 'tenant', label: 'المستأجر' },
          { key: 'contracts', label: 'العقود', align: 'left' },
          { key: 'overdue', label: 'الفواتير المتأخرة', align: 'left' },
          { key: 'balance', label: 'الرصيد المفتوح', align: 'left' },
        ],
        rows,
        onExport: () =>
          exportTenantStatementToPdf(
            {
              title: 'تقارير المستأجرين',
              metadata: [
                { label: 'اسم التقرير', value: 'وضع المستأجرين' },
                { label: 'عدد المستأجرين', value: tenantRows.length.toLocaleString('ar') },
              ],
              summary: [
                { label: 'إجمالي المستأجرين', value: tenantRows.length.toLocaleString('ar') },
                { label: 'إجمالي الرصيد المفتوح', value: currencyValue(tenantRows.reduce((sum, row) => sum + row.balance, 0), currency) },
              ],
              rows,
            },
            db.settings as Settings,
          ),
        notes: ['يعرض التقرير العقود القائمة، الفواتير المتأخرة، والرصد المفتوح لكل مستأجر.'],
      };
    }

    if (activeTab === 'operations') {
      return {
        title: 'الملخصات التشغيلية',
        metadata: [
          { label: 'اسم التقرير', value: 'ملخص تشغيل يومي' },
          { label: 'الفترة', value: reportDateLabel },
          { label: 'عدد المؤشرات', value: operationRows.length.toLocaleString('ar') },
        ],
        summary: [
          { label: 'الصيانة المفتوحة', value: overview.openMaintenance.length.toLocaleString('ar') },
          { label: 'العقود القريبة من الانتهاء', value: overview.expiringContracts.length.toLocaleString('ar') },
          { label: 'الفواتير المتأخرة', value: overview.overdueInvoices.length.toLocaleString('ar') },
        ],
        columns: [
          { key: 'label', label: 'المؤشر' },
          { key: 'value', label: 'القيمة', align: 'left' },
          { key: 'period', label: 'الفترة' },
        ],
        rows: operationRows.map((row) => ({
          label: row.label,
          value: row.value,
          period: reportDateLabel,
        })),
        onExport: () =>
          exportStructuredReportToPdf({
            title: 'الملخصات التشغيلية',
            fileName: 'operations-report.pdf',
            settings: db.settings as Settings,
            reportDateLabel,
            metadata: [
              { label: 'اسم التقرير', value: 'ملخص تشغيل يومي' },
              { label: 'عدد المؤشرات', value: operationRows.length.toLocaleString('ar') },
            ],
            summary: [
              { label: 'الصيانة المفتوحة', value: overview.openMaintenance.length.toLocaleString('ar') },
              { label: 'العقود القريبة من الانتهاء', value: overview.expiringContracts.length.toLocaleString('ar') },
              { label: 'الفواتير المتأخرة', value: overview.overdueInvoices.length.toLocaleString('ar') },
            ],
            columns: [
              { key: 'label', label: 'المؤشر' },
              { key: 'value', label: 'القيمة', align: 'left' },
            ],
            rows: operationRows,
            notes: ['يعرض التقرير المؤشرات التشغيلية اليومية الخاصة بالعقود والصيانة والتحصيل.'],
          }),
        notes: ['تم تجميع هذا الملخص من السجلات التشغيلية الحالية في النظام.'],
      };
    }

    if (activeTab === 'owners' && selectedOwnerRow) {
      const utilityExpenses = db.expenses
        .filter((expense) => ['WATER', 'ELECTRICITY', 'INTERNET'].includes(String(expense.category || '').toUpperCase()))
        .filter(
          (expense) =>
            selectedOwnerRow.properties.some((property) => property.id === expense.propertyId) ||
            selectedOwnerRow.units.some((unit) => unit.id === expense.unitId),
        )
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      const ownerPayload = {
        owner: selectedOwnerRow.owner as Owner,
        data: {
          outstandingBalance: selectedOwnerRow.balance?.net || 0,
          totalCollected: selectedOwnerRow.balance?.collections || 0,
          totalExpenses: selectedOwnerRow.balance?.expenses || 0,
          officeShare: selectedOwnerRow.balance?.officeShare || 0,
          ownerNet: selectedOwnerRow.balance?.net || 0,
          propertiesCount: selectedOwnerRow.properties.length,
          unitsCount: selectedOwnerRow.units.length,
          activeContractsCount: selectedOwnerRow.contracts.filter((contract) => contract.status === 'ACTIVE').length,
          openMaintenanceCount: selectedOwnerRow.maintenance.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status)).length,
          overdueInvoicesCount: selectedOwnerRow.overdueInvoices.length,
          utilityExpenses,
        },
        entries: ownerStatementEntries.map((entry) => ({
          date: entry.date,
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit,
        })),
        settings: db.settings as Settings,
      };

      return {
        title: 'كشف حساب المالك',
        metadata: [
          { label: 'اسم التقرير', value: 'كشف حساب المالك' },
          { label: 'المالك', value: selectedOwnerRow.owner.name },
          { label: 'عدد العقارات', value: selectedOwnerRow.properties.length.toLocaleString('ar') },
          { label: 'عدد الوحدات', value: selectedOwnerRow.units.length.toLocaleString('ar') },
        ],
        summary: [
          { label: 'التحصيلات', value: currencyValue(selectedOwnerRow.balance?.collections || 0, currency) },
          { label: 'المصروفات', value: currencyValue(selectedOwnerRow.balance?.expenses || 0, currency) },
          { label: 'الصافي', value: currencyValue(selectedOwnerRow.balance?.net || 0, currency) },
        ],
        columns: [
          { key: 'date', label: 'التاريخ' },
          { key: 'type', label: 'النوع' },
          { key: 'description', label: 'البيان' },
          { key: 'debit', label: 'مدين', align: 'left' },
          { key: 'credit', label: 'دائن', align: 'left' },
        ],
        rows: ownerStatementEntries.map((entry) => ({
          date: formatDate(entry.date),
          type: entry.type,
          description: entry.description,
          debit: currencyValue(entry.debit, currency),
          credit: currencyValue(entry.credit, currency),
        })),
        onExport: () => exportOwnerLedgerToPdf(ownerPayload),
        notes: ['يعرض هذا التقرير حركة المالك من التحصيلات والمصروفات والتسويات وفق السجلات الحالية.'],
      };
    }

    return null;
  }, [activeTab, currency, db, financialRows, operationRows, overview, ownerStatementEntries, propertyRows, selectedOwnerRow, tenantRows]);

  return (
    <div className="app-page" dir="rtl">
      <PageHeader
        title="مركز التقارير"
        description="مركز موحد للتقارير المالية، العقارية، التشغيلية، وكشوف حساب الملاك مع الطباعة والتصدير الرسمي."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            <ArrowLeft size={15} />
            العودة إلى لوحة القيادة
          </button>
          <button onClick={() => setShowPreview(true)} className="btn btn-secondary" disabled={!activeReport}>
            <Printer size={15} />
            معاينة قبل الطباعة
          </button>
          <button onClick={() => activeReport?.onExport()} className="btn btn-primary" disabled={!activeReport}>
            <Download size={15} />
            تصدير PDF
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard title="إيرادات محصلة" value={currencyValue(overview.totalRevenue, currency)} color="emerald" icon={<Wallet size={18} />} />
        <SummaryStatCard title="فواتير متأخرة" value={overview.overdueInvoices.length.toLocaleString('ar')} color="rose" icon={<ReceiptText size={18} />} />
        <SummaryStatCard title="عقود تنتهي قريبًا" value={overview.expiringContracts.length.toLocaleString('ar')} color="amber" icon={<CalendarClock size={18} />} />
        <SummaryStatCard title="صيانة مفتوحة" value={overview.openMaintenance.length.toLocaleString('ar')} color="blue" icon={<Wrench size={18} />} />
      </div>

      <Card className="p-3 sm:p-4">
        <Tabs tabs={reportTabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as ReportTab)} />
      </Card>

      {activeTab === 'financial' && (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <ReportListCard
            title="التقارير المالية"
            description="مؤشرات التحصيل، المصروفات، الرصيد المفتوح، وتسويات الملاك في شاشة واحدة."
            items={financialRows.map((row) => ({
              label: row.label,
              value: row.value,
              helperText: row.status,
              icon: row.label.includes('تحصيل') ? <TrendingUp size={16} /> : row.label.includes('مصروف') ? <TrendingDown size={16} /> : <Wallet size={16} />,
            }))}
          />

          <Card className="p-4 sm:p-5">
            <div className="mb-3">
              <h3 className="erp-section-title">العقود الأعلى رصيدًا</h3>
              <p className="erp-section-text mt-1">قراءة سريعة للعقود ذات الأرصدة المفتوحة الأعلى داخل النظام.</p>
            </div>
            <TableWrapper>
              <thead>
                <Tr>
                  <Th>العقد</Th>
                  <Th>المستأجر</Th>
                  <Th>الرصيد</Th>
                </Tr>
              </thead>
              <tbody>
                {Object.entries(contractBalances)
                  .sort(([, a], [, b]) => (b.balance || 0) - (a.balance || 0))
                  .slice(0, 8)
                  .map(([contractId, balance]) => {
                    const contract = db.contracts.find((item) => item.id === contractId);
                    const tenant = contract ? db.tenants.find((item) => item.id === contract.tenantId) : undefined;
                    return (
                      <Tr key={contractId}>
                        <Td data-label="العقد">{contract?.no || contractId.slice(0, 8)}</Td>
                        <Td data-label="المستأجر">{tenant?.name || 'غير محدد'}</Td>
                        <Td data-label="الرصيد">{currencyValue(balance.balance || 0, currency)}</Td>
                      </Tr>
                    );
                  })}
              </tbody>
            </TableWrapper>
          </Card>
        </div>
      )}

      {activeTab === 'properties' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="erp-section-title">تقارير العقارات</h3>
            <p className="erp-section-text mt-1">مقارنة الأداء بين العقارات من حيث الوحدات والإشغال والإيراد.</p>
          </div>
          <TableWrapper>
            <thead>
              <Tr>
                <Th>العقار</Th>
                <Th>الوحدات</Th>
                <Th>العقود النشطة</Th>
                <Th>نسبة الإشغال</Th>
                <Th>الإيراد</Th>
              </Tr>
            </thead>
            <tbody>
              {propertyRows.map((row) => (
                <Tr key={row.property.id}>
                  <Td data-label="العقار">{row.property.name}</Td>
                  <Td data-label="الوحدات">{row.unitsCount.toLocaleString('ar')}</Td>
                  <Td data-label="العقود النشطة">{row.activeContractsCount.toLocaleString('ar')}</Td>
                  <Td data-label="نسبة الإشغال">{`${row.occupancyRate.toLocaleString('ar')}%`}</Td>
                  <Td data-label="الإيراد">{currencyValue(row.revenue, currency)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        </Card>
      )}

      {activeTab === 'tenants' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="erp-section-title">تقارير المستأجرين</h3>
            <p className="erp-section-text mt-1">العقود الحالية، الفواتير المتأخرة، والرصيد المفتوح لكل مستأجر.</p>
          </div>
          <TableWrapper>
            <thead>
              <Tr>
                <Th>المستأجر</Th>
                <Th>العقود</Th>
                <Th>الفواتير المتأخرة</Th>
                <Th>الرصيد المفتوح</Th>
              </Tr>
            </thead>
            <tbody>
              {tenantRows.map((row) => (
                <Tr key={row.tenant.id}>
                  <Td data-label="المستأجر">{row.tenant.name}</Td>
                  <Td data-label="العقود">{row.contractsCount.toLocaleString('ar')}</Td>
                  <Td data-label="الفواتير المتأخرة">{row.overdueCount.toLocaleString('ar')}</Td>
                  <Td data-label="الرصيد المفتوح">{currencyValue(row.balance, currency)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrapper>
        </Card>
      )}

      {activeTab === 'owners' && (
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="erp-section-title">كشف حساب المالك</h3>
                <p className="erp-section-text mt-1">اختر المالك ثم راجع الحركة المالية، وصدّر كشف الحساب بصيغة PDF رسمية.</p>
              </div>
            </div>
            <div className="mt-4">
              <SearchFilterBar
                value={ownerSearch}
                onChange={setOwnerSearch}
                placeholder="ابحث باسم المالك أو الهاتف أو البريد"
                rightSlot={
                  <select value={selectedOwnerId} onChange={(event) => setSelectedOwnerId(event.target.value)} className="min-w-[220px]">
                    <option value="">اختر المالك</option>
                    {ownerRows.map((row) => (
                      <option key={row.owner.id} value={row.owner.id}>
                        {row.owner.name}
                      </option>
                    ))}
                  </select>
                }
              />
            </div>
          </Card>

          {selectedOwnerRow ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryStatCard title="العقارات" value={selectedOwnerRow.properties.length.toLocaleString('ar')} color="blue" icon={<Building2 size={18} />} />
                <SummaryStatCard title="الوحدات" value={selectedOwnerRow.units.length.toLocaleString('ar')} color="slate" icon={<Building2 size={18} />} />
                <SummaryStatCard title="التحصيلات" value={currencyValue(selectedOwnerRow.balance?.collections || 0, currency)} color="emerald" icon={<Wallet size={18} />} />
                <SummaryStatCard title="المصروفات" value={currencyValue(selectedOwnerRow.balance?.expenses || 0, currency)} color="amber" icon={<TrendingDown size={18} />} />
                <SummaryStatCard title="الصافي" value={currencyValue(selectedOwnerRow.balance?.net || 0, currency)} color="green" icon={<TrendingUp size={18} />} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <Card className="p-4 sm:p-5">
                  <h4 className="erp-section-title">ملخص المالك</h4>
                  <div className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    <div><span className="font-bold text-slate-900 dark:text-slate-100">الاسم:</span> {selectedOwnerRow.owner.name}</div>
                    <div><span className="font-bold text-slate-900 dark:text-slate-100">الهاتف:</span> {selectedOwnerRow.owner.phone || 'غير متوفر'}</div>
                    <div><span className="font-bold text-slate-900 dark:text-slate-100">البريد:</span> {selectedOwnerRow.owner.email || 'غير متوفر'}</div>
                    <div><span className="font-bold text-slate-900 dark:text-slate-100">الفواتير المتأخرة:</span> {selectedOwnerRow.overdueInvoices.length.toLocaleString('ar')}</div>
                    <div><span className="font-bold text-slate-900 dark:text-slate-100">الصيانة المفتوحة:</span> {selectedOwnerRow.maintenance.filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status)).length.toLocaleString('ar')}</div>
                  </div>
                </Card>

                <Card className="p-4 sm:p-5">
                  <h4 className="erp-section-title">حركة الحساب</h4>
                  <TableWrapper>
                    <thead>
                      <Tr>
                        <Th>التاريخ</Th>
                        <Th>النوع</Th>
                        <Th>البيان</Th>
                        <Th>مدين</Th>
                        <Th>دائن</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {ownerStatementEntries.length === 0 ? (
                        <Tr>
                          <Td data-label="الحالة" colSpan={5}>لا توجد حركات مالية لهذا المالك حاليًا.</Td>
                        </Tr>
                      ) : (
                        ownerStatementEntries.map((entry) => (
                          <Tr key={entry.id}>
                            <Td data-label="التاريخ">{formatDate(entry.date)}</Td>
                            <Td data-label="النوع">{entry.type}</Td>
                            <Td data-label="البيان">{entry.description}</Td>
                            <Td data-label="مدين">{currencyValue(entry.debit, currency)}</Td>
                            <Td data-label="دائن">{currencyValue(entry.credit, currency)}</Td>
                          </Tr>
                        ))
                      )}
                    </tbody>
                  </TableWrapper>
                </Card>
              </div>
            </>
          ) : (
            <Card className="erp-empty">لا توجد بيانات مطابقة للبحث الحالي.</Card>
          )}
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <ReportListCard
            title="الملخصات التشغيلية"
            description="قراءة مركزة للحالات التي تحتاج متابعة يومية من الفريق."
            items={operationRows.map((item) => ({
              label: item.label,
              value: item.value,
              icon: item.label.includes('صيانة') ? <Wrench size={16} /> : item.label.includes('عقود') ? <CalendarClock size={16} /> : <FileBarChart2 size={16} />,
            }))}
          />
          <Card className="p-4 sm:p-5">
            <div className="mb-3">
              <h3 className="erp-section-title">أحدث الطلبات التشغيلية</h3>
              <p className="erp-section-text mt-1">أحدث طلبات الصيانة المفتوحة لسهولة المتابعة اليومية.</p>
            </div>
            <TableWrapper>
              <thead>
                <Tr>
                  <Th>العنوان</Th>
                  <Th>العقار</Th>
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                </Tr>
              </thead>
              <tbody>
                {db.maintenanceRecords
                  .slice()
                  .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
                  .slice(0, 8)
                  .map((record) => {
                    const property = db.properties.find((item) => item.id === record.propertyId);
                    return (
                      <Tr key={record.id}>
                        <Td data-label="العنوان">{record.issueTitle || record.description || 'طلب صيانة'}</Td>
                        <Td data-label="العقار">{property?.name || 'غير محدد'}</Td>
                        <Td data-label="الحالة">{record.status}</Td>
                        <Td data-label="التاريخ">{formatDate(record.requestDate)}</Td>
                      </Tr>
                    );
                  })}
              </tbody>
            </TableWrapper>
          </Card>
        </div>
      )}

      {activeReport && (
        <PrintPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`معاينة التقرير - ${activeReport.title}`}
          onExportPdf={activeReport.onExport}
        >
          <ReportDocumentLayout
            company={db.settings?.company}
            title={activeReport.title}
            metadata={activeReport.metadata}
            summary={activeReport.summary}
            columns={activeReport.columns}
            rows={activeReport.rows}
            notes={activeReport.notes}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
};

const ReportListCard: React.FC<{
  title: string;
  description: string;
  items: Array<{ label: string; value: string; helperText?: string; icon: React.ReactNode }>;
}> = ({ title, description, items }) => (
  <Card className="p-4 sm:p-5">
    <div className="mb-3">
      <h3 className="erp-section-title">{title}</h3>
      <p className="erp-section-text mt-1">{description}</p>
    </div>
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
              {item.icon}
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.label}</div>
              {item.helperText ? <div className="text-xs text-slate-500 dark:text-slate-400">{item.helperText}</div> : null}
            </div>
          </div>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{item.value}</span>
        </div>
      ))}
    </div>
  </Card>
);

export default Reports;
