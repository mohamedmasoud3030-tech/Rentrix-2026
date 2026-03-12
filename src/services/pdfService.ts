import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cairoFontBase64 } from './cairoFontBase64';
import {
  Settings,
  Contract,
  Invoice,
  Expense,
  Receipt,
  MaintenanceRecord,
  Tenant,
  Unit,
  Property,
  Owner,
} from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { tafneeta } from '../utils/numberToArabic';

type Alignment = 'right' | 'left' | 'center';

export interface ReportMetadataItem {
  label: string;
  value: string;
}

export interface ReportSummaryItem {
  label: string;
  value: string;
  helperText?: string;
}

export interface ReportTableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  align?: Alignment;
  formatter?: (value: unknown, row: T) => string;
}

export interface ReportPdfPayload<T extends Record<string, unknown> = Record<string, unknown>> {
  title: string;
  fileName: string;
  settings: Settings;
  metadata?: ReportMetadataItem[];
  summary?: ReportSummaryItem[];
  columns?: ReportTableColumn<T>[];
  rows?: T[];
  notes?: string[];
  orientation?: 'p' | 'l';
  generatedAt?: string;
  reportDateLabel?: string;
}

interface OwnerLedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
}

interface OwnerLedgerPayload {
  owner: Owner;
  data: {
    outstandingBalance: number;
    totalCollected: number;
    totalExpenses: number;
    officeShare: number;
    ownerNet: number;
    propertiesCount?: number;
    unitsCount?: number;
    activeContractsCount?: number;
    openMaintenanceCount?: number;
    overdueInvoicesCount?: number;
    utilityExpenses?: number;
  };
  entries: OwnerLedgerEntry[];
  settings: Settings;
  dateRangeLabel?: string;
}

const safeText = (value: unknown): string => {
  if (value === null || typeof value === 'undefined' || value === '') return '-';
  return String(value);
};

const resolveCurrency = (settings?: Settings) => settings?.currency || 'OMR';

const detectImageFormat = (dataUrl?: string) => {
  if (!dataUrl) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
};

const createArabicPdf = (orientation: 'p' | 'l' = 'p') => {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  try {
    doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
    doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
    doc.setFont('Cairo');
  } catch (error) {
    console.error('تعذر تحميل خط PDF العربي', error);
  }

  return doc;
};

const drawHeader = (doc: jsPDF, settings: Settings, title: string, generatedAt: string, reportDateLabel?: string) => {
  const company = settings.company || { name: '', address: '', phone: '', email: '', logo: '' };
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(216, 223, 232);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 10, pageWidth - 24, 34, 4, 4, 'FD');

  if (company.logoDataUrl) {
    try {
      doc.addImage(company.logoDataUrl, detectImageFormat(company.logoDataUrl), 16, 15, 15, 15);
    } catch {
      // ignore invalid logo
    }
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text(safeText(company.name), pageWidth - 16, 18, { align: 'right' });
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Rentrix ERP', pageWidth - 16, 24, { align: 'right' });
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`تاريخ الطباعة: ${generatedAt}`, pageWidth - 16, 36, { align: 'right' });

  const contact = [company.address, company.phone, company.email].filter(Boolean).join(' | ');
  if (contact) {
    doc.text(contact, pageWidth / 2, 40, { align: 'center' });
  }

  if (reportDateLabel) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(12, 47, pageWidth - 24, 9, 3, 3, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(8.5);
    doc.text(reportDateLabel, pageWidth - 16, 53, { align: 'right' });
  }

  return reportDateLabel ? 62 : 50;
};

const ensurePageSpace = (doc: jsPDF, currentY: number, minimumHeight: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + minimumHeight <= pageHeight - 18) return currentY;
  doc.addPage();
  return 20;
};

const drawMetadata = (doc: jsPDF, y: number, metadata: ReportMetadataItem[] = []) => {
  if (!metadata.length) return y;

  let currentY = ensurePageSpace(doc, y, 28);
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 30) / 2;

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('بيانات التقرير', pageWidth - 12, currentY, { align: 'right' });

  currentY += 4;
  metadata.forEach((item, index) => {
    const isRightColumn = index % 2 === 0;
    const rowIndex = Math.floor(index / 2);
    const x = isRightColumn ? pageWidth - 12 - boxWidth : 12;
    const boxY = currentY + rowIndex * 14;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, boxY, boxWidth, 11, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + boxWidth - 4, boxY + 4, { align: 'right' });
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(safeText(item.value), x + boxWidth - 4, boxY + 8.4, { align: 'right' });
  });

  return currentY + Math.ceil(metadata.length / 2) * 14 + 6;
};

const drawSummary = (doc: jsPDF, y: number, summary: ReportSummaryItem[] = []) => {
  if (!summary.length) return y;

  let currentY = ensurePageSpace(doc, y, 32);
  const pageWidth = doc.internal.pageSize.getWidth();
  const columns = Math.min(summary.length, 3);
  const cardWidth = (pageWidth - 24 - (columns - 1) * 4) / columns;

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('الملخص التنفيذي', pageWidth - 12, currentY, { align: 'right' });

  currentY += 4;
  summary.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 12 + column * (cardWidth + 4);
    const boxY = currentY + row * 18;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, boxY, cardWidth, 15, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + cardWidth - 3, boxY + 4, { align: 'right' });
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(safeText(item.value), x + cardWidth - 3, boxY + 9, { align: 'right' });
    if (item.helperText) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(item.helperText, x + cardWidth - 3, boxY + 13, { align: 'right' });
    }
  });

  return currentY + Math.ceil(summary.length / columns) * 18 + 4;
};

const drawNotes = (doc: jsPDF, y: number, notes: string[] = []) => {
  if (!notes.length) return y;

  let currentY = ensurePageSpace(doc, y, notes.length * 7 + 10);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ملاحظات التقرير', pageWidth - 12, currentY, { align: 'right' });
  currentY += 5;

  notes.forEach((note) => {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, currentY, pageWidth - 24, 8, 3, 3, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(note, pageWidth - 16, currentY + 5.2, { align: 'right' });
    currentY += 10;
  });

  return currentY;
};

const addFooters = (doc: jsPDF, settings: Settings, generatedAt: string) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Rentrix ERP • ${generatedAt}`, pageWidth - 12, pageHeight - 8, { align: 'right' });
    doc.text(`الصفحة ${page} من ${totalPages}`, 12, pageHeight - 8, { align: 'left' });
  }
};

const buildTableBody = <T extends Record<string, unknown>>(rows: T[], columns: ReportTableColumn<T>[]) =>
  rows.map((row) =>
    columns.map((column) => {
      const rawValue = row[String(column.key)];
      return column.formatter ? column.formatter(rawValue, row) : safeText(rawValue);
    }),
  );

export const exportStructuredReportToPdf = <T extends Record<string, unknown>>(payload: ReportPdfPayload<T>) => {
  const generatedAt = payload.generatedAt || formatDate(new Date().toISOString());
  const doc = createArabicPdf(payload.orientation || 'p');

  let currentY = drawHeader(doc, payload.settings, payload.title, generatedAt, payload.reportDateLabel);
  currentY = drawMetadata(doc, currentY, payload.metadata);
  currentY = drawSummary(doc, currentY, payload.summary);
  currentY = drawNotes(doc, currentY, payload.notes);

  if (payload.columns?.length && payload.rows?.length) {
    autoTable(doc, {
      startY: currentY + 2,
      head: [payload.columns.map((column) => column.label)],
      body: buildTableBody(payload.rows, payload.columns),
      theme: 'grid',
      margin: { left: 12, right: 12, bottom: 20 },
      styles: {
        font: 'Cairo',
        fontSize: 8.2,
        halign: 'right',
        cellPadding: { top: 2.6, right: 2.8, bottom: 2.6, left: 2.8 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'right',
      },
      alternateRowStyles: {
        fillColor: [250, 252, 254],
      },
      columnStyles: payload.columns.reduce<Record<number, { halign: Alignment }>>((acc, column, index) => {
        acc[index] = { halign: column.align || 'right' };
        return acc;
      }, {}),
    });
  }

  addFooters(doc, payload.settings, generatedAt);
  doc.save(payload.fileName);
};

export const exportRentRollToPdf = (units: Array<Record<string, unknown>>, totals: Record<string, unknown>, settings: Settings) => {
  exportStructuredReportToPdf({
    title: 'تقرير قائمة الإيجارات الحالية',
    fileName: 'rent-roll.pdf',
    settings,
    reportDateLabel: `تاريخ التقرير: ${formatDate(new Date().toISOString())}`,
    metadata: [
      { label: 'اسم التقرير', value: 'قائمة الإيجارات' },
      { label: 'إجمالي الوحدات', value: safeText(totals.totalUnits || units.length) },
      { label: 'الوحدات المؤجرة', value: safeText(totals.occupiedUnits || '-') },
      { label: 'الوحدات الشاغرة', value: safeText(totals.vacantUnits || '-') },
    ],
    summary: [
      { label: 'إجمالي الإيجارات', value: formatCurrency(Number(totals.totalRent || 0), resolveCurrency(settings)) },
      { label: 'إجمالي التأمينات', value: formatCurrency(Number(totals.totalDeposits || 0), resolveCurrency(settings)) },
      { label: 'إجمالي الرصيد المستحق', value: formatCurrency(Number(totals.totalBalance || 0), resolveCurrency(settings)) },
    ],
    columns: [
      { key: 'unit', label: 'الوحدة' },
      { key: 'status', label: 'الحالة' },
      { key: 'tenant', label: 'المستأجر' },
      { key: 'endDate', label: 'نهاية العقد' },
      { key: 'rent', label: 'الإيجار', align: 'left', formatter: (value) => formatCurrency(Number(value || 0), resolveCurrency(settings)) },
      { key: 'deposit', label: 'التأمين', align: 'left', formatter: (value) => formatCurrency(Number(value || 0), resolveCurrency(settings)) },
      { key: 'balance', label: 'المستحق', align: 'left', formatter: (value) => formatCurrency(Number(value || 0), resolveCurrency(settings)) },
    ],
    rows: units,
  });
};

export const exportReceiptToPdf = (receipt: Receipt, tenant: Tenant | undefined, settings: Settings) => {
  exportStructuredReportToPdf({
    title: 'سند قبض',
    fileName: `receipt-${receipt.no || receipt.id.slice(0, 8)}.pdf`,
    settings,
    reportDateLabel: `تاريخ السند: ${formatDate(receipt.dateTime)}`,
    metadata: [
      { label: 'رقم السند', value: safeText(receipt.no || receipt.id.slice(0, 8)) },
      { label: 'المستأجر', value: safeText(tenant?.name) },
      { label: 'القناة', value: safeText(receipt.channel) },
      { label: 'الحالة', value: safeText(receipt.status) },
    ],
    summary: [
      { label: 'المبلغ المحصل', value: formatCurrency(receipt.amount, resolveCurrency(settings)) },
      { label: 'التفقيط', value: tafneeta(receipt.amount) },
    ],
    notes: [receipt.notes ? `وذلك عن: ${receipt.notes}` : 'لا توجد ملاحظات إضافية.'],
  });
};

export const exportExpenseToPdf = (expense: Expense, settings: Settings) => {
  exportStructuredReportToPdf({
    title: 'سند صرف',
    fileName: `expense-${expense.no || expense.id.slice(0, 8)}.pdf`,
    settings,
    reportDateLabel: `تاريخ السند: ${formatDate(expense.dateTime)}`,
    metadata: [
      { label: 'رقم السند', value: safeText(expense.no || expense.id.slice(0, 8)) },
      { label: 'الفئة', value: safeText(expense.category) },
      { label: 'المستفيد', value: safeText(expense.payee || expense.ref) },
      { label: 'جهة التحميل', value: safeText(expense.chargedTo) },
    ],
    summary: [
      { label: 'قيمة الصرف', value: formatCurrency(expense.amount, resolveCurrency(settings)) },
      { label: 'التفقيط', value: tafneeta(expense.amount) },
    ],
    notes: [expense.notes || 'لا توجد ملاحظات إضافية.'],
  });
};

export const exportContractToPdf = (
  contract: Contract,
  tenant: Tenant | undefined,
  unit: Unit | undefined,
  property: Property | undefined,
  owner: Owner | undefined,
  settings: Settings,
) => {
  exportStructuredReportToPdf({
    title: 'عقد إيجار',
    fileName: `contract-${contract.no || contract.id.slice(0, 8)}.pdf`,
    settings,
    reportDateLabel: `الفترة: ${formatDate(contract.start)} إلى ${formatDate(contract.end)}`,
    metadata: [
      { label: 'رقم العقد', value: safeText(contract.no || contract.id.slice(0, 8)) },
      { label: 'المستأجر', value: safeText(tenant?.name) },
      { label: 'الوحدة', value: safeText(unit?.name || unit?.unitNumber) },
      { label: 'العقار', value: safeText(property?.name) },
      { label: 'المالك', value: safeText(owner?.name) },
      { label: 'الحالة', value: safeText(contract.status) },
    ],
    summary: [
      { label: 'الإيجار الشهري', value: formatCurrency(contract.rent, resolveCurrency(settings)) },
      { label: 'التأمين', value: formatCurrency(contract.deposit, resolveCurrency(settings)) },
      { label: 'يوم الاستحقاق', value: safeText(contract.dueDay) },
    ],
    notes: [contract.notes || 'تم إصدار هذا العقد من نظام Rentrix ERP.'],
  });
};

export const exportInvoiceToPdf = (invoice: Invoice, tenant: Tenant | undefined, contract: Contract | undefined, settings: Settings) => {
  exportStructuredReportToPdf({
    title: 'فاتورة مطالبة',
    fileName: `invoice-${invoice.no || invoice.id.slice(0, 8)}.pdf`,
    settings,
    reportDateLabel: `تاريخ الاستحقاق: ${formatDate(invoice.dueDate)}`,
    metadata: [
      { label: 'رقم الفاتورة', value: safeText(invoice.no || invoice.id.slice(0, 8)) },
      { label: 'المستأجر', value: safeText(tenant?.name) },
      { label: 'العقد', value: safeText(contract?.no || contract?.id.slice(0, 8)) },
      { label: 'الحالة', value: safeText(invoice.status) },
    ],
    summary: [
      { label: 'المبلغ الأساسي', value: formatCurrency(invoice.amount, resolveCurrency(settings)) },
      { label: 'الضريبة', value: formatCurrency(invoice.taxAmount || 0, resolveCurrency(settings)) },
      { label: 'المبلغ المدفوع', value: formatCurrency(invoice.paidAmount || 0, resolveCurrency(settings)) },
      { label: 'المتبقي', value: formatCurrency(Math.max((invoice.amount || 0) + (invoice.taxAmount || 0) - (invoice.paidAmount || 0), 0), resolveCurrency(settings)) },
    ],
    notes: [invoice.notes || 'تم إصدار الفاتورة من نظام Rentrix ERP.'],
  });
};

export const exportMaintenanceRecordToPdf = (
  record: MaintenanceRecord,
  unit: Unit | undefined,
  property: Property | undefined,
  settings: Settings,
) => {
  exportStructuredReportToPdf({
    title: 'تقرير طلب صيانة',
    fileName: `maintenance-${record.no || record.id.slice(0, 8)}.pdf`,
    settings,
    reportDateLabel: `تاريخ الطلب: ${formatDate(record.requestDate)}`,
    metadata: [
      { label: 'رقم الطلب', value: safeText(record.no || record.id.slice(0, 8)) },
      { label: 'العقار', value: safeText(property?.name) },
      { label: 'الوحدة', value: safeText(unit?.name || unit?.unitNumber) },
      { label: 'الحالة', value: safeText(record.status) },
      { label: 'جهة التحميل', value: safeText(record.chargedTo) },
    ],
    summary: [{ label: 'التكلفة المقدرة', value: formatCurrency(record.cost || 0, resolveCurrency(settings)) }],
    notes: [record.issueTitle, record.description || 'لا توجد تفاصيل إضافية.'],
  });
};

const normalizeOwnerLedgerPayload = (
  payloadOrTransactions: OwnerLedgerPayload | Array<Record<string, unknown>>,
  totals?: { gross?: number; officeShare?: number; net?: number },
  settings?: Settings,
  ownerName?: string,
  range?: string,
): OwnerLedgerPayload => {
  if (!Array.isArray(payloadOrTransactions)) {
    return payloadOrTransactions;
  }

  return {
    owner: {
      id: 'legacy',
      name: ownerName || 'المالك',
      phone: null,
      phone2: null,
      nationalId: null,
      ownerType: 'INDIVIDUAL',
      commissionType: null,
      commissionValue: 0,
      notes: null,
      portalToken: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    data: {
      outstandingBalance: totals?.net || 0,
      totalCollected: totals?.gross || 0,
      totalExpenses: 0,
      officeShare: totals?.officeShare || 0,
      ownerNet: totals?.net || 0,
    },
    entries: payloadOrTransactions.map((entry) => ({
      date: safeText(entry.date),
      description: safeText(entry.details || entry.description || entry.label),
      debit: entry.gross && Number(entry.gross) < 0 ? Math.abs(Number(entry.gross)) : Number(entry.debit || 0),
      credit: entry.gross && Number(entry.gross) > 0 ? Number(entry.gross) : Number(entry.credit || 0),
    })),
    settings: settings as Settings,
    dateRangeLabel: range,
  };
};

export const exportOwnerLedgerToPdf = (
  payloadOrTransactions: OwnerLedgerPayload | Array<Record<string, unknown>>,
  totals?: { gross?: number; officeShare?: number; net?: number },
  settings?: Settings,
  ownerName?: string,
  range?: string,
  _showComm?: boolean,
) => {
  const payload = normalizeOwnerLedgerPayload(payloadOrTransactions, totals, settings, ownerName, range);
  const currency = resolveCurrency(payload.settings);

  exportStructuredReportToPdf({
    title: `كشف حساب المالك - ${payload.owner.name}`,
    fileName: `owner-ledger-${payload.owner.name}.pdf`,
    settings: payload.settings,
    reportDateLabel: payload.dateRangeLabel || 'الفترة: جميع الحركات',
    metadata: [
      { label: 'اسم التقرير', value: 'كشف حساب المالك' },
      { label: 'المالك', value: payload.owner.name },
      { label: 'عدد العقارات', value: safeText(payload.data.propertiesCount ?? '-') },
      { label: 'عدد الوحدات', value: safeText(payload.data.unitsCount ?? '-') },
      { label: 'العقود النشطة', value: safeText(payload.data.activeContractsCount ?? '-') },
      { label: 'طلبات الصيانة المفتوحة', value: safeText(payload.data.openMaintenanceCount ?? '-') },
      { label: 'الفواتير المتأخرة', value: safeText(payload.data.overdueInvoicesCount ?? '-') },
    ],
    summary: [
      { label: 'إجمالي التحصيل', value: formatCurrency(payload.data.totalCollected || 0, currency) },
      { label: 'المصروفات', value: formatCurrency(payload.data.totalExpenses || 0, currency) },
      { label: 'عمولة المكتب', value: formatCurrency(payload.data.officeShare || 0, currency) },
      { label: 'صافي المالك', value: formatCurrency(payload.data.ownerNet || 0, currency) },
      { label: 'الرصيد النهائي', value: formatCurrency(payload.data.outstandingBalance || 0, currency) },
      { label: 'مصروفات الخدمات', value: formatCurrency(payload.data.utilityExpenses || 0, currency) },
    ],
    columns: [
      { key: 'date', label: 'التاريخ' },
      { key: 'description', label: 'البيان' },
      { key: 'debit', label: 'مدين', align: 'left', formatter: (value) => formatCurrency(Number(value || 0), currency) },
      { key: 'credit', label: 'دائن', align: 'left', formatter: (value) => formatCurrency(Number(value || 0), currency) },
    ],
    rows: payload.entries,
    notes: ['تم إنشاء هذا التقرير من نظام Rentrix ERP اعتمادًا على البيانات الفعلية المسجلة في النظام.'],
  });
};

export const exportTenantStatementToPdf = (
  data: {
    title?: string;
    metadata?: ReportMetadataItem[];
    summary?: ReportSummaryItem[];
    rows?: Array<Record<string, unknown>>;
  },
  settings: Settings,
) => {
  exportStructuredReportToPdf({
    title: data.title || 'تقرير المستأجرين',
    fileName: 'tenant-report.pdf',
    settings,
    metadata: data.metadata,
    summary: data.summary,
    columns: [
      { key: 'tenant', label: 'المستأجر' },
      { key: 'contracts', label: 'العقود', align: 'left' },
      { key: 'overdue', label: 'الفواتير المتأخرة', align: 'left' },
      { key: 'balance', label: 'الرصيد المفتوح', align: 'left' },
    ],
    rows: data.rows || [],
  });
};

export const exportIncomeStatementToPdf = (
  data: {
    title?: string;
    metadata?: ReportMetadataItem[];
    summary?: ReportSummaryItem[];
    rows?: Array<Record<string, unknown>>;
    notes?: string[];
  },
  settings: Settings,
  range: string,
) => {
  exportStructuredReportToPdf({
    title: data.title || 'التقرير المالي',
    fileName: 'financial-report.pdf',
    settings,
    reportDateLabel: range,
    metadata: data.metadata,
    summary: data.summary,
    columns: [
      { key: 'label', label: 'المؤشر' },
      { key: 'value', label: 'القيمة', align: 'left' },
      { key: 'status', label: 'الملاحظة' },
    ],
    rows: data.rows || [],
    notes: data.notes,
  });
};

export const exportTrialBalanceToPdf = (
  data: { metadata?: ReportMetadataItem[]; summary?: ReportSummaryItem[]; rows?: Array<Record<string, unknown>> },
  settings: Settings,
  date: string,
) => {
  exportStructuredReportToPdf({
    title: 'تقرير العقارات',
    fileName: 'property-report.pdf',
    settings,
    reportDateLabel: date,
    metadata: data.metadata,
    summary: data.summary,
    columns: [
      { key: 'property', label: 'العقار' },
      { key: 'units', label: 'الوحدات', align: 'left' },
      { key: 'contracts', label: 'العقود النشطة', align: 'left' },
      { key: 'revenue', label: 'الإيراد', align: 'left' },
    ],
    rows: data.rows || [],
  });
};

export const exportBalanceSheetToPdf = (
  data: { metadata?: ReportMetadataItem[]; summary?: ReportSummaryItem[]; rows?: Array<Record<string, unknown>> },
  settings: Settings,
  date: string,
) => {
  exportStructuredReportToPdf({
    title: 'الملخص التشغيلي',
    fileName: 'operations-report.pdf',
    settings,
    reportDateLabel: date,
    metadata: data.metadata,
    summary: data.summary,
    columns: [
      { key: 'label', label: 'المؤشر' },
      { key: 'value', label: 'القيمة', align: 'left' },
    ],
    rows: data.rows || [],
  });
};

export const exportAgedReceivablesToPdf = (
  data: { metadata?: ReportMetadataItem[]; summary?: ReportSummaryItem[]; rows?: Array<Record<string, unknown>> },
  settings: Settings,
  date: string,
) => {
  exportStructuredReportToPdf({
    title: 'تقرير الإيرادات والتحصيل',
    fileName: 'revenue-report.pdf',
    settings,
    reportDateLabel: date,
    metadata: data.metadata,
    summary: data.summary,
    columns: [
      { key: 'period', label: 'الفترة' },
      { key: 'collected', label: 'المحصل', align: 'left' },
      { key: 'overdue', label: 'المتأخر', align: 'left' },
      { key: 'net', label: 'الصافي', align: 'left' },
    ],
    rows: data.rows || [],
  });
};
