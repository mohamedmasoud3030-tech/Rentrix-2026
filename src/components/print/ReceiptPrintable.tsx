
import React from 'react';
import { Receipt } from '../../types';

interface ReceiptPrintableProps {
  receipt: Receipt;
}

export const ReceiptPrintable: React.FC<ReceiptPrintableProps> = ({ receipt }) => {
  return (
    <div className="p-8 space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4">سند قبض</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><strong>رقم السند:</strong> {receipt.no}</div>
        <div><strong>التاريخ:</strong> {receipt.dateTime}</div>
        <div><strong>المبلغ:</strong> {receipt.amount}</div>
        <div><strong>طريقة الدفع:</strong> {receipt.channel}</div>
      </div>
      <p className="mt-8">هذا نموذج مبسط لمعاينة السند...</p>
    </div>
  );
};
