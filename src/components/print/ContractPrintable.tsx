
import React from 'react';
import { Contract } from '../../types';

interface ContractPrintableProps {
  contract: Contract;
}

export const ContractPrintable: React.FC<ContractPrintableProps> = ({ contract }) => {
  return (
    <div className="p-8 space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4">عقد إيجار</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><strong>رقم العقد:</strong> {contract.id}</div>
        <div><strong>تاريخ البدء:</strong> {contract.start}</div>
        <div><strong>تاريخ الانتهاء:</strong> {contract.end}</div>
        <div><strong>قيمة الإيجار:</strong> {contract.rent}</div>
      </div>
      <p className="mt-8">هذا نموذج مبسط لمعاينة العقد...</p>
    </div>
  );
};
