
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cairoFontBase64 } from './cairoFontBase64';
import { Settings, Contract, Database, Invoice, Expense, Receipt, MaintenanceRecord, Tenant, Unit, Property, Owner } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { tafneeta } from '../utils/numberToArabic';

// مساعد لتطهير البيانات ومنع الأخطاء في الجداول
const s = (value: any): string => (value === null || typeof value === 'undefined' || value === '') ? '-' : String(value);

const getArabicDoc = (title: string, subtitle: string, settings: Settings) => {
    const doc = new jsPDF();
    try {
        doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
        doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
        doc.setFont('Cairo');
    } catch (e) { console.error("Font error", e); }
    
    const { company } = settings;
    const pageWidth = doc.internal.pageSize.width;

    if (company.logoDataUrl) {
        try {
            doc.addImage(company.logoDataUrl, 'PNG', 15, 10, 25, 25);
        } catch (e) {}
    }

    doc.setFontSize(16);
    doc.text(s(company.name), pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(s(title), pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.text(s(subtitle), pageWidth / 2, 28, { align: 'center' });

    return doc;
};

export const exportRentRollToPdf = (units: any[], totals: any, settings: Settings) => {
    const doc = getArabicDoc('تقرير قائمة الإيجارات الحالي', `تاريخ التقرير: ${formatDate(new Date().toISOString())}`, settings);
    const head = [['المستحق', 'التأمين', 'الإيجار', 'نهاية العقد', 'المستأجر', 'الحالة', 'الوحدة']];
    const body = units.map(u => [
        formatCurrency(u.balance, settings.currency),
        formatCurrency(u.deposit, settings.currency),
        formatCurrency(u.rent, settings.currency),
        s(u.endDate),
        s(u.tenant),
        s(u.status),
        s(u.unit)
    ]);
    (doc as any).autoTable({ head, body, startY: 35, styles: { font: 'Cairo', halign: 'right' }, headStyles: { fillColor: [30, 60, 120] } });
    doc.save('Rent_Roll.pdf');
};

export const exportReceiptToPdf = (receipt: Receipt, tenant: Tenant | undefined, settings: Settings) => {
    const doc = getArabicDoc('سند قبض نقد / شيك', `رقم السند: ${receipt.no}`, settings);
    const y = 50;
    doc.setFontSize(11);
    doc.text(`التاريخ: ${formatDate(receipt.dateTime)}`, 195, y, { align: 'right' });
    doc.text(`استلمنا من السيد/ة: ${s(tenant?.name)}`, 195, y + 10, { align: 'right' });
    doc.text(`مبلغاً وقدره: ${formatCurrency(receipt.amount, settings.currency)}`, 195, y + 20, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`تفقيط: ${tafneeta(receipt.amount)}`, 195, y + 28, { align: 'right' });
    doc.setFontSize(11);
    doc.text(`وذلك عن: ${s(receipt.notes)}`, 195, y + 38, { align: 'right' });
    
    doc.line(20, y + 60, 190, y + 60);
    doc.text('توقيع المستلم', 160, y + 70);
    doc.text('الختم الرسمي', 40, y + 70);
    doc.save(`Receipt_${receipt.no}.pdf`);
};

export const exportExpenseToPdf = (expense: Expense, settings: Settings) => {
    const doc = getArabicDoc('سند صرف نقد / شيك', `رقم السند: ${expense.no}`, settings);
    const y = 50;
    doc.setFontSize(11);
    doc.text(`التاريخ: ${formatDate(expense.dateTime)}`, 195, y, { align: 'right' });
    doc.text(`صرفنا للسيد/ة: ${s(expense.payee || expense.ref)}`, 195, y + 10, { align: 'right' });
    doc.text(`مبلغاً وقدره: ${formatCurrency(expense.amount, settings.currency)}`, 195, y + 20, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`تفقيط: ${tafneeta(expense.amount)}`, 195, y + 28, { align: 'right' });
    doc.setFontSize(11);
    doc.text(`وذلك عن: ${s(expense.notes || expense.category)}`, 195, y + 38, { align: 'right' });
    
    doc.line(20, y + 60, 190, y + 60);
    doc.text('توقيع المستلم', 160, y + 70);
    doc.text('المحاسب المسؤول', 40, y + 70);
    doc.save(`Expense_${expense.no}.pdf`);
};

export const exportOwnerLedgerToPdf = (transactions: any[], totals: any, settings: Settings, ownerName: string, range: string, showComm: boolean) => {
    const doc = getArabicDoc(`كشف حساب المالك: ${s(ownerName)}`, range, settings);
    const head = [['الرصيد', 'دائن (له)', 'مدين (عليه)', 'البيان', 'التاريخ']];
    const body = transactions.map(t => [
        formatCurrency(t.balance, settings.currency),
        t.gross > 0 ? formatCurrency(t.gross, settings.currency) : '-',
        t.gross < 0 ? formatCurrency(Math.abs(t.gross), settings.currency) : '-',
        s(t.details),
        formatDate(t.date)
    ]);
    (doc as any).autoTable({ head, body, startY: 35, styles: { font: 'Cairo', halign: 'right' } });
    doc.save(`Owner_Ledger_${ownerName}.pdf`);
};

export const exportContractToPdf = (c: Contract, t: Tenant|undefined, u: Unit|undefined, p: Property|undefined, o: Owner|undefined, settings: Settings) => {
    const doc = getArabicDoc('عقد إيجار موحد', `رقم المرجع: ${c.id.slice(0,8)}`, settings);
    doc.setFontSize(10);
    const text = `إنه في يوم ${formatDate(new Date().toISOString())} تم الاتفاق بين المالك ${s(o?.name)} والمستأجر ${s(t?.name)} على استئجار ${s(u?.type)} رقم ${s(u?.name)} في عقار ${s(p?.name)} بقيمة ${formatCurrency(c.rent, settings.currency)} شهرياً. يبدأ العقد من ${formatDate(c.start)} وينتهي في ${formatDate(c.end)}.`;
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 190, 50, { align: 'right' });
    doc.save(`Contract_${s(t?.name)}.pdf`);
};

export const exportInvoiceToPdf = (inv: Invoice, t: Tenant|undefined, c: Contract|undefined, settings: Settings) => {
    const doc = getArabicDoc('فاتورة مطالبة', `رقم الفاتورة: ${inv.no}`, settings);
    doc.text(`المستأجر: ${s(t?.name)}`, 190, 45, { align: 'right' });
    doc.text(`تاريخ الاستحقاق: ${formatDate(inv.dueDate)}`, 190, 52, { align: 'right' });
    (doc as any).autoTable({
        head: [['المجموع', 'الضريبة', 'المبلغ', 'البيان']],
        body: [[formatCurrency(inv.amount + (inv.taxAmount||0), settings.currency), formatCurrency(inv.taxAmount||0, settings.currency), formatCurrency(inv.amount, settings.currency), inv.notes]],
        startY: 60, styles: { font: 'Cairo', halign: 'right' }
    });
    doc.save(`Invoice_${inv.no}.pdf`);
};

export const exportMaintenanceRecordToPdf = (r: MaintenanceRecord, u: Unit|undefined, p: Property|undefined, settings: Settings) => {
    const doc = getArabicDoc('أمر عمل صيانة', `رقم الطلب: ${r.no}`, settings);
    doc.text(`العقار: ${s(p?.name)} - الوحدة: ${s(u?.name)}`, 190, 45, { align: 'right' });
    doc.text(`الوصف: ${s(r.description)}`, 190, 55, { align: 'right' });
    doc.text(`التكلفة المقدرة: ${formatCurrency(r.cost, settings.currency)}`, 190, 65, { align: 'right' });
    doc.save(`Maintenance_${r.no}.pdf`);
};

export const exportTenantStatementToPdf = (data: any, settings: Settings) => { /* تنفيذ مشابه */ };
export const exportIncomeStatementToPdf = (data: any, settings: Settings, range: string) => { /* تنفيذ مشابه */ };
export const exportTrialBalanceToPdf = (data: any, settings: Settings, date: string) => { /* تنفيذ مشابه */ };
export const exportBalanceSheetToPdf = (data: any, settings: Settings, date: string) => { /* تنفيذ مشابه */ };
export const exportAgedReceivablesToPdf = (data: any, settings: Settings, date: string) => { /* تنفيذ مشابه */ };
