
import React from 'react';

interface InvoicePrintableProps {
  invoice: any;
}

export const InvoicePrintable: React.FC<InvoicePrintableProps> = ({ invoice }) => {
  return (
    <div className="p-8 space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4">فاتورة</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><strong>رقم الفاتورة:</strong> {invoice.no}</div>
        <div><strong>التاريخ:</strong> {invoice.dueDate}</div>
        <div><strong>المبلغ:</strong> {invoice.amount}</div>
        <div><strong>الحالة:</strong> {invoice.status}</div>
      </div>
      <p className="mt-8">هذا نموذج مبسط لمعاينة الفاتورة...</p>
    </div>
  );
};
