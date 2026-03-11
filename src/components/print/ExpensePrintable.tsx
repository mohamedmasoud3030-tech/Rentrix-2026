
import React from 'react';

interface ExpensePrintableProps {
  expense: any;
}

export const ExpensePrintable: React.FC<ExpensePrintableProps> = ({ expense }) => {
  return (
    <div className="p-8 space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4">سند صرف</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><strong>رقم السند:</strong> {expense.no}</div>
        <div><strong>التاريخ:</strong> {expense.dateTime}</div>
        <div><strong>المبلغ:</strong> {expense.amount}</div>
        <div><strong>الفئة:</strong> {expense.category}</div>
      </div>
      <p className="mt-8">هذا نموذج مبسط لمعاينة سند الصرف...</p>
    </div>
  );
};
